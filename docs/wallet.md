# Wallet

## Depositing funds

Your agent wallet address is shown in the [dashboard](https://litebeam.xyz/dashboard). To fund it:

**1. Send USDC on Base**

Only send **USDC on the Base network**. Do not send USDC on Ethereum mainnet, Polygon, or other chains — those funds cannot be recovered automatically.

**2. Send a small amount of ETH on Base**

Approximately **0.0001 ETH on Base** is enough for hundreds of withdrawals. This ETH covers on-chain gas fees when you withdraw.

**3. Balance appears in the dashboard**

litebeam monitors your wallet for incoming USDC transfers. Your displayed balance updates within one block confirmation (~2 seconds on Base).

> **Base network only.** Only send assets on the Base (chainId 8453) network to your litebeam wallet address. Tokens sent on other networks cannot be credited to your balance.

---

## Budget controls

Budget controls let you cap what your agent can spend without manual intervention. Configure them in the [dashboard](https://litebeam.xyz/dashboard) under Controls.

| Control | What it does | Default |
|---|---|---|
| **Daily spend limit** | Agent halts when this USDC amount is reached. Resets at UTC midnight. Set to 0 to disable. | Unlimited |
| **Approval threshold** (HITL) | Any single call estimated above this cost is paused and held for your approval. Set to 0 for full autopilot. | Off |
| **Low balance alert** | Sends a notification (email or webhook) when balance falls below this amount. Agent continues running. | $5 USDC |
| **Webhook URL** | Receives JSON events for HITL requests and low-balance alerts. HMAC-signed for verification. | None |
| **Alert email** | Receives email notifications for HITL requests and low-balance alerts. | None |

### Via the REST API

```typescript
await fetch('https://litebeam.xyz/api/wallet/controls', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer sk-litebeam-your-key-here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    daily_limit_usdc: 10.00,
    hitl_threshold: 1.00,
    low_balance_alert: 5.00,
    webhook_url: 'https://yourapp.com/webhooks/litebeam',
  }),
});
```

### Webhook signature verification

All outbound webhooks include an `X-LITEBEAM-Signature` header (HMAC-SHA256 of the request body). Verify before acting:

```typescript
import { createHmac } from 'crypto';

function verifyWebhook(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
}
```

---

## HITL approvals

Human-in-the-Loop (HITL) pauses high-cost calls for your review before payment is committed.

1. **Call is held** — the agent's call is queued. litebeam returns a pending ID to the agent instead of a result.
2. **You are notified** — via your configured webhook URL and/or alert email, including the capability, estimated cost, and pending ID.
3. **Approve or reject** — open the [dashboard](https://litebeam.xyz/dashboard); pending approvals appear in the Approvals section.
4. **Agent retries** — on approval, tell your agent to retry with the `hitl_override_id`. litebeam fulfills the call immediately.

```typescript
// The agent receives this instead of a result when HITL triggers:
{
  "hitl_request_id": "550e8400-e29b-41d4-a716-446655440000",
  "estimated_cost_usdc": 2.50,
  "capability": "video_generation",
  "expires_at": "2025-01-01T12:15:00Z"
}

// After approval, retry with:
await client.callTool('call_service', {
  request: 'generate a 10-second product demo video',
  hitl_override_id: '550e8400-e29b-41d4-a716-446655440000',
});
```

> HITL requests expire after **24 hours**. Expired requests are automatically rejected.

---

## Withdrawals

Withdraw any asset from your wallet at any time from the [dashboard](https://litebeam.xyz/dashboard).

| Type | Where to find it | Notes |
|---|---|---|
| **USDC** | Balance card → Withdraw row | Specify amount and destination address. |
| **ETH** | Balance card → Token & ETH recovery | For recovering ETH sent to your wallet address. |
| **Other ERC-20** | Balance card → Token & ETH recovery | Enter the token contract address, amount, and destination. |

> **Withdrawals are irreversible.** Always double-check the destination address before confirming.

Withdrawals require a small amount of ETH on Base for gas. Approximately 0.0001 ETH covers hundreds of withdrawal transactions.
