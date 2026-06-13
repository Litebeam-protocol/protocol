---
title: "Litebeam"
description: "Access 12,000+ AI microservices — image generation, web search, financial data, translation, compute, travel, audio — paid per-call in USDC via x402. No account required."
tags: [ai, microservices, image, text, finance, search, compute, travel, audio, x402]
name: litebeam
version: 0.1.0
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

[Litebeam](https://litebeam.xyz) is a universal AI microservice router. One x402 call gives access to 12,000+ services across image generation, translation, web search, financial data, compute, travel, and audio. Litebeam runs a real-time auction across vendors and routes to the best available option — your Base Account wallet pays per-call in USDC, only on successful delivery.

**No account required.** No signup, no API key, no new wallet. Your existing Base Account handles payment.

## Detection

Litebeam uses Base MCP's built-in x402 tools (`initiate_x402_request`, `complete_x402_request`). No additional MCP server is needed — if those tools are available, Litebeam is ready to use.

## Onboarding

Before making a service call:

1. Call `get_wallets` and confirm the user has an active Base mainnet wallet
2. Let the user know they will see a USDC approval prompt for each call
3. Optionally, call `GET https://litebeam.xyz/api/discover` to show available service categories

## Calling a Service

### Step 1 — Initiate the request

Call `initiate_x402_request`:

| Parameter    | Value |
|---|---|
| `url`        | `https://litebeam.xyz/api/call` |
| `method`     | `POST` |
| `maxPayment` | `"0.10"` USDC (ceiling — actual charge is shown before approval) |
| `body`       | See below |

**Body — natural language (recommended):**
```json
{ "request": "generate a photorealistic image of a mountain at sunset" }
```

**Body — structured:**
```json
{
  "capability": "image_generation",
  "params": { "prompt": "a mountain at sunset, photorealistic, 4K" }
}
```

The 402 response includes the exact USDC price and which vendor was selected. Base MCP presents this to the user for approval.

### Step 2 — Complete the request

After the user approves the payment in Base Account:

```
complete_x402_request(requestId)
```

The response contains:

```json
{
  "result":     "<service output — text, image URL, JSON data, etc.>",
  "cost_usdc":  0.019,
  "routed_to":  "<vendor name>",
  "latency_ms": 1240
}
```

## Service Capabilities

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

## Examples

**Image generation:**
```json
{ "request": "generate a photorealistic image of a futuristic city at night" }
```
Typical cost: $0.019 · Typical latency: 3–8s

**ETH price:**
```json
{ "request": "What is the current price of ETH?" }
```
Typical cost: $0.003 · Typical latency: <1s

**Web search:**
```json
{ "capability": "web_search", "params": { "query": "latest AI news June 2026" } }
```
Typical cost: $0.010 · Typical latency: 1–2s

**Flight search:**
```json
{ "request": "find flights from New York to London next Friday" }
```
Typical cost: $0.006 · Typical latency: 2–5s

## Discover Available Services

Before committing to a call, you can show the user what's available:

```
GET https://litebeam.xyz/api/discover
```

Returns total service count and per-category breakdowns with price ranges.

Filter by category:
```
GET https://litebeam.xyz/api/discover?category=finance
```

## Orchestration Rules

1. Always call `get_wallets` first and confirm Base mainnet is available.
2. Show the price from the 402 response before the user approves — do not auto-approve.
3. `maxPayment` is a ceiling; the actual charge will always be ≤ this amount.
4. If `complete_x402_request` returns an error, the user was not charged — inform them and retry if appropriate.
5. For operations that may cost more than $0.05, confirm the budget with the user first.
6. Never pass private keys, wallet mnemonics, or personal credentials in the request body.

## Safety

- **Charge-on-success only:** Litebeam does not charge if the vendor fails to deliver.
- **Exact price before approval:** the 402 response shows the exact price. `maxPayment` is a ceiling only.
- **Base mainnet only:** payments are USDC on Base (chainId 8453).
- **No data retention:** Litebeam does not store request content beyond what is needed for routing.
