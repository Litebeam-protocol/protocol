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
   * Parameters merged with AI-extracted params and passed directly to the
   * vendor. Useful for overriding or supplementing AI-extracted values.
   */
  params?: Record<string, unknown>;

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
