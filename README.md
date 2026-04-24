# ⚠️ Archived

This repo has been archived. The plugin is now published as an npm package and is easier to install.

## New Location

- **npm:** [@telnyx/opencode](https://www.npmjs.com/package/@telnyx/opencode)
- **Source:** [team-telnyx/ai — opencode directory](https://github.com/team-telnyx/ai/tree/main#opencode)

## Migration

Replace the `file:///` plugin path in your OpenCode config with the npm package:

**Before (this repo):**
```json
{
  "plugin": [
    "file:///absolute/path/to/opencode-telnyx-auth"
  ]
}
```

**After (npm):**
```json
{
  "plugin": [
    "@telnyx/opencode"
  ]
}
```

No other config changes needed — the npm package provides the same Telnyx provider registration, auth, model manager, and `max_completion_tokens` workaround.
