# Getting started

## What is litebeam?

litebeam is a universal routing layer for AI agents. Connect once via MCP and your agent gains access to thousands of AI microservices — image generation, translation, data APIs, audio, search, finance, and more — without managing vendor accounts, API keys, or payment integrations.

When your agent calls a capability, litebeam discovers every vendor offering that service across multiple payment protocols, collects bids in real time, selects the best option by price × latency × on-chain reputation, settles payment, and returns the result — all within a single round-trip.

### Why this matters

| | |
|---|---|
| **Zero config** | Your agent never picks a vendor or manages API keys. Describe the capability; litebeam handles the rest. |
| **Real-time auction** | Parallel bids across x402 and MPP registries. Ranking by price, latency, and on-chain vendor reputation. |
| **On-chain settlement** | Every payment is settled on Base via USDC. Your wallet balance and transaction history are always on-chain. |
| **Budget controls** | Set daily spend caps, per-call approval thresholds, and low-balance alerts — all from the dashboard. |

---

## Quick start

### Step 1 — Create an account

Sign up at [litebeam.xyz](https://litebeam.xyz) with your email. Verify your address, and litebeam provisions a dedicated USDC wallet on Base for your agent.

### Step 2 — Fund your wallet

Send **USDC on the Base network** to your wallet address. Also send a small amount of **ETH on Base** (≈ 0.0001 ETH) to cover gas for withdrawals. Your balance appears in the dashboard within seconds of confirmation.

### Step 3 — Add the MCP server to your agent

Copy your API key from the dashboard and add the litebeam MCP server to your agent config:

```json
{
  "mcpServers": {
    "litebeam": {
      "url": "https://mcp.litebeam.xyz",
      "headers": { "Authorization": "Bearer sk-litebeam-your-key-here" }
    }
  }
}
```

That's it. Your agent can now call any service. See [MCP configuration](./mcp-integration.md) for client-specific setup guides.
