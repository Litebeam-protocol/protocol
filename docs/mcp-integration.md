# MCP Integration Guide

litebeam exposes its routing engine as an MCP server. Any MCP-compatible client (Claude Desktop, Claude Code, custom agent) can connect and immediately call thousands of AI microservices.

## Connection

```json
{
  "mcpServers": {
    "litebeam": {
      "url": "https://mcp.litebeam.xyz/mcp",
      "headers": {
        "Authorization": "Bearer sk-litebeam-YOUR_KEY"
      }
    }
  }
}
```

Get your API key at [litebeam.xyz](https://litebeam.xyz). The MCP server uses Streamable HTTP transport (MCP spec §6.3).

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## Claude Code

```bash
claude mcp add litebeam --transport http \
  --url https://mcp.litebeam.xyz/mcp \
  --header "Authorization: Bearer sk-litebeam-YOUR_KEY"
```

## Custom agent (TypeScript)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({ name: 'my-agent', version: '1.0.0' }, { capabilities: {} });
const transport = new StreamableHTTPClientTransport(
  new URL('https://mcp.litebeam.xyz/mcp'),
  { requestInit: { headers: { Authorization: 'Bearer sk-litebeam-YOUR_KEY' } } }
);
await client.connect(transport);

// Call any service with natural language
const result = await client.callTool('call_service', {
  request: 'generate a photorealistic image of a red panda in the snow'
});
```

## Tool: `call_service`

### Natural language mode (recommended)

```typescript
await client.callTool('call_service', {
  request: 'translate "good morning" to Japanese, French, and Spanish'
});
```

litebeam:
1. Classifies intent → `translation`
2. Finds cheapest online translation vendor
3. Formats the request for that vendor's API
4. Settles payment and returns the result

### Explicit capability mode (no AI overhead)

```typescript
await client.callTool('call_service', {
  capability: 'image_generation',
  params: {
    prompt: 'cyberpunk cityscape at dusk, neon rain',
    width: 1024,
    height: 1024,
  },
  max_price_usdc: 0.05,
});
```

Use this when you know exactly what you need and want to avoid the `$0.003` inference overhead.

## Budget controls

Configure from your [dashboard](https://litebeam.xyz/dashboard) or via the API:

```typescript
await fetch('https://litebeam.xyz/api/wallet/controls', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer sk-litebeam-YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    daily_limit_usdc: 10.00,     // hard cap; resets at UTC midnight
    hitl_threshold: 1.00,         // calls above $1 require human approval
    low_balance_alert: 5.00,      // webhook notification when balance drops below $5
    webhook_url: 'https://yourapp.com/webhooks/litebeam',
  }),
});
```

### Human-in-the-loop (HITL)

When a call exceeds your `hitl_threshold`, litebeam:
1. Returns a `hitl_request_id` instead of executing the call
2. Sends a webhook to your `webhook_url`
3. Waits for your approval (15-minute window)

```typescript
// The agent receives this instead of a result:
{
  "hitl_request_id": "550e8400-e29b-41d4-a716-446655440000",
  "estimated_cost_usdc": 2.50,
  "capability": "video_generation",
  "expires_at": "2025-01-01T12:15:00Z"
}

// After you approve at: POST /api/hitl/{id}/approve
// Retry the original call:
await client.callTool('call_service', {
  request: 'generate a 10-second product demo video',
  hitl_override_id: '550e8400-e29b-41d4-a716-446655440000',
});
```

## Webhook signature verification

All outbound webhooks include an `X-LITEBEAM-Signature` header (HMAC-SHA256 of the request body, signed with your `WEBHOOK_SIGNING_SECRET`). Verify before acting:

```typescript
import { createHmac } from 'crypto';

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
}
```
