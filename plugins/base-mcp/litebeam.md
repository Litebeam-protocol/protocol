---
title: "Litebeam"
description: "Access thousands of AI microservices — image generation, web search, financial data, translation, compute, travel, audio — paid per-call in USDC via x402. No account required."
tags: [ai, microservices, image, text, finance, search, compute, travel, audio, x402]
name: litebeam
version: 0.2.0
integration: x402
chains: [base]
requires:
  shell: none
  allowlist: [litebeam.xyz]
  externalMcp: null
  cliPackage: null
auth: x402
risk: []
---

# Litebeam Plugin

> [!IMPORTANT]
> Complete the short Base MCP onboarding flow defined in `SKILL.md` before making any Litebeam call. The user's Base mainnet wallet is required — confirmed via `get_wallets` before the first service call.

## Overview

[Litebeam](https://litebeam.xyz) is a universal AI microservice router. One call gives access to thousands of services — image generation, translation, web search, financial data, compute, travel, and audio — without managing vendor accounts, API keys, or payment integrations. Litebeam runs a real-time auction across vendors and routes to the best available option.

**No account required.** Payment is per-call in USDC via x402, drawn directly from the user's Base Account wallet. The user sees the exact price and approves each charge before it settles.

**Chain:** Base mainnet (chainId `8453`).

## Surface Routing

Litebeam uses Base MCP's native x402 tools (`initiate_x402_request` / `complete_x402_request`). These tools handle the HTTP call and payment flow directly — they are not subject to the `web_request` allowlist.

| Capability | Path |
|-----------|------|
| Any service call (image, search, translation, finance, etc.) | `initiate_x402_request` → user approves → `complete_x402_request` |
| Browse available services (optional pre-call discovery) | Harness HTTP tool if available, else `web_request` GET against `litebeam.xyz`. |

**Prerequisite:** The user must have an active Base mainnet wallet with USDC balance. Confirm with `get_wallets` before the first call. The discover endpoint (`litebeam.xyz`) must be in the `web_request` allowlist for service browsing on chat-only surfaces — skip the discover step if the allowlist rejects it.

## Endpoints

Base URL: `https://litebeam.xyz/api`

### `POST /call` — route a service call (x402)

This endpoint is x402-gated. Use `initiate_x402_request`, not `web_request`.

**Natural language (recommended):**
```json
{ "request": "generate a photorealistic image of a mountain at sunset" }
```

**Structured (explicit capability):**
```json
{
  "capability": "image_generation",
  "params": { "prompt": "a mountain at sunset, photorealistic, 4K" }
}
```

Parameters:

| Field | Type | Description |
|---|---|---|
| `request` | string | Natural language description. Litebeam routes automatically. |
| `capability` | string | Explicit capability keyword (e.g. `image_generation`). Skips AI routing. |
| `params` | object | Vendor-specific parameters merged with AI-extracted params. |
| `max_price_usdc` | number | Maximum price per call in USDC. Litebeam will not route above this. |

The 402 response includes the exact USDC price and selected vendor. `initiate_x402_request` presents this to the user for approval. After approval, `complete_x402_request` settles the payment and returns the result.

**Success response (from `complete_x402_request`):**
```json
{
  "result": "<service output — text, image URL, JSON data, etc.>",
  "cost_usdc": 0.019,
  "routed_to": "<vendor name>",
  "latency_ms": 1240
}
```

### `GET /discover` — browse available services (optional)

No auth required.

```text
GET https://litebeam.xyz/api/discover
GET https://litebeam.xyz/api/discover?category=finance
```

Returns total service count and per-category breakdowns with price ranges. Use before a session to show the user what's available, or when they ask what Litebeam supports.

## Capabilities

Pass a `capability` key or describe the task in `request` — Litebeam's routing AI finds the best vendor.

| Capability | Category | Typical cost | Use for |
|---|---|---|---|
| `image_generation` | image | ~$0.019 | Generate images from text prompts |
| `web_search` | search | ~$0.010 | Search the web, retrieve URLs and snippets |
| `news_search` | search | ~$0.010 | Find recent news articles on any topic |
| `text_translation` | text | ~$0.001 | Translate text between languages |
| `text_generation` | text | ~$0.001 | Generate or rewrite text, summaries, copy |
| `crypto_price` | finance | ~$0.003 | Real-time cryptocurrency prices |
| `stock_price` | finance | ~$0.003 | Equity prices and market data |
| `flight_search` | travel | ~$0.006 | Search flights between cities |
| `weather` | data | ~$0.002 | Current weather and forecasts |
| `audio_transcription` | audio | ~$0.005 | Transcribe audio files to text |
| `code_execution` | compute | ~$0.003 | Run code in a sandboxed environment |

For anything not listed, use the `request` field with a natural language description.

## Orchestration

```text
1. get_wallets → confirm Base mainnet wallet is active and has USDC balance
2. Let the user know they will see a USDC approval prompt for each call
3. initiate_x402_request (see parameters below)
4. Surface the price and vendor from the 402 response — do not auto-approve
5. User approves in Base Account
6. complete_x402_request(requestId)
7. Return result to the user with cost and vendor shown
```

### `initiate_x402_request` parameters

| Parameter | Value |
|---|---|
| `url` | `https://litebeam.xyz/api/call` |
| `method` | `POST` |
| `maxPayment` | `"0.10"` USDC (ceiling — actual charge shown before approval) |
| `body` | See [Endpoints](#endpoints) above |

Never skip step 4. Always show the price from the 402 response before the user approves — do not auto-approve.

For calls that may cost more than $0.05, confirm the budget with the user before calling `initiate_x402_request`.

If `complete_x402_request` returns an error, the user was not charged — inform them and offer to retry.

## Example Prompts

**Generate an image**
1. `get_wallets` → confirm Base mainnet is active.
2. `initiate_x402_request` POST `https://litebeam.xyz/api/call` with `{ "request": "generate a photorealistic image of a futuristic city at night" }`, `maxPayment: "0.10"`.
3. Show the user the price and vendor from the 402 response. Wait for approval.
4. `complete_x402_request(requestId)`.
5. Return the image URL from `result`.

**Get the current price of a token**
1. `get_wallets` → confirm Base mainnet is active.
2. `initiate_x402_request` POST `https://litebeam.xyz/api/call` with `{ "request": "What is the current price of ETH?" }`, `maxPayment: "0.10"`.
3. Show price (~$0.003) and vendor. Wait for approval.
4. `complete_x402_request(requestId)`.
5. Return the price data.

**Search the web**
1. `get_wallets` → confirm Base mainnet is active.
2. `initiate_x402_request` POST `https://litebeam.xyz/api/call` with `{ "capability": "web_search", "params": { "query": "latest AI news" } }`, `maxPayment: "0.10"`.
3. Show price (~$0.010) and vendor. Wait for approval.
4. `complete_x402_request(requestId)`.
5. Return URLs and snippets from `result`.

**Find flights**
1. `get_wallets` → confirm Base mainnet is active.
2. `initiate_x402_request` POST `https://litebeam.xyz/api/call` with `{ "request": "find flights from New York to London next Friday" }`, `maxPayment: "0.10"`.
3. Show price (~$0.006) and vendor. Wait for approval.
4. `complete_x402_request(requestId)`.
5. Return flight options from `result`.

**What services does Litebeam support?**
1. If harness HTTP tool is available: GET `https://litebeam.xyz/api/discover`.
2. Else: `web_request` GET `https://litebeam.xyz/api/discover` (requires allowlist).
3. Show total service count and per-category breakdown with price ranges.

## Risks & Warnings

- **Charge-on-success only.** Litebeam does not charge if the vendor fails to deliver. If `complete_x402_request` returns an error, the user was not charged.
- **Always show price before approval.** The 402 response shows the exact USDC cost. `maxPayment` is a ceiling only — never tell the user the charge will be `maxPayment`.
- **USDC balance required.** If the user has no USDC on Base mainnet, `complete_x402_request` will fail. Surface this clearly rather than retrying.
- **Budget awareness.** For operations above $0.05, confirm budget before initiating. Direct mode has no server-side spend controls — the user is responsible for their own limits.
- **No data retention.** Litebeam does not store request content beyond what is needed for routing.

## Notes

- USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Base mainnet chainId: `8453`
- `maxPayment` is denominated in USDC as a string (e.g. `"0.10"`), not wei.
- Natural language `request` is preferred over structured `capability` for multi-step or ambiguous tasks; use `capability` only when the service type is unambiguous.
- For anything not in the capability table, use natural language — Litebeam's AI routing handles it.
