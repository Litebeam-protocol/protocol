# API reference

The litebeam REST API is available at `https://litebeam.xyz/api`. All endpoints accept and return JSON. Authenticated endpoints require a session cookie (dashboard) or Bearer token (programmatic).

```
Authorization: Bearer sk-litebeam-your-key-here
```

---

## Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account. Body: `{ email, password }`. Sends verification email. |
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
| `POST` | `/api/hitl/:id/approve` | Approve a pending HITL request. |
| `POST` | `/api/hitl/:id/reject` | Reject a pending HITL request. |

---

## Services

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/services` | Search service directory. Query: `q`, `protocol`, `status`, `category`, `limit`, `offset`. |
