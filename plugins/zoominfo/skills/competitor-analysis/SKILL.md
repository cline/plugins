---
name: zoominfo-competitor-analysis
description: Produce a fact-led competitive intel brief on one or more competitors -- firmographics, recent strategic moves, product positioning, ICP overlap, and discovery questions. Defaults to your configured competitors from GTM context if none specified. Uses ZoomInfo data (account_research, scoops, intent, exec teams, similar companies) and can optionally add public web context when Cline has a web search tool available. Identify competitors by ZoomInfo account/company ID (preferred) or name; include rich context on why the brief is being pulled and what decision it supports.
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# Competitor Analysis

Produce a fact-led competitive intel brief. Lead with an executive comparison across competitors, then a per-competitor section. Pull positioning verbatim from the GTM context -- don't invent your own opinions about who wins or who's the biggest threat.

## Input

The user request should provide:

- Competitor identifiers (optional) -- zero or more of:
  - Preferred: ZoomInfo account/company IDs (numeric). Use directly as `companyId`; skip the search step for that competitor.
  - Fallback: competitor names. Resolve via `search_companies` (use `companyWebsite` from GTM context's `url` field if present; otherwise `companyName`).
  - If omitted entirely, default to all competitors configured in your GTM context.
  - For named competitors NOT in GTM context, flag as "uncovered" -- research proceeds, but pre-built positioning is missing.
- Research context (strongly recommended) -- a free-form description of *why* this brief is being pulled and what decision it supports. Richer is better -- flat depth enums and deal one-liners produce flat briefs. Capture as much as is true: the deal or situation in play, what you're losing or winning on, the offering or product line under pressure, the audience for the brief (AE prep / leadership review / enablement), how exhaustive the analysis needs to be, and any specific angles or hypotheses to test. Examples:
  - *"Losing the mid-market segment to Clay on data orchestration. Need to understand their recent product moves, pricing, and where their customer reviews show cracks. AE-facing -- concrete discovery questions matter most."*
  - *"Quarterly competitive review for leadership. All configured competitors. Want a scannable Executive Comparison plus 90-day strategic moves. Depth on each is light."*
  - *"Deep dive on Acme before a head-to-head bake-off next month. Their security platform vs ours. Want G2/TrustRadius sentiment themes, recent CISO commentary, and the exact products they'd field against our SKUs."*

This context drives depth allocation (deep vs scan), the `account_research` query framing, scoops/news triage, web-search angles, and the discovery-question slant.

## Workflow

Parallelize aggressively -- once each competitor's company ID is resolved, all per-competitor calls can fan out in parallel. When briefing multiple competitors, run all competitors' fan-outs in the same parallel batch.

1. Anchor on purpose. Read the research context from the user's request.
   - If supplied, restate it in 1-2 sentences as the *brief purpose* and keep it as the framing lens for every downstream step.
   - If missing, ask the user once. If they decline or say "just general competitive intel", default to general competitive scan across configured competitors and state that assumption at the top.
   - From the context, derive: a brief purpose (1 line), depth allocation (which competitors get deep treatment vs lighter coverage), priority angles (3-5 -- e.g., pricing, data orchestration, CISO-level positioning, G2 sentiment), and any named hypotheses to test (e.g., "test whether Clay's mid-market push is sustainable"). These drive the `account_research` query, scoops triage, and web-search angles.

2. Get GTM context -- call `get_gtm_context` with `detailed: true`. This is the anchor source: it contains your defined competitors with `products`, `reasonsTheyWin`, `reasonsTheyLose`, `customersWeWon`, and `competitiveProducts`. Quote these verbatim in the output -- they're pre-built positioning content, not your interpretation.

3. Determine the competitor set -- match user-named competitors (or IDs) against the GTM-context list. If user named none, brief all configured. Flag uncovered competitors as noted in Input.

4. For each competitor, fan out in parallel (retrieval, not filtering). Treat each tool call as a context-retrieval step. Pull broadly now; decide what's relevant during synthesis.
   - Resolve company ID -- if the user supplied a ZoomInfo ID, use directly; otherwise `search_companies` (use `companyWebsite` from GTM context's `url` field if present; fall back to `companyName`).
   - Firmographics via `enrich_companies` (full field set including `employeeCountByDepartment`, `companyFunding`, `recentFundingDate`, `totalFundingAmount`).
   - Strategic narrative via `account_research` -- inject the brief purpose, priority angles, and named hypotheses into the query. Ask for go-to-market motion, recent moves, customer wins/losses, leadership changes, direct overlap with your products, and anything that bears on the specific angles named in the context.
   - Recent scoops via `enrich_scoops` (90 days, `pageSize: 15`) -- no role filter. Triage in step 7.
   - Their intent signals via `enrich_intent` -- call with the `companyId` only. Do not pre-filter by topic. The goal is to see what topics this competitor is actually expressing intent on. Filtering happens in step 7. Intent for competitors often returns sparse -- note as a confidence indicator if so.
   - Their executive team via `search_contacts` (`managementLevel: "C Level Exec,VP Level Exec"`, sort by `-contactAccuracyScore`, `pageSize: 15`).
   - Their similar companies via `find_similar_companies` -- apply the cohort-consistency check; if the top peers span inconsistent industries vs the target, flag as directional only.

5. Optional public web context per competitor -- if the separate Cline `web_search` tool is installed and available, use it for targeted checks against the priority angles from step 1. Useful queries include G2 reviews / TrustRadius sentiment, head-to-head comparisons (`"[Competitor] vs [Your Org]"`), recent product launches, public earnings/CEO statements (if public), pricing, product lines, and customer churn stories. Capture verifiable quotes with URLs. If no web search tool is available, continue with ZoomInfo data only and state that public web validation was not performed.

6. Date and currency checks -- if `account_research` surfaces dates in the past (renewal, contract end, exec tenure end, last activity), retain but flag for verification. If optional public web context contradicts a CEO or other top exec named in `account_research`, lead with the corrected fact and note the source disagreement.

7. Synthesize. Each retrieval is raw context -- now decide what makes the brief, framed by the brief purpose and priority angles. Apply these principles:
   - Intent triage: from `enrich_intent`, keep topics that map to the brief purpose, priority angles, or non-obvious competitive signals worth flagging. Drop noise. If nothing meaningful remains, say so explicitly -- don't infer roadmap from absence.
   - Scoops triage: keep product launches, exec moves at VP+, partnerships, M&A, hiring patterns relevant to the priority angles. Drop generic press releases.
   - Verbatim positioning: pull `reasonsTheyWin`, `reasonsTheyLose`, `customersWeWon` verbatim from GTM context. Do not paraphrase or add your own opinions.
   - Recent moves: dated, sourced, described without interpretation ("Acquired Pocus on Mar 19" -- not "Aggressive M&A signals confidence").
   - ICP overlap: classify each of your defined ICPs against the competitor's apparent reach (High / Partial / None) using firmographics and `customersWeWon` evidence.
   - Discovery questions: 3 per competitor (more for deep targets), anchored in a specific gap, priority angle, or surfaced fact. Not generic.
   - Hypothesis check: explicitly address each named hypothesis from step 1 -- confirmed / contradicted / unresolved. Surface in the Executive Comparison preamble.
   - Avoid threat ranking, "biggest threat" calls, or whitespace synthesis -- these require win-rate and pipeline data the skill doesn't have.

## Output Format

### Executive Comparison

*Brief purpose: [restate the user's research context in one line, or "general competitive scan (no context supplied)" if defaulted].*

Hypothesis check (one line per named hypothesis from the input): confirmed / contradicted / unresolved.

A single side-by-side table covering all competitors:

| | Competitor 1 | Competitor 2 | Competitor 3 |
|---|---|---|---|
| HQ / Founded | | | |
| Type / Funding | total raised + most recent round + date | | |
| Revenue (range) | | | |
| Employees (Eng / Sales / Mktg) | | | |
| CEO | | | |
| Most recent strategic move | one-line + date | | |
| Public G2 rating (if pulled) | | | |
| Defined by [Your Org] as primary competitor for | from GTM context `competitiveProducts` | | |

Below the table, a short Recent product/strategy moves (last 90 days, all competitors) bulleted list -- one to three bullets per competitor, with `[scoops]` / `[web]` / `[CRM]` source tags.

Then a Warning: Data quality flags block listing any failures or uncertain data -- failed intent calls, weak similarity cohorts, stale exec records caught by web cross-check, framework errors. Be specific.

---

### [Competitor Name]

Snapshot. One-paragraph context -- what they do, key exec team (CEO / CTO / CMO / CRO / CPO), department headcount weights from `employeeCountByDepartment`.

Recent moves (last 90 days) with `[source]` tags -- bulleted, dated, no interpretation. Lead with M&A and exec moves; then product launches; then hiring patterns. Include URLs for web-sourced items.

Product positioning (per [Your Org]'s defined competitive matrix):

| Their product | Your product (per GTM context) |
|---|---|
| | |

Map their products to the items in GTM context's `competitiveProducts` field for this competitor.

Per GTM context `[GTM]`:
- *reasonsTheyWin*: [verbatim from GTM context -- bulleted]
- *reasonsTheyLose*: [verbatim from GTM context -- bulleted]
- *customersWeWon*: [verbatim from GTM context -- bulleted]

ICP overlap with [Your Org]'s defined ICPs:
- High: [ICP names where the competitor competes hard]
- Partial: [ICP names where they touch but it's not their focus]
- None: [ICPs they don't compete in]

(Use firmographics + `customersWeWon` as evidence. If unclear, mark as "Partial".)

G2 / web sentiment `[web]` (if pulled): rating + N reviews. 1-2 themes from praise, 1-2 themes from criticism. Source URLs.

Intent signal `[intent]` (if returned): 1-line note. If 0 signals returned, say so explicitly -- don't infer roadmap from absence.

Discovery questions to ask in deal:

1. [Question rooted in a specific `reasonsTheyLose` weakness or a verified gap]
2. [Question that surfaces a feature/capability they're missing]
3. [Question grounded in a recent move or specific deal-stage friction]

---

### [Next Competitor Name]

(Repeat the structure above per competitor.)

---

### Skill Issues to Fold Back

If anything failed or returned unreliable data during the run, list it here so the next iteration can pick it up:
- Tool errors (parameter type bugs, 400s)
- Weak `find_similar_companies` cohorts
- Stale `account_research` records caught by optional public web validation
- Empty `enrich_intent` results

This section can be omitted if everything ran cleanly.

## Notes on what NOT to do

- Don't invent threat rankings ("top threat", "fastest mover", "most displaceable"). The skill doesn't have win-rate or pipeline data to back these calls.
- Don't paraphrase `reasonsTheyWin` / `reasonsTheyLose` / `customersWeWon` -- quote them verbatim. They're pre-built positioning your org has approved.
- Don't interpret roadmap from absence of intent signals -- competitors often return sparse intent.
- Don't synthesize a cross-competitor whitespace section -- that requires win/loss data this skill doesn't pull.
- Don't pad -- if a section has thin data, say so explicitly rather than filling with interpretation.
