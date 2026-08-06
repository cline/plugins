---
name: zoominfo-score-accounts
description: Score and rank a list of accounts (mixed ZoomInfo company IDs, names, or domains) by ICP fit + buying intent + recent triggers. Returns per-account composite score (0-100), tier (A/B/C), explainable component breakdown (fit / intent / trigger / engagement), a specific "why now" sentence per account, and the working weight set as a saveable search filter set. Resolves name/domain inputs via search_companies with explicit confirmation for ambiguous matches. Iteratively refinable -- adjust weights, swap axes, retier, or drill into a specific account. Use for account-based selling, ABM list prioritization, territory planning, sales prospecting prioritization, signal-based selling, buyer intent ranking, B2B prospecting. Triggers on phrases like "score these accounts", "prioritize this list", "rank by ICP fit and intent", "which accounts should I work first", "build a tiered account list".
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# Score Accounts

Rank a list of accounts by ICP fit + intent + trigger signals. Calls `get_gtm_context(detailed: true)` unconditionally, resolves mixed-identifier inputs explicitly surfacing ambiguity, scores each account on four axes, and presents both the ranking and the weight set as iteratively-refinable output.

## The bar

1. Resolution accuracy 100% -- every input auto-resolved / verified / ambiguous / failed. Nothing silently picked.
2. Every score explainable -- composite is a transparent weighted sum, never an opaque number.
3. "Why now" cites a specific signal -- not the composite restated.
4. Every tier comes with a recommended action.
5. Weights and axes are exposed and overridable.

Sellers reject black-box scores. Transparency + per-account "why now" are what make this skill trusted.

## Scope

Scores company-level accounts, not contacts. Persona-aware ranking is a chain target via `zoominfo-personalize-email` after tier-A is produced.

## Input

- Accounts (required) -- list of ZI IDs / company names / domains / mixed CSV.
- Use case (default `prospecting`) -- `prospecting`, `abm`, `territory_planning`, `pipeline_acceleration`. Affects tier thresholds + recommended actions.
- Weight overrides (optional) -- `{fit, intent, trigger, engagement}` summing to 100.
- Tier thresholds (optional) -- `{A, B}`. C is the remainder.
- ICP override (optional) -- natural-language refinement on top of `get_gtm_context.icp`.
- Intent topics (optional) -- explicit list overriding GTM-derived defaults.

## Four-axis framework

| Axis | Question | Source |
|---|---|---|
| Fit | Does this match our ICP? | `enrich_companies` vs `get_gtm_context.icp` |
| Intent | Are they actively researching the topic? | `enrich_intent` with curated topics |
| Trigger | Fresh event creating a window? | `enrich_news` + `enrich_scoops` (last 90d) |
| Engagement | Already interacting with us? | `account_research` narrative for known accounts. If absent, weight redistributed. |

Each axis 0-100 independently. Composite is the weighted sum -- never collapsed to an opaque number.

## Default weights

```
fit:        45%
intent:     25%
trigger:    25%
engagement:  5%   (redistributed if unavailable)
```

User overrides accepted. Weights are exposed in every output. Cache per-axis scores; recompute only the composite when weights change.

## Tier thresholds

| Tier | Composite | Recommended action |
|---|---|---|
| A | >= 75 | Route to AE for 1:1 outreach within 24h. Chain to `zoominfo-personalize-email`. |
| B | 50-74 | SDR sequence; ABM retargeting; nurture-to-meeting. |
| C | < 50 | Watchlist; monitor for tier-promotion signals. |

Use-case adjustments: `abm` -> A=80/B=55 - `territory_planning` keeps defaults - `pipeline_acceleration` -> A=65/B=40.

## Workflow

### 1. Pull GTM context (always)
`get_gtm_context(detailed: true)`. Capture ICP, personas, competitors, offerings, strategic priorities. ICP = fit-axis target; strategic priorities -> intent-topic curation.

### 2. Honor input data first
Use user-supplied weights / thresholds / ICP refinements / intent topics. Fall back to GTM defaults only for missing fields.

### 3. Resolve identifiers (four-bucket routing)

- Auto-resolved -- top match dwarfs alternatives. Score without confirmation.
- Verified -- clear top match BUT plausible alternatives exist. Score; surface verification note.
- Ambiguous -- no dominant match. Pause scoring; surface candidates.
- Failed -- no match. List separately.

Routing by input type:
- Numeric ZI ID -> auto-resolved.
- Domain (`.com` / `.io` / `.co` / `.ai`) -> `search_companies(companyWebsite)`. Single match -> auto-resolved. Multiple -> ambiguous.
- Name -> `search_companies(companyName)`.
  - Top match's size/revenue dwarfs alternatives -> auto-resolved.
  - Clear top but 3+ plausible alternatives -> verified with note.
  - No dominant match -> ambiguous.
- No match -> failed.

Surface rule. Never silently pick a winner. Present top 5 with attributes; ask user to confirm. Use GTM context as soft tiebreaker for `verified` (e.g., a B2B SaaS context defaults an ambiguous name to the SaaS-industry candidate over an unrelated-industry candidate, with a flag).

Domain-confirmation gate (mandatory for high-collision names). When `search_companies(companyName=X)` returns >100 matches AND no strong GTM tiebreaker exists, require domain confirmation. Surface top match's domain and ask. Never silently auto-pick -- cost of getting it wrong is scoring the wrong company entirely.

Duplicate-record detection (mandatory). If top candidates share the same domain root (e.g., `acmeco.com` and `acmecoinc.com`) AND <=20% revenue diff AND same metro/country -> flag suspected duplicate. Surface both records and offer to union. For signal-heavy workflows, scoring both and unioning is the right default -- signals may be split across records.

Resolution path must hit 100% accuracy. Score auto-resolved + verified immediately; pause ambiguous; list failed separately.

### 3.5. Relationship-context pre-flight (mandatory)

Tag each resolved account against GTM context. Tag visible on the row before the tier letter -- sellers see relationship status BEFORE running the play.

- `competitor` [competitive] -- in `get_gtm_context.competitors`. Don't exclude from ranking (competitive intel matters) but make it impossible to miss visually.
- `customer` [relationship] -- in `get_gtm_context.customers` / `proof_bank`. Shift recommended action to expansion / renewal.
- `partner` [link] -- in `get_gtm_context.partners` / `integration_partners`. Shift to co-sell / integration angle.
- `prospect` -- default; no tag.

In the row label: `[competitive] [Account] (B 62)`. Skill never silently produces "pursue this competitor" rankings.

### 4. Curate intent topics
From `get_gtm_context.strategicPriorities` (or user-supplied list), derive 5-10 topics. `lookup intent-topics fuzzyMatch=<theme>` -- one call per theme (multi-field fuzzyMatch fails silently). If no topics resolve, set intent weight = 0 and redistribute.

### 5. Fetch data per account (parallel, batched <=10; chunked for large lists)

For each resolved account, in parallel:
- `enrich_companies(companyId, fields: industries, employeeCount, revenue, country, metroArea, businessModel, employeeCountByDepartment, foundedYear)`.
- `enrich_intent(companyId, topics: curated list, signalScoreMin: 60, signalStartDate: 30d ago, pageSize 25)`.
- `enrich_news(zoominfoCompanyId, last 90d, categories: PERSON,MERGER_OR_ACQUISITION,FUNDING,PRODUCT,FINANCIAL_RESULTS, pageSize 15)`.
- `enrich_scoops(zoominfoCompanyIds, last 90d, pageSize 10)`.

Hard batch limit: <=10 concurrent per MCP tool type.

Batch + context-window discipline. For lists >25 accounts, process in chunks of ~25 accounts end-to-end (resolve -> fetch -> score -> compose row -> write chunk -> discard raw payloads) before moving to the next chunk. Don't accumulate full raw enrichment payloads for hundreds of accounts in working context -- once per-axis scores + the winning trigger event + the winning intent topic are captured per account, drop the rest. For >100-account lists, summarize completed chunks into running totals (tier distribution, top-A list, multi-product anomalies, duplicate-suspected flags, missing-axes counts) and discard the per-account breakdowns from context. Output is built incrementally chunk-by-chunk so a long list doesn't blow context.

Skip `account_research` here; fire selectively in section 7.5 for tier-A.

### 6. Score each axis

Fit (0-100) -- compare `enrich_companies` to `get_gtm_context.icp`:

| Dimension | Max | Banded scoring |
|---|---|---|
| Industry / sub-industry | 25 | Primary = 25 - secondary = 15 - adjacent = 8 - none = 0 |
| Employee count band | 20 | In band = 20 - one off = 12 - two off = 4 - outside = 0 |
| Revenue band | 20 | Same banding |
| Geography | 15 | ICP country = 15 - in continent = 8 - outside = 0 |
| Business model | 10 | B2B/B2C match = 10 - mixed = 5 - mismatch = 0 |
| Technographic (optional) | 10 | Uses named tech-stack vendor = 10 - else 0. Verify via `search_contacts` + `techAttributeTagList` if needed. |

Cache per account; reuse across weight changes.

Intent (0-100) -- `max(signalScore x audienceStrengthFactor)` from `enrich_intent`. A=1.0 - B=0.85 - C=0.7 - D=0.55 - E=0.4. Cap 100. Record winning topic for "why now." If no data -> 0 with "no intent activity in window" flag.

Trigger (0-100) -- for each event in `enrich_news` + `enrich_scoops` (last 90d):

```
event_score = signal_type_weight x recency_factor
```

| Signal type | Weight |
|---|---|
| M&A, Funding, New CEO/C-suite hire | 95 |
| Product launch, Hiring surge, Earnings beat/miss | 75 |
| Partnership, New facility | 55 |
| Pain-point scoop, Other PERSON moves | 45 |
| Generic press release | 25 |

Recency: 0-14d=1.0 - 14-30d=0.7 - 30-60d=0.4 - 60-90d=0.2 - >90d=0.

Account trigger = `max(event_score)` capped at 100. Record winning event for "why now."

Engagement (0-100) -- if `account_research` returns rich CRM context: active deal/renewal/champion = 80-100 - past meeting/known stakeholder = 40-70 - no history = null. If null, redistribute weight and surface gap.

### 7. Compute composite + assign tier

```
composite = round((fit x w_fit + intent x w_intent + trigger x w_trigger + engagement x w_engagement) / 100)
```

Assign per thresholds. Default A>=75 / B 50-74 / C<50 (use-case overrides apply).

### 7.5. Auto-pull `account_research` on tier-A rows (mandatory)

Tier A = "route to AE in 24h." Engagement-axis gap on tier-A is the highest-cost gap to close.

For each tier-A account (and ONLY tier-A -- cost control): `account_research(zoominfoCompanyId, query="Open opportunities, active deal stages, named champion or blocker, last activity date, renewal timing")`. Parse for:
- Open deal status -- stage, value, next step.
- Renewal date -- surface prominently if within 90 days.
- Named champion / blocker -- source-tag `[from account_research]`.
- Last activity -- flag if >60 days old.

Append inline beneath the why-now:

```
| 1 | [Account] | [relationship] A | 84 | ... | [Trigger event] X days ago -- [pain-bridge]
                                     -> Engagement: open deal $XXXk, champion [Name], last activity Xd ago [from account_research]
```

If no CRM history -> annotate "no engagement signal -- cold open."

For tier-B/C: skip -- cost-to-value doesn't justify.

### 8. Compose "why now" per account

One sentence anchored on the strongest signal:

- Trigger + in-tier fit -> cite event + date. "Closed [counterparty] acquisition 20 days ago."
- High intent -> cite topic + score + recency. "Spiked on '[topic]' (score 92, audience A) over 14 days."
- Strong fit, no fresh signal -> "Perfect-fit ICP -- no fresh trigger; pursue on fit alone."
- Engagement-driven -> "Active deal in flight; renewal due in 47 days."
- Strong trigger BUT C-tier (fit mismatch) -> be explicit about routing: "Do not pursue -- strong trigger (new CEO 10 days ago) but ICP mismatch ([reason]) keeps this low priority." Don't bury the trigger; surface BOTH signal and recommendation.
- Low signal across all axes -> "Low signal -- monitor only."

Never restate the composite as the why-now. Always cite the underlying axis driver.

### 9. Self-check before output

- [x] Composite shown with component breakdown (fit / intent / trigger / engagement).
- [x] "Why now" cites a specific signal, not the composite.
- [x] Tier has a recommended next action.
- [x] Weights + axes used exposed.
- [x] Every input bucketed (resolved / ambiguous / failed) -- none silently dropped.
- [x] Ambiguous surfaced, not silently picked.
- [x] Stale signals (>90d) contribute 0; not padded.
- [x] Missing axes flagged + weights redistributed transparently.
- [x] Iteration options offered.

### 10. Present + offer iteration

1. Accept ranking; save filter+weight set.
2. Adjust weights -- re-rank without recomputing axes.
3. Tighten / loosen tier thresholds.
4. Refilter -- remove tier C / specific industries.
5. Swap ICP -- different ICP definition.
6. Drill into one account -- chain to `zoominfo-personalize-email`.
7. Add accounts -- extend list and re-score.

Re-execute step 5 only when account list changes. For weight / threshold / ICP changes -> recompute from cached axis scores.

Terminate when user accepts, saves, or hands off.

## Anti-patterns -- fail-fast checklist

1. Black-box composite -- single number without component breakdown.
2. "Why now" = composite restated.
3. Silent identifier resolution on ambiguous names.
4. Fixed weights not exposed.
5. Tier without action.
6. Stale signal padding -- events >90d contributing.
7. Generic "why now" -- "good fit" applies to every account.
8. Ignoring missing axes -- pretending engagement exists when null.
9. Auto-accepting ambiguous matches.
10. No iteration affordance.

## Fallback rules

- `get_gtm_context` empty -> use user-supplied ICP override; surface gap.
- Intent topics fail to resolve -> intent weight = 0; redistribute.
- `enrich_intent` empty -> score = 0 (real signal, not gap).
- `enrich_news` + `enrich_scoops` both empty -> trigger = 0; flag.
- Engagement unavailable -> weight = 0; redistribute proportionally.
- All axes thin -> tier C "monitor only"; honest.
- Resolution failure -> list separately; never silently drop.

Never block ranking on a single missing axis. Never invent data.

## Output Format

### TL;DR -- Account Scoring - N accounts - Pass [M]

*Use case: [restate]. Weights - Thresholds A>=[X] - B[Y-Z].*

Resolution: [R resolved - A ambiguous - F failed]. [If A>0: "User confirmation required."]
Tier distribution: A: x - B: y - C: z.

Top 3:
1. [Account] (tier - composite) -- [why now]
2. ...

---

### Resolution Summary

| Input | Resolved To | ZI ID | Confidence | Status |
|---|---|---|---|---|

`Status` legend: [yes] Auto-resolved - [research] Verified - Warning: Ambiguous - [no] Failed.

Ambiguous matches -- please confirm: [list top 5 candidates per ambiguous input with attributes].

### Ranked Accounts

*Sorted by composite descending. Engagement column `-` when redistributed.*

| # | Account | Tag | Tier | Composite | Fit | Intent | Trigger | Eng | Why now | ZI ID |

(Tier-A rows also carry an "-> Engagement: ..." sub-line from section 7.5.)

### Weights & Axes Used

```
fit:        [%]
intent:     [%]
trigger:    [%]
engagement: [%]   (redistributed if axis unavailable)
```

Axes missing this run: [list, or "none"].

### Recommended Actions per Tier

- Tier A -- Route to AE for 1:1 outreach within 24h. Chain to `zoominfo-personalize-email`.
- Tier B -- SDR sequence; ABM retargeting; cadence with the why-now as opener.
- Tier C -- Monitor; re-score weekly.

### Iteration Options

1. Accept ranking; save filter+weight set.
2. Adjust weights.
3. Tighten thresholds.
4. Refilter.
5. Swap ICP.
6. Drill into one account.
7. Add accounts.

### Caveats (when relevant)

- Ambiguous pending -- N accounts not yet scored.
- Failed resolutions -- N inputs had no match.
- Engagement axis unavailable -- surface per-account (`no CRM signal -- consider cross-check`) for each tier-A row.
- Intent topic curation per-tenant -- if <50% of curated topics resolve, intent axis is configuration-gap, not signal-absent.
- Intent thin -- <3 topics resolved; intent directional.
- Stale-signal cliff -- N accounts' best trigger >60d old.
- Edge-of-recency -- N trigger events 80-90d.
- GTM-context gap -- `icp` sparse; fit-axis precision reduced.

### Final Filter + Weight Set (on accept)

```json
{
  "icp": { /* GTM ICP or user override */ },
  "weights": {"fit": 45, "intent": 25, "trigger": 25, "engagement": 5},
  "tier_thresholds": {"A": 75, "B": 50},
  "intent_topics": ["..."],
  "use_case": "prospecting",
  "_meta": {"account_count": ..., "tier_distribution": {...}, "axes_missing": [...], "pass_count": ...}
}
```

### Chain Targets

- `zoominfo-personalize-email` per tier-A contact -> grounded in the same "why now" signal.
- `zoominfo-build-list` to extend the universe.
- `zoominfo-find-similar` on a tier-A seed.
- `zoominfo-tam-sizer` with this filter set to confirm universe size.
