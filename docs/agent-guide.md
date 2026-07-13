# Agent guide — using litebeam well

This is the **usage contract** for an agent (or its developer) once connected to
litebeam over MCP. For *connecting* a client (Claude Desktop, Cursor, Claude
Code, HTTP clients), see [MCP integration](./mcp-integration.md). The same text
is available in-band: call the `get_started` tool or read the `litebeam://guide`
MCP resource.

litebeam is a **capability linker** for AI agents: a single MCP connection to
thousands of microservices (image, text, data, crypto, finance, travel, audio,
search, code, video). You describe a capability you need; litebeam picks the
best service for it, pays, and returns the result. You never choose a vendor or
hold an API key.

The division of labor is the whole contract:

- **You plan the task.** Break your goal into individual capabilities.
- **litebeam resolves each capability.** It ranks services by price × latency ×
  on-chain reputation, calls the winner, and returns the result.

litebeam is a linker, **not** an orchestrator. It will not chain primitives into
a pipeline for you — that needs your goal context and is your job. It composes
multiple services only when a single advertised product does so internally.

---

## The five rules

### 1. One capability per call (atomic intents)
Send exactly one capability per `call_service`. A request that names two
capabilities ("translate this and then summarize it") should be **two calls**.
Atomic intents route accurately; compound intents mis-route. If you send a
compound request, litebeam may return a breakdown hint instead of a result —
split it and call each part.

### 2. Discover by intent, then address by handle
**For a NEW capability, use the `discover` tool.** `discover(request: "…")`
returns a ranked shortlist — `recommended` is litebeam's pick (taking it is
always a valid strategy), and every entry carries the `service_id` to execute
it. A small flat discovery fee applies (shown in the response) — it buys the
ranking itself: price × latency × verified on-chain reputation over the whole
catalog. When the catalog cannot serve the request, discover returns
`{"type": "no_coverage"}` and you are **not charged**: trust it. Entries
labeled `fit: "partial"` are adjacent capabilities, not answers — calling
them will not fulfil your request.

Passing `request` straight to `call_service` works too, with two outcomes:
if the request matches a service you have used or pinned before, it executes
there directly (the fast path — no fee beyond the call itself); otherwise the
call IS a discovery — it returns the same charged shortlist as `discover`
(litebeam never auto-spends your money on a vendor you have not chosen).
Every executed response includes a **`handle`** — a reusable address for the
chosen service:

```json
"handle": {
  "service_id": "…uuid…",
  "name": "…", "provider": "…", "category": "…",
  "protocol": "x402", "price_usdc": 0.002,
  "reuse_hint": "Pass this service_id to call_service to skip routing."
}
```

For every **repeat** of that capability, pass `service_id` (the handle) instead
of `request`. This skips AI routing entirely: no inference fee, deterministic,
faster. Store the handle for capabilities you call repeatedly — this is the
recommended pattern for production agents with known workflows.

### 3. Attach your constraints, not your reasoning
Pass machine constraints with the intent — litebeam enforces them:
- `max_price_usdc` — litebeam will not route above this price per call.
- `protocol` — force `x402` or `mpp`; omit to let litebeam choose.
- `params` — explicit parameters merged with litebeam's extracted ones.

Do not encode task logic in the request; describe the capability and bound it.

**Get params right before paying.** `get_quote(service_id: …)` returns the
vendor's published `param_schema` (JSON Schema), a working `param_example`, and
the HTTP `method` when the vendor publishes them (`param_guidance` docs text
otherwise). Pass params FLAT (e.g. `params: {"location": "Tokyo"}`) — litebeam
builds the vendor request. `call_service` validates your params against that
schema BEFORE charging: a call missing a required field is rejected with a
teaching error and you are NOT charged. Pass `validate: false` to send your
params as-is.

### 4. Read the routing receipt
Every `call_service` result carries a machine-readable receipt so you can make
informed reuse decisions:

```json
"routing_receipt": {
  "selection": "ai",          // ai | direct | score
  "confidence": { "score": 0.82, "level": "high", "reason": "…" },
  "considered": 7,
  "alternatives": [ { "name": "…", "provider": "…", "price_usdc": 0.003 } ],
  "cost_usdc": 0.0021
}
```

Also always present: `cost_usdc` (total charged), `vendor_cost_usdc` /
`litebeam_fee_usdc` (breakdown), `latency_ms`, `transaction_id`.

**Read `result_check` — litebeam's own verdict on what you paid for.** Every
paid result carries `result_check: {matched_intent, note?}`. When
`matched_intent` is `false`, the data likely does not answer your request:
STOP, re-discover, and do not escalate to another blind call — wrong-typed data
with an HTTP 200 is the classic way agents burn money. On a direct
`service_id` call the check is advisory (you chose the vendor; litebeam
executes as instructed) and runs only when you include `request` alongside —
include it.

**When confidence is low**, litebeam will *not* silently invoke a likely-wrong
service. Instead it returns `{"type": "candidates"}` — the interpreted intent
plus a ranked shortlist — and charges nothing. Pick one and re-call with its
`service_id`, or rephrase the request. A silent confident-wrong call is the
failure mode this prevents — treat a candidate list as litebeam asking you to
choose.

**Ask for the shortlist yourself with `discover`.** `discover(request)` never
executes: it returns `{"type": "candidates", "recommended": "…", "shortlist":
[...]}` ranked by reputation × price × latency, each entry carrying
`service_id` (the handle to execute it), `price_estimate_usdc` (an ESTIMATE —
the binding quote is the vendor 402 at invoke), `reputation`,
`latency_ms_p50`, `cost_model` (`single` | `submit+poll` | `escrow`, when
litebeam has observed it), and `required_params` when the vendor publishes a
schema. Inspect a pick with `get_quote(service_id)` (full param schema +
binding price), then execute with `call_service(service_id: …[, params])` —
that invoke hits exactly the vendor you picked, never re-routes, and returns
`{"type":"job"}` if the vendor is async. Managed keys pay the flat discovery
fee from balance; BYO wallets sign it via x402 (call once without `payment`
for the 402 quote). Use discover when you have more context than the router —
your own eval, downstream constraints, prior results — and want the pick
yourself.
The old `call_service` parameters `mode: "recommend"` and `capability` are
retired — the two-verb contract is live. Discovery is `discover`; execution is
`call_service(service_id: …)`; a request-only `call_service` outside your
chosen services returns the charged shortlist instead of auto-executing.

**HTTP-only clients get the same loop over REST** (no MCP needed — Base MCP,
x402-fetch, AgentKit): `GET https://litebeam.xyz/api/recommend?q=…&wallet=0x…`
answers 402 with x402 signing details for the same flat discovery fee —
re-request with the `X-PAYMENT` header to get the shortlist with full param
schemas embedded (honest `no_coverage` is never charged); execute a pick with
`POST /api/call {"service_id": …, "params": …}` — the 402 offer is
self-describing (its `extensions.bazaar` block carries the quoted service's
param schema + a worked example), and params are validated before you are
charged.

### 5. Rate results to improve your routing
After a call, `rate_result(transaction_id, rating: 1-5)` teaches litebeam which
services work for your account. Reuse (addressing by handle) and immediate
re-queries are also read as implicit signals, so good reuse habits feed back
into ranking automatically. Rating is optional but compounds.

---

## Payment modes (pick once)

- **Managed** — prepaid litebeam wallet, `Authorization: Bearer sk-litebeam-…`.
  litebeam draws per call from your USDC balance on Base. Budget controls
  (daily limit, approval threshold, low-balance alert) apply; a call above your
  approval threshold pauses for human approval and returns a request id.
- **Direct** — bring your own wallet, no signup. Call `get_quote` first to get
  the exact price and signing parameters, sign a stablecoin transfer
  authorization (EIP-3009 — gasless for you), and pass it as `payment_auth`.
  litebeam quotes the price up front; budget is your responsibility.
  Networks: USDC on Base (default) and USDG on Robinhood Chain
  (`network: "robinhood"`).

### Paying from Robinhood Chain (USDG)

litebeam accepts USDG on Robinhood Chain (chain id 4663) in Direct mode — same
flow as Base, different token and domain:

1. Fund any EVM wallet with USDG on Robinhood Chain (for example: buy USDG on
   Robinhood, withdraw to your self-custody wallet). You need NO ETH — payments
   are gasless for the payer.
2. `get_quote(request: "…", network: "robinhood")` → returns `token_address`,
   `chain_id: 4663`, and the exact EIP-712 domain to sign:
   `{ name: "Global Dollar", version: "1", chainId: 4663,
      verifyingContract: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" }`
3. Sign the `TransferWithAuthorization` and pass it as `payment_auth`,
   **including `network: "robinhood"`** — omitting it verifies against Base and
   fails.

Plain-HTTP agents: the 402 offer from `POST https://litebeam.xyz/api/call`
lists an `eip155:4663` entry in `accepts`; any standard x402 client can select
it and pay with the `X-PAYMENT` header (`network: "eip155:4663"`).

---

## Worked examples (principles, not an algorithm)

**A. Repeat work → discover once, address by handle.**
```
call_service(request: "get the current ETH price")
  → result + handle.service_id = "abc-…"
// next time, skip routing:
call_service(service_id: "abc-…")
```

**B. A goal with two capabilities → two atomic calls (you plan, litebeam links).**
```
// Goal: "make a product image and translate the tagline to French."
call_service(request: "generate a product photo of a ceramic mug")   // capability 1
call_service(request: "translate 'Brewed for mornings' to French")    // capability 2
// You decide the order and how the outputs combine — that is planning, your job.
```

**C. Bound the cost, force a protocol.**
```
call_service(request: "transcribe this audio clip",
             max_price_usdc: 0.01, protocol: "x402")
```

**D. A long job → submit, then resume by handle (don't re-send the request).**
```
call_service(request: "generate a 5-second video of a hamster")
  → { "type": "job", "job_handle": "job_…", "poll_after_ms": 3000 }
// wait poll_after_ms, then resume the SAME job — never re-send the request:
call_service(job_handle: "job_…")
  → { "type": "result", "result": { "video_url": "…" } }
```

---

## Async jobs (long-running work)

Some services can't finish inside one response (video, long compute). When that
happens `call_service` returns a **job** instead of a result:
```
{ "type": "job", "job_handle": "job_…", "status": "running",
  "poll_after_ms": 3000, "cost_usdc": 0.05, "transaction_id": "…" }
```
- **Resume by handle.** Call `call_service(job_handle: "job_…")` to poll/fetch. It
  returns `{type:"job"}` while still running (wait `poll_after_ms`, then call again)
  and `{type:"result"}` when done. Resuming hits the **same vendor** that started the
  job — it never re-routes.
- **Never re-send the original `request` to "check status."** That starts NEW work
  on a possibly different vendor and charges you again. Resume only by `job_handle`.
- You pay once, at submit (`cost_usdc`); status polls are free. `get_quote(job_handle)`
  confirms a resume is free.
- Fast calls are unaffected — they still return `{type:"result"}` inline. You only get
  a job when the work genuinely won't fit in one response.

---

## Tooling quick reference

| Tool | Use it to |
|------|-----------|
| `discover` | Find services for a NEW capability: ranked shortlist + `recommended`, honest `no_coverage` (uncharged), small flat fee. |
| `call_service` | Run one capability (`request`), reuse a vendor (`service_id`), or resume a long job (`job_handle`). |
| `list_services` | The phone book: keyword/category browse or fetch-by-`service_id` (free). Intent matching lives in `discover`. |
| `get_quote` | Get price + signing params before paying (Direct mode) — plus the vendor's `param_schema` + `param_example` when published. |
| `get_balance` | Managed mode: check wallet balance and deposit address. |
| `rate_result` | Rate a `transaction_id` to improve your routing. |
| `test_connection` | Confirm auth, wallet, and tools after setup. |

Connection/client setup (Claude Desktop, Cursor, Claude Code, HTTP clients) is a
separate document: `GET https://mcp.litebeam.xyz/agent-setup`.

— litebeam 0.7.3 · https://litebeam.xyz/docs
