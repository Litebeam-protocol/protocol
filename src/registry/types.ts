/**
 * litebeam service registry types
 *
 * The registry is synced every 6 hours from agentic.market (x402) and
 * mpp.dev (MPP). Vendors are ranked by price × latency × reputation score.
 */

export type ServiceProtocol = 'x402' | 'mpp';

export type ServiceCategory =
  | 'image' | 'text' | 'audio' | 'data'
  | 'compute' | 'travel' | 'finance' | 'search' | 'code';

export type ServiceStatus = 'online' | 'slow' | 'offline';

export interface Service {
  id: string;
  name: string;
  provider: string;
  category: ServiceCategory;
  description: string;
  price_usdc: number;
  protocol: ServiceProtocol;
  endpoint: string;
  endpoint_method: string;
  status: ServiceStatus;
  /**
   * Reputation score (0–100). Starts at 80. Updated after every settled
   * transaction: +2 (fast success), +1 (normal success), −1 (slow success),
   * −5 (failure). Floored at 0, capped at 100.
   */
  reputation: number;
  last_seen: string;
  created_at: string;
  /**
   * AI-assessed quality score (0.0–1.0). Assigned during housekeeping sweeps.
   * null until the service has been reviewed.
   */
  quality_score: number | null;
  /**
   * Moderation status set by the litebeam housekeeping system or admin.
   * - `none`     — not reviewed
   * - `flagged`  — needs admin review
   * - `approved` — explicitly cleared
   * - `blocked`  — excluded from all routing
   */
  flag_status: 'none' | 'flagged' | 'approved' | 'blocked';
  flag_reason: string | null;
  /** Whether category was manually pinned (immune to registry re-sync overwrite) */
  category_pinned: boolean;
}

/**
 * A vendor candidate returned by the routing engine.
 * Ordered by composite score: lower price + higher reputation + online status.
 */
export interface RoutingCandidate extends Service {
  score: number;
}
