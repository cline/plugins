# Portfolio Company Financials & KPIs

Query financial metrics and KPIs reported by portfolio companies -- revenue, ARR, headcount, burn rate, and other operational data.

> For *investment cost basis and FMV*, use `AGGREGATE_INVESTMENTS` (see `investments.md`).
> `COMPANY_FINANCIALS` contains metrics reported by the company, not fund-level investment figures.

## Common Aliases

`PORTFOLIO_COMPANY_KPIS`, `PORTCO_FINANCIALS`, `COMPANY_KPIS`, `PORTCO_KPIS`, `PORTFOLIO_COMPANY_FINANCIALS`, `HEADCOUNT`, `METRICS`, `PORTCO_METRICS`

## Table: COMPANY_FINANCIALS

Each row is a single metric data point for a portfolio company at a given period. The table is in a long/unpivoted format -- one row per metric per period.

| Column | Description |
|--------|-------------|
| `legal_name` | Legal name of the portfolio company -- use to filter by company |
| `firm_name` | Name of the management firm |
| `as_of_date` | Date the data was collected |
| `period_start` | Start date of the reporting period |
| `period_end` | End date of the reporting period -- use `period_end`, not `period_end_date` |
| `frequency` | Period frequency: `ANN` (annual), `QTR` (quarterly), `MON` (monthly), `SA` (semi-annual) |
| `name` | Human-readable metric name (e.g. "Revenue", "ARR", "Headcount") |
| `mnemonic` | Short code for the metric -- use for programmatic filtering |
| `report_type` | `P&L`, `Cash Flow`, `Balance Sheet`, or `KPI` |
| `float_value` | Numeric value of the metric |
| `string_value` | String value when metric cannot be represented as a number |
| `unit_type` | `Dollar`, `Percentage`, `Ratio`, `Number` |
| `currency` | Currency of the metric (e.g. `USD`) |
| `instance_type` | `Actual` or `Estimate` |
| `is_latest` | `TRUE` for the most recent data point per metric per period |
| `source_type` | Data source: `Direct Import`, `Xero`, `Excel Import`, `Codat Import` |
| `agg_method` | Aggregation method: `Sum`, `Average`, `Max`, `Min` |
| `corporation_id` | Carta corporation UUID (NULL for LLCs) |
| `entity_type` | `CORP` for corporations, `LLC` for LLCs |

> Tip: Run the discovery query below first to see which metrics are available for a given company.

### Discovery Query -- Available Metrics for a Company

```sql
SELECT DISTINCT name, mnemonic, report_type, unit_type, frequency
FROM FUND_ADMIN.COMPANY_FINANCIALS
WHERE LOWER(legal_name) ILIKE '%{company_name}%'
  AND is_latest = TRUE
ORDER BY report_type, name
LIMIT 100
```

## Query 1 -- Latest KPIs for a Portfolio Company

```sql
SELECT
    legal_name,
    period_start,
    period_end,
    frequency,
    name            AS metric,
    float_value     AS value,
    unit_type,
    currency,
    instance_type
FROM FUND_ADMIN.COMPANY_FINANCIALS
WHERE LOWER(legal_name) ILIKE '%{company_name}%'
  AND is_latest = TRUE
  AND instance_type = 'Actual'
ORDER BY period_end DESC, report_type, name
LIMIT 100
```

## Query 2 -- Revenue Trend Over Time

```sql
SELECT
    legal_name,
    period_start,
    period_end,
    float_value     AS revenue,
    currency,
    frequency,
    instance_type
FROM FUND_ADMIN.COMPANY_FINANCIALS
WHERE LOWER(legal_name) ILIKE '%{company_name}%'
  AND LOWER(name) ILIKE '%revenue%'
  AND is_latest = TRUE
ORDER BY period_end DESC
LIMIT 50
```

## Query 3 -- Top Companies by a Metric (e.g. Revenue)

```sql
SELECT
    legal_name,
    firm_name,
    period_end      AS as_of,
    float_value     AS metric_value,
    unit_type,
    currency
FROM FUND_ADMIN.COMPANY_FINANCIALS
WHERE LOWER(name) ILIKE '%{metric_name}%'
  AND is_latest = TRUE
  AND instance_type = 'Actual'
  AND float_value IS NOT NULL
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY legal_name
    ORDER BY float_value DESC
) = 1
ORDER BY float_value DESC NULLS LAST
LIMIT 50
```

## Presentation

1. Lead with the company and period -- "Here are the latest financials for [Company] as of [period_end]"
2. Group by `report_type` -- P&L / Cash Flow / Balance Sheet / KPI sections
3. Format numbers by `unit_type` -- `Dollar` -> `$X,XXX`; `Percentage` -> `X.X%`; `Number` -> `X,XXX`
4. Flag estimates -- note when `instance_type = 'Estimate'`
5. Use Carta voice -- "your portfolio company reported", not "query results"
