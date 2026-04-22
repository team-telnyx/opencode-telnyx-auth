# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- initial Telnyx auth and provider plugin for OpenCode
- Telnyx model discovery via `GET https://api.telnyx.com/v2/ai/models`
- API key resolution from `TELNYX_API_KEY` or OpenCode's stored `auth.json` credential
- compatibility fix for Telnyx requests that reject tool use with output token caps
