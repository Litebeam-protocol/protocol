/**
 * litebeam x402 micropayment client
 *
 * A self-contained implementation of the x402 payment protocol
 * (https://x402.org) for Base mainnet USDC. Handles the full flow:
 *
 *   1. Make initial request → receive 402 + payment offer
 *   2. Sign EIP-3009 TransferWithAuthorization from your wallet
 *   3. Resubmit with X-PAYMENT header → receive 200 + result
 *
 * Works with any viem Account (private key, mnemonic-derived, hardware wallet, etc.)
 * No litebeam account required — this is the same client litebeam uses internally.
 *
 * @example
 * ```typescript
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { settleX402 } from '@litebeam/sdk/x402';
 *
 * const account = privateKeyToAccount('0x...');
 * const result = await settleX402({
 *   account,
 *   endpoint: 'https://some-x402-service.com/generate',
 *   method: 'POST',
 *   params: { prompt: 'a red panda in the snow' },
 * });
 * console.log(result.data);        // service response
 * console.log(result.vendorCostUsdc); // what was charged
 * ```
 */

import { createWalletClient, http, toHex, createPublicClient } from 'viem';
import { base } from 'viem/chains';
import type { Account } from 'viem';

// Base mainnet USDC (Circle native USDC)
const USDC_ADDRESS   = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;
const BASE_CHAIN_ID  = 8453;
const BASE_RPC_URL   = 'https://mainnet.base.org';

const USDC_VERSION_ABI = [{
  inputs: [], name: 'version',
  outputs: [{ name: '', type: 'string' }],
  stateMutability: 'view', type: 'function',
}] as const;

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',          type: 'address' },
    { name: 'value',       type: 'uint256' },
    { name: 'validAfter',  type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce',       type: 'bytes32' },
  ],
} as const;

export interface X402Result {
  /** The vendor's response body */
  data: unknown;
  /** How much USDC was actually charged (from the vendor's offer) */
  vendorCostUsdc: number;
  /** X-PAYMENT-RESPONSE header or a local reference if absent */
  txRef: string;
  /** Total round-trip time in milliseconds */
  latencyMs: number;
}

export interface X402Options {
  /** A viem Account — private key, HD wallet, or any signer */
  account: Account;
  /** Full URL of the x402-enabled endpoint */
  endpoint: string;
  /** HTTP method (default: POST) */
  method?: string;
  /** Request parameters — sent as JSON body (POST) or query string (GET) */
  params?: Record<string, unknown>;
  /** Override the Base RPC URL (defaults to mainnet.base.org) */
  rpcUrl?: string;
}

interface X402Offer {
  scheme: string;
  networkId?: string;
  maxAmountRequired: string;
  payToAddress: string;
  requiredDeadlineSeconds?: number;
  resource?: string;
}

interface X402Body {
  accepts?: X402Offer[];
  scheme?: string;
  networkId?: string;
  maxAmountRequired?: string;
  payToAddress?: string;
}

let _usdcVersionCache: string | null = null;
async function getUsdcVersion(rpcUrl: string): Promise<string> {
  if (_usdcVersionCache) return _usdcVersionCache;
  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
  _usdcVersionCache = await client.readContract({
    address: USDC_ADDRESS, abi: USDC_VERSION_ABI, functionName: 'version',
  }) as string;
  return _usdcVersionCache;
}

function encodePayment(p: object): string {
  return Buffer.from(JSON.stringify(p)).toString('base64');
}

/**
 * Execute a single x402 micropayment against any x402-enabled endpoint.
 *
 * If the endpoint returns 200 immediately (free tier / quota), returns
 * the response with `vendorCostUsdc: 0`.
 */
export async function settleX402(opts: X402Options): Promise<X402Result> {
  const { account, endpoint, params } = opts;
  const method   = (opts.method ?? 'POST').toUpperCase();
  const rpcUrl   = opts.rpcUrl ?? BASE_RPC_URL;
  const t0       = Date.now();

  const url = new URL(endpoint);
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: string | undefined;

  if (method === 'GET') {
    if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(params ?? {});
  }

  // ── 1. Initial request ──────────────────────────────────────────────────
  const initial = await fetch(url.toString(), { method, headers, body });

  if (initial.status !== 402) {
    if (initial.ok) {
      const data = await initial.json().catch(() => initial.text());
      return { data, vendorCostUsdc: 0, txRef: 'free', latencyMs: Date.now() - t0 };
    }
    throw new Error(`Endpoint returned ${initial.status}: ${await initial.text().catch(() => '')}`);
  }

  // ── 2. Parse payment offer ──────────────────────────────────────────────
  const body402 = await initial.json() as X402Body;
  const accepts  = body402.accepts ?? [body402 as unknown as X402Offer];
  const offer    = accepts.find(
    a => a.scheme === 'exact' && (!a.networkId || a.networkId === String(BASE_CHAIN_ID))
  );
  if (!offer?.payToAddress || !offer?.maxAmountRequired) {
    throw new Error('No compatible x402 offer found (need scheme=exact on Base)');
  }

  const vendorCostUsdc = Number(offer.maxAmountRequired) / 1e6;

  // ── 3. Sign EIP-3009 TransferWithAuthorization ──────────────────────────
  const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) });
  const version  = await getUsdcVersion(rpcUrl);
  const nonce    = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const now      = BigInt(Math.floor(Date.now() / 1000));
  const value    = BigInt(offer.maxAmountRequired);
  const deadline = BigInt(offer.requiredDeadlineSeconds ?? 300);

  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: 'USD Coin', version,
      chainId: BASE_CHAIN_ID,
      verifyingContract: USDC_ADDRESS,
    },
    types: EIP3009_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from:        account.address,
      to:          offer.payToAddress as `0x${string}`,
      value,
      validAfter:  now - 5n,
      validBefore: now + deadline,
      nonce:       nonce as `0x${string}`,
    },
  });

  // ── 4. Encode and resubmit with payment ────────────────────────────────
  const payment = {
    x402Version: 1,
    scheme: offer.scheme,
    networkId: offer.networkId ?? String(BASE_CHAIN_ID),
    payload: {
      signature,
      authorization: {
        from:        account.address,
        to:          offer.payToAddress,
        value:       value.toString(),
        validAfter:  (now - 5n).toString(),
        validBefore: (now + deadline).toString(),
        nonce,
        version,
      },
    },
    resource: offer.resource ?? endpoint,
  };

  const paid = await fetch(url.toString(), {
    method, body,
    headers: { ...headers, 'X-PAYMENT': encodePayment(payment) },
  });

  if (!paid.ok) {
    const errText = await paid.text().catch(() => '');
    throw new Error(`Vendor rejected payment (${paid.status}): ${errText.slice(0, 200)}`);
  }

  const data   = await paid.json().catch(() => paid.text());
  const txRef  = paid.headers.get('X-PAYMENT-RESPONSE') ?? `x402:${nonce.slice(0, 18)}`;

  return { data, vendorCostUsdc, txRef, latencyMs: Date.now() - t0 };
}
