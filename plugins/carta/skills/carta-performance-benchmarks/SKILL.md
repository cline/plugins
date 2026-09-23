---
name: carta-performance-benchmarks
description: Compare a fund's performance against peer benchmark cohorts. Use when asked about fund benchmarks, peer comparison, percentile ranking, Net IRR vs peers, TVPI benchmarks, or how a fund stacks up against its cohort. Do NOT use for cap table market benchmarks (option pool sizes, SAFE terms, cap structure patterns -- use carta-market-benchmarks in carta-cap-table). Do NOT use for general fund financial data queries or NAV -- use carta-explore-data.
---

# Performance Benchmarks

Compare a fund's historical Net IRR, TVPI, MOIC, or DPI against peer benchmark cohorts grouped by vintage year, AUM bucket, and entity type.

## When to Use

- "How does Fund I compare to its benchmark?"
- "Show me Net IRR benchmarks for [Fund]"
- "What percentile is [Fund] in for TVPI?"
- "Compare [Fund] against vintage 2020 peers"
- "Show me benchmark data for our funds"
- "How does our fund stack up against peers?"
- "How does our fund's IRR compare to peers?"
- "What percentile is our TVPI?"
- "Is Fund II above or below median DPI?"
- "Show me MOIC benchmarks for vintage 2021"

## When NOT to Use

- "What's the average option pool size for Series A?" -> use `carta-market-benchmarks`
- "What are typical SAFE terms across our portfolio?" -> use `carta-market-benchmarks`
- "Show me cap structure patterns for seed-stage companies" -> use `carta-market-benchmarks`
- "What's the current NAV for Fund I?" -> use `carta-explore-data`
- "Pull fund financial data for our quarterly report" -> use `carta-explore-data`

## Prerequisites

- The user must have the Carta MCP server connected
- A `fund_name` is required -- ask if not provided
- If this is the first query, call `list_contexts` and `set_context` to set the firm

### Optional Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `metric` | `net_irr` | One of: `net_irr`, `tvpi`, `moic`, `dpi` |
| `vintage_year` | Auto-resolved from fund | Filter cohort by vintage year |
| `aum_bucket` | Auto-resolved from fund | Filter by AUM bucket (e.g. `"25m-100m"`) |
| `entity_type` | Auto-resolved from fund | `"Fund"` or `"SPV"` |
| `start_date` | All history | Only show quarters on/after this date (YYYY-MM-DD) |

## Data Retrieval

Query the `FUND_ADMIN.TEMPORAL_FUND_COHORT_BENCHMARKS` table which contains fund metrics, benchmark percentiles, and cohort size in one denormalized table.

### SQL Query

Execute this query with `call_tool({"name": "dwh__execute__query", "arguments": {"sql": "..."}})`, substituting the user's fund name and optional filters:

```sql
SELECT
    fund_name,
    fund_uuid,
    performance_quarter_start_date AS quarter,
    vintage_year,
    fund_aum_bucket,
    entity_type_name,
    fund_count,
    net_irr, tvpi, dpi, moic,
    net_irr_10th, net_irr_25th, net_irr_50th, net_irr_75th, net_irr_90th,
    tvpi_10, tvpi_25, tvpi_50, tvpi_75, tvpi_90,
    dpi_10, dpi_25, dpi_50, dpi_75, dpi_90,
    moic_10, moic_25, moic_50, moic_75, moic_90
FROM FUND_ADMIN.TEMPORAL_FUND_COHORT_BENCHMARKS
WHERE LOWER(fund_name) ILIKE '%{fund_name}%'
  AND performance_quarter_start_date >= '{start_date}'
  -- Add optional filters:
  -- AND vintage_year = {vintage_year}
  -- AND fund_aum_bucket = '{aum_bucket}'
  -- AND entity_type_name = '{entity_type}'
ORDER BY performance_quarter_start_date
LIMIT 1000
```

Important: Build the WHERE clause dynamically -- only include filters the user provided. Omitted filters are auto-resolved from the data.

### Handling Multiple Fund Matches

If the query returns rows for more than one distinct `fund_name`, list them and ask the user to be more specific:

> Multiple funds matched "[search term]":
> - Fund I
> - Fund II
>
> Please use a more specific fund name.

## Metric Configuration

| Metric | Column | Format | Percentile Columns |
|--------|--------|--------|--------------------|
| Net IRR | `net_irr` | Percentage (e.g. `8.0%`) | `net_irr_10th` through `net_irr_90th` |
| TVPI | `tvpi` | Multiple (e.g. `1.85x`) | `tvpi_10` through `tvpi_90` |
| MOIC | `moic` | Multiple (e.g. `2.10x`) | `moic_10` through `moic_90` |
| DPI | `dpi` | Multiple (e.g. `0.42x`) | `dpi_10` through `dpi_90` |

### Percentile Band Logic

Based on the fund's value relative to benchmarks in the latest quarter:

| Condition | Label |
|-----------|-------|
| Fund >= 90th percentile | Top 10th percentile |
| Fund >= 75th percentile | 75th-90th percentile |
| Fund >= 50th percentile | 50th-75th percentile (above median) |
| Fund >= 25th percentile | 25th-50th percentile (below median) |
| Fund < 25th percentile | Bottom 25th percentile |

## How to Present

Use the latest quarter (last row) for the summary, all rows for the timeline.

### Section 1 -- Cohort Details

| | |
|---|---|
| Fund | {fund_name} |
| Metric | {metric_label} |
| Vintage Year | {vintage_year} |
| AUM Bucket | {aum_bucket} |
| Entity Type | {entity_type} |
| Date Range | {first_quarter} - {last_quarter} |
| Benchmark Sample Size | {fund_count} funds |

### Section 2 -- Current Standing

| | {metric_label} |
|---|---|
| {fund_name} | {fund_value} |
| Benchmark Median (50th pct) | {p50} |
| Benchmark 75th pct | {p75} |
| Benchmark 90th pct | {p90} |
| Fund Percentile Band | {band_label} |

### Section 3 -- Timeline by Quarter

| Quarter | {fund_name} | 10th pct | 25th pct | Median | 75th pct | 90th pct | Cohort (n) |
|---|---|---|---|---|---|---|---|
| 2023-01-01 | 8.5% | 2.1% | 5.0% | 7.8% | 10.2% | 14.5% | 45 |

### Formatting

- Net IRR: display as `X.X%` (values are stored as percentage points, e.g. 8.0 = 8%)
- TVPI/MOIC/DPI: display as `X.XXx`
- Use `--` for null values
- End with: *Cohort: {vintage} vintage · {bucket} AUM · {entity_type} · {count} funds as of latest quarter*

## Voice Guidelines

- Say "your fund ranks in the top quartile" not "the query returned a value above the 75th percentile"
- Frame the percentile band in plain language: "Fund I is performing above the median for its peer group"

## Best Effort

- Computed: percentile band classification, trend analysis
- Authoritative: fund metrics and benchmark percentiles come directly from the Carta data warehouse
