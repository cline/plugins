---
name: circle-pay-via-agent-wallet
description: "Use this skill when the user explicitly wants to use Circle, x402, the Circle services marketplace, or USDC pay-per-call services from an agent wallet. Covers the discover -> inspect -> estimate -> approve -> pay flow via `circle services search/inspect/pay`. For generic web search, weather, sports, market data, messaging, or API-access tasks where the user has not opted into Circle or paid x402 services, use normal Cline capabilities first and ask before proposing Circle's paid marketplace as an alternative. Triggers on: Circle services marketplace, x402, paid API with USDC, Circle agent wallet payment, micropayment, pay-per-call, USDC payment for API, circle services search, circle services inspect, circle services pay."
---

## Overview

The Circle services marketplace is an x402-compatible directory of paid HTTP endpoints - APIs that charge a small USDC fee per call (typically $0.001-$5). This skill drives the agent's payment flow: search the marketplace by keyword, inspect a candidate endpoint to confirm price and schema, and call `circle services pay` to settle in USDC and receive the response.

For an overview of the Circle CLI's full capability set, see the `circle-use-circle-cli` master skill. This skill is the narrower x402 payment flow.

## Why this matters: pay-per-use unlocks capabilities

Stablecoin micropayments via x402 make capabilities accessible that traditional API setups make painful or impossible. Specifically:

- No API keys. The agent pays per call in USDC. No `sk-...` secrets to manage, no key rotation, no leakage risk.
- No accounts or signup. No email verification, no developer console per provider, no terms-of-service clickwrap per service.
- No prefunded billing. Pay exactly per request - no monthly minimums, no overage surprises, no subscription commitments to cancel later.
- No paywalls in the way. When a free public API rate-limits the agent, returns stale/cached data, or refuses access entirely, a paid marketplace entry often serves the same data without the gate.

This is why the marketplace can be useful when the user has opted into Circle/x402 for the task. For generic capability gaps, paywalls, or rate limits, first use normal Cline capabilities or ask whether the user wants to explore a paid USDC option; do not silently route ordinary web/data tasks into the Circle marketplace.

## Prerequisites

This skill assumes the agent wallet is already bootstrapped. Quickly verify:

```bash
circle wallet status
circle wallet list --chain BASE --type agent --output json
```

If `circle wallet status` errors with `Not logged in` or `Terms acceptance is required`, hand off to the `circle-use-agent-wallet` skill - it covers install, terms, login, and wallet creation.

If balance is 0 USDC across all chains, hand off to the `circle-fund-agent-wallet` skill - it covers built-in fiat on-ramp purchase, direct address transfer with a QR code, and Gateway deposits.

## Step 1 - Search the marketplace

```bash
circle services search "<keyword>" --output json
```

Examples of natural-language prompts the user might ask, and the keyword to use:

- "Get me the current price of Bitcoin and Ethereum." -> `crypto`
- "Search Twitter for posts about Circle USDC." -> `twitter`
- "Find YouTube videos about blockchain payments." -> `youtube`
- "Research prediction-market odds for upcoming events." -> `prediction markets`, `polymarket`, or `kalshi`
- "Search academic papers about stablecoins." -> `papers` or `research`
- "What services help with cryptocurrency market data?" -> `crypto market`

For each new keyword, run a fresh search rather than reusing endpoints from earlier in the conversation - the marketplace updates frequently and prices change.

Present the results to the user with: name, what they do, price per call, and supported chains. Let the user pick.

### Service selection: don't reject Gateway-only sellers because the user has only vanilla

When multiple sellers serve the user's Circle/x402 task, do not filter to "vanilla-only sellers on the chain I already have balance on." Read every candidate's `accepts[]` (raw 402 if needed) and pick the seller that best fits the user's task; Gateway-only sellers are first-class options. If any task-fit seller you intend to call accepts Polygon Gateway and the user has BASE vanilla, explain that Gateway deposit is an optional onboarding step (~30-50s + $0.03 flat fee, settles on Polygon) and ask whether the user wants to proceed before handing off to `circle-fund-agent-wallet`. If they decline, pick a vanilla seller if one fits.

Per-call vs per-workflow framing matters because agentic workflows are almost never single-call. "Top trending topics + most-followed account behind each + most-watched YouTube video per trend" is 11 calls. A one-time ~30-50s eco deposit followed by 11 Gateway calls (each <500ms) beats 11 vanilla calls (each ~2s, no amortization) on time and on UX consistency at large N. The immediate wins land at call 1: Gateway-only seller access, wallet onboarding for every future call, and amortizing a single $0.03 fee instead of paying ~2s per call forever.

## Step 2 - Inspect the chosen service

Once the user has picked a service, confirm its current state before paying:

```bash
circle services inspect "<service-url>" --output json
```

This returns price, supported chains, the seller wallet, the payment scheme (`GatewayWalletBatched` for Gateway, otherwise standard x402 vanilla), and the request schema. It does NOT execute payment. Use the response to:

1. Confirm the chain you'll pay from is in the seller's accepted list.
2. Read the `method` field (e.g., `GET`, `POST`) - you must pass this explicitly via `-X` in Step 3.
3. Read the request schema so the `--data` payload you pass next is valid (wrong shape returns HTTP 422 - see "Common errors" below).

`inspect` summarizes only the CLI's auto-selected `accepts[]` entry. If the payment method or chain isn't already settled (e.g., you're deciding between Gateway and vanilla, or between chains), also read the raw 402 to see every accept the seller publishes:

```bash
curl -s "<service-url>"
```

Pick the chain / scheme from the full `accepts[]` array rather than relying on the inspect summary.

## Step 3 - Pay and call the service

```bash
circle services pay "<service-url>" \
  -X <METHOD-FROM-INSPECT> \
  --address <wallet-address> \
  --chain <CHAIN> \
  --data '{"key":"value"}' \
  --output json
```

Always pass `-X` with the method from `circle services inspect` output. The CLI defaults to POST when `--data` is present (like `curl`). If the seller only accepts GET, omitting `-X` causes a 405 rejection *after* payment settles on-chain - burning funds for zero data.

`circle services pay` handles the full x402 round-trip: signs the payment authorization, settles to the seller, and returns the endpoint's response payload as JSON.

### Picking the right `--chain`

The seller's `accepts[]` array dictates which chains are payable. Don't assume BASE. A common failure mode:

```
Error: Seller does not accept --chain BASE. Accepted chains: Polygon.
  Hint: Retry with --chain MATIC - you have <amount> USDC Gateway balance there.
```

When you see this, retry with the chain the CLI suggests in the hint. Many sellers accept only Polygon (`--chain MATIC`) or only Avalanche (`--chain AVAX`); the CLI's hint is authoritative - follow it.

Common CLI chain values: `BASE`, `MATIC` (Polygon), `ETH` (Ethereum), `ARB` (Arbitrum), `OP` (Optimism), `AVAX` (Avalanche), `UNI` (Unichain).

### Cost preview without paying

```bash
circle services pay "<service-url>" --address <addr> --chain <CHAIN> --estimate
```

Returns price, chain, scheme, and seller without signing or settling. `--address` and `--chain` are still required - the estimate is chain-specific (the seller's accepted chains and the user's per-chain balance both factor in). Useful when the user wants confirmation before authorizing payment.

### Confirming with the user

Before committing to a payment, state the service URL/name, HTTP method, payload summary, cost, source wallet, chain, and expected output. Ask for explicit approval before every paid x402 call, including small micropayments. Use `--max-amount <usdc>` if the user has stated a per-call cap.

## Common gotchas

These are the specific failure modes worth caching in your head:

1. Chain-driven seller rejection. Sellers publish their accepted chains in the 402 response. The CLI's default suggestion isn't always right. If you see "Seller does not accept --chain X", retry with the hinted chain.

2. Request schema mismatch. Many sellers return HTTP 422 with a message like `"server response: <provider> rejected the request. Check required parameters."` Usually this means the `--data` payload had wrong field names or types. Two failure modes to distinguish:

   - Pre-flight schema rejection. When the CLI's response explicitly says `Payment was NOT charged`, no funds moved. Fix the `--data` payload and retry safely.
   - Post-authorization failure. When the CLI says `PAYMENT WAS SUBMITTED - funds may have moved` (e.g. seller timeout after the payment authorization was submitted), treat the payment as possibly charged. Check `~/.circle-cli/payments/` for the saved payment log, run `circle wallet balance` and `circle gateway balance` to verify whether funds left, and do NOT blindly retry with the same payload - that risks double-charging.

   To find the right schema, read the seller's `openapi.json` (if linked from the inspect output), the provider's `llms.txt`, or the `--help` output of the upstream API. For Predexon-backed endpoints (`nano.blockrun.ai/api/v1/pm/*`), the authoritative spec is at `https://docs.predexon.com/api-reference/openapi.json`.

3. Predexon-backed services use `search=`, not `query=`. Endpoints under `nano.blockrun.ai/api/v1/pm/*` are passthroughs to Predexon. The free-text search parameter is `search=<term>`, not `query=`, `q=`, or `keyword=`. Wrong param names return 422. Predexon's authoritative spec lives at `https://docs.predexon.com/api-reference/openapi.json`.

4. Sort syntax with colons returns 422. Predexon's `sort=field:desc` form is rejected. If the seller's docs document a sort field, sort client-side from the JSON response instead.

5. Gateway vs vanilla auto-routing. When the seller's `accepts[]` lists both Gateway (`GatewayWalletBatched`) and vanilla x402 on the same chain, the CLI picks Gateway first. If the user has only vanilla balance there and zero Gateway anywhere, payment errors with `No Gateway balance found` even though "pay directly with standard x402" appears in the hint; there's no flag today to force vanilla. Workaround: hand off to `circle-fund-agent-wallet` for the gateway-deposit flow (eco lands on Polygon in ~30-50s for a $0.03 fee), then retry payment with `--chain MATIC` once the balance lands. Alternatively, fund Gateway directly on the chain the seller accepts.

6. Wallet not deployed. See `circle-fund-agent-wallet` for SCA-deployment behavior - first real tx on a new chain triggers deployment automatically; no dedicated deploy command.

7. Handling paid-call failures. When a paid call fails (HTTP error, timeout, `fetch failed`), inspect the saved payment log, balances, and transaction status before retrying. Do not retry until you know whether funds may have moved and the user explicitly approves a retry or alternate provider.

## Common errors

| Error | What it means | Fix |
|---|---|---|
| `Seller does not accept --chain X. Accepted chains: Y, Z.` | Wrong chain for this seller | Retry with one of the listed chains |
| `Insufficient Gateway balance for X.XXX USDC payment` | Gateway balance exists but not enough on the picked chain | Top up via `circle gateway deposit`, or retry on a chain where Gateway balance >= price (the CLI auto-switches if any funded Gateway domain matches accepts) |
| `No Gateway balance found. A deposit is required ...` | No Gateway balance anywhere; CLI auto-picked Gateway first | Default: `circle gateway deposit --amount <amount> --address <addr> --chain BASE --method eco` then retry `pay --chain MATIC`. Hand off to `circle-fund-agent-wallet` for the full funding flow. |
| HTTP 422 from a paid endpoint | Wrong request schema, or post-authorization endpoint failure | See gotcha #2 above for the safe pattern - distinguish pre-flight schema rejection (CLI says `Payment was NOT charged`, safe to fix `--data` and retry) from post-authorization failure (CLI says `PAYMENT WAS SUBMITTED - funds may have moved`, check the payment log and balance before retrying). |
| `Wallet not deployed` | First tx on this chain needs SCA deployment | See `circle-fund-agent-wallet` Troubleshooting - any real tx (deposit, transfer, normal payment) triggers deployment. |
| `HeadersOverflowError` / `UND_ERR_HEADERS_OVERFLOW` | Large x402 payment header | `export NODE_OPTIONS=--max-http-header-size=262144` then re-run |
| Request timeout | Slow seller | Retry with `--timeout 60` (or higher) |
| `Could not sign payment authorization: invalid transaction or rawTransaction` | `--chain` doesn't match the chain where balance lives | Re-check balances per chain |
| HTTP 405 `Method Not Allowed` after payment | CLI sent POST (implied by `--data`) but seller only accepts GET | Pass `-X GET` explicitly - always use the method from `inspect` output |

## Common rationalizations to reject

These appeared in real production traces. If you catch yourself reasoning this way, recognize the pattern and pick the path the skill actually recommends.

| Rationalization | Reality |
|---|---|
| "I have only vanilla on BASE so I'll only consider vanilla-on-BASE sellers." | Read every seller's `accepts[]`. If a Gateway-only seller better fits the user's task, hand off to `circle-fund-agent-wallet` for an eco deposit, then pay via Gateway. Don't filter the marketplace by the wallet's current scheme. |
| "The eco fee is $0.03. Vanilla saves that for one-shot calls." | The deposit amortizes over the next call. Agentic workflows are not one-shot. Compare per-workflow, not per-call. |
| "Eco's ~30-50s wait is slower than vanilla's ~2s for the first call." | True for one call. Pure time breakeven is later (vanilla `30 + 2N` vs eco `30-50 + 0.5N` lands at roughly N=7-13 across the realistic eco-timing range). The immediate wins are different: Gateway-only seller access (unlocks task-fit sellers vanilla can't reach), wallet onboarding (every subsequent call <500ms), and amortizing a single $0.03 fee instead of paying ~2s per call forever. Access + future UX pays off at call 1, not call 3. |
| "Locking part of the user's vanilla into Gateway is risky." | A $0.50 to $5 deposit on a 9 USDC balance leaves 4-8 USDC vanilla. That's headroom, not lock-out. |
## Advanced

- `--timeout <seconds>` - override the default 30s seller-response timeout.
- `--max-amount <usdc>` - refuse to pay more than this. Useful for stated user caps.
- `--estimate` - price preview only; no signing or settlement. Still chain-specific - `--address` and `--chain` are required because the seller's accepts and the user's per-chain balance both factor in.
- Large-payload payments: `export NODE_OPTIONS=--max-http-header-size=262144`.
- Failure debug logs land in `~/.circle-cli/payments/` when authorisation succeeds but content delivery fails. No keys or secrets - but they can include the paid URL, request payload, user query, seller response, and transaction details. Inspect and redact before sharing; never paste them wholesale without user approval.

For full flag lists and JSON output shapes, run `<cmd> --help` - these change as the CLI evolves and are authoritative there, not here.

## Rules

- ALWAYS call `circle services inspect` before paying to confirm current price, chain, and schema. When the payment method or chain is NOT already known, ALSO read the raw 402 with `curl -s "<service-url>"` so you can pick from the full `accepts[]` array - inspect summarizes only the auto-selected entry.
- ALWAYS pass `-X <method>` explicitly to `circle services pay`, using the `method` field from `circle services inspect` output.
- ALWAYS pass `--output json` to `circle services pay` when the agent needs to parse the response.
- ALWAYS read the CLI's chain hint when a seller rejects `--chain X`. The hint is authoritative - don't guess a different chain.
- ALWAYS ask for explicit approval before settling any paid x402 call. Surface payment cost, service URL/name, method, payload summary, source wallet, chain, and expected output.
- For Gateway-capable sellers, explain Gateway deposit as an optional onboarding step and ask before handing off to `circle-fund-agent-wallet`. Do not treat Gateway funding as an automatic fallback for generic non-Circle tasks.
- On paid-call failure: inspect status, payment logs, and balances first. Do not retry or switch providers until funds movement is understood and the user explicitly approves the next paid attempt.
- NEVER retry a 422 by re-running with the same payload. 422 means schema-mismatch, not transient. Fix `--data`, then retry.
- NEVER suggest `gateway deposit --method direct` on BASE without verifying one of the four conditions in the `circle-fund-agent-wallet` skill (the "Eco vs direct" section) - eco is the default and saves 12+ minutes vs direct's finality wait.
- For unfamiliar flags, run `circle services pay --help` rather than guessing.

## Reference Links

- Full payment-decision walkthrough (chain selection, Gateway vs vanilla, cross-chain workflows): https://agents.circle.com/skills/wallet-pay.md
- Service discovery API + filters: https://agents.circle.com/skills/discover-services.md
- Predexon API reference (for `nano.blockrun.ai/api/v1/pm/*` endpoints): https://docs.predexon.com/api-reference/openapi.json
- Circle Developer Docs: https://developers.circle.com/llms.txt

## Alternatives

Trigger the `circle-use-agent-wallet` skill instead when:

- `circle wallet status` errors with "Not logged in" or "Terms acceptance is required".
- The user wants to set up the CLI / agent wallet for the first time.
- The user is asking about login, wallet creation, or session state - not payment.

Trigger the `circle-fund-agent-wallet` skill instead when:

- Wallet balance is 0 USDC and the user wants to add funds.
- A `circle services pay` call errors with `No Gateway balance found` and the user has no USDC anywhere yet.
- The user asks about fiat on-ramp, deposit, withdrawal, or Gateway deposit specifics.

Trigger the `circle-agent-wallet-policy` skill instead when:

- The user wants to set or change spending limits before paying.
- The user mentions per-tx / daily / weekly / monthly caps, spending policy, or wallet rules.

---

DISCLAIMER: This skill is provided "as is" without warranties, is subject to the [Circle Developer Terms](https://console.circle.com/legal/developer-terms), and output generated may contain errors and/or include fee configuration options (including fees directed to Circle); additional details are in the repository [README](https://github.com/circlefin/skills/blob/master/README.md).
