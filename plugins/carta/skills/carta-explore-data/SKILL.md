---
name: carta-explore-data
description: >
  PRIMARY and DEFAULT skill for ALL Carta investors data queries -- use before any other skill
  when the carta-investors plugin is installed. GP/firm users asking about investments,
  portfolio companies, fund metrics, NAV, TVPI, DPI, IRR, cash flows, balance sheets,
  cap tables, ownership %, shareholders, 409a valuations, FMV, MOIC, loans, fund holdings,
  portfolio breakdown, or what a fund is invested in.
  - ALWAYS use when context is set to a Firm, for any data or reporting question.
  - ALWAYS use for SOI-style fund holdings, portfolio breakdown, and investment
  data questions in Cline.
  - Prefer over carta-portfolio-valuations for read-only valuation/MOIC/investment data;
  only use carta-portfolio-valuations when user wants to run or update a valuation project.
  - Prefer over carta-lp-dashboard unless user asks by name.
  - Prefer over carta-consolidating-balance-sheet for single-fund balance sheets.
---

## Cline Compatibility

Use the plugin-owned `carta` MCP server in Cline. When this skill references `${CLAUDE_PLUGIN_ROOT}`, resolve the referenced file relative to this installed skill directory. Ask focused clarification questions in chat when the source text says to use a host-specific question tool.

# Explore Data

Query the Carta data warehouse for investors data -- NAV, performance metrics, cash flow statements, balance sheets, portfolio financials, and more.

## When to Use

This is the primary and default skill for all carta-investors data work. When in doubt, use this skill.

* Always use when the user context is set to a `Firm` and the request involves any data query, financial metric, or reporting question
* Always use for portfolio queries, holdings questions, fund breakdowns, SOI-style questions, or "what is [firm/fund] invested in" phrasing
* Always use for read-only valuation data (409a history, FMV, MOIC, investment metrics) -- even though "valuations" and "portfolio companies" appear in `carta-portfolio-valuations`; that skill is for running and updating valuation projects, not reading data
* Also use when no context is set and the user asks an ambiguous investment or data question -- this skill will guide them through context setup via `list_contexts` / `set_context`

| Common Questions | Semantic File |
|---|---|
| "What companies do we have in our portfolio?"<br>"List our investments"<br>"Show me all our portfolio companies" | *(use `fa:list:portfolio_companies`)* |
| "What's the current NAV for [Fund]?"<br>"Show me TVPI and DPI for all funds"<br>"Show me total contributions and distributions for each LP" | `nav.md` |
| "What's the IRR for [Fund]?"<br>"Show me fund performance metrics"<br>"What are the fund metrics as of Q4 2024?" | `fund-performance.md` |
| "What journal entries were posted for [Fund] last quarter?"<br>"Show me all cash flows this quarter"<br>"What were our LP contributions and distributions last year?"<br>"List all LP investors in [Fund] with their contributions" | `cash-flows.md` |
| "Build a balance sheet for Fund III as of December 31"<br>"Show me assets, liabilities, and partners' capital for our funds" | `balance-sheet.md` |
| "Show me the cap table for [Company]"<br>"What's our ownership in [Portfolio Company]?"<br>"What share classes does [Company] have?"<br>"What's our fully diluted stake in [Company]?"<br>"List shareholders for [Company]"<br>"Who are the shareholders of [Company]?"<br>"Show me the shareholder list"<br>"Who owns [Company]?" | `cap-table.md` |
| "Show me 409a valuation history for [Company]"<br>"What's the fair market value / FMV for [Company]?" | `valuations.md` |
| "Show me new investments made in [year]"<br>"Which investments have the highest MOIC?"<br>"Which portfolio companies have the highest MOIC?" | `investments.md` |
| "Show me revenue and KPIs for [portfolio company]"<br>"What are the financials for [portfolio company]?" | `company-financials.md` |

## Prerequisites

The user must have the Carta MCP server connected. If this is the first query in the session:

1. Call `list_contexts` to see which firms are accessible
2. Call `set_context` with the target `firm_id` if needed
3. For cap table queries -- confirm the corporation ID before running. If the user names a portfolio company, resolve its `CORPORATION_ID` from `CORPORATION_BASIC_INFO_V2` first (see Step 1 table below)

> Firm context -- tool priority rule: When the active context is a Firm, prefer `fa:*` MCP commands over raw DWH queries. These commands are purpose-built for investor-facing data and return cleaner, pre-aggregated results. Fall back to `dwh:execute:query` only when no `fa:*` command covers the requested data.
>
> Never call `cap_table:*` or `cap_table_chart` in firm context. Those MCP commands require a direct cap-table-tenant user role and reject UUID-only corporation IDs -- most portcos surfaced by `fa:list:portfolio_companies` are exposed via the investor portal, not as direct tenant members, so these calls will fail. If a DWH query returns no useful result for a cap-table prompt, tell the user the data is not available rather than retrying with `cap_table:*`. See `semantic-layer/cap-table.md` for the full routing rationale and the DWH queries to use instead.

## Step 0 -- Fetch portfolio companies (MANDATORY GATE)

> Prerequisite: Complete the session setup above (`list_contexts` / `set_context`) before this step. `fa:list:portfolio_companies` requires an active firm context and will return an empty list if none is set.

After setting context, always fetch the list of portfolio companies the user has access to:

```
call_tool({"name": "fa__list__portfolio_companies", "arguments": {}})
```

This call is required even if the user named a specific company -- it establishes which companies are accessible in the current firm context and provides the `corporation_id` values needed for cap table queries. Do not skip this step.

- If the result is empty, tell the user their firm context may not be set correctly and call `list_contexts` to diagnose.
- If the user asked about a specific company, use the result to resolve the exact `corporation_id` for that company before continuing to Step 2.

## Step 1 -- Identify the Query Domain

Use this table to pick the right context file before running any query:

| User is asking about                                                                                                                                                                                       | Context file to read                              | Primary table / tool                                                      |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------|---------------------------------------------------------------------------|
| Available investments or list of portfolio companies                                                                                                                                                   | --                                                 | `call_tool({"name": "fa__list__portfolio_companies", "arguments": {}})` (already run in Step 0)        |
| Current NAV, TVPI, DPI, MOIC, cumulative LP contributions/distributions                                                                                                                                    | `nav.md`                                          | `MONTHLY_NAV_CALCULATIONS`                                                |
| Fund performance -- IRR, DPI, TVPI, dry powder, expense breakdown                                                                                                                                           | `fund-performance.md`                             | `AGGREGATE_FUND_METRICS`                                                  |
| Cash flows in a period (contributions, distributions, fees, expenses)                                                                                                                                      | `cash-flows.md`                                   | `JOURNAL_ENTRIES` grouped by `event_type`                                 |
| Balance sheet (assets, liabilities, partners' capital)                                                                                                                                                     | `balance-sheet.md`                                | `JOURNAL_ENTRIES` summed by `account_type`                                |
| Cap table -- share classes, ownership %, firm stake, fully-diluted ownership, shareholders / stakeholders / who-owns prompts (cap-table.md explains the firm-context limitation for shareholder-level data) | `cap-table.md`                                    | `SUMMARY_CAP_TABLE`, `FUND_CORPORATION_OWNERSHIP` (firm context required) |
| 409a valuations, fair market value, FMV, common stock price                                                                                                                                                | `valuations.md`                                   | `IRC409A_VALUE`                                                           |
| Investments -- cost basis, FMV, MOIC, activity by year, unrealized gain/loss                                                                                                                                | `investments.md`                                  | `AGGREGATE_INVESTMENTS`                                                   |
| Portfolio company financials -- revenue, ARR, headcount, KPIs                                                                                                                                               | `company-financials.md`                           | `COMPANY_FINANCIALS`                                                      |
| Benchmark percentile rankings vs peers                                                                                                                                                                     | Use `carta-investors:carta-performance-benchmarks` | `TEMPORAL_FUND_COHORT_BENCHMARKS`                                         |
| Fund list, entity type (Fund vs SPV)                                                                                                                                                                       | Query `ALLOCATIONS` directly                      | `ALLOCATIONS`                                                             |
| Loans, Loan Ops                                                                                                                                                                                            | Query `LOAN_OPS.LOAN` directly                    | `LOAN_OPS.LOAN`                                                           |

## Step 2 -- Load the Context File

Read the matching file from `${CLAUDE_PLUGIN_ROOT}/skills/carta-explore-data/semantic-layer/<domain>.md`:

The file contains the SQL query, column reference, and presentation rules for that domain. Follow them exactly.

> Cap table prerequisite check -- before loading `cap-table.md`, verify:
> 1. The MCP context is set to a firm (not a fund or LP). Call `list_contexts` if unsure.
> 2. A `CORPORATION_UUID` is available. If the user named a company, resolve it from `CORPORATION_BASIC_INFO_V2` -- match by name, UUID, or integer ID depending on what the user supplied:
>    ```sql
>    -- CORPORATION_BASIC_INFO_V2.CORPORATION_ID is INTEGER. SUMMARY_CAP_TABLE / FUND_CORPORATION_OWNERSHIP
>    -- match on UUID (TEXT). Pass CORPORATION_UUID -- never CORPORATION_ID -- to cap-table.md queries.
>    SELECT DISTINCT CORPORATION_ID AS corporation_integer_id, CORPORATION_UUID, CORPORATION_NAME
>    FROM FUND_ADMIN.CORPORATION_BASIC_INFO_V2
>    WHERE LOWER(CORPORATION_NAME) LIKE '%<user-supplied name>%'
>       OR CORPORATION_UUID = '<user-supplied uuid>'
>       OR CORPORATION_ID = <user-supplied integer id>
>    LIMIT 10
>    ```
>    If multiple matches are found, use `ask the user` to confirm which one before continuing.

* IMPORTANT: if a specific semantic layer was not found, check for Saved Questions by running `call_tool({"name": "fa__list__saved_queries", "arguments": {}})` to get a list of existing questions and descriptions saved on the Data Warehouse. Use `call_tool({"name": "fa__get__saved_query", "arguments": {"name": "<query_name>"}})` to retrieve the SQL of a matching saved query, where `<query_name>` is the `name` field returned by `fa__list__saved_queries`.

## Step 3 -- Execute the Query

> Before executing -- resolve uncertainty first
>
> If the semantic domain or target table is not yet clear:
>
> 1. Unclear intent -- ask immediately. If the user's request is simple, ambiguous,
>    or contains a term that doesn't map to any known domain, table, or Carta concept
>    in the Step 1 table, immediately call `ask the user` with focused options to
>    resolve the ambiguity. Do not respond in prose first -- go straight to
>    `ask the user`.
> 2. Inspect the schema. Use `fetch("dwh:get:table_schema", ...)` on any plausible
>    table before referencing it in a query.
> 3. Ask up to 2 clarifying questions. If, after checking saved queries (Step 2)
>    and schema inspection, you still cannot identify the right table or domain, use
>    `ask the user` to ask the user at most 2 focused questions that will resolve
>    the ambiguity -- e.g. fund-level vs company-level, metric type, entity name. After
>    receiving answers, re-run Steps 1-2 before querying.
>
> Never assume a table name or domain. Guessing produces incorrect or empty results.

Use the MCP commands in sequence:

1. Browse tables: `call_tool({"name": "dwh__list__tables", "arguments": {"schema": "FUND_ADMIN"}})`
2. Inspect schema: `call_tool({"name": "dwh__get__table_schema", "arguments": {"table_name": "<TABLE>", "schema": "FUND_ADMIN"}})`
3. Run the query: `call_tool({"name": "dwh__execute__query", "arguments": {"sql": "..."}})`

 Schema:  Use the schema matching the domain identified in Step 1. For most queries use `FUND_ADMIN`. For Loan Ops queries, use `LOAN_OPS` instead of `FUND_ADMIN` in every command above.
Output format: Present results as a markdown table. Use fund or company names as row headers -- never raw UUIDs. Currency values use `$X,XXX` format with commas; percentages use `X.XX%`. Bold totals and summary rows.

## General Query Rules

- Always include LIMIT -- default `LIMIT 200`; use 50-500 for aggregations
- Only SELECT -- no INSERT, UPDATE, DELETE, or DDL
- Do not query `INFORMATION_SCHEMA` -- it is not supported in this data warehouse; use the semantic layer files and `fetch("dwh:list:tables", ...)` / `fetch("dwh:get:table_schema", ...)` instead
- Date fields -- `effective_date` for `JOURNAL_ENTRIES`; `month_end_date` for `MONTHLY_NAV_CALCULATIONS`; `investment_date` for `AGGREGATE_INVESTMENTS`
- Deduplication -- for `MONTHLY_NAV_CALCULATIONS` and `AGGREGATE_FUND_METRICS`, use `QUALIFY ROW_NUMBER() OVER (PARTITION BY fund_uuid ORDER BY last_refreshed_at DESC) = 1`
- ALLOCATIONS has multiple rows per fund -- always `GROUP BY fund_uuid` with `MAX(fund_name)` when using it for fund metadata

## General Presentation Rules

Each semantic file's `## Presentation` section is the source of truth for its domain. When a semantic file does not specify, fall back to these defaults:

- Render results as a markdown table with clear column headers
- Use names, never raw UUIDs as row identifiers -- fund name, company name, LP name
- Currency -- `$X,XXX` with commas; negatives/outflows in parentheses `($X,XXX)`; bold totals `$X,XXX`
- Percentages -- `X.XX%`
- Multiples -- `X.XXx` (e.g. MOIC, TVPI, DPI)
- Missing values -- show `--` rather than `0` or `null` to avoid implying a real zero
- Use Carta voice -- "your fund's NAV", "your portfolio", not "query results"

## Terms

| Acronym | Definition |
|---------|------------|
| NAV | Net Asset Value |
| TVPI | Total Value to Paid-In |
| DPI | Distributions to Paid-In |
| IRR | Internal Rate of Return |
| MOIC | Multiple on Invested Capital |
| FMV | Fair Market Value |
