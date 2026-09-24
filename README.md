# MintFaceoff

A tiny, shareable Solana token comparison app. Enter two token mint addresses to compare 24-hour volume, trades, market cap, price change, and liquidity. Copy a live link or save a PNG card. No wallet or account is required.

## Run locally

From this directory, run `python3 -m http.server 4180`, then open `http://localhost:4180/`.

This is a static site: `index.html`, `styles.css`, `app.js`, and `favicon.svg`. It uses the public [DEX Screener token endpoint](https://docs.dexscreener.com/api/reference). The browser fetches market data directly; there is no backend, tracking, wallet integration, or token contract.

## How the faceoff works

The app finds the most liquid Solana pair where each entered mint is the base token. Its activity meter displays each token's share of their combined 24-hour trading volume. The data can be delayed, incomplete, or unavailable. The meter is not a prediction, endorsement, or ranking of token quality.

## Limitations

- A token without a DEX Screener tracked Solana pair cannot be compared.
- Shared links reload the latest data, so the numbers may differ from a saved card.
- The static page depends on DEX Screener's public API availability and cross-origin access.
- The sample addresses are examples only; their market activity may change or disappear.

See [PLAN.md](./PLAN.md) for the product and launch plan.
