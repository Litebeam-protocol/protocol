# x402 Client

The `@ag0ra/sdk/x402` package exports a standalone x402 micropayment client. Use it to call any x402-enabled endpoint directly, without going through ag0ra's routing layer.

ag0ra uses this same client internally. It's published here so the community can use it, audit it, and build on it.

## What is x402?

[x402](https://x402.org) is an HTTP micropayment protocol built on USDC and EIP-3009. The flow:

1. Client makes a request → server returns `HTTP 402` with a payment offer
2. Client signs a `TransferWithAuthorization` (EIP-3009) — no gas, instant
3. Client resubmits with `X-PAYMENT` header → server verifies on-chain and returns result

No wallet connect popups, no pending transactions from the client's perspective. The server calls `USDC.transferWithAuthorization()` on-chain to actually move funds.

## Installation

```bash
npm install @ag0ra/sdk viem
```

## Usage

```typescript
import { privateKeyToAccount } from 'viem/accounts';
import { settleX402 } from '@ag0ra/sdk/x402';

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
import { settleX402 } from '@ag0ra/sdk/x402';

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

Browse [agentic.market](https://agentic.market) for the full directory of x402-enabled services, or use the ag0ra service directory at [ag0ra.xyz/services.html](https://ag0ra.xyz/services.html).
