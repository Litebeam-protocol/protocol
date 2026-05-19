/**
 * Example: BYO-wallet agent (Mode B — no ag0ra account needed)
 *
 * Demonstrates paying ag0ra directly via x402 using your own Base wallet.
 * No signup, no API key — just a wallet with USDC on Base.
 *
 * Prerequisites:
 *   npm install @ag0ra/sdk viem
 *
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx byo-wallet.ts
 */

import { privateKeyToAccount } from 'viem/accounts';
import { settleX402 } from '../src/payment/x402-client.js';

const AG0RA_CALL_ENDPOINT = 'https://ag0ra.xyz/api/call';

async function main() {
  const account = privateKeyToAccount(process.env['PRIVATE_KEY'] as `0x${string}`);
  console.log('Wallet:', account.address);

  // ag0ra's /api/call endpoint is itself an x402 server.
  // The settleX402 client handles the 402 → sign → resubmit flow automatically.
  const result = await settleX402({
    account,
    endpoint: AG0RA_CALL_ENDPOINT,
    method: 'POST',
    params: {
      capability: 'web_search',
      params: { q: 'x402 micropayment protocol' },
    },
  });

  console.log('Cost:', result.vendorCostUsdc, 'USDC');
  console.log('Latency:', result.latencyMs, 'ms');
  console.log('Result:', JSON.stringify(result.data, null, 2));
}

main().catch(console.error);
