# Payment modes

litebeam supports two payment modes. Both use the same MCP server and routing engine.

---

## Managed mode — litebeam wallet (recommended)

The default mode. Your agent is provisioned a dedicated USDC wallet address on Base. You deposit funds upfront; litebeam deducts per-request automatically. Every deduction is on-chain and auditable. Your balance is always withdrawable.

| Property | Detail |
|---|---|
| Network | Base (mainnet) |
| Currency | USDC (native Circle USDC) |
| Funding | Send USDC to your wallet address shown in the dashboard |
| Settlement | litebeam deducts per call; balance updates within seconds |
| Withdrawals | Any time, to any address — requires a small amount of ETH on Base for gas |
| Budget controls | Daily limit, HITL threshold, low-balance alerts |
| litebeam fee | 0.5% of routed volume (50 basis points) |

### Setup

1. Sign up at [litebeam.xyz](https://litebeam.xyz)
2. Copy your API key and wallet address from the dashboard
3. Send USDC on Base to your wallet address
4. Add the MCP server config — see [MCP integration](./mcp-integration.md)

---

## Direct mode — BYO wallet (no account needed)

For agents that already have a Base wallet (Coinbase AgentKit, CDP, or any Base-compatible wallet). No litebeam account required — your agent pays per-call directly using the x402 protocol.

When the agent calls a service, litebeam returns an HTTP 402 response with the price. The agent's wallet signs and submits payment; litebeam verifies it on-chain and fulfills the request. Funds stay in your wallet until the moment of payment.

| Property | Detail |
|---|---|
| Networks | Base (mainnet), Robinhood Chain (mainnet) |
| Currency | USDC on Base · USDG on Robinhood Chain — via x402 protocol |
| Signup required | No — just an EVM wallet holding either stablecoin |
| Payment flow | 402 response → agent signs → litebeam verifies → fulfills |
| Budget controls | Agent-side only |
| litebeam fee | Included in the quoted price |

### Networks

| Network | Token | Chain id | EIP-712 domain |
|---|---|---|---|
| Base (default) | USDC | 8453 | `{ "USD Coin", "2" }` |
| Robinhood Chain | USDG | 4663 | `{ "Global Dollar", "1" }` |

Select with `get_quote(network: "robinhood")` / `payment_auth.network` (MCP) or
by choosing the `eip155:4663` accepts entry (REST x402). Both tokens use 6
decimals; amounts are micro-units in both. Payments are gasless for the payer
on both networks (EIP-3009 `TransferWithAuthorization`).

> **Direct mode has no dashboard budget controls.** Your agent is responsible for its own spend limits. litebeam quotes the price upfront in the 402 response, so your agent can inspect cost before committing.

### Example

```
POST https://litebeam.xyz/api/call
{ "capability": "image_generation", "params": { "prompt": "..." } }
→ 402 + payment offer
→ POST with X-PAYMENT header
→ 200 + result
```

See the [x402 client](./x402-client.md) for a working implementation and the [BYO wallet example](../examples/byo-wallet.ts).
