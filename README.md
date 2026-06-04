# litebeam

**The routing layer for AI agents.**

litebeam is a universal routing layer for AI agents. Connect once via MCP and get instant access to thousands of AI microservices — image generation, translation, web search, audio, data APIs, and more — without managing vendor accounts, API keys, or payment integrations.

```json
{
  "mcpServers": {
    "litebeam": {
      "url": "https://mcp.litebeam.xyz/mcp",
      "headers": { "Authorization": "Bearer sk-litebeam-YOUR_KEY" }
    }
  }
}
```

That's the entire integration. Your agent can now call any service.

---

## What litebeam does

When your agent makes a request:

1. **Pre-filters candidates** — keyword search across 6,000+ x402 and MPP services returns up to 25 candidates
2. **AI selects the winner** — the model sees the actual candidate list (name, description, price, protocol) and picks the best match by UUID, extracting vendor-specific parameters in the same inference call
3. **Settles payment on-chain** — no API keys, no billing portals, pure crypto micropayments
4. **Returns the result** with full cost transparency — vendor cost, litebeam fee, and endpoint shown separately

### Why this matters as services scale

Routing to the right microservice is already non-trivial at hundreds of services. At thousands, it's intractable for an agent to reason about directly. litebeam turns a vendor-selection problem into a one-line capability call. The routing layer also decouples your agent from specific protocols (x402, MPP, and future ones) — your code doesn't change as payment infrastructure evolves.

---

## MCP tools

### `call_service`

Route any AI microservice call using natural language or an explicit capability keyword.

```typescript
// Natural language — litebeam classifies and routes automatically
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
| `request` | `string` | Natural language description of what you need. litebeam uses AI to classify, find the best vendor, and format the call. |
| `capability` | `string` | Explicit capability keyword (e.g. `"image_generation"`, `"translate"`). Skips AI routing — use when you know exactly what you need. |
| `params` | `object` | Parameters merged with AI-extracted params and passed to the vendor. |
| `max_price_usdc` | `number` | Maximum price per call in USDC. litebeam will not route to vendors above this price. |
| `protocol` | `"x402" \| "mpp"` | Force a specific protocol. Omit to let litebeam choose. |
| `hitl_override_id` | `string` | UUID of an approved HITL request. Include this to proceed after human approval of a high-cost call. |

**Response:**

```json
{
  "result": { ... },
  "routed_to": "Stable Diffusion XL",
  "provider": "replicate.com",
  "protocol": "x402",
  "cost_usdc": 0.0082,
  "vendor_cost_usdc": 0.005,
  "litebeam_fee_usdc": 0.0032,
  "vendor_endpoint": "https://replicate.com/api/generate",
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

### Mode A — litebeam wallet (recommended)

Get a dedicated USDC wallet address on Base, fund it, and litebeam draws per-request automatically. Every deduction is on-chain and auditable. Balance always withdrawable.

1. Sign up at [litebeam.xyz](https://litebeam.xyz)
2. Copy your API key and wallet address
3. Send USDC to your wallet address on Base
4. Configure the MCP server (snippet above)

Budget controls available: daily spend limits, per-call HITL approval thresholds, and low-balance alerts via webhook.

### Mode B — BYO wallet (no account needed)

Agents with their own Base wallet (Coinbase AgentKit, CDP, or any Base wallet) can call litebeam's REST endpoint directly. litebeam quotes the price, the agent signs and pays via [x402](https://x402.org), litebeam routes and returns the result. No pre-funding, no signup.

```
POST https://litebeam.xyz/api/call
{ "capability": "image_generation", "params": { "prompt": "..." } }
→ 402 + payment offer
→ POST with X-PAYMENT header
→ 200 + result
```

---

## Reputation system

Every settled transaction updates vendor reputation scores. Ranking uses `price × latency × reputation` — not just lowest listed price. Vendors that consistently deliver fast, correct results rank higher than cheaper vendors that are slow or unreliable. This dataset compounds with every call and is the core reason litebeam gets better over time.

---

## Repo contents

This repository contains the **protocol-facing layer** of litebeam:

| Path | Description |
|---|---|
| [`src/payment/x402-client.ts`](src/payment/x402-client.ts) | Standalone x402 micropayment client — reusable outside litebeam |
| [`src/mcp/schema.ts`](src/mcp/schema.ts) | MCP tool input/output type definitions |
| [`src/registry/types.ts`](src/registry/types.ts) | Service registry types |
| [`src/registry/sync.ts`](src/registry/sync.ts) | Registry crawler (agentic.market + mpp.dev) |
| [`docs/mcp-integration.md`](docs/mcp-integration.md) | Full MCP integration guide |
| [`docs/x402-client.md`](docs/x402-client.md) | Using the x402 client standalone |
| [`docs/registry.md`](docs/registry.md) | How service discovery and reputation work |
| [`examples/`](examples/) | Integration examples |

---

## Links

- **Website**: [litebeam.xyz](https://litebeam.xyz)
- **Service directory**: [litebeam.xyz/services](https://litebeam.xyz/services)
- **Sign up**: [litebeam.xyz](https://litebeam.xyz)
- **Email**: [hello@litebeam.xyz](mailto:hello@litebeam.xyz)
