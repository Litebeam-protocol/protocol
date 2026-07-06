# MCP integration

litebeam exposes a standard Model Context Protocol server. Any MCP-compatible agent or client can connect with a single config block. Your API key authenticates the session and routes all calls to your agent's wallet.

Once connected, read the [Agent guide](./agent-guide.md) for the usage contract — how to call litebeam well (atomic intents, handle reuse, routing receipts, constraints). It is also available in-band via the `get_started` tool, the `litebeam://guide` MCP resource, or `https://litebeam.xyz/llms.txt`.

## Standard MCP config

Add the following to your agent or client's MCP server configuration:

```json
{
  "mcpServers": {
    "litebeam": {
      "url": "https://mcp.litebeam.xyz",
      "headers": {
        "Authorization": "Bearer sk-litebeam-your-key-here"
      }
    }
  }
}
```

The MCP server uses Streamable HTTP transport (MCP spec §6.3).

## Supported clients

### Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows) and add the `litebeam` block to `mcpServers`.

### Cursor

Go to **Cursor → Settings → MCP** and add a new server entry with the URL and Authorization header above.

### Claude Code (CLI)

```json
{
  "mcpServers": {
    "litebeam": {
      "type": "sse",
      "url":   "https://mcp.litebeam.xyz",
      "headers": {
        "Authorization": "Bearer sk-litebeam-your-key-here"
      }
    }
  }
}
```

Add this to `~/.claude/settings.json`.

### Any HTTP MCP client

The litebeam MCP endpoint speaks standard [MCP over HTTP](https://modelcontextprotocol.io) with SSE streaming. Point your client at `https://mcp.litebeam.xyz` and include the `Authorization: Bearer <key>` header on every request.

### Custom agent (TypeScript)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({ name: 'my-agent', version: '1.0.0' }, { capabilities: {} });
const transport = new StreamableHTTPClientTransport(
  new URL('https://mcp.litebeam.xyz'),
  { requestInit: { headers: { Authorization: 'Bearer sk-litebeam-your-key-here' } } }
);
await client.connect(transport);

const result = await client.callTool('call_service', {
  request: 'generate a photorealistic image of a red panda in the snow'
});
```

---

## Authentication

litebeam API keys start with `sk-litebeam-` and are shown once at account creation. Store yours securely — it cannot be retrieved later, but you can rotate it from the dashboard.

> **Your key controls your wallet.** Anyone with your key can spend your USDC balance. Never commit it to source control or expose it in client-side code. Set a daily spend limit and HITL threshold as a safety net.

Pass the key as a Bearer token in the `Authorization` header on every request to the MCP server or REST API:

```
Authorization: Bearer sk-litebeam-your-key-here
```

---

## MCP tools

### `discover` (litebeam/0.7.0)

Find services for one capability before spending on execution. Returns a ranked
shortlist — `recommended` is litebeam's pick — with prices, reputation, latency
and required params, or an honest `{"type": "no_coverage"}` when the catalog
cannot serve the request (never charged). A small flat discovery fee applies and
is **credited back** when you execute a listed candidate within the credit
window. Managed keys pay from balance; BYO wallets call once without `payment`
to receive the x402 signing quote, then re-call with the signed authorization.

```ts
const found = await client.callTool('discover', { request: 'technical SEO audit of a web page' });
// → { type: 'candidates', recommended: '…', shortlist: [...], discovery_fee_usdc: …, credit: {...} }
await client.callTool('call_service', { service_id: found.recommended, params: { url: 'https://example.com' } });
// executing a listed candidate inside the window credits the discovery fee back
```

### `call_service`

Route any AI microservice call using natural language or an explicit capability keyword.

```typescript
// Natural language — litebeam classifies and routes automatically
await client.callTool('call_service', {
  request: 'translate "good morning" to Japanese, French, and Spanish'
});

// Explicit capability — skips AI routing, slightly cheaper
await client.callTool('call_service', {
  capability: 'image_generation',
  params: { prompt: 'cyberpunk cityscape at dusk, neon rain', width: 1024, height: 1024 },
  max_price_usdc: 0.05,
});
```

**Parameters:**

| Field | Type | Description |
|---|---|---|
| `request` | `string` | Natural language description. litebeam uses AI to classify, find the best vendor, and format the call. |
| `capability` | `string` | Explicit capability keyword (e.g. `image_generation`, `translation`). Skips AI routing. |
| `service_id` | `string` | Address a specific service directly (from a prior response's `handle`). Skips AI routing and the routing fee — see *Reuse by handle* below. |
| `params` | `object` | Parameters merged with AI-extracted params and passed to the vendor. |
| `max_price_usdc` | `number` | Maximum price per call in USDC. litebeam will not route above this price. |
| `protocol` | `"x402" \| "mpp"` | Force a specific protocol. Omit to let litebeam choose. |
| `hitl_override_id` | `string` | UUID of an approved HITL request. Include after human approval of a high-cost call. |

**Response:**

```json
{
  "result": { "...": "vendor response" },
  "routed_to": "Stable Diffusion XL",
  "provider": "replicate.com",
  "protocol": "x402",
  "cost_usdc": 0.0082,
  "vendor_cost_usdc": 0.005,
  "litebeam_fee_usdc": 0.0032,
  "vendor_endpoint": "https://replicate.com/api/generate",
  "latency_ms": 412,
  "candidates_evaluated": 5,
  "ai_routed": true,
  "handle": {
    "service_id": "1875014f-3ef4-4859-82ac-aaa1e0cea096",
    "name": "Stable Diffusion XL",
    "provider": "replicate.com",
    "category": "image",
    "protocol": "x402",
    "price_usdc": 0.005,
    "reuse_hint": "Reuse this exact service without re-routing by calling call_service with service_id: \"1875014f-...\" (no AI routing fee)."
  }
}
```

**Reuse by handle.** *Discover by intent once; address by handle thereafter.* Every
`call_service` response includes a `handle`. To call the same service again without paying
for AI routing, pass `handle.service_id` back as `service_id`:

```typescript
// First call: discover by intent (AI routing)
const first = await client.callTool('call_service', { request: 'price of bitcoin in USD' });
const { service_id } = first.handle;

// Reuse: address the same service directly — no routing, no routing fee
await client.callTool('call_service', { service_id, request: 'price of bitcoin in USD' });
```

### `list_services`

Browse available services. Filter by category, protocol, or search term.

```typescript
await client.callTool('list_services', {
  category: 'image',
  protocol: 'x402',
  limit: 20
});
```

### `get_started`

Returns the agent usage contract — how to call litebeam well (one capability per call, reuse handles by `service_id`, read the `routing_receipt`, attach constraints, rate results). Read it once before building a workflow. The same text is the `litebeam://guide` MCP resource and `https://litebeam.xyz/llms.txt`.

```typescript
await client.callTool('get_started', {});
```
