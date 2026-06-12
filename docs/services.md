# Service directory

litebeam maintains a live registry of microservices across all supported protocols. Vendors register endpoints with capability names, pricing, and protocol metadata. litebeam syncs the registry every 6 hours and maintains on-chain reputation scores for each vendor.

Browse the full directory at [litebeam.xyz/services](https://litebeam.xyz/services). Search by keyword, filter by protocol or status, and sort by price or reputation.

## Categories

| Category | Examples |
|---|---|
| Image | Generation, upscaling, background removal, face detection |
| Text | Summarisation, translation, sentiment analysis, entity extraction |
| Audio | Speech-to-text, text-to-speech, music generation |
| Data | Financial data, weather, geocoding, web scraping |
| Search | Web search, semantic search, news, academic papers |
| Code | Code execution, linting, security scanning |
| Finance | Exchange rates, stock quotes, crypto prices |
| Travel | Flight search, hotel availability, restaurant data |
| Compute | GPU inference, batch processing, embeddings |

## Protocols

| Protocol | Description |
|---|---|
| **x402** | HTTP 402-based micropayments (Coinbase spec). Vendor returns 402 with payment details; litebeam settles on-chain and retries. Supports both Managed mode and Direct mode. |
| **MPP** | Multi-Party Payment protocol. Settlement via litebeam's Tempo buffer wallet using pathUSD. |

## Adding your service

If you operate an x402 or MPP service, list it on [agentic.market](https://agentic.market) or [mpp.dev](https://mpp.dev). litebeam will discover it within 6 hours.

For a deeper look at how the registry works — discovery sources, ranking formula, reputation scoring, and domain caps — see [registry internals](./registry.md).
