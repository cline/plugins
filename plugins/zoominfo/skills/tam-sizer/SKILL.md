---
name: zoominfo-tam-sizer
description: Size the total addressable market (TAM) for an Ideal Customer Profile (ICP) using ZoomInfo's verified company database. Iteratively refine the firmographic and technographic filter set with the user until the account universe matches their intent, then return both the count and the working filter set that other ZoomInfo skills can consume. Use for territory and capacity design, investor-ready market sizing, and ICP sharpening.
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# TAM Sizer

Iteratively refine a company-level ICP filter set against ZoomInfo's company database. Each pass returns a count, a banded sizing read, labelled sample views, and concrete refinement options. Terminates when the user finalizes. Output is both the count and a structured filter set ready for `zoominfo-build-list`, `zoominfo-score-accounts`, or `zoominfo-find-similar`.

## When to use

- `zoominfo-tam-sizer` -- user wants count + shape + working filter set, willing to iterate.
- `zoominfo-build-list` -- filter set already settled; user wants the exportable list.
- `zoominfo-find-similar` -- user has a seed account, not a filter-based market.

## Scope

TAM here = company count AND working filter set, both first-class outputs.

This skill does NOT size contacts. Buyer-persona criteria ("CTOs", "VP Sales") are recorded but NOT applied to the count -- they describe who you sell *into*, not who the account *is*. Persona discovery is `zoominfo-build-list` / `search_contacts` once the filter set is settled.

## Input

- ICP description (recommended) -- natural language, OR "my ICP" / "our ICP" / nothing (fall back to `get_gtm_context`).
- Use case (optional) -- *territory design* / *investor sizing* / *ICP sharpening* (default).
- SAM hypothesis inputs (optional) -- `addressable_fraction` (0-1) and `arpa_usd`.

## Workflow

### 1. Pull GTM context (always)
Call `get_gtm_context(detailed: true)` first. Use throughout -- for filter defaults when the user is vague, sanity-check expectations on the sample, and refinement recommendations. If empty, proceed with user filters only and surface the absence.

### 2. Parse + merge ICP
Reconcile user text and GTM context. User text wins direct conflicts ("SF" overrides GTM's "North America"); GTM fills gaps. Tag every dimension as `user-specified` / `inherited from GTM` / `unspecified`. Persona criteria recorded but not applied.

### 3. Disambiguate ambiguous regions BEFORE the search
- "EU" can mean European Union (27 countries) or Europe (continent) -- `continent: Europe` includes Russia, Turkey, UK, Switzerland, Norway. Ask one clarifying question if "EU" is unclarified.
- "Asia" includes Russia; "Americas" vs "North America" vs "US/Canada" -- confirm if uncertain.

### 4. Lookup all filter values
Call `lookup` to resolve free text to standardized values. Don't guess.

`lookup` with multi-field `fuzzyMatch` may return empty data for the second field -- call once per fieldName when using `fuzzyMatch`.

| Field | `fieldName` | Notes |
|---|---|---|
| Industries | `industries` | Passed to `search_companies` by `attributes.name` (e.g., `"Software"`), not `id`. Narrow to sub-industries (`"Customer Relationship Management (CRM) Software"`) over top-level. |
| Employee bands | `employee-count` | Enum values (`50to99`, etc.) in `employeeCount`. |
| Revenue bands | `revenue-ranges` | Or `revenueMin`/`revenueMax` (thousands USD). |
| Geography | `metro-regions` / `states` / `countries` / `continents` | |
| Technographics | `tech-vendors` -> `tech-products` filtered by `vendor` | |
| NAICS / SIC | `naics-codes` / `sic-codes` | |
| Rankings | `company-rankings` | |

#### Taxonomy-gap gate (mandatory)

For every industry term (user-supplied or from GTM context), call `lookup industries fuzzyMatch=<term>` first.

- >=1 match -> use the resolved industry name in `industryCodes`.
- 0 matches -> do NOT silently fall back to `industryKeywords`. Surface: *"No matching industry in ZI's taxonomy for `<term>`."* Recommend one of: (a) seed company + `zoominfo-find-similar`, (b) external list import via a company-match service, (c) explicit confirmation to proceed with `industryKeywords` knowing the noise risk. Wait for user confirmation.

Common gaps: climate-tech, sustainability, cleantech, sales-engagement, RevOps, agentic-AI, vector-databases.

### 5. Get the count
`search_companies` with resolved filters, `pageSize: 1`. Use `meta.totalResults`.

`meta.fieldResolution` does NOT echo continent / revenueMin/Max / fundingAmountMin/Max / employeeRangeMin/Max -- always populate "Filters Applied" from input parsing.

#### Data-sparsity probe (mandatory when funding/revenue filters applied)

ZI's coverage of `fundingAmountMin/Max`, `fundingStartDate/EndDate`, `revenueMin/Max` is sparse for many segments. A filter collapsing the count to 0 may be a data gap, not a narrow ICP.

1. Run count with filter (`count_filtered`).
2. Run count without the funding/revenue filter (`count_unfiltered`), other filters intact.
3. If `count_filtered / count_unfiltered < 0.1` (filter drops >90%):
   - Treat as data-sparse, not narrow ICP.
   - Use `count_unfiltered` as operative TAM for banding.
   - Surface: *"ZI's coverage of [field] is sparse for this segment. Filtered: X. Operative TAM: Y (unfiltered)."*
4. Otherwise: `count_filtered` is the operative TAM.

Both numbers always shown.

### 6. Classify the sizing band

| TAM size | Band | Read |
|---|---|---|
| > 50,000 | Too broad | Probably not operational. |
| 5,000 - 50,000 | Healthy enterprise/mid-market | Suggest tier segmentation. |
| 1,000 - 5,000 | Sweet spot | Focused primary-tier list. |
| 250 - 1,000 | Tight/niche | Flag capacity feasibility. |
| < 250 | Too narrow | Coverage risk; suggest widening. |

### 7. Fetch representative-account sample (two views)

`search_companies` twice in parallel, each `pageSize: 12`:

- Trophy view -- default sort. ZI's internal ranking (revenue-biased). Biggest logos.
- Anchor view -- `sort: "-employeeCount"`. Largest by headcount.

`search_companies.sort` does NOT support `relevance` -- only `name` / `employeeCount` / `revenue` and `-` variants. Dedupe by `companyId`; label each row with its view.

### 8. Directional shape sample + noise rate

`search_companies` with `pageSize: 100`, default sort. Revenue-skewed -- NOT a census. Use for:

- ICP sanity check -- do top names look like the ICP, or contain conglomerate/BPO/staffing noise?
- Geographic + sub-industry shape -- directionally useful even when revenue is biased.
- Noise-rate estimation -- count rows in top 25 that visibly don't match the ICP. Rate = `noisy_rows / 25`.

Do NOT compute revenue-band or employee-band % from this sample. Skip the directional table entirely when TAM > 50,000.

#### Noise-adjusted TAM (mandatory when noise >=20%)

- `tam_noise_adjusted = round(raw_count x (1 - noise_rate), 2 sig figs)`.
- Re-classify the band against `tam_noise_adjusted`.
- Cite specific noisy samples ("of top 25, 6 are wineries / solar installers").
- Report order: `raw count -> noise rate -> adjusted TAM -> band`.

20-60% noise is common for keyword-fallback or taxonomy-gap searches -- a stronger signal to revisit the filter set than to ship the count.

### 9. SAM hypothesis (only if both inputs supplied)
- SAM count = TAM x `addressable_fraction`
- SAM revenue = SAM count x `arpa_usd`
- Label: *Hypothesis, not forecast.*

### 10. Self-check before output

- [x] Headline count to <=2 sig figs.
- [x] Taxonomy gap gate cleared -- every industry term resolved via `lookup`, OR user explicitly confirmed `industryKeywords` proceed.
- [x] Data-sparsity probe run when funding/revenue filters applied.
- [x] Noise-adjusted TAM computed when top-25 noise >=20%.
- [x] Every unspecified dimension flagged from input parsing (not `fieldResolution`).
- [x] GTM-inherited filters labeled separately from user-specified.
- [x] Persona criteria marked "not applied to company TAM."
- [x] Both sample views shown, labeled.
- [x] Directional shape only if count <= 50k; no revenue/employee % bands ever.
- [x] Refinement names specific dimension + estimated post-refinement count.
- [x] Region disambiguation resolved.

### 11. Present refinement options + loop

- Too broad (>50k) -> 2-3 narrowing options with estimated impact.
- Too narrow (<250) -> 2-3 widening options.
- Healthy band -> tier segmentation OR finalize.
- Always -> offer "save filters" exit to chain targets.

Re-run from step 4 when filter changes. Surface filter-set diff each pass.

Terminates on finalize or hand-off.

## Output Format

### TL;DR -- TAM Sizing for [ICP one-liner] - Pass [N]

*Use case: [restate].*

Headline. ~[count] companies. Band: [too broad / healthy / sweet spot / tight / too narrow].

*If data-sparsity probe fired:* `Raw filtered: X - Unfiltered: Y - Operative TAM: Y (filter is data-sparse).`

*If noise-adjusted:* `Raw: A - Sample noise: ~B% - Noise-adjusted: C` (band classified against C).

Read. [1-2 sentences: operational? dominant skew? most consequential refinement?]

This pass's filter diff: [for pass N>1]

---

### Filters Applied

| Dimension | Value | Source |
|---|---|---|

`Source` legend: `user-specified` - `inherited from GTM` - `unspecified` - `approximation`. Persona criteria -> `Info NOT applied to company TAM`.

### Representative Accounts (<=25, two views)

*Trophy = ZI internal ranking (revenue-biased) - Anchor = `-employeeCount`.*

| # | Company | Industry | Employees | Revenue | Country | View | ZoomInfo ID |

Sanity check. Do these look like the ICP, or include conglomerate / BPO / staffing noise? If noise -> name the specific narrowing filter that removes it.

### Directional Shape (only if count <= 50,000)

By country (top 5) - By sub-industry (top 5). Sample is revenue-biased; directional only.

### Sizing Band & Refinement

Band: [letter].
Why this band. [1-2 sentences on count + operational implication.]
Refinement options:
1. [Dimension change + estimated post-refinement count]
2. [Alternative]
3. [Optional]

Or: finalize and hand off to `zoominfo-build-list` / `zoominfo-score-accounts` / `zoominfo-find-similar`.

### Caveats (when relevant)

- Industry-classification looseness -- top-level industries classify conglomerates inside. Narrow to sub-industries for B2B.
- Funding approximation -- `fundingAmountMin` captures total raised, not stage.
- Region scope -- "EU" was resolved as [EU-27 / Europe-continent]. Confirm if mismatch.
- Subsidiary records -- `search_companies` returns parent + subsidiary. Consider `subUnitTypes` filter for investor-ready TAM.

### SAM Hypothesis (only if both inputs supplied)

*Hypothesis, not forecast.*

| Metric | Value |
|---|---|
| TAM count | |
| Addressable fraction | |
| SAM count | |
| ARPA (USD) | |
| SAM revenue | |

### Final Filter Set (on finalize)

```json
{
  "industryCodes": "...",
  "employeeCount": "...",
  "metroRegion": "...",
  "continent": "...",
  "revenueMin": ...,
  "fundingAmountMin": ...,
  "techAttributeTagList": "...",
  "_meta": {"tam_count": ..., "band": "...", "pass_count": ..., "use_case": "..."}
}
```

### Chain Targets

- `zoominfo-build-list` -> exportable account list.
- `search_contacts` -> buyer-persona discovery at these accounts.
- `zoominfo-score-accounts` -> rank by buying signal and ICP fit.
- `zoominfo-find-similar` -> adjacent accounts from a seed.
