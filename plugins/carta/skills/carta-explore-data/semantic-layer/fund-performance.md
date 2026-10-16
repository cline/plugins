# Fund Performance Metrics

Query fund-level performance metrics: IRR, DPI, TVPI, RVPI, MOIC, NAV, cost basis, and expense breakdowns.

> For *current NAV and cumulative LP contributions*, `MONTHLY_NAV_CALCULATIONS` (see `nav.md`) is also valid.
> `AGGREGATE_FUND_METRICS` is preferred when you need IRR, DPI, TVPI, expense detail, or dry powder.

## Common Aliases

`FUND_PERFORMANCE`, `FUND_METRICS`, `FUND_SUMMARY`, `FUND_QUARTERLY_PERFORMANCE`, `FUND_INVESTMENTS`, `FUND_PERFORMANCE_METRICS`, `FUND_PERFORMANCE_METRICS_HISTORY`, `PERFORMANCE`

> For deal-level IRR specifically, use `TEMPORAL_DEAL_IRR` instead.

## Table: AGGREGATE_FUND_METRICS

Each row is a month-end snapshot per fund. Use `QUALIFY ROW_NUMBER()` to get the latest row per fund.

| Column | Description |
|--------|-------------|
| `fund_name` | Fund display name |
| `firm_name` | Name of the management firm |
| `month_end_date` | Snapshot date |
| `vintage_year` | Calendar year of first capital call -- use for cohort analysis |
| `entity_type_name` | Legal structure (e.g. `Fund`, `SPV`) |
| `ending_total_nav` | Ending NAV for both GPs and LPs |
| `ending_lp_nav` | Ending NAV for LPs |
| `total_tvpi` | Total Value to Paid-In (LPs + GPs) |
| `lp_tvpi` | TVPI for LPs only |
| `lp_dpi` | LP Distributions to Paid-In |
| `total_rvpi` | Residual Value to Paid-In |
| `total_moic` | Multiple on Invested Capital |
| `deal_irr` | Gross deal-level IRR (%) -- NULL when not computable |
| `net_lp_irr` | Net LP IRR (%) -- NULL when not computable |
| `fund_size` | Total committed capital across all LPs and GPs |
| `dry_powder` | Remaining capital available (`fund_size - cost - opx - mgmt_fees`) |
| `perc_capital_remaining` | % of fund size not yet deployed |
| `total_cost_of_investments` | Aggregate cost basis of all investments |
| `total_investments_at_fair_value` | Current FMV of remaining investments |
| `total_unrealized_gain_loss` | Unrealized gain/loss on current holdings |
| `total_cap_contribution` | Total capital contributed by all partners |
| `total_lp_cap_contribution` | LP capital contributed to date |
| `total_distribution` | Total distributions paid to all partners |
| `total_lp_distribution` | LP distributions paid to date |
| `total_mgmt_fees` | Total management fees paid |
| `total_opx` | Total operating expenses excluding management fees |
| `fund_uuid` | Unique fund identifier (foreign key) |
| `is_eligible_fund` | `TRUE` if fund meets benchmark inclusion criteria |
| `is_administered_by_carta` | `TRUE` if fund has Carta fund admin access |

### IRR disambiguation

| Use case | Column | Notes |
|----------|--------|-------|
| Fund-level gross IRR | `deal_irr` | On `AGGREGATE_FUND_METRICS` |
| Fund-level net LP IRR | `net_lp_irr` | On `AGGREGATE_FUND_METRICS` |
| Deal-level IRR (per investment) | -- | Use `TEMPORAL_DEAL_IRR` table instead |

## Query 1 -- Fund Performance Summary (latest snapshot)

```sql
SELECT
    fund_name,
    firm_name,
    month_end_date          AS as_of,
    vintage_year,
    entity_type_name,
    ending_total_nav,
    total_tvpi,
    lp_dpi,
    total_moic,
    net_lp_irr,
    deal_irr,
    fund_size,
    dry_powder,
    perc_capital_remaining,
    total_cost_of_investments,
    total_unrealized_gain_loss
FROM FUND_ADMIN.AGGREGATE_FUND_METRICS
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY fund_uuid
    ORDER BY month_end_date DESC, last_refreshed_at DESC
) = 1
ORDER BY ending_total_nav DESC NULLS LAST
LIMIT 50
```

## Query 2 -- Fund Performance Trend Over Time

```sql
SELECT
    fund_name,
    month_end_date,
    ending_total_nav,
    total_tvpi,
    lp_dpi,
    net_lp_irr,
    total_cost_of_investments,
    total_distribution
FROM FUND_ADMIN.AGGREGATE_FUND_METRICS
WHERE fund_name ILIKE '%{fund_name}%'
ORDER BY fund_name, month_end_date
LIMIT 200
```

## Query 3 -- Expense Breakdown by Fund

```sql
SELECT
    fund_name,
    month_end_date          AS as_of,
    total_mgmt_fees,
    total_opx,
    cost_fa_fees,
    cost_legal_fees,
    cost_tax_prep_fees,
    cost_audit_fees,
    cost_other_professional_fees,
    perc_mgmt_fees_to_fundsize,
    perc_opx_to_contributions
FROM FUND_ADMIN.AGGREGATE_FUND_METRICS
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY fund_uuid
    ORDER BY month_end_date DESC, last_refreshed_at DESC
) = 1
ORDER BY total_mgmt_fees DESC NULLS LAST
LIMIT 50
```

## Presentation

1. Lead with a summary -- "Your firm has N funds with a combined NAV of $X and weighted net IRR of Y%"
2. Format as a table -- Fund Name | NAV | TVPI | DPI | Net IRR | Vintage
3. Currency -- `$X,XXX`; multiples -- `X.XXx`; IRR -- `X.X%`
4. Flag nulls -- show `--` for IRR when NULL (not enough data to compute)
5. Use Carta voice -- "your fund's IRR", not "query results"
