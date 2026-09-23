---
name: carta-market-benchmarks
description: Computed statistics across portfolio companies -- median, average, typical, range -- used as market benchmarks. Returns aggregate numbers and percentiles, not raw per-company listings.
when_to_use: >-
  Use when asked what's typical for a metric, what's normal at a given
  stage, what the median value is, what the average comes out to, how
  something compares to the market, what range a metric falls in across
  the portfolio, or how a specific deal's terms stack up against portfolio
  norms. Covers option pool sizing, SAFE valuation caps, SAFE discount
  rates, round sizes by stage, and similar structural metrics. For raw
  cross-company data tables without computed statistics, prefer a
  multi-company raw-data skill. For time-based risk detection across
  companies, prefer a portfolio-alerts skill.
---

# Market Benchmarks

Compute portfolio-wide benchmarks from your own Carta data: option pool sizes, SAFE valuation caps, and round sizes. Useful for sanity-checking a new deal's terms against your existing portfolio.

> Note: This reflects your firm's portfolio, not Carta-wide market data. Present results as "portfolio benchmarks" not "market data."

## Prerequisites

No inputs required -- this skill loops the full portfolio automatically.

## Data Retrieval

### Portfolio Enumeration

Call `list_accounts`. Filter to `corporation_pk:` accounts. Extract up to 20 numeric corporation IDs. If more than 20 companies exist, ask the user to narrow scope.

### Per-Company Commands

For each company, the relevant commands are:

- `call_tool({"name": "cap_table__get__cap_table_by_share_class", "arguments": {"corporation_id": corporation_id}})` -- option pool data
- `call_tool({"name": "cap_table__get__convertible_notes", "arguments": {"corporation_id": corporation_id}})` -- SAFE/note terms (summary includes median/min/max price_cap, avg_discount, by_type)
- `call_tool({"name": "cap_table__get__financing_history", "arguments": {"corporation_id": corporation_id}})` -- round sizes (summary includes per-round cash_raised and latest_date)

The gateway defaults to `detail=summary` for all three commands. The enriched summaries include all fields needed for portfolio benchmarks -- no individual records required.

> Parallel execution: Issue ALL fetch calls for ALL companies in a single response when the host supports parallel tool calls -- do NOT loop company-by-company. See Workflow Step 2.

## Key Fields

From cap table (option pool):
- `option_plans[].authorized_shares`: shares authorized per plan
- `totals.total_fully_diluted`: total fully diluted share count

From convertible notes (summary):
- `median_price_cap`, `min_price_cap`, `max_price_cap`: valuation cap statistics
- `avg_discount`: average discount rate
- `by_type`: count of SAFEs vs Convertible Notes
- `total_dollar_amount`: total invested across all instruments

From financing history (summary):
- `by_round`: per-round `{count, cash_raised, latest_date}`
- `total_cash_raised`: aggregate across all rounds

## Workflow

### Step 1 -- Get Portfolio

Call `list_accounts`. Filter to `corporation_pk:` accounts. Extract up to 20 numeric corporation IDs.

### Step 2 -- Collect Data for All Companies (parallel)

Issue ALL fetch calls for ALL companies in a single response -- do NOT loop company-by-company. Each fetch call is independent and will execute concurrently.

For example, with 5 companies and all 3 data types, issue all 15 fetch calls at once:

```
call_tool({"name": "cap_table__get__cap_table_by_share_class", "arguments": {"corporation_id": 1}})
call_tool({"name": "cap_table__get__convertible_notes", "arguments": {"corporation_id": 1}})
call_tool({"name": "cap_table__get__financing_history", "arguments": {"corporation_id": 1}})
call_tool({"name": "cap_table__get__cap_table_by_share_class", "arguments": {"corporation_id": 2}})
call_tool({"name": "cap_table__get__convertible_notes", "arguments": {"corporation_id": 2}})
call_tool({"name": "cap_table__get__financing_history", "arguments": {"corporation_id": 2}})
... (all companies)
```

Then from the results:

Cap table by share class (for option pool %):
- From `option_plans[]`: sum `authorized_shares` across all plans
- From `totals.total_fully_diluted`: compute option pool % = option_pool_authorized / total_fully_diluted

SAFE / convertible note terms (summary):
- Use `median_price_cap`, `min_price_cap`, `max_price_cap` directly for SAFE cap benchmarks
- Use `avg_discount` for discount benchmarks
- Use `by_type` to count SAFEs vs notes per company

Financing history (summary):
- Use `by_round` to identify rounds and their `cash_raised`
- Use `total_cash_raised` for aggregate amounts
- Most recent round = round with latest `latest_date`

### Step 3 -- Compute Summary Statistics

For each metric, compute across companies that have data:
- Median, min, max
- Skip companies with no data for a given metric (don't count as zero)

Metrics:
- Option pool % (fully diluted)
- SAFE valuation cap
- Last priced round size

### Step 4 -- Present Results

See Presentation section.

If the user asks about a specific company ("how does Acme's option pool compare?"), show that company's value alongside the portfolio median.

## Gates

Required inputs: None -- portfolio enumeration is automatic.

AI computation: Yes -- portfolio benchmark statistics (median, min, max for option pool sizes, SAFE caps, round sizes) are AI-derived from aggregated cap table data.
Trigger the AI computation gate (see carta-interaction-reference §6.2) before outputting any benchmark statistics or portfolio comparisons.

Subagent prohibition: Not applicable.

## Presentation

Format: Benchmark tables grouped by metric

BLUF lead: Lead with the number of companies analyzed and the most notable finding (e.g., "median option pool is 12.5% across 14 companies").

Sort order: By metric name (Option Pool, SAFE Caps, Round Sizes).

Portfolio Benchmarks (N companies)

Option Pool Size (% Fully Diluted)
| Metric | Value |
|--------|-------|
| Median | 12.5% |
| Range  | 8% - 20% |
| Companies with data | 14 |

SAFE Valuation Caps
| Metric | Value |
|--------|-------|
| Median | $8,000,000 |
| Range  | $3M - $25M |
| SAFEs analyzed | 28 |

Last Priced Round Size
| Metric | Value |
|--------|-------|
| Median | $5,000,000 |
| Range  | $500K - $30M |
| Companies with priced rounds | 10 |

## Caveats

- Portfolio data reflects point-in-time API calls, not a single atomic snapshot
- Companies with restricted permissions may have incomplete data
- Rate limit: maximum 20 companies per invocation
- This reflects your firm's portfolio, not Carta-wide market data -- present results as "portfolio benchmarks" not "market data"
