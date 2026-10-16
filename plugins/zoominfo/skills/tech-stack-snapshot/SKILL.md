---
name: zoominfo-tech-stack-snapshot
description: Produce a technology-stack snapshot for one or more companies -- what CRM, marketing automation, sales engagement, data warehouse, analytics, conversation intelligence, and other tools they have tagged in ZoomInfo's database. Groups detected products by category, surfaces displacement plays for competitive tools, integration angles for partner tools, and coverage gaps honestly. Resolves mixed-identifier inputs (IDs / names / domains) with explicit ambiguity surfacing. Useful for sales prospecting, account-based selling, competitive battle-card prep, integration partner research, technographic signal analysis, B2B prospecting. Triggers on phrases like "what tech does X use", "tech stack for", "technographic snapshot", "what's in their stack", "do they use Salesforce", "competitive displacement angle".
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# Tech Stack Snapshot

Per-company tech-stack snapshot grouped by category, with displacement angles for competitive tools and integration angles for partner tools -- anchored on the user's GTM context. Resolves mixed-identifier inputs, queries `search_companies` with `techAttributeTagList` to check each product in a curated universe, and presents both the detected stack and the gaps honestly.

## How it works

`search_companies` accepts `techAttributeTagList` (tech-product IDs) as a filter:

```
search_companies(
  companyId="<input IDs, comma-separated>",
  techAttributeTagList=<one product ID>,
  pageSize=<N>
) -> returns subset of input companies that have that product tagged
```

Iterate over a curated universe of ~30-50 high-relevance tech products -> build a company x product matrix -> group by category and pair with GTM-context-anchored plays.

## The bar

1. Resolution accuracy 100% -- every input bucketed; never silently picked.
2. Detections are binary and verified -- [yes] comes from a non-zero `search_companies` result; [no] means no tag. Never invent presence.
3. Output is grouped by category.
4. Recommended plays anchor on GTM context.
5. Coverage gaps surfaced honestly -- absence = "no tag detected", not "no tool used."

## Always-on context: `get_gtm_context`

Every run calls `get_gtm_context(detailed: true)`. Drives:
- Which categories are in scope (sales-focused vs. dev-focused).
- Which detected tools map to displacement vs. integration angles.
- Framing of recommended plays (anchored on specific value props).

## Scope

Snapshots are company-level. Per-person tech-skill data is out of scope.

## Input

- Companies (required) -- list of ZI IDs / names / domains / mixed CSV.
- Categories of interest (optional) -- any of: `sales`, `marketing`, `analytics`, `data`, `conversation_intelligence`, `intent_abm`, `cdp`, `devops`, `security`, `customer_service`, `collaboration`. Default = first 7 (B2B SaaS sales motion).
- Custom universe (optional) -- `["product_id_1", ...]` to override curated default.
- Use case (default `sales_prep`) -- `sales_prep`, `battle_card`, `integration_partner_research`, `displacement_targeting`. Affects play framing.

## The curated universe (default)

~30 anchor products across 7 categories. The skill resolves vendors and products at runtime via `lookup` -- see section 3.5 below for the canonical enumeration paths. The default anchor set:

| Category | Anchor vendors | Anchor products |
|---|---|---|
| CRM | Salesforce, HubSpot, Microsoft | Salesforce (generic 713) + Salesforce Sales Cloud, HubSpot CRM, Microsoft Dynamics CRM |
| Marketing Automation | Marketo, HubSpot, Salesforce, Oracle | Marketo Engage + Marketo (generic 172), HubSpot Marketing Hub + HubSpot (generic 248), Salesforce Pardot, Salesforce Marketing Cloud, Eloqua |
| Sales Engagement | Outreach, Salesloft, Salesforce | Outreach, Salesloft, Salesforce Inbox |
| Data Warehouse | Snowflake, Google, Databricks, Amazon | Snowflake, BigQuery, Databricks, Redshift |
| BI / Analytics | Salesforce, Microsoft, Google, Mixpanel, Amplitude | Tableau, PowerBI, Looker, Mixpanel, Amplitude |
| Conversation Intelligence | Gong, ZoomInfo | Gong, Chorus |
| Intent / ABM | 6sense, Demandbase, ZoomInfo | 6sense, Demandbase, ZoomInfo Intent |
| CDP | Segment, Treasure Data | Segment, Treasure Data |

Always include both generic vendor IDs AND specific sub-products -- companies tagged with the generic ID won't surface if only sub-products are checked. Salesforce has 70+ tagged products; the universe must include each vendor's major sub-products.

User can extend / narrow per run.

## Enumerating the full tech taxonomy via `lookup`

The orchestrator does NOT need to memorize ZoomInfo's tech taxonomy -- every list is enumerable from `lookup` at runtime. Three calls give you the entire surface area:

| Goal | `lookup` call | Returns |
|---|---|---|
| All tech categories | `lookup` with `fields: [{fieldName: "tech-categories"}]` | The full enum of top-level categories (20 categories like Sales, Marketing, IT Infrastructure, DevOps, Security, etc.) with their sub-category trees. Use this to decide which categories are in scope or to extend beyond the default 7. |
| Vendors in a category | `lookup` with `fields: [{fieldName: "tech-vendors"}]` + `category` or `parentCategory` filter (or `fuzzyMatch=<vendor name>` for a single-vendor lookup) | The full enum of vendors. Filter by category to expand the universe systematically (e.g., all CDP vendors); filter by `fuzzyMatch` to resolve a specific vendor name. |
| Products for a vendor | `lookup` with `fields: [{fieldName: "tech-products"}]` + required `vendor` (or `category` / `parentCategory`) filter | All products that vendor has tagged. `tech-products` REQUIRES at least one of `vendor`, `category`, or `parentCategory` -- calling it without a filter returns 0. Note that single vendors can have many sub-products (e.g., Salesforce has 70+ products tagged). |

Use this path when the user asks "what categories of tech does ZI track?" / "what vendors exist in the [X] category?" / "what are all the products for [vendor]?" -- and when extending the universe beyond the default 7 categories without hardcoding new entries.

`lookup` quirk to respect: multi-field requests with per-field `fuzzyMatch` can silently fail on the second field. Call once per fieldName when using `fuzzyMatch`.

## Workflow

### 1. Pull GTM context (always)
`get_gtm_context(detailed: true)`. Capture competitors (displacement framing), offerings (integration framing), strategic priorities, ICP (sanity-check).

### 2. Honor input data first
Use user-supplied categories / custom universe / use case. Default only for missing fields.

### 3. Resolve identifiers (four-bucket routing -- same as `zoominfo-score-accounts`)

- Numeric ZI ID -> auto-resolved.
- Domain -> `search_companies(companyWebsite)`. Single match -> auto-resolved. Multiple -> ambiguous.
- Name -> `search_companies(companyName)`. Dominant top match -> auto-resolved. Clear top with plausible alternatives -> verified. No dominant winner -> ambiguous.
- No match -> failed.

100% resolution accuracy. Probe only resolved + verified rows.

Domain-confirmation gate (mandatory for high-collision names). When `search_companies(companyName=X)` returns >100 matches AND no strong GTM tiebreaker, require domain confirmation. Never silently auto-pick -- the cost is wasted MCP calls AND misleading output.

Duplicate-record detection (mandatory). If two+ candidates share same domain root, <=20% revenue diff, AND same metro/country -> flag suspected duplicate. Probe BOTH records and union the detections -- tags may be split across entries (record A might have Salesforce; record B might have HubSpot). Annotate `[from A]` / `[from B]` in the output.

Probing one record and reporting "no detections" is the failure mode this rule prevents.

### 4. Build the product universe

For each category in scope:
- `lookup tech-vendors fuzzyMatch=<vendor>` -- one call per anchor vendor (multi-field fuzzyMatch is unreliable). For category-wide expansion, use `lookup tech-vendors` with a `category` or `parentCategory` filter instead of fuzzyMatch -- returns the full vendor list for that category.
- `lookup tech-products vendor=<resolved-vendor-name>` -- returns the vendor's full product catalogue; select anchor products by name match. Requires at least one of `vendor`, `category`, or `parentCategory`.
- Aggregate to `{product_id, product_name, category, vendor}`.

To enumerate the full tech taxonomy (categories -> vendors -> products) instead of hardcoding, see the table in "Enumerating the full tech taxonomy via `lookup`" above.

If custom universe supplied, skip this step; attach category metadata for grouping.

### 5. Probe each product against the input company list

For each product ID, run one batched call (not one-per-company):

```
search_companies(
  companyId="<resolved IDs, comma-separated>",
  techAttributeTagList=<product-id>,
  pageSize=<N>
)
```

Cache per (product x company) into a matrix.

Batch limit: <=10 concurrent `search_companies` calls. For 30 products, 3 sequential batches of 10.

### 6. Build per-company snapshots

For each company:
- Group detections by category.
- Multi-product anomaly. If >=3 products in the same category are tagged (Marketo + Pardot + Marketing Cloud), surface "multi-product anomaly" flag. Don't pick a "primary." Common causes: multi-BU, stale tagging from acquisitions, ZI overlap. Surface so the user investigates.
- Stack signature. Top 4-5 detected tools as a short label (`Salesforce + Marketo + Snowflake + Mixpanel`). If <3 detections, label "sparse -- likely incomplete coverage."
- Identify coverage gaps -- categories with no detected product.
- Size vs. universe mismatch. If `employeeCount` < 50 AND universe is enterprise-default, surface: "small company / enterprise universe -- default universe may be blind to SMB tools (Pipedrive, Mailchimp, Zoho). Recommend switching to SMB universe or extending."

### 7. Map to displacement / integration angles

For each detected tool, apply the GTM-context-anchored angle library:

- In `get_gtm_context.competitors` -> displacement angle anchored on a GTM offering / value prop.
- In `get_gtm_context.offerings.integration_partners` -> integration angle.
- Neither -> neutral note; don't fabricate.
- Category gap mapping to a GTM offering -> opportunity flag (e.g., "No intent/ABM tool detected -- greenfield for [the matching GTM-context offering]").

### 8. Self-check before output

- [x] Resolution buckets clean.
- [x] No fabricated detections (every [yes] from a non-zero `search_companies` result).
- [x] Detections grouped by category.
- [x] Stack signature surfaced (or "sparse" label).
- [x] Coverage gaps explicit.
- [x] Plays anchored on GTM context (not generic).
- [x] "What we didn't check" caveat included.
- [x] Stale-tag caveat included.
- [x] Iteration options offered.

### 9. Present + offer iteration

1. Accept -- save universe + snapshot.
2. Extend the universe -- add products/vendors.
3. Drill into a category -- broaden the product list.
4. Drill into a company -- full vendor-by-vendor detail or run `account_research` for deal-context layered on top.
5. Switch use case -- battle-card / integration-partner-research / displacement-targeting.
6. Chain to `zoominfo-personalize-email` for a contact at a detected-competitor account.

## Anti-patterns

1. Fabricating tech presence. Never claim a tool is present if `search_companies` returned 0.
2. Overclaiming coverage. Default universe is ~30-50 of thousands of products; say so.
3. Absence-as-evidence-of-no-tool. "No tag detected" != "company doesn't use this." Could be data gap, recent adoption, or non-standard naming.
4. Generic displacement angles. "We're better than Salesforce" is not a play. Every angle anchored on GTM context.
5. Flat product list. Category grouping is mandatory.
6. Single-product vendor check. Salesforce has 70 tagged products -- the universe must include each vendor's major sub-products.
7. No GTM context -> block the run; skill can't produce plays.
8. Silent auto-pick on ambiguous resolution.

## Fallback rules

- `get_gtm_context` empty -> continue with detections only; suppress angle library; surface "no GTM context -- generic angles only."
- Vendor lookup fails for a category -> drop that vendor; flag.
- All products return 0 for a company -> "No tag matches in the universe checked. Could be ICP-mismatch (too small / wrong industry) or a data gap. Recommend manual verification."
- Ambiguous resolution -> pause; never silently pick.
- Failed resolution -> list separately.

## Output Format

### TL;DR -- Tech Stack Snapshot - N companies - Pass [M]

*Use case: [restate]. Universe: [N products across M categories].*

Resolution: [R resolved - A ambiguous - F failed].

Coverage snapshot:
- Most-detected category: [e.g., "CRM (3 of 3 companies)"]
- Most-frequent product: [e.g., "Salesforce: 2 of 3"]
- Notable gap: [e.g., "Intent/ABM detected at 0 of 3 -- greenfield for [matching offering]"]

---

### Resolution Summary

| Input | Resolved To | ZI ID | Status |
|---|---|---|---|

(Four-bucket framework as in `zoominfo-score-accounts`.)

### Per-Company Snapshots

For each resolved company:

```
## [Company Name] - ZI ID [id]
Stack signature: [tool] + [tool] + [tool] + [tool]

By category:
- CRM:                [yes] [Detected]  - [no] [Not detected -- list products checked]
- Marketing Auto:     [yes] [Detected]  - [no] [Not detected]
- Sales Engagement:   -- ([products checked]: no tag)
- Data Warehouse:     [yes] [Detected]  - [no] [Not detected]
- BI / Analytics:     [yes] [Detected]  - [no] [Not detected]
- Conversation Intel: -- ([products]: no tag)
- Intent / ABM:       -- ([products]: no tag) <- gap
- CDP:                -- ([products]: no tag)

Recommended plays:
- [Detected tool] (integration partner / displacement): [GTM-context-anchored angle].
- [Category gap]: [opportunity framing tied to a GTM offering].

Caveats:
- N products across M categories checked.
- Absence = no tag in ZI; could be data gap or non-standard naming.
- ZI tech-tagging refreshes on cycles; some tags may be 6+ months stale.
```

### Cross-Company Comparison (when N > 1)

| Product | Category | Acct A | Acct B | Acct C |
|---|---|---|---|---|

### Universe Reference

| Category | Products |
|---|---|

### Iteration Options

1. Accept -- save universe + snapshot.
2. Extend the universe.
3. Drill into a category.
4. Drill into a company.
5. Switch use case.
6. Chain to `zoominfo-personalize-email` for a detected-competitor account.

### Caveats (when relevant)

- Universe scope -- N products / M categories. Not exhaustive.
- Absence is absence. No tag != "doesn't use." Could be data gap, recent adoption, non-standard naming.
- Stale-tag risk. ZI tech-tagging refreshes on cycles; cross-check for high-stakes deal contexts.
- Vendor resolution failures. Any vendor that failed lookup is excluded from the universe; flag separately.
- GTM-context gaps. Sparse competitors / offerings -> generic angles. Recommend richer GTM context.

### Chain Targets

- `zoominfo-score-accounts` on the same list with technographic-weighted fit.
- `zoominfo-personalize-email` for a contact at a detected-competitor account -- anchor on the displacement angle.
- `zoominfo-find-similar` on a company with a strong stack -- find more accounts with the same signature.
- `zoominfo-account-research` to pair technographics with deal narrative.
