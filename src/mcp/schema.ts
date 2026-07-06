/**
 * litebeam MCP tool schemas
 *
 * Type definitions for the litebeam MCP server's tools.
 * Import these for type-safe integration in TypeScript agents.
 */

// ── call_service ──────────────────────────────────────────────────────────────

export interface CallServiceInput {
  /**
   * Natural language description of what you need. litebeam uses AI to classify
   * intent, find the best vendor, and format the call automatically.
   *
   * @example "translate this text to French: Hello, world"
   * @example "generate a photorealistic image of Mars at dusk"
   * @example "get the current ETH price in USD"
   */
  request?: string;

  /**
   * Explicit capability keyword. Skips AI routing — use when you know exactly
   * what you need and want to avoid the inference overhead charge.
   *
   * @example "image_generation"
   * @example "translation"
   * @example "web_search"
   */
  capability?: string;

  /**
   * Direct service UUID (from list_services, a prior result's `handle.service_id`,
   * or a quote). Bypasses AI intent routing entirely — no inference fee,
   * deterministic vendor.
   */
  service_id?: string;

  /**
   * Parameters merged with AI-extracted params and passed directly to the
   * vendor. Useful for overriding or supplementing AI-extracted values.
   * Pass params FLAT (e.g. `{ "location": "Tokyo" }`) — litebeam builds the
   * vendor request from them.
   */
  params?: Record<string, unknown>;

  /**
   * Default true. litebeam validates `params` against the vendor's published
   * schema BEFORE settling: a call missing a required field (or containing an
   * obvious typo of a known field) is rejected with a teaching error and is
   * NOT charged. Anything else warns and proceeds (`param_warnings` on the
   * result). Set false to skip validation and send params as-is.
   */
  validate?: boolean;

  /**
   * Maximum price per call in USDC. litebeam will not route to vendors above
   * this price. Omit to accept any price.
   */
  max_price_usdc?: number;

  /**
   * Force a specific payment protocol. Omit to let litebeam choose the best
   * available option.
   */
  protocol?: 'x402' | 'mpp';

  /**
   * UUID of an approved HITL (human-in-the-loop) request. Include this to
   * proceed after the agent owner has approved a high-cost call that exceeded
   * the configured approval threshold.
   */
  hitl_override_id?: string;

  /**
   * Resume a running async job. Pass the `job_handle` returned by a prior
   * call_service that responded with `{ type: "job" }`. litebeam polls/fetches the
   * job on the SAME vendor that started it — it never re-routes. Do not pass
   * `request`/`capability` alongside it; this is "resume this job", not "start new
   * work" (re-sending the request would start a fresh job on a possibly different
   * vendor and charge again).
   */
  job_handle?: string;

  /**
   * Default "auto": litebeam picks and executes the best service (when routing
   * confidence is low it returns `{ type: "candidates" }` instead of charging).
   * "recommend": no execution, no charge — returns a ranked shortlist
   * (`CandidatesResponse`).
   *
   * DEPRECATED (litebeam/0.7.0): prefer the `discover` tool — same shortlist
   * plus an explicit `recommended` pick and an honest `no_coverage` abstain,
   * for a small flat fee credited back when you execute a listed candidate.
   * mode:"recommend" will retire with the two-verb contract flip.
   */
  mode?: 'auto' | 'recommend';
}

export interface CallServiceResult {
  /** The vendor's response data */
  result: unknown;
  /** Name of the vendor that served the request */
  routed_to: string;
  /** Vendor's domain or provider name */
  provider: string;
  /** Payment protocol used */
  protocol: 'x402' | 'mpp';
  /** Total cost charged to the agent's wallet (vendor cost + litebeam fee) */
  cost_usdc: number;
  /** Amount paid to the vendor */
  vendor_cost_usdc: number;
  /** litebeam's routing fee margin (cost_usdc − vendor_cost_usdc) */
  litebeam_fee_usdc: number;
  /** The vendor endpoint that was called */
  vendor_endpoint: string;
  /** End-to-end latency in milliseconds */
  latency_ms: number;
  /** Number of vendor candidates evaluated before selecting the winner */
  candidates_evaluated: number;
  /** Whether AI routing was used (vs. explicit capability) */
  ai_routed: boolean;
  /**
   * litebeam/0.7.0: litebeam's own relevance verdict on the paid result.
   * `matched_intent: false` means the data likely does not answer your request —
   * stop and re-discover; do not escalate to another blind call. On direct
   * service_id calls this is ADVISORY and runs only when `request` was included.
   */
  result_check?: { matched_intent: boolean; note?: string };
  /** Agent-guide version — diff against your snapshot; re-read get_started when it moves. */
  guide_version?: string;
  /**
   * litebeam/0.7.0: set when a request-only call executed via the prior-pick
   * fast path — this vendor is one YOU chose before (pin / pref / discovery pick).
   */
  fastpath?: { matched_from: 'prior_pick'; service: string; similarity: number };
  /**
   * Reusable handle for the service that served this request. Pass `handle.service_id`
   * back as `service_id` on a later call_service to address this exact service directly
   * — no AI routing, no routing fee. Discover by intent once; reuse by handle thereafter.
   */
  handle?: ServiceHandle;
  /**
   * Advisory schema findings from pre-charge param validation (type mismatches,
   * unknown fields, enum violations). The call proceeded anyway — only missing
   * required fields / typo-class violations block, and those are never charged.
   */
  param_warnings?: string[];
}

export interface ServiceHandle {
  /** Stable id — pass as `service_id` to call_service to skip routing */
  service_id: string;
  /** Vendor name */
  name: string;
  /** Vendor domain or provider name */
  provider: string;
  /** Service category */
  category: string;
  /** Payment protocol */
  protocol: string;
  /** Vendor price in USDC (excludes litebeam fee) */
  price_usdc: number;
  /** Human-readable hint describing how to reuse this handle */
  reuse_hint: string;
}

// ── get_quote ─────────────────────────────────────────────────────────────────

export interface GetQuoteInput {
  /** Natural language description of what you need (AI-routed quote). */
  request?: string;
  /** Direct service UUID — quotes exactly this service, no routing. */
  service_id?: string;
  /** Capability keyword (e.g. "image_generation"). */
  capability?: string;
  /** Maximum price per call in USDC. */
  max_price_usdc?: number;
  /** Force a specific payment protocol. */
  protocol?: 'x402' | 'mpp';
  /** Quote a resume of a running async job (always free — status polls cost nothing). */
  job_handle?: string;
}

/**
 * A quote never executes or charges. Direct-mode agents sign the returned value;
 * all agents can use the param fields to construct correct params BEFORE paying.
 */
export interface GetQuoteResult {
  /** Total cost of the call in USDC (vendor price + litebeam fee). */
  estimated_cost_usdc: number;
  /** Amount to sign, in micro-USDC (6 decimals), as a string. */
  value: string;
  /** litebeam operator address — the `to` of the USDC TransferWithAuthorization. */
  operator_address: string;
  /** USDC contract address on Base. */
  usdc_address: string;
  network: 'base';
  chain_id: 8453;
  valid_after: string;
  valid_before: string;
  valid_for_seconds: number;
  /** Name of the service that would serve this call. */
  service: string;
  provider: string;
  /**
   * HTTP verb the vendor's endpoint expects, when known (probe-observed or
   * registry-listed).
   */
  method?: string;
  /**
   * The vendor's published parameter schema (JSON Schema for the FLAT params
   * object you pass to call_service), when the vendor publishes one via the
   * x402 bazaar extension. Fields in `required` must be present or call_service
   * rejects before charging (see CallServiceInput.validate).
   */
  param_schema?: Record<string, unknown>;
  /** A working example params object observed from the vendor, when available. */
  param_example?: Record<string, unknown>;
  /** Vendor docs excerpt describing the endpoint, when no structured schema exists. */
  param_guidance?: string;
  /** How to pass params (present when param_schema is). */
  params_note?: string;
  /** Step-by-step EIP-3009 signing instructions for Direct mode. */
  signing_instructions: string;
}

// ── async jobs ──────────────────────────────────────────────────────────────────

/** Normalized job status. Terminal = succeeded | refunded | expired | rejected | failed. */
export type JobStatus =
  | 'pending'      // accepted, not yet running
  | 'running'      // in progress
  | 'needs_input'  // blocked on the agent (reserved)
  | 'succeeded'
  | 'refunded'     // escrow returned (reserved for x402)
  | 'expired'
  | 'rejected'
  | 'failed';

/**
 * Returned by call_service when the vendor cannot finish inside one response
 * (e.g. video generation, long compute). The submit was already charged
 * (`cost_usdc`). Resume by calling `call_service({ job_handle })` until it returns
 * a `{ type: "result" }` payload; resuming polls the SAME vendor and never
 * re-routes. Status polls are free. A fast call returns a result inline as usual —
 * you only receive a job when the work genuinely will not fit in one response.
 */
export interface JobResponse {
  type: 'job';
  /** Opaque handle — pass back as `call_service({ job_handle })` to poll/fetch. */
  job_handle: string;
  /** Normalized job status (terminal statuses end the job). */
  status: JobStatus;
  /** Vendor that took the job — the same one every resume hits. */
  vendor_name: string;
  /** Suggested wait, in ms, before the next poll. */
  poll_after_ms: number;
  /** Submit cost — already charged at submit. */
  cost_usdc: number;
  /** Transaction id for the submit. */
  transaction_id: string;
  /** Optional progress 0–100 when the vendor exposes it. */
  progress?: number;
}

// ── recommendation shortlist ─────────────────────────────────────────────────

/**
 * One ranked option in a shortlist. `fulfillment` + `cost_model` let async/escrow
 * vendors sit in the same list as sync x402 vendors.
 */
export interface ShortlistEntry {
  /** Stable id — execute this entry with call_service(service_id). */
  service_id: string;
  vendor_name: string;
  /** What the service does (truncated description). */
  what: string;
  /** 0–100. Verifier-sourced clean reputation when available. */
  reputation: number;
  /** Median observed latency over the last 30 days; null when unobserved. */
  latency_ms_p50: number | null;
  protocol: string;
  /** ESTIMATE — the binding quote is the vendor's 402 at invoke (use get_quote). */
  price_estimate_usdc: number;
  /** 'litebeam' = litebeam settles for you; 'self_serve' = you run it (e.g. ACP). */
  fulfillment: 'litebeam' | 'self_serve';
  /**
   * How this vendor charges, LEARNED from observed settlements — omitted for
   * vendors litebeam has not settled with yet. 'submit+poll' vendors return
   * `{ type: "job" }` when invoked.
   */
  cost_model?: 'single' | 'submit+poll' | 'escrow';
  /** Service handle — same value as service_id. */
  handle: string;
  /** Required param names, when the vendor publishes a schema (full schema via get_quote). */
  required_params?: string[];
  /** True when get_quote(service_id) will return a full param_schema. */
  param_schema_available?: boolean;
  /**
   * Relevance-floor label (litebeam/0.7.0). 'match' passed the floor; 'partial'
   * failed it and appears only under `nearest` — an adjacent capability, NOT an
   * answer. Calling a partial will not fulfil the request.
   */
  fit?: 'match' | 'partial';
  /** Why a 'partial' entry is not a match. */
  partial_note?: string;
}

/**
 * Returned by call_service(mode: "recommend"), and under mode "auto" when routing
 * confidence is below the threshold. Nothing was executed or charged. Pick an
 * entry and execute it via call_service(service_id) — that invoke hits exactly
 * the picked vendor and never re-routes.
 */
export interface CandidatesResponse {
  type: 'candidates';
  shortlist: ShortlistEntry[];
  /** What litebeam understood the ask to be (echoes your request in recommend mode). */
  interpreted_intent: string;
  /** litebeam's pick (rank 1's service_id) — taking it is always a valid strategy. */
  recommended?: string;
  /** Human/agent-readable instructions for what to do with the shortlist. */
  next_step?: string;
  /** discover tool only: the flat discovery fee charged for this shortlist. */
  discovery_fee_usdc?: number;
  /** discover tool only: whether the fee was actually collected. */
  charged?: boolean;
  /** discover tool only: conversion-credit terms — execute a listed candidate
   *  within `window_s` and the fee comes back. */
  credit?: { window_s: number; note: string };
  /** Agent-guide version — diff against your snapshot; re-read get_started when it moves. */
  guide_version?: string;
}

// ── discover (litebeam/0.7.0) ─────────────────────────────────────────────────

/**
 * Signed USDC TransferWithAuthorization (EIP-3009 / EIP-712) — Direct-mode
 * payment. Same shape as call_service's `payment_auth`. Sign for exactly the
 * quoted `value`, to the quoted `operator_address`.
 */
export interface X402PaymentAuth {
  /** Your wallet address (the signer). */
  from: string;
  /** Operator address from the quote. */
  to: string;
  /** Amount in micro-USDC (6 decimals) from the quote. */
  value: string;
  /** Unix seconds, typically now − 60. */
  validAfter: string;
  /** Unix seconds, typically now + 300. */
  validBefore: string;
  /** Random 32-byte hex (0x-prefixed), unique per authorization. */
  nonce: string;
  /** EIP-712 signature. */
  signature: string;
}

/**
 * The discovery verb: ranked shortlist for ONE capability, for a small flat fee
 * (credited back when you execute a listed candidate within the credit window).
 * Managed keys pay from balance; BYO wallets sign the fee via x402 — call once
 * without `payment` to receive `DiscoverPaymentRequired` with signing params.
 */
export interface DiscoverInput {
  /** One capability, natural language. One capability per discover call. */
  request: string;
  /** Drop candidates whose vendor price exceeds this. */
  max_price_usdc?: number;
  /** Shortlist size, 1–5 (default 5). */
  limit?: number;
  /** BYO wallet: signed USDC TransferWithAuthorization for the discovery fee. */
  payment?: X402PaymentAuth;
}

/**
 * Honest abstain: nothing in the catalog provides the capability. NEVER charged.
 * `nearest` entries are labeled `fit: "partial"` — adjacent capabilities shown
 * for orientation only; calling them will not fulfil the request.
 */
export interface NoCoverageResponse {
  type: 'no_coverage';
  interpreted_intent: string;
  why: string;
  nearest: ShortlistEntry[];
  charged: false;
  guide_version?: string;
}

/** BYO wallet 402 for the discovery fee — sign exactly `value` and re-call with `payment`. */
export interface DiscoverPaymentRequired {
  type: 'payment_required';
  discovery_fee_usdc: number;
  /** Fee in micro-USDC (6 decimals) — sign exactly this. */
  value: string;
  operator_address: string;
  usdc_address: string;
  network: 'base';
  chain_id: 8453;
  valid_after: number;
  valid_before: number;
  note: string;
}

export type DiscoverResponse = CandidatesResponse | NoCoverageResponse | DiscoverPaymentRequired;

/**
 * Any call_service response. A sync success keeps all of `CallServiceResult`'s
 * top-level fields for backward-compat (and may carry an ignorable `type: "result"`);
 * `JobResponse` is the async case; `CandidatesResponse` is the shortlist case
 * (recommend mode / low confidence); `HitlRequiredResponse` is the approval case.
 */
export type CallServiceResponse = CallServiceResult | JobResponse | CandidatesResponse | HitlRequiredResponse;

// ── list_services ─────────────────────────────────────────────────────────────

export type ServiceCategory =
  | 'image' | 'text' | 'audio' | 'data'
  | 'compute' | 'travel' | 'finance' | 'search' | 'code';

export interface ListServicesInput {
  category?: ServiceCategory;
  protocol?: 'x402' | 'mpp';
  search?: string;
  limit?: number;
}

export interface ServiceListing {
  id: string;
  name: string;
  provider: string;
  category: ServiceCategory;
  description: string;
  price_usdc: number;
  protocol: 'x402' | 'mpp';
  status: 'online' | 'slow' | 'offline';
  reputation: number;      // 0–100
  endpoint_count?: number; // when grouped
}

// ── HITL (human-in-the-loop) ──────────────────────────────────────────────────

/**
 * Returned by call_service when a call exceeds the agent's approval threshold.
 * The agent owner is notified and must approve before the call proceeds.
 */
export interface HitlRequiredResponse {
  /**
   * UUID to pass as `hitl_override_id` on the retry call after approval.
   * Poll `GET /api/hitl/{request_id}` to check status.
   */
  hitl_request_id: string;
  estimated_cost_usdc: number;
  capability: string;
  /** ISO timestamp after which the approval expires */
  expires_at: string;
}
