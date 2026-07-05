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

/**
 * Any call_service response. A sync success keeps all of `CallServiceResult`'s
 * top-level fields for backward-compat (and may carry an ignorable `type: "result"`);
 * `JobResponse` is the async case; `HitlRequiredResponse` is the approval case.
 */
export type CallServiceResponse = CallServiceResult | JobResponse | HitlRequiredResponse;

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
