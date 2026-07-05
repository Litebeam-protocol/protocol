# API reference

The litebeam REST API is available at `https://litebeam.xyz/api`. All endpoints accept and return JSON. Authenticated endpoints require a session cookie (dashboard) or Bearer token (programmatic):

```
Authorization: Bearer sk-litebeam-your-key-here
```

Direct mode endpoints require no authentication — payment is via x402.

---

## Direct mode — service calls

For agents using their own Base wallet (no API key required).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/call` | Call a service. Body: `{ request \| capability \| service_id, params?, max_price_usdc?, validate? }` — `service_id` pins an exact vendor (deterministic, no routing fee). Without `X-Payment` header: returns `402` with the price offer `{ estimated_cost_usdc, routed_to, accepts: [...], extensions.bazaar }`; the bazaar extension carries the quoted service's `param_schema` and a worked example. With `X-Payment` header (base64-encoded EIP-3009 signed USDC transfer): executes and returns `{ result, routed_to, cost_usdc, tx_hash, latency_ms }`. Pinned calls are validated against the vendor schema BEFORE charging — missing required fields return a `400` teaching error with the schema attached, uncharged; `validate: false` skips. |
| `GET`/`POST` | `/api/recommend` | Ranked shortlist without executing or paying — the REST mirror of `call_service(mode: "recommend")`. `q` (GET) or `{ request }` (POST), optional `max_price_usdc`, optional `wallet` (links the discovery to your later payment). Free, rate-limited, no auth. Entries carry reputation, price estimate, latency p50, `cost_model`, and the full `param_schema` + `param_example`. Execute a pick via `POST /api/call` with its `service_id`. |
| `GET` | `/api/discover` | Discover available services. No auth required. Without params: category summary with counts and prices. With `q` (keyword) and/or `category` + `limit`: matching services list. |

---

## Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account. Body: `{ email, password }`. Sends verification email. |
| `POST` | `/api/auth/verify` | Verify email address. Body: `{ token }` from verification email. |
| `POST` | `/api/auth/resend-verification` | Resend verification email. Body: `{ email }`. |
| `POST` | `/api/auth/login` | Log in. Body: `{ email, password }`. Returns session cookie. |
| `POST` | `/api/auth/logout` | Invalidate session cookie. |
| `GET` | `/api/auth/me` | Return current session user + agent info. |
| `POST` | `/api/auth/forgot-password` | Request a password reset email. Always returns 200. |
| `POST` | `/api/auth/reset-password` | Complete password reset. Issues session on success. |

---

## Wallet

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/wallet` | Return wallet balance, budget controls, and recent transactions. |
| `PATCH` | `/api/wallet/controls` | Update budget controls. |
| `POST` | `/api/wallet/withdraw` | Withdraw USDC. Body: `{ to, amount_usdc }`. |
| `POST` | `/api/wallet/withdraw-eth` | Withdraw ETH. Body: `{ to, amount_eth }`. |
| `POST` | `/api/wallet/withdraw-token` | Withdraw any ERC-20. Body: `{ token, to, amount }`. |

---

## Transactions

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/transactions` | Paginated transaction history. Query params: `limit` (max 200), default 50. |

---

## HITL

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/hitl` | List HITL requests. Query param: `status` (pending / approved / rejected). |
| `GET` | `/api/hitl/:id` | Get a specific HITL request. Accessible to the owning agent or dashboard session. |
| `POST` | `/api/hitl/:id/approve` | Approve a pending HITL request. |
| `POST` | `/api/hitl/:id/reject` | Reject a pending HITL request. |

---

## Services

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/services` | Search service directory. Query: `q`, `protocol`, `status`, `category`, `limit`, `offset`. |
