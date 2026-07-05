# x402 Client

`src/payment/x402-client.ts` is a standalone x402 micropayment client. Use it to call any x402-enabled endpoint directly, without going through litebeam's routing layer.

litebeam uses this same client internally. The source is published here so the community can use it, audit it, and build on it. Copy it into your project or use it as a reference.

## What is x402?

[x402](https://x402.org) is an HTTP micropayment protocol built on USDC and EIP-3009. The flow:

1. Client makes a request → server returns `HTTP 402` with a payment offer
2. Client signs a `TransferWithAuthorization` (EIP-3009) — no gas, instant
3. Client resubmits with `X-PAYMENT` header → server verifies on-chain and returns result

No wallet connect popups, no pending transactions from the client's perspective. The server calls `USDC.transferWithAuthorization()` on-chain to actually move funds.

## Using litebeam itself as an x402 merchant

litebeam's `POST https://litebeam.xyz/api/call` speaks this exact flow, so any x402 client (this one, Base MCP, x402-fetch, AgentKit) gets the full loop with no MCP connection:

1. **Discover** — `GET /api/recommend?q=<what you need>&wallet=0x<your addr>` (free, no key): ranked shortlist with `service_id`, reputation, price estimate, and each service's full `param_schema` + `param_example`.
2. **Quote** — `POST /api/call {"service_id": "<pick>"}` → `402`. The offer is self-describing: its `extensions.bazaar` block carries litebeam's input format with the quoted service's param schema nested at `body.params`, plus a worked example.
3. **Pay + execute** — resubmit with `params` and the `X-PAYMENT` header. Params are validated against the vendor schema **before** you are charged — missing required fields return a `400` teaching error (with the schema attached), uncharged. Pinned calls carry no routing/inference fee.

## Setup

```bash
npm install viem
```

Copy [`src/payment/x402-client.ts`](../src/payment/x402-client.ts) into your project, then import from it directly.

## Usage

```typescript
import { privateKeyToAccount } from 'viem/accounts';
import { settleX402 } from './x402-client.js';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');

const result = await settleX402({
  account,
  endpoint: 'https://api.example.com/generate',
  method: 'POST',
  params: {
    prompt: 'a red panda in the snow',
    width: 1024,
  },
});

console.log(result.data);            // vendor response
console.log(result.vendorCostUsdc);  // e.g. 0.001
console.log(result.latencyMs);       // end-to-end time
```

## With a mnemonic-derived wallet

```typescript
import { mnemonicToAccount } from 'viem/accounts';
import { settleX402 } from './x402-client.js';

const account = mnemonicToAccount('word1 word2 ... word12', { addressIndex: 0 });

const result = await settleX402({
  account,
  endpoint: 'https://api.example.com/search',
  method: 'GET',
  params: { q: 'latest AI research papers' },
});
```

## Options

```typescript
interface X402Options {
  account: Account;           // any viem Account
  endpoint: string;           // full URL of the x402 endpoint
  method?: string;            // default: 'POST'
  params?: Record<string, unknown>;
  rpcUrl?: string;            // default: 'https://mainnet.base.org'
}
```

## Result

```typescript
interface X402Result {
  data: unknown;          // vendor's response body
  vendorCostUsdc: number; // amount charged (from the 402 offer)
  txRef: string;          // X-PAYMENT-RESPONSE header or local nonce reference
  latencyMs: number;      // total round-trip time
}
```

## Requirements

- A Base mainnet wallet with USDC balance
- The endpoint must accept x402 payments with `scheme: "exact"` on Base (chainId 8453)

## Finding x402 services

Browse [agentic.market](https://agentic.market) for the full directory of x402-enabled services, or use the litebeam service directory at [litebeam.xyz/services](https://litebeam.xyz/services).
