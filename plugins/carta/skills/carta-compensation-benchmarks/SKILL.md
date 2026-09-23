---
name: carta-compensation-benchmarks
description: >
  Retrieves Carta Total Compensation market benchmarks (salary, equity, total cash) for a role. Output to chat or CSV.
  Market benchmarks are triggered by queries like: "sales benchmarks", "comp benchmarks", "market rate", "what does a [role] pay", "put benchmarks in a CSV".
  Do NOT use for job classification or role mapping -- use carta-compensation-rolematcher for that.
  Do NOT use for fund performance benchmarks (use carta-performance-benchmarks) or portfolio structural metrics like SAFE terms and option pool sizes (use carta-market-benchmarks).
version: 1.0.0
model: sonnet
---

## Cline Compatibility

Use the plugin-owned `carta` MCP server in Cline. When this skill references `${CLAUDE_PLUGIN_ROOT}`, resolve the referenced file relative to this installed skill directory. Ask focused clarification questions in chat when the source text says to use a host-specific question tool.

# Benchmark Query

Look up Carta Total Compensation (CTC) market salary and equity benchmarks for a role at a specific corporation.

> CRITICAL -- Casing rule for ALL user-facing CTC values.
>
> In every part of your response that the user reads -- chat narration, status updates, table headers, table cells, chart titles, CSV column values, file summaries, follow-up suggestions -- render CTC taxonomy values in Title Case display form, never the UPPER_SNAKE_CASE API enums. This matches the carta-compensation-rolematcher output convention so the plugin's voice is consistent.
>
> | Field | Use in user-facing text | Never |
> |---|---|---|
> | Job area | `Engineering`, `Sales`, `Customer Success`, `Project Management`, `Human Resources` | `ENGINEER`, `SALES`, `CUSTOMER_SUCCESS`, `PROJECT_MANAGEMENT`, `HR` |
> | Focus | `DevOps and Site Reliability`, `Account Executive`, `FP&A` | `devops and site reliability`, `account executive`, `fp&a` |
> | Level | `Entry`, `Mid 1`, `Senior 1`, `Staff 2`, `VP 1`, `C-Level`, `CEO`, `Unknown` | `ENTRY`, `MID1`, `SENIOR1`, `STAFF2`, `VP1`, `C_LEVEL`, `UNKNOWN` |
> | Track | `IC`, `Manager`, `Executive`, `Unknown` | `ic`, `manager`, `executive`, `UNKNOWN` |
>
> The UPPER_SNAKE_CASE enums are only for machine handoff -- i.e. the `job`, `level`, `focus`, `is_leader` parameters you pass to `compensation:get:benchmark`. Inside the JSON payload for the API call, keep the enum form. Outside the API call, switch to Title Case before any value reaches the user. Even in narration like "Engineering maps to ENGINEER", drop the API enum -- say *"Pulling Engineering benchmarks for corp 7"* instead.
>
> See `carta-compensation-rolematcher` -> "Display -> API enum tables" for the full mapping.

> Use MCP, not CLI. Every API call in this skill goes through the carta MCP server's `mcp__carta__call_tool` tool, with `compensation:*` commands. Do NOT shell out to the `carta` CLI (`carta compensation ...`, `carta web ...`, etc.) -- that bypasses the formatters, the 403 handler, and the attribution requirement. The Bash tool is allowed only for writing CSV/JSON files locally, never for calling Carta APIs.
>
> Examples below use shorthand `call_tool({"name": "compensation__get__plan", "arguments": {...}})` -- read this as `mcp__carta__call_tool({"name": "compensation__get__plan", "arguments": {...}})`.

> CRITICAL -- Show only PERCENTILE columns (p25/p50/p75/p90) for all three rating types.
>
> The `compensation:get:benchmark` response includes both `low/mid/high` bands AND `p25/p50/p75/p90` percentiles. Surface only the percentiles -- they are the raw market data. Skip the band fields entirely (they're a derived corp-specific target band that adds noise without adding information for benchmark queries).
>
> Every output (chat reply, CSV, JSON) MUST include all three rating types: salary, equity, AND total cash. Don't stop at salary.
>
> ### Chat reply format (single role)
>
> Three small tables, one per rating type. Each has 4 columns: P25, P50, P75, P90.
>
> ```
> ## Market Benchmark: [Role] at [Company]
>
> Salary
> | P25 | P50 | P75 | P90 |
> |-----|-----|-----|-----|
> | $145,000 | $164,000 | $186,000 | $210,000 |
>
> Total Cash Compensation (TCC)
> | P25 | P50 | P75 | P90 |
> |-----|-----|-----|-----|
> | $164,000 | $185,000 | $210,000 | $237,000 |
>
> Equity (4-Year Grant)
> | Metric | P25 | P50 | P75 | P90 |
> |--------|-----|-----|-----|-----|
> | FD % | 0.030% | 0.040% | 0.050% | 0.144% |
> | Shares | 18,620 | 24,745 | 30,870 | 88,444 |
> | Notional value | $100,000 | $133,000 | $165,000 | $474,000 |
>
> The 4-year grant view is the default -- it matches the "Equity (4 year award)" columns in the CTC Total Compensation product UI (set by passing `equity_quantity=FOUR_YEAR_GRANT` to `compensation:get:benchmark`; see Step 4). If the user explicitly asks for "annual" / "NTM" / "next-twelve-months" equity, pass `equity_quantity=NTM_VESTING` instead and rename this header to Equity (Annual NTM Vesting).
>
> (For peer groups >= $500M post money -- `peer_group.notional_available: true` -- put Notional value as the first row instead.)
>
> Geo Adjustment: [location] (X.XX× salary, X.XX× equity)
>
> ---
> *Data source: Companies with [peer_group_dimension_phrase] [peer_group_label]. Benchmarks released [Month YYYY].*
>
> The `[peer_group_dimension_phrase]` placeholder is required and varies by dimension -- see the "Required attribution" block below for the three exact phrasings. Do NOT hardcode `post money valuations between` here regardless of what corp you're looking at; the phrase depends on `peer_group.dimension`.
> ```
>
> ### CSV format (bulk)
>
> One row per `(job, ladder, level)`. Default column order (peer group < $500M post money):
>
> ```
> job, ladder, level, currency,
> salary_p25, salary_p50, salary_p75, salary_p90,
> tcc_p25, tcc_p50, tcc_p75, tcc_p90,
> equity_fd_pct_p25, equity_fd_pct_p50, equity_fd_pct_p75, equity_fd_pct_p90,
> equity_shares_p25, equity_shares_p50, equity_shares_p75, equity_shares_p90,
> equity_notional_p25, equity_notional_p50, equity_notional_p75, equity_notional_p90
> ```
>
> For peer groups >= $500M post money (`peer_group.notional_available: true`), notional comes first:
>
> ```
> ..., equity_notional_p25..p90, equity_fd_pct_p25..p90, equity_shares_p25..p90
> ```
>
> Field source map (from each `benchmarks[i]` entry):
> - `salary_p*` -> `salary_benchmarks.percentiles.{p25,p50,p75,p90}`
> - `tcc_p*` -> `tcc_benchmarks.percentiles.{p25,p50,p75,p90}`
> - `equity_shares_p*` -> `equity_benchmarks.percentiles.{p25,p50,p75,p90}.as_shares`
> - `equity_fd_pct_p*` -> `equity_benchmarks.percentiles.{p25,p50,p75,p90}.as_fd_percentage`
> - `equity_notional_p*` -> `equity_benchmarks.percentiles.{p25,p50,p75,p90}.as_notional_value`
> - `currency` -> `salary_benchmarks.currency_code`
>
> Note: equity percentiles are nested objects (`percentiles.p25.as_shares`, etc.), not flat values like salary/tcc.
>
> If a column's source field is missing for a particular row (e.g. some roles have no equity), leave that cell blank -- do not invent zeros and do not drop the column.
>
> Anti-patterns:
> - ❌ Showing the user a low/mid/high table. Those are the corp's pay-band target, not market data -- skip them.
> - ❌ CSV with `salary_low / salary_mid / salary_high` columns instead of percentile columns.
> - ❌ Salary-only output. The user asked for "benchmarks" -- show all three rating types.
> - ❌ Skipping TCC because "the user said sales benchmarks" -- TCC IS a benchmark.

> CRITICAL -- Required attribution on every benchmark response
>
> Whenever you surface ANY Carta Total Compensation benchmark data (single lookup, bulk table, comparison, follow-up answer, CSV, Markdown, JSON export -- anything that contains target $, percentile, compa-ratio, score, or per-role/level numbers), you MUST include the attribution string in EVERY output channel -- chat reply AND every file you generate.
>
> ### The exact string
>
> ```
> Data source: Companies with <peer_group_dimension_phrase> <peer_group_label>. Benchmarks released <Month> <YYYY>.
> ```
>
> Three placeholders, all required:
>
> 1. `<peer_group_dimension_phrase>` -- depends on which peer-group dimension the corp's plan uses (`peer_group.dimension` from `compensation:get:plan`). The skill chooses one of three exact phrasings:
>    - `post_money` -> *"post money valuations between"*
>    - `capital_raised` -> *"capital raised between"*
>    - `headcount` -> *"headcount of"*
> 2. `<peer_group_label>` -- `peer_group.label` from the same response (e.g. `"$50M-$100M"`, `"$1M-$10M"`, `"100-500 employees"`).
> 3. `<Month> <YYYY>` -- a calendar date derived from `benchmark_version.created`. NOT a version number.
>
> Examples of correct values:
>
> | `peer_group.dimension` | `peer_group.label` | `benchmark_version.created` | Correct attribution |
> |---|---|---|---|
> | `post_money` | `"$50M-$100M"` | `"2026-05-06T14:42:41Z"` | `Data source: Companies with post money valuations between $50M-$100M. Benchmarks released May 2026.` |
> | `post_money` | `"$500M-$1B"` | `"2026-02-15T08:00:00Z"` | `Data source: Companies with post money valuations between $500M-$1B. Benchmarks released February 2026.` |
> | `capital_raised` | `"$1M-$10M"` | `"2025-06-26T21:19:22Z"` | `Data source: Companies with capital raised between $1M-$10M. Benchmarks released June 2025.` |
> | `capital_raised` | `"$10M-$25M"` | `"2025-11-30T23:59:59Z"` | `Data source: Companies with capital raised between $10M-$25M. Benchmarks released November 2025.` |
> | `headcount` | `"100-500 employees"` | `"2026-01-15T08:00:00Z"` | `Data source: Companies with headcount of 100-500 employees. Benchmarks released January 2026.` |
>
> Anti-patterns -- do NOT do these:
> - ❌ Hardcoding "post money valuations" when the corp's plan actually uses capital-raised or headcount -- that misrepresents the comparison set
> - ❌ Omitting the peer-group sentence -- the citation must always name the comparison set
> - ❌ `Data source: ... released v24.6` -- that's the version number, not the date
> - ❌ `Data source: ... released benchmark v24.6 (May 2026)` -- drop the version, just use the month + year
> - ❌ Omitting it from the CSV because "the chat reply has it"
> - ❌ Putting it only in a separate "Source" sheet without also placing it visibly in the data
> - ❌ Using `version_major`, `version_minor`, or the `version` string anywhere in the attribution
> - ❌ Using the internal enum code instead of the human label (`$50M-$100M`) -- always use `peer_group.label`, never `peer_group.code`
>
> ### Where to place it
>
> | Output type | Placement (required) |
> |---|---|
> | Chat reply | Last line of the message, italicized, after a `---` horizontal rule |
> | Markdown file | Last line of the file, italicized, after a `---` horizontal rule |
> | CSV file | Final row, e.g. `Data source,Companies with capital raised between $1M-$10M. Benchmarks released June 2025.` (use 1 cell or split across 2; both work) |
> | JSON export | Top-level `"_source": "Companies with capital raised between $1M-$10M. Benchmarks released June 2025."` field |
>
> ### Pre-send checklist (run before every response that touches benchmark data)
>
> 1. Did I read `peer_group.dimension` from the `compensation:get:plan` response and pick the right phrase (`post money valuations between` / `capital raised between` / `headcount of`)?
> 2. Did I read `peer_group.label` and put it in the citation?
> 3. Did I derive the date from the benchmark version's `created` ISO timestamp? (Not from `version`, `version_major`, `version_minor`.)
> 4. Did I format it as `<Month name> <YYYY>` with no version number?
> 5. Is the attribution in the chat reply?
> 6. If I generated a file, is the attribution INSIDE the file too?
> 7. If multiple versions were used, did I list each with its own date?
>
> If any answer is no, fix it before sending. This is non-negotiable, even when the user asks for terse output.

## When to Use

- "What's the market rate for a senior engineer in San Francisco?"
- "Benchmark this role: Staff Product Manager, NYC"
- "How does our offer compare to market for a mid-level designer?"
- "What's the equity benchmark for a Director of Engineering?"
- "Show me CTC data for a [role] at [company]"

## Prerequisites

1. A corporation -- resolved automatically from your accounts (see Step 1 below). If you have multiple corps, you'll be asked once to pick one.
2. A role description or job title -- free text is fine, the rolematcher maps it to the CTC taxonomy.

## Workflow

### Step 1 -- Resolve corporation (REQUIRED before anything else)

> Do this ONCE, upfront, before calling any compensation endpoint. Do not start fetching subscription status or plan data until you have a confirmed `corporation_id`.

Resolve in this priority order -- stop as soon as one path succeeds:

Path 1 -- Explicit numeric ID in the prompt (highest priority, no API call needed)

If the user mentioned a numeric corporation ID anywhere (e.g. *"corp 7"*, *"corp id 7"*, *"corporation_id=7"*, *"for company 728"*), use that exact integer. Do not call `list_accounts`. Do not search for it. Do not substitute a similar-looking ID.

> Anti-patterns:
> - ❌ User says "corp 7" -> agent calls `list_accounts(search="7")` -- `list_accounts` searches by name substring, not ID. "7" matches every corp with "7" in its name.
> - ❌ User says "corp 7" -> agent picks a corp from a previous turn. Each prompt's corp ID overrides any prior context.

Path 2 -- Company name in prompt

If the user named a company (e.g. *"benchmarks for Acme"*), call `list_accounts(search="Acme")`. Filter results to entries where `id` starts with `corporation_pk:`. If exactly one match, use it. If multiple, proceed to Path 4.

Path 3 -- Single account (auto-select, no question needed)

If the user gave no corp hint at all, call `list_accounts()` with no search. Filter to `corporation_pk:` entries. If exactly one corporation is returned, use it automatically -- do not ask the user to confirm something they have no choice about.

Path 4 -- Multiple accounts (ask once, cleanly)

If multiple corporations are found, use `ask the user` immediately:
- Question: *"Which company should I look up benchmarks for?"*
- Options: corporation names from the list (cap at 10; offer "Other" if more)

Do not show the user a raw JSON dump of accounts. Do not attempt any compensation call before they answer.

> HARD STOP -- user dismissed the question:
>
> If the user closed the prompt, said "cancel", "never mind", or otherwise did not select an option -- STOP. Do not guess a corp. Do not call any compensation endpoint. Reply:
>
> > *"No problem -- let me know which corporation to look up benchmarks for (name or numeric ID) when you're ready. If there's something else I can help with in the meantime, just ask."*
>
> Picking a corp the user didn't authorize would return data for the wrong company. There is no recovery from that mistake.

Note: `list_contexts` / `set_context` are for Fund Admin firms -- they do not return corporations. Always use `list_accounts` for corporation lookup.

Extract the numeric `corporation_pk` (the integer after `corporation_pk:`) for all subsequent calls.

### Step 2 -- Map role to CTC taxonomy

Load the bundled `carta-compensation-rolematcher` skill to classify free-text job titles, descriptions, or pasted job postings into the CTC taxonomy. Pass the user's role description as input. Do not freelance the mapping -- the rolematcher has the canonical job_area / focus / level / track logic and will return values that align with the CTC enums.

When to invoke: anytime the user provides a job title or job description in the context of a benchmark/comp conversation, even if their phrasing sounds like something else. Treat all of these as rolematcher invocations:

- *"What role is this?"* (explicit)
- *"Match this job description to the CTC taxonomy"* (explicit)
- *"What would be a good role for this job description?"* (asking for the taxonomy match)
- *"What's a good job description for this role?"* (the user is showing you a JD and asking about classification -- even though "for this role" sounds like reverse direction, in a benchmark context the JD is the input and the taxonomy match is the output)
- *"What level is this?"* / *"What level does this map to?"*
- *"How does this fit?"* (when paired with a JD or title)
- Any time the user pastes a multi-line job description after a benchmark query -- they're almost always asking how it maps

If the user's question is ambiguous between "classify this for benchmark" vs "help me write the JD copy" vs "give me career advice", invoke the rolematcher first to get the classification, then use the result to answer their actual question. Do not skip the rolematcher and freelance -- the user is in a comp/benchmark conversation.

Capture the output:
- `job_area` -- must be one of: `ACCOUNTING`, `ADMIN`, `CEO`, `CORPORATE_AFFAIRS`, `CUSTOMER_SUCCESS`, `DATA`, `DESIGN`, `ENGINEER`, `FINANCE`, `HR`, `IT`, `LEGAL`, `MANUFACTURING`, `MARKETING`, `OPERATIONS`, `PRODUCT`, `PROJECT_MANAGEMENT`, `RESEARCH`, `SALES`, `STRATEGY`, `SUPPORT`, `OTHER`
- `focus` (e.g. `"backend"`, `"devops and site reliability"`, `null`) -- job-area-dependent; the rolematcher returns lowercase multi-word strings matching the taxonomy verbatim -- pass them through as-is to the API
- `level` -- must be one of (low to high seniority): `ENTRY`, `MID1`, `MID2`, `SENIOR1`, `SENIOR2`, `STAFF1`, `STAFF2`, `PRINCIPAL`, `VP1`, `VP2`, `C_LEVEL`, `CEO`
- `track` -- the value returned by the rolematcher (`ic`, `manager`, `executive`, or `UNKNOWN`). Map to `is_leader`: `manager` or `executive` -> `true`, `ic` -> `false`. If `UNKNOWN`, stop and ask the user before calling the API -- see Error Handling.

If the rolematcher returns a value not in these enums (e.g. `LEAD1`, `PRODUCT_MANAGER`), map it to the closest valid value before calling the API. If unsure, inspect the available Carta compensation MCP tool metadata when exposed, or ask the user.

If the user provides only a job title, that is sufficient minimum input for the rolematcher.

Anti-patterns:
- ❌ Freelancing the taxonomy mapping ("this looks like SENIOR2 to me") -- always defer to `carta-compensation-rolematcher` for the classification

### Step 3a -- Verify CTC subscription (REQUIRED)

```
call_tool({"name": "compensation__get__subscription_status", "arguments": {"corporation_id": <corporation_pk>}})
```

If `is_subscribed` is False, stop here and send the subscription message (see Subscription gating section below). Do not call `plans/` or `benchmark/` -- they will return empty data anyway and waste a round-trip.

### Step 3b -- Fetch the corporation's active benchmark version + peer group

```
call_tool({"name": "compensation__get__plan", "arguments": {"corporation_id": <corporation_pk>}})
```

Capture three things from the response:
- `benchmark_version.id` -- use as `benchmark_version_id` in the next step.
- `peer_group` -- `{code, label, dimension, notional_available}`. The `label` (e.g. `"$50M-$100M"`, `"$1M-$10M"`, `"100-500 employees"`) is required for the data-source footnote. The `notional_available` boolean tells you the equity column order (see Step 5).
- `peer_group.dimension` -- one of `post_money` / `capital_raised` / `headcount`. This tells you which bucket param to pass in Step 4 (`post_money_bucket` / `capital_raised_bucket` / `headcount_bucket`) AND which phrasing to use in the data-source attribution. Many corps default to `capital_raised` -- do not assume `post_money`.

### Step 4 -- Fetch the benchmark

```
call_tool({"name": "compensation__get__benchmark", "arguments": {
  "corporation_id": <corporation_pk>,
  "job": <job_area>,                        # omit to get ALL job areas
  "level": <level>,                         # omit to get ALL levels for the job
  "focus": <focus>,                         # omit if null
  "is_leader": <true if track == "manager" or track == "executive" else false>,
  "benchmark_version_id": <benchmark_version.id>,
  "location": <location string>,            # optional, for geo adjustment

  # --- The corp's plan-default peer group. Include EXACTLY ONE bucket
  #     param. Do NOT include two or three. Pick the key by string-mapping
  #     `peer_group.dimension` from the plan response:
  #
  #         peer_group.dimension          key to use
  #         ────────────────────────      ─────────────────────────
  #         "post_money"               ->  "post_money_bucket"
  #         "capital_raised"           ->  "capital_raised_bucket"
  #         "headcount"                ->  "headcount_bucket"
  #         null / unknown             ->  STOP -- see Step 4a below
  #
  #     The value is always `peer_group.code` from the plan response.
  "<peer_group_dimension>_bucket": <peer_group.code>,   # ONLY ONE -- see mapping above

  # ⚠ DO NOT include the other two bucket params in the same call. The enum
  # values are dimension-specific (PostMoneyBuckets vs CapitalRaisedBuckets
  # vs HeadcountBuckets are disjoint), so a code value valid for one bucket
  # param is invalid for the other two -- including more than one will either
  # silently override (which one wins is undefined and may change) or return
  # HTTP 400.
  #
  # Example: Meetly's plan returns peer_group = {dimension: "post_money",
  # code: "ONE_HUNDRED_MILLION", label: "$100M-$250M"}. The right call passes:
  #     "post_money_bucket": "ONE_HUNDRED_MILLION"
  # Not:
  #     "capital_raised_bucket": "ONE_HUNDRED_MILLION"   <- 400 Bad Request
  #     (also wrong: passing both -- only one bucket param per call)

  # --- Match the CTC product UI's defaults so the skill's numbers tie out
  #     against what HR users see at /benchmarks/employee?corporationId=N
  "equity_quantity": "FOUR_YEAR_GRANT",          # The default in the CTC UI's "Equity (4 year award)"
                                                  # columns. Pass "NTM_VESTING" only when the user
                                                  # explicitly asks for "annual" / "NTM" equity.
  "equity_competitiveness_percentile": 50,        # Market median. Overrides the plan's per-job-area
  "salary_competitiveness_percentile": 50,        # competitiveness target. Pass a different integer
                                                  # (e.g. 75) if the user asks for a different posture.
  "industry": "all"                               # No industry filter; pass an industry enum if the
                                                  # user explicitly scopes the query to one vertical.
}})
```

No input pay required. This command returns raw market bands (salary, equity, total cash) directly.

Why all those defaults? The skill's output is most useful when its numbers tie out against the CTC product UI's "Employee Benchmarks" page. The frontend defaults to `equity_quantity=FOUR_YEAR_GRANT`, `equity_competitiveness_percentile=50`, `salary_competitiveness_percentile=50`, `industry=all`, plus the corp's plan-default peer group dimension. Sending the same params produces matching numbers; omitting them returns plan-derived bands instead of the percentile data HR users compare against.

Peer-group override (user-driven sensitivity analysis). When the user explicitly asks to see a different peer group than the corp's plan default (*"show me $10M-$25M benchmarks instead"* or *"what would this look like for a 100-500 person company"*), DROP the plan-default bucket param entirely and replace it with the override. Do not include both -- the API's behavior when more than one bucket is non-null is undefined and may change.

So a Meetly-corp call that normally has `post_money_bucket: "ONE_HUNDRED_MILLION"` (plan default), when the user asks for "show me the $1M-$10M raised peer group instead", becomes:

```
call_tool({"name": "compensation__get__benchmark", "arguments": {
  "corporation_id": 7, "job": "ENGINEER", "level": "ENTRY",
  # post_money_bucket DROPPED -- replaced by capital_raised_bucket below
  "capital_raised_bucket": "ONE_TO_TEN_MILLION",
  "equity_quantity": "FOUR_YEAR_GRANT",
  ...
}})
```

User-phrasing -> override mapping:

| User says | Bucket param key | Bucket value (note: each dimension's enum uses different naming) |
|---|---|---|
| *"$10M-$25M valuation"* | `post_money_bucket` | `TEN_MILLION` (post-money enum uses single-lower-bound names) |
| *"$25M-$50M valuation"* | `post_money_bucket` | `TWENTY_FIVE_MILLION` |
| *"$1M-$10M raised"* | `capital_raised_bucket` | `ONE_TO_TEN_MILLION` (capital-raised enum uses range names) |
| *"$10M-$25M raised"* | `capital_raised_bucket` | `TEN_TO_TWENTY_FIVE_MILLION` |
| *"100-500 employees"* | `headcount_bucket` | `HUNDRED_TO_FIVE_HUNDRED` |
| *"25-100 employees"* | `headcount_bucket` | `TWENTY_FIVE_TO_HUNDRED` |

Important: the naming asymmetry between the three enums is intentional, not a typo.

- `PostMoneyBuckets` names a bucket by its lower bound only: `TEN_MILLION` IS the `$10M-$25M` band.
- `CapitalRaisedBuckets` and `HeadcountBuckets` name a bucket by its explicit range: `TEN_TO_TWENTY_FIVE_MILLION` is the `$10M-$25M` band.

Do NOT "fix" `post_money_bucket: "TEN_MILLION"` to `post_money_bucket: "TEN_TO_TWENTY_FIVE_MILLION"` thinking it's a typo. The post-money enum has no `_TO_` form -- passing `TEN_TO_TWENTY_FIVE_MILLION` returns HTTP 400.

Reference for the full enum sets is in `compensation:get:benchmark`'s description. Inspect the available Carta compensation MCP tool metadata when exposed if you need to verify a specific value.

### Step 4a -- Unknown / missing `peer_group.dimension` (STOP)

If `compensation:get:plan` returned a `peer_group.dimension` value that is not one of `post_money` / `capital_raised` / `headcount`, OR `peer_group.dimension` is null / absent entirely, stop. Do not attempt the benchmark fetch. Do not guess a bucket param.

Tell the user:

> *"I can't pull benchmarks for [Company Name] -- the corporation's plan returned an unexpected peer-group dimension (`<dimension value>`), so I don't know which peer-group bucket to query. This usually means compensation-service shipped a new dimension type the skill hasn't been updated for. Please reach out to the CTC team to confirm the corp's plan configuration."*

Why this is a stop-not-guess: each dimension's bucket param accepts values from a different enum. Picking a default would either send a code value that's invalid for the chosen param (HTTP 400) or -- worse -- accidentally return data from the wrong peer-group dimension, which would mislead the user with numbers that don't match what they see in the product UI.

If the dimension is one of the three known values, continue to Step 4 above.

### Step 4 -- bulk-fetch nuances

Single-job bulk: omit `level` to get every level for one job in one call (~17 rows, fits well under the response budget).

Multi-job bulk (CSV across all functions): issue one call per job area in parallel -- do not omit both `job` and `level`. The unfiltered query returns ~22 jobs × ~17 levels in a single payload that exceeds the 40K-char response budget and will be rejected with `"response too large"`. Iterating per-job stays inside the budget and parallelizes cleanly.

### Step 5 -- Present results

The response shape is:

```
{
  "benchmarks": [
    {
      "job": "ENGINEER", "ladder": "IC", "level": "SENIOR1",
      "salary_benchmarks": {
        "yearly_salary": {"low": "158000.00", "mid": "186000.00", "high": "214000.00"},
        "percentiles": {"p25": "...", "p50": "...", "p75": "...", "p90": "..."},
        "currency_code": "USD"
      },
      "equity_benchmarks": {
        "as_fd_percentage": {"low": "...", "mid": "0.012600", "high": "..."},
        "as_shares": {"low": "...", "mid": "7717.00", "high": "..."},
        "as_notional_value": {"low": "...", "mid": "41000.00", "high": "..."},
        "percentiles": {...},
        "quantity": "FOUR_YEAR_GRANT"
      },
      "tcc_benchmarks": {
        "yearly_tcc": {"low": "...", "mid": "210000.00", "high": "..."},
        "percentiles": {...}
      },
      "geo_adjustment": {"label": "...", ...}
    },
    ...
  ],
  "count": N,
  "benchmark_version": {"id": ..., "version_major": ..., "version_minor": ..., "created": "...", "description": "..."}
}
```

Three rating types -- show only the percentile distribution (p25/p50/p75/p90) for each. The `low/mid/high` band fields are derived from the corp's pay-philosophy target percentile and a configured spread; they're noise for benchmark queries. Read the percentiles directly from the response.

Null percentile handling -- no fallbacks allowed:
If a percentile field (`p25`, `p50`, `p75`, `p90`) is `null` or absent, render it as `--` in the table. Do not substitute `yearly_salary.mid`, `yearly_salary.low`, or any other band field. Do not infer, interpolate, or borrow values from adjacent fields. A `--` is correct and honest; a band value presented as a percentile is misleading.

Sparse benchmark version message:
If some or all percentiles are null (older benchmark versions may only populate a subset), add a note below the table:

> *Some percentiles are unavailable -- this corporation's plan uses an older benchmark version (v[X.Y], [Month YYYY]) with limited coverage. To see full percentile ranges, the plan can be updated to a current benchmark version.*

Do not editorialize beyond this. Do not say "the data is incomplete" or suggest the data is wrong -- it's accurate for that version, just limited.

Use the single-role chat reply format and CSV column structure spelled out in the CRITICAL block at the top of this file. Do not improvise different shapes.

For role-specific emphasis when there's space to call out a single number per rating:

- All roles -- quote `salary_benchmarks.percentiles.p50` (median market salary) and `equity_benchmarks.percentiles.p50.as_notional_value` (median annual equity in $)
- Sales / sales-leadership roles -- lead with `tcc_benchmarks.percentiles.p50` (median total cash) since variable pay is a major part of sales comp; salary alone understates the comp picture
- Equity -- surface `as_fd_percentage`, `as_shares`, AND `as_notional_value` percentiles; users want all three (what % of company, how many shares, what's it worth)

### Equity column order (tables, CSVs, chat formatting)

The order in which equity columns appear depends on the corp's peer group, surfaced by `compensation:get:plan` as `peer_group.notional_available`:

| `peer_group.notional_available` | Order |
|---|---|
| `true` (>= $500M post money) | notional -> FD% -> shares |
| `false` (all smaller peer groups) | FD% -> shares -> notional |

Rationale: actual notional-value benchmarks are only available for valuations >= $500M. Below that, the notional is a derived figure, so FD% (the structural metric) leads. Apply this ordering to:
- CSV column order: `equity_fd_pct_*` / `equity_shares_*` / `equity_notional_*` groups
- Markdown / chat tables: column position
- Per-row callouts: which equity number you quote first

If `peer_group` is missing from the plan response (very old plans, mis-configured corps), fall back to the default order (FD% -> shares -> notional).

If a `benchmarks` array entry has empty `salary_benchmarks`, empty `equity_benchmarks`, AND empty `tcc_benchmarks` (i.e. only `geo_adjustment` populated), that's a genuine data coverage gap for that role/level/version. Flag it as a separate "no data" section and exclude the row from the data table -- do not emit a zero-filled row.

## Version Override

If the user asks about the current benchmark version or wants to query against a different version, follow the workflow in `${CLAUDE_PLUGIN_ROOT}/skills/carta-compensation-benchmarks/references/benchmark-versions.md`.

## Subscription gating (REQUIRED before any benchmark query)

> HARD STOP RULE: `is_subscribed: false` is FINAL. Do NOT call `plans/` or `benchmark/` for that corp. Do NOT "try anyway to see what comes back". Do NOT rationalize ("local/test environments may still return data"). The `subscription_status` response is authoritative -- if the UI says no subscription, the API has no data, and you must respect that.

Compensation-service's `plans/` and `benchmark/` endpoints return 200 even for corporations that don't have an active CTC subscription -- the response just has empty/null ratings. You cannot infer subscription status from those calls. That's why `subscription_status` exists.

Always call `compensation:get:subscription_status` FIRST for every corporation you intend to query. It returns `{corporation_id, is_subscribed}`.

Single-corp query:
1. `call_tool({"name": "compensation__get__subscription_status", "arguments": {"corporation_id": <id>}})`
2. If `is_subscribed` is `false`:
   - Tell the user: *"Compensation benchmarks require a Carta Total Compensation subscription. Visit this page to request a demo: https://carta.com/demo/total-comp/?&utm_medium=product&utm_source=carta-web&utm_campaign=ctc-plugin-inq-amer-q2-26"*
   - STOP. Do not call `plans/`, `benchmark/`, `benchmark_versions`, or any other compensation endpoint for this corp.
   - Do not generate a CSV/JSON file for this corp. No "framework" file. No "structure-only" file. Nothing.
   - Do not "try the benchmark to see if it works anyway". The answer is no.
3. If `is_subscribed` is `true` -> proceed with the benchmark workflow.

Multi-corp / bulk query:
1. Call `compensation:get:subscription_status` for each corp up front. Partition them into `subscribed` and `unsubscribed` lists.
2. Run benchmark queries (`plans/`, `benchmark/`) only for corps in the `subscribed` list. Never query the API for corps in `unsubscribed`.
3. In the chat reply, list unsubscribed corps separately: *"The following corporations don't have an active CTC subscription and were excluded: [Corp A], [Corp B]."*
4. In any generated file (CSV/JSON), unsubscribed corps must not appear as data rows. Optionally include a separate "Excluded (no CTC subscription)" section for transparency. Never invent zeros or blanks for them.

### Anti-patterns to avoid

- ❌ User says "corp 728" -> `subscription_status` returns `is_subscribed: false` -> agent thinks "let me try the benchmark anyway to see if local/test data exists" -- NO. Stop and tell the user.
- ❌ Generating a CSV with empty rows when the corp isn't subscribed -- that's a wasted file with no data.
- ❌ Saying "the local test environment doesn't have benchmark data seeded" when the actual cause is "this corp doesn't have CTC". The agent's diagnosis is wrong, and the user-facing message conflates two unrelated problems.

## Error Handling

| Symptom | Cause | Tell user |
|---|---|---|
| Rolematcher returns `UNKNOWN` for `job_area` | Role description too vague or not in CTC taxonomy | "Could you clarify the role? For example: job area (Engineering, Sales), seniority level, and whether it's an IC or manager track." |
| Rolematcher returns `UNKNOWN` for `track` | Level is also UNKNOWN -- no seniority signals present | "Is this an individual contributor (IC), manager, or executive role? This determines which benchmark track to use." |
| Benchmark response has no data for role/level (subscribed corp) | Data coverage gap -- no snapshot for that exact slice | "No benchmark data is available for [role] at [level] in this benchmark version. Want to try a different level or focus?" |
| `compensation:get:subscription_status` returns `is_subscribed: false` | Corp doesn't have an active CTC subscription | See Step 3a -- stop and send the subscription message. |
| `compensation:get:benchmark` returns 403 | Caller lacks permission for that corporation | Re-authenticate via the MCP welcome flow and retry. If it persists, the user may not have access to this corporation's data. |

## What next?

After delivering benchmarks, offer these follow-up options:

- Export to CSV -- "Want me to export this as a CSV file?"
- Look up another role -- "Want benchmarks for a different role or level?"
- Compare with a different location -- "Want to see how these numbers change for a different city or country?"
- Version comparison -- "Want to compare against a prior benchmark version?"
