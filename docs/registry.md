# Service Registry

litebeam maintains a live index of AI microservices discovered from public protocol directories. This document explains how services get in, how they're ranked, and how reputation works.

## Sources

| Source | Protocol | Sync frequency |
|---|---|---|
| [agentic.market](https://agentic.market) | x402 | Every 6 hours |
| [mpp.dev](https://mpp.dev) | MPP | Every 6 hours |

Services that haven't been seen in 2+ days are marked `offline`. They return to `online` on the next sync if they reappear.

## Categorisation

Each service is assigned one category:

| Category | Typical services |
|---|---|
| `image` | Stable Diffusion, DALL-E wrappers, Flux, Recraft, upscalers |
| `text` | Claude, GPT wrappers, translation, summarisation, classification |
| `audio` | Whisper, ElevenLabs, music generation, TTS |
| `search` | Brave Search, Exa, Perplexity, news APIs |
| `finance` | Crypto price feeds, DeFi data, trading APIs |
| `data` | Blockchain data, on-chain indexers, datasets |
| `compute` | Code execution, browser automation, GPU sandboxes |
| `travel` | Flight search, hotel APIs, maps, weather |
| `code` | Code generation, review, execution environments |

Category is inferred from the service name, provider, and description using the open-source `inferCategory()` function in [`src/registry/sync.ts`](../src/registry/sync.ts).

## Ranking

When routing a call, litebeam selects from matching services using a composite score:

```
score = (priceScore × 0.5 + reputationScore × 0.5) × statusMultiplier

priceScore     = 1 / (price_usdc + 0.001)   -- lower price → higher score
reputationScore = reputation / 100           -- 0–100 normalised
statusMultiplier = 1.0 (online) | 0.6 (slow) | 0.0 (offline)
```

The first ordered result (highest score) is the winner. The `candidates_evaluated` field in every response shows how many were considered.

## Reputation

Reputation starts at **80** for every new service. It updates after every settled transaction:

| Outcome | Delta |
|---|---|
| Fast success (< 500ms) | +2 |
| Normal success | +1 |
| Slow success (> 2000ms) | −1 |
| Failure / rejected payment | −5 |

Reputation is floored at 0 and capped at 100. Every delta is recorded in `reputation_events` for auditability. This dataset compounds with every call litebeam routes — vendors that consistently perform well rise in rankings, vendors that fail or respond slowly fall.

## Domain caps

To prevent catch-all gateway providers from flooding the index, litebeam caps how many endpoints it accepts from any single domain: **300 per sync cycle**. This keeps the index diverse and prevents a single operator from dominating search results.

## Adding your service

If you operate an x402 or MPP service, list it on [agentic.market](https://agentic.market) or [mpp.dev](https://mpp.dev). litebeam will discover it on the next sync cycle (within 6 hours).

If your service is miscategorised or you notice any issue with how it appears in the litebeam directory, open an issue or PR against the categorisation logic in [`src/registry/sync.ts`](../src/registry/sync.ts).
