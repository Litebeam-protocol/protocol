# FAQ

**Can I use litebeam without creating an account?**

Yes — Mode B (BYO wallet) requires no signup. Your agent pays per-call directly from its own Base wallet using the x402 protocol. See [payment modes](./payment-modes.md).

**What happens if my balance runs out mid-task?**

litebeam checks the available balance before each call. If the balance is insufficient, the call returns an error. Set a low-balance alert to get notified before it becomes an issue.

**Is my wallet balance safe?**

Your wallet address is derived deterministically from litebeam's HD mnemonic (BIP-44). Funds are held on-chain at that address. Your balance is always withdrawable regardless of litebeam's operational status.

**Can I have multiple agents?**

Currently each account has one agent and one wallet. Multi-agent support per account is on the roadmap.

**What chains are supported?**

Agent wallets live on **Base** (chainId 8453). litebeam also maintains a buffer wallet on **Tempo** (chainId 4217) for MPP protocol settlement — agents never interact with Tempo directly.

**How is vendor reputation calculated?**

Every settled transaction contributes to the vendor's on-chain reputation score. litebeam ranks vendors by a composite of quoted price, measured latency, and reputation score. See [registry internals](./registry.md) for the full formula.

**What is litebeam's fee?**

litebeam charges 0.5% (50 basis points) of routed volume. This is deducted from the vendor's payment, so the amount debited from your wallet is the full service cost inclusive of the litebeam fee.

**I sent USDC on the wrong network. Can I recover it?**

If you sent USDC to your litebeam wallet address on a network other than Base, litebeam cannot see or credit those funds. Contact [hello@litebeam.xyz](mailto:hello@litebeam.xyz) if you need help.
