# ag0ra

**One MCP connection. Every AI microservice. Zero config.**

ag0ra is a universal routing layer for AI agents. Connect once via MCP and get instant access to thousands of AI microservices — image generation, translation, web search, audio, data APIs, and more — without managing vendor accounts, API keys, or payment integrations.

```json
{
  "mcpServers": {
    "ag0ra": {
      "url": "https://mcp.ag0ra.xyz/mcp",
      "headers": { "Authorization": "Bearer sk-ag0ra-YOUR_KEY" }
    }
  }
}
```

That's the entire integration. Your agent can now call any service.

---

## What ag0ra does

When your agent makes a request:

1. **Classifies intent** using AI — "generate an image of Mars at dusk" → `image_generation`
2. **Finds the best vendor** across 6,000+ x402 and MPP services, ranked by price × latency × on-chain reputation
3. **Settles payment on-chain** — no API keys, no billing portals, pure crypto micropayments
4. **Returns the result** — your agent never knows which vendor served it

### Why this matters as services scale

Routing to the right microservice is already non-trivial at hundreds of services. At thousands, it's intractable for an agent to reason about directly. ag0ra turns a vendor-selection problem into a one-line capability call. The routing layer also decouples your agent from specific protocols (x402, MPP, and future ones) — your code doesn't change as payment infrastructure evolves.

---

## MCP tools

### `call_service`

Route any AI microservice call using natural language or an explicit capability keyword.

```typescript
// Natural language — ag0ra classifies and routes automatically
await mcp.call("call_service", {
  request: "translate this text to French: Hello, world"
});

// Explicit capability — skips AI routing, slightly cheaper
await mcp.call("call_service", {
  capability: "translation",
  params: { text: "Hello, world", target_language: "fr" }
});
```

**Parameters:**

| Field | Type | Description |
|---|---|---|
| `request` | `string` | Natural language description of what you need. ag0ra uses AI to classify, find the best vendor, and format the call. |
| `capability` | `string` | Explicit capability keyword (e.g. `"image_generation"`, `"translate"`). Skips AI routing — use when you know exactly what you need. |
| `params` | `object` | Parameters merged with AI-extracted params and passed to the vendor. |
| `max_price_usdc` | `number` | Maximum price per call in USDC. ag0ra will not route to vendors above this price. |
| `protocol` | `"x402" \| "mpp"` | Force a specific protocol. Omit to let ag0ra choose. |
| `hitl_override_id` | `string` | UUID of an approved HITL request. Include this to proceed after human approval of a high-cost call. |

**Response:**

```json
{
  "result": { ... },
  "routed_to": "Stable Diffusion XL",
  "provider": "replicate.com",
  "protocol": "x402",
  "cost_usdc": 0.0052,
  "latency_ms": 412,
  "candidates_evaluated": 5,
  "ai_routed": true
}
```

### `list_services`

Browse available services. Filter by category, protocol, or search term.

```typescript
await mcp.call("list_services", {
  category: "image",
  protocol: "x402",
  limit: 20
});
```

---

## Service categories

| Category | Examples |
|---|---|
| `image` | Generation, editing, upscaling, style transfer |
| `text` | LLM inference, translation, summarisation, classification |
| `audio` | Speech-to-text, TTS, music generation, transcription |
| `search` | Web search, news, research |
| `finance` | Crypto prices, DeFi data, market feeds |
| `data` | Blockchain data, datasets, APIs |
| `compute` | Code execution, browser automation, scraping |
| `travel` | Hotels, flights, maps, weather |
| `code` | Code generation, review, execution |

---

## Wallet & payment model

### Mode A — ag0ra wallet (recommended)

Get a dedicated USDC wallet address on Base, fund it, and ag0ra draws per-request automatically. Every deduction is on-chain and auditable. Balance always withdrawable.

1. Sign up at [ag0ra.xyz](https://ag0ra.xyz)
2. Copy your API key and wallet address
3. Send USDC to your wallet address on Base
4. Configure the MCP server (snippet above)

Budget controls available: daily spend limits, per-call HITL approval thresholds, and low-balance alerts via webhook.

### Mode B — BYO wallet (no account needed)

Agents with their own Base wallet (Coinbase AgentKit, CDP, or any Base wallet) can call ag0ra's REST endpoint directly. ag0ra quotes the price, the agent signs and pays via [x402](https://x402.org), ag0ra routes and returns the result. No pre-funding, no signup.

```
POST https://ag0ra.xyz/api/call
{ "capability": "image_generation", "params": { "prompt": "..." } }
→ 402 + payment offer
→ POST with X-PAYMENT header
→ 200 + result
```

---

## Reputation system

Every settled transaction updates vendor reputation scores. Ranking uses `price × latency × reputation` — not just lowest listed price. Vendors that consistently deliver fast, correct results rank higher than cheaper vendors that are slow or unreliable. This dataset compounds with every call and is the core reason ag0ra gets better over time.

---

## Repo contents

This repository contains the **protocol-facing layer** of ag0ra:

| Path | Description |
|---|---|
| [`src/payment/x402-client.ts`](src/payment/x402-client.ts) | Standalone x402 micropayment client — reusable outside ag0ra |
| [`src/mcp/schema.ts`](src/mcp/schema.ts) | MCP tool input/output type definitions |
| [`src/registry/types.ts`](src/registry/types.ts) | Service registry types |
| [`src/registry/sync.ts`](src/registry/sync.ts) | Registry crawler (agentic.market + mpp.dev) |
| [`docs/mcp-integration.md`](docs/mcp-integration.md) | Full MCP integration guide |
| [`docs/x402-client.md`](docs/x402-client.md) | Using the x402 client standalone |
| [`docs/registry.md`](docs/registry.md) | How service discovery and reputation work |
| [`examples/`](examples/) | Integration examples |

---

## Links

- **Website**: [ag0ra.xyz](https://ag0ra.xyz)
- **Service directory**: [ag0ra.xyz/services.html](https://ag0ra.xyz/services.html)
- **Sign up**: [ag0ra.xyz](https://ag0ra.xyz)
- **Email**: [hello@ag0ra.xyz](mailto:hello@ag0ra.xyz)
