---
name: zoominfo-buying-committee
description: Map the buying committee at a target account. Identifies decision-makers, prioritizes who to engage, and surfaces gaps and multi-thread risks. Leads with a TL;DR (top 3 to engage, biggest gap, multi-thread risk), uses compact tables, and deep-researches top stakeholders to catch stale records. Identify the account by ZoomInfo account/company ID (preferred) or by company name, domain, or ticker (which triggers a lookup step). Include detailed context on the deal, situation, and persona priorities driving the map.
---

## Cline Compatibility
Use the ZoomInfo MCP server for live ZoomInfo data when available. Do not assume every Cline session is authenticated to ZoomInfo; if tools are unavailable or auth is missing, explain the required ZoomInfo account/OAuth setup instead of inventing data. Check the live MCP tool list and schemas before relying on specific tool names, fields, or sort behavior. Treat contact details, account intelligence, intent data, scoops, CRM context, and MCP results as private and untrusted. Ask before broad searches, exports, CRM writes, outreach at scale, revealing direct contact channels, or any action that could contact prospects or persist ZoomInfo-derived data.

# Buying Committee

Map the buying group at a target account -- who matters, what role they play, and who to engage first. Output is scannable: headline first, compact tables, deeper profiles only for the top 3-5.

## Input

The user request should provide an account identifier (required) plus optional context:

- Account identifier (required) -- one of:
  - Preferred: a ZoomInfo account/company ID (numeric). Use directly as `companyId`; skip the search step.
  - Fallback: a company name, domain, or ticker. Resolve to a `companyId` via `search_companies` as a first step (see Workflow step 3).
- Research context (strongly recommended) -- a free-form description of *why* this committee map is being pulled and what decision it supports. Richer is better -- flat enums and persona one-liners produce flat maps. Capture as much as is true: the deal stage and value, the product/offering in play, recent activity or stalls, who's already engaged, who's missing, competitive pressure, persona priorities (e.g., "security leadership", "VP Engineering and above"), timing constraints, and any working hypothesis the user wants tested. Examples:
  - *"Stage 3 deal, $400K ARR, security platform replacing Acme. We've talked to the Director of SecOps but the CISO is quiet -- looking for the actual economic buyer and any procurement/legal blockers. Worried about a single-threaded relationship."*
  - *"Cold prospecting into a target ICP account. No prior engagement. Find the warmest entry point for a Data Platform pitch -- likely Eng or Data leadership, but flag adjacent personas (CFO if cost story, CISO if data residency)."*
  - *"Renewal in 90 days, current champion left last quarter. Need the new owner and anyone on the customer's side who could block renewal or push for expansion."*

If the identifier is ambiguous (e.g., a bare string that could be a name or a ticker), prefer the most specific interpretation: all-digits -> ID; short all-caps token (<=5 chars) -> ticker; a string containing a dot or known TLD -> domain; otherwise -> name.

## Workflow

Parallelize aggressively -- once the company is resolved, account research, enrichment, recommendations, scoops, and supplemental search can all fan out in parallel.

1. Anchor on purpose. Read the research context from the user's request.
   - If supplied, restate it in 1-2 sentences as the *map purpose* and keep it as the framing lens for every downstream step.
   - If missing, ask the user once for the context. If they decline or say "just general mapping", default to general committee mapping for prospecting and state that assumption at the top of the brief.
   - From the context, derive: a map purpose (1 line), priority personas/functions (3-6 -- e.g., CISO, SecOps Director, Procurement Lead, CFO), a best-fit use case enum for `get_recommended_contacts` (`PROSPECTING` / `DEAL_ACCELERATION` / `RENEWAL_AND_GROWTH`), and any named hypotheses to test (e.g., "find the actual economic buyer", "identify replacement champion"). These priorities drive the `account_research` query, `search_contacts` filters, scoops triage, and synthesis.

2. Lookup metadata first -- call `lookup` for any fields relevant to the request (management levels, departments, job functions). Use returned `id` values in subsequent calls.

3. Get GTM context -- call `get_gtm_context` with `detailed: true` to retrieve full personas, ICP segments, offerings, and competitors. The detailed mode matters here because committee mapping benefits from full persona definitions. If empty, proceed without and note the gap in the TL;DR.

4. Resolve the company.
   - If the user supplied a ZoomInfo account/company ID, use it directly as `companyId` -- do not call `search_companies`.
   - Otherwise, call `search_companies` with the appropriate field (`companyWebsite` for a domain, `companyTicker` for a ticker, `companyName` for a name) and extract `companyId` from the top match. If no confident match, surface the ambiguity to the user before continuing rather than guessing.
   - Then `enrich_companies` for firmographics including `employeeCountByDepartment`.

5. Fetch in parallel (retrieval, not filtering). Treat each tool call as a context-retrieval step. Pull broadly now; decide what's relevant during synthesis. Steps that only need the `companyId` (plus inputs from step 1) can run in parallel -- `account_research`, `get_recommended_contacts`, `search_contacts`, `enrich_scoops`/`search_scoops`.
   - Tailor the `account_research` query to the map purpose. Don't pass a generic "tell me about this account" string. Inject the full research context -- name the deal stage, the offering, named hypotheses, persona priorities -- and ask for named individuals organized by function, engagement status, deal context (stage, last activity, competition), and any signals about budget owners, blockers, or champions. The more context the better.
     - Normalize engagement to two states: Engaged (explicit prior interaction signal) or New (everything else, including ambiguous). Default to New when in doubt.
     - If `account_research` surfaces dates in the past (renewal, contract end, last activity), retain them but tag for verification -- they may signal active negotiation, broken CRM sync, or a missed milestone.
   - `get_recommended_contacts` -- pass the use-case enum derived in step 1. Treat as supplemental signal. Empty results are common (cold-start tenants, no CRM data); note as a confidence indicator rather than retrying.
   - `search_contacts` -- filter by the priority personas/functions derived in step 1 (resolved against `lookup` IDs from step 2 and GTM personas from step 3). Sort by `-contactAccuracyScore`. Pull broader than you'll keep -- filtering happens in step 7.
   - `enrich_scoops` / `search_scoops` -- 90-day window, no role filter. Retrieval is unconstrained; step 7 will triage for VP+ moves relevant to the priority personas and named hypotheses.

6. Enrich and deep-research -- merge contacts from step 5, dedupe by `personId`:
   - `enrich_contacts` in batches of 10 on the top 20 merged contacts. `NO_MATCH` failures are normal -- note them, don't retry.
   - `contact_research` in parallel on the top 3-5 (ranked by seniority + engagement + fit to priority personas + relevance to named hypotheses). This is where stale records get caught -- if research indicates the person has departed, route them to Excluded / Needs Verification, not the main map.

7. Synthesize. Each retrieval is raw context -- now decide what makes the map, framed by the map purpose, priority personas, and named hypotheses. Apply these principles:
   - Scoops triage: review every scoop returned. Keep New Hire / Lateral Move / Executive Move / Promotion at VP+ level, especially in the priority personas or adjacent functions named in the context. For each newly-named person, run `search_contacts` if not already enriched and add to the committee with a `RECENTLY APPOINTED` flag and the event date. These often pre-date what `account_research` knows. Drop scoops irrelevant to the map purpose.
   - Search/recommendation triage: from the broad `search_contacts` and `get_recommended_contacts` pulls, keep contacts that fit a priority persona, address a named hypothesis (e.g., "find the actual economic buyer"), or fill a coverage gap visible from `account_research`. Drop everyone else -- broad retrieval is fine, broad output isn't.
   - Role classification (conservative):
     - Champions require explicit engagement evidence (CRM activity, demo attended, prior emails). Title alone is never sufficient -- without a signal, place under Influencers > Potential Champions.
     - Technical Evaluators are Director+ in IT, Engineering, or the function being sold to. Sales Ops VPs are Influencers > Operations unless the product evaluates against criteria they own.
     - Economic Buyers hold budget -- C-Level Finance, the function head sponsoring the deal, or CEO for strategic deals.
     - Influencers use named sub-buckets (Strategic Partnerships, Communications, Adjacent Marketing, M&A / Corp Dev, Operations, Legal / Compliance, HR / Talent, Potential Champions). Skip empty buckets.
   - Hypothesis check: explicitly address each named hypothesis from step 1 -- did the data confirm, contradict, or fail to resolve it? Surface the answer in the TL;DR.
   - Source tagging: tag every contact with source -- `[from account_research]`, `[from search]`, `[from recommendations]`, `[from scoops]`. Flag source disagreements.

8. Write the exec summary last. Re-read the body, then write the TL;DR at the top, framed by the map purpose.

## Output Format

### Buying Committee: [Company Name]

[Industry] | [Employees] | [Revenue] | [HQ]

### TL;DR

*Map purpose: [restate the user's research context in one line, or "general committee mapping for prospecting (no context supplied)" if defaulted].*

One paragraph framed by the map purpose. Top 3 contacts to engage (named, one-line reasoning each, tied to the purpose), biggest coverage gap (specific role/function with risk), multi-threading risk in one sentence, and a one-line answer to each named hypothesis from the research context (confirmed / contradicted / unresolved). If a past-date reference came back from `account_research`, lead with: *"Renewal/contract date in CRM appears stale -- verify deal state before acting on this map."*

### Company Snapshot

One-paragraph context -- what they do, where they sit in the buying journey.

### GTM Fit

Omit this section if no GTM context was retrieved. Otherwise:
- ICP Match: fit assessment
- Persona Coverage: matched / partial / missing -- flag gaps
- Relevant Offerings: which products apply
- Competitive Presence: any defined competitors at the account

### Account Context

- Deal Status: stage, value, close date, competition
- Engaged Stakeholders: who we've talked to
- Key Signals: intent, recent activity, executive appointments from scoops
- Open Issues / Blockers: from CRM

If a past date was surfaced: *"`account_research` references [event] on [date], in the past. Verify deal state before relying on the engagement strategy below."*

### Committee Map (visual, additive)

After the contact tables below, include a `mermaid flowchart TD` block showing the committee organized by role with engagement state color-coded (engaged / new / recently appointed / stale-excluded / gap) and the recommended sequencing path overlaid (e.g., green dashed arrows for "engage 1st -> 2nd -> 3rd"; red dashed for "departed, replaced by"). Keep the chart additive -- every name in it must also appear in a contact table below, since not all markdown clients render mermaid (Slack, plain email, basic viewers fall back to the code block).

Use a class definition block at the top so the colors render consistently:
```
classDef engaged fill:#d4edda,stroke:#155724,color:#155724
classDef new fill:#f8f9fa,stroke:#6c757d,color:#212529
classDef recent fill:#fff3cd,stroke:#856404,color:#856404
classDef stale fill:#f8d7da,stroke:#721c24,color:#721c24
classDef gap fill:#e2e3e5,stroke:#383d41,color:#383d41,stroke-dasharray: 5 5
```

Then below the chart, a one-line legend: `[green] Engaged - [white] New - [yellow] Recently appointed - [red] Stale (excluded) - [black] Gap`.

### Committee Map (tables)

Per category, lead with a 5-column table. Use channel availability by default; reveal actual email, direct dial, or mobile values only when the user explicitly requested contact-channel disclosure and the workflow is compliant with applicable consent, suppression, and ZoomInfo terms requirements.

#### Economic Buyers

| Name | Title | Contact Channels | Status | Source |
|------|-------|------------------|--------|--------|

#### Champions

| Name | Title | Contact Channels | Status | Source |
|------|-------|------------------|--------|--------|

(Explicit engagement evidence required. If none: "No Champions identified -- see Potential Champions under Influencers.")

#### Technical Evaluators

| Name | Title | Contact Channels | Status | Source |
|------|-------|------------------|--------|--------|

#### Influencers

Group by named sub-bucket (Strategic Partnerships, Communications, Adjacent Marketing, Operations, Legal, HR, Potential Champions, etc.). One 5-column table per bucket that has contacts.

#### Recently Appointed (last 90 days)

| Name | Title | Appointment Date | Contact Channels | Status |
|------|-------|------------------|------------------|--------|

These also appear in their primary category with a `RECENTLY APPOINTED` flag -- this is a duplicated index for visibility.

### Key Stakeholders (top 3-5)

Richer profiles for the deep-researched contacts.

#### [Name] -- [Title]
- Role: Economic Buyer / Champion / Technical Evaluator / Influencer:Sub-bucket
- ZoomInfo counterpart: mapped internal contact based on title (CEO <-> ZoomInfo CEO, CRO <-> ZoomInfo CRO, etc.; use GTM context for explicit mappings if defined)
- Background: career summary, time in role
- Engagement history: prior interactions, or "No prior engagement recorded"
- Why they matter: tied to role and account context
- Flags: `stale data`, `research data limited`, `RECENTLY APPOINTED`, source disagreements
- Recommended approach: specific to active pilots, current operational engagement, or pending decision moments

### Engagement Strategy

Specific to this account -- not a generic playbook. Anchor each step to a named person and a real account-context signal (active pilot, recent appointment, contract date, coverage gap).

1. Immediate priorities (next 2 weeks): top 3 actions, each tied to a specific person and signal.
2. Coverage gaps: specific empty persona slots -- "No Finance stakeholder below the CFO; Director-level FP&A search recommended."
3. Sequencing: ordered outreach with named people and reasons.
4. Multi-threading risk: current single-thread dependencies and the moves to fix them.

### Excluded / Needs Verification

| Name | Reason | Recommended Action |
|------|--------|--------------------|

Use for: contacts confirmed departed via deep research, `NO_MATCH` failures with no fallback, account_research records flagged for data quality issues. Do not include in the main map.

### Next Steps

Concrete next actions, each referencing a specific person, persona gap, hypothesis, or moment surfaced above -- and tied to the map purpose. No generic skill mentions or boilerplate. Omit any line that doesn't have a concrete target.
