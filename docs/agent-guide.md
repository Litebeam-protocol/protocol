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

The first call to a capability is a **discovery** — pass `request` (natural
language) and litebeam runs full AI routing (a small inference fee, ~$0.001).
Every response includes a **`handle`** — a reusable address for the chosen
service:

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

### 4. Read the routing receipt

Every `call_service` result carries a machine-readable receipt so you can make
informed reuse decisions:

```json
"routing_receipt": {
  "selection": "ai",
  "confidence": { "score": 0.82, "level": "high", "reason": "…" },
  "considered": 7,
  "alternatives": [ { "name": "…", "provider": "…", "price_usdc": 0.003 } ],
  "cost_usdc": 0.0021
}
```

Also always present: `cost_usdc` (total charged), `vendor_cost_usdc` /
`litebeam_fee_usdc` (breakdown), `latency_ms`, `transaction_id`.

**When confidence is low**, litebeam will *not* silently invoke a likely-wrong
service. Instead it returns the interpreted intent plus the top candidate
handles and charges nothing. Pick one and re-call with its `service_id`, or
rephrase the request. A silent confident-wrong call is the failure mode this
prevents — treat a candidate list as litebeam asking you to choose.

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
- **Direct** — bring your own Base wallet, no signup. Call `get_quote` first to
  get the exact price and signing parameters, sign a USDC authorization, and
  pass it as `payment_auth`. litebeam quotes the price up front; budget is your
  responsibility.

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

---

## Tooling quick reference

| Tool | Use it to |
|------|-----------|
| `call_service` | Run one capability (by `request`, or by `service_id` to reuse a handle). |
| `list_services` | Browse/search the directory; each row has a `service_id` you can reuse. |
| `get_quote` | Direct mode: get price + signing params before paying. |
| `get_balance` | Managed mode: check wallet balance and deposit address. |
| `rate_result` | Rate a `transaction_id` to improve your routing. |
| `get_started` | Re-read this contract in-band. |
| `test_connection` | Confirm auth, wallet, and tools after setup. |
