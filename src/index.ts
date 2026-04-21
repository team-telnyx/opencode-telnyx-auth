import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

const PROVIDER_ID = "telnyx"
const API_BASE = "https://api.telnyx.com/v2/ai"
const OPENAI_BASE = `${API_BASE}/openai`
const MODELS_URL = `${API_BASE}/models`
const TEXT_TASKS = new Set(["text-generation", "text generation"])
const PASSTHROUGH_PREFIXES = ["openai/", "anthropic/", "google/gemini-", "xai-org/"]

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null
}

function authFilePath(): string {
  const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share")
  return join(dataHome, "opencode", "auth.json")
}

function storedApiKey(): string | undefined {
  try {
    const auth = JSON.parse(readFileSync(authFilePath(), "utf8")) as unknown
    if (!isObject(auth)) return undefined
    const telnyx = auth[PROVIDER_ID]
    if (!isObject(telnyx) || telnyx.type !== "api") return undefined
    return typeof telnyx.key === "string" && telnyx.key.length > 0 ? telnyx.key : undefined
  } catch {
    return undefined
  }
}

function apiKey(): string | undefined {
  return process.env.TELNYX_API_KEY ?? storedApiKey()
}

function modelConfig(model: JsonObject): [string, JsonObject] | undefined {
  const id = typeof model.id === "string" ? model.id : undefined
  const task = typeof model.task === "string" ? model.task : undefined
  const context = typeof model.context_length === "number" ? model.context_length : undefined
  if (!id || !task || context === undefined) return undefined
  if (!TEXT_TASKS.has(task)) return undefined
  if (PASSTHROUGH_PREFIXES.some((prefix) => id.startsWith(prefix))) return undefined

  const shortId = id.includes("/") ? id.split("/").pop() ?? id : id
  const vision = model.is_vision_supported === true

  return [
    id,
    {
      name: shortId,
      limit: { context },
      ...(vision
        ? {
            attachment: true,
            modalities: {
              input: ["text", "image"],
              output: ["text"],
            },
          }
        : {}),
    },
  ]
}

async function fetchModels(key: string | undefined): Promise<Record<string, JsonObject>> {
  if (!key) return {}

  try {
    const response = await fetch(MODELS_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return {}

    const payload = (await response.json()) as unknown
    const data = isObject(payload) && Array.isArray(payload.data) ? payload.data : []
    return Object.fromEntries(data.flatMap((item) => {
      if (!isObject(item)) return []
      const parsed = modelConfig(item)
      return parsed ? [parsed] : []
    }))
  } catch {
    return {}
  }
}

const TelnyxAuthPlugin: Plugin = async () => {
  const key = apiKey()
  const models = await fetchModels(key)

  return {
    auth: {
      provider: PROVIDER_ID,
      methods: [{ type: "api", label: "API Key" }],
      loader: async (auth) => {
        const stored = await auth()
        return isObject(stored) && stored.type === "api" && typeof stored.key === "string"
          ? { apiKey: stored.key }
          : {}
      },
    },

    config: async (config: { provider?: Record<string, unknown> }) => {
      config.provider ??= {}
      config.provider[PROVIDER_ID] = {
        npm: "@ai-sdk/openai-compatible",
        name: "Telnyx",
        options: {
          baseURL: OPENAI_BASE,
          ...(key ? { apiKey: key } : {}),
        },
        models,
      }
    },

    "chat.params": async (input: { model?: { providerID?: string } }, output: { maxOutputTokens?: number }) => {
      if (input.model?.providerID === PROVIDER_ID) output.maxOutputTokens = undefined
    },
  }
}

export default TelnyxAuthPlugin
