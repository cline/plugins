# Investments & Portfolio Holdings

Query investment-level data: cost basis, fair market value, unrealized gain/loss, MOIC, asset class, and investment activity by year.

> For *fund-level* performance (IRR, DPI, TVPI), use `AGGREGATE_FUND_METRICS` (see `fund-performance.md`).
> For *cap table* data (share classes, ownership %), use `SUMMARY_CAP_TABLE` (see `cap-table.md`).

## Common Aliases

`PORTFOLIO_COMPANIES`, `INVESTMENTS`, `FUND_INVESTMENTS`, `PORTFOLIO`

## Table: AGGREGATE_INVESTMENTS

Each row represents one investment (fund × issuer × asset class combination). One fund can have multiple rows per portfolio company if it invested across multiple asset classes or rounds.

| Column | Description |
|--------|-------------|
| `fund_name` | Name of the investing fund |
| `firm_name` | Name of the investment firm |
| `issuer_name` | Name of the portfolio company (investee) |
| `asset_name` | Specific asset description (e.g. "Series A Preferred", "SAFE") |
| `asset_class_type` | Classification: `PREFERRED_EQUITY`, `CONVERTIBLE_DEBT`, `COMMON_EQUITY`, `WARRANTS`, `FUND_INVESTMENT`, etc. |
| `investment_date` | Date the initial investment was made -- use for "invested in [year]" queries |
| `latest_update_effective_date` | Date of most recent update to the investment record |
| `latest_fmv_effective_date` | Date of the most recent fair market value assessment |
| `fund_entity_type_name` | Fund legal structure (`Fund`, `SPV`, etc.) |
| `total_cost_basis` | Remaining cost basis of the investment |
| `total_cost` | Total capital invested (includes all follow-ons) |
| `remaining_value` | Current FMV of remaining holdings |
| `remaining_value_per_share` | Current FMV per share |
| `total_value` | Total value (realized + unrealized) |
| `total_unrealized_gain_loss` | Current unrealized gain/loss (`remaining_value - total_cost_basis`) |
| `total_proceeds` | Cash received from partial or full exits |
| `total_net_realized` | Net realized gains/losses from exited positions |
| `count_remaining_shares` | Current shares/units held |
| `tags` | Comma-delimited tags assigned by the firm (e.g. "AI, SaaS") |
| `tags_json` | JSON key-value pairs of tags |
| `is_active_investment` | `TRUE` if investment is currently held |
| `has_realization` | `TRUE` if any exit proceeds have been received |
| `is_carta_customer` | `TRUE` if portfolio company is a Carta customer |
| `most_recent_journal_entry_type` | Last transaction type (`NEW_INVESTMENT`, `CONVERSION`, `VALUATION`, etc.) |
| `fund_uuid` | Fund unique identifier |
| `firm_id` | Firm unique identifier |

### Date column disambiguation

| Query intent | Column to use |
|---|---|
| "investments made in [year]" / "new investments in 2024" | `investment_date` |
| "funded in [year]" / "cash deployed in [year]" | `investment_date` (same -- this is the initial cash date) |
| "as of [date]" / "current holdings" | filter `is_active_investment = TRUE` |
| "updated in [year]" / "revalued in [year]" | `latest_update_effective_date` or `latest_fmv_effective_date` |

> "Investments in 2024" means `YEAR(investment_date) = 2024` -- not update date, not FMV date.

## Query 1 -- All Active Investments with Current Value

```sql
SELECT
    fund_name,
    issuer_name,
    asset_name,
    asset_class_type,
    investment_date,
    total_cost_basis,
    remaining_value,
    total_unrealized_gain_loss,
    ROUND((remaining_value + total_proceeds) / NULLIF(total_cost_basis, 0), 2) AS moic
FROM FUND_ADMIN.AGGREGATE_INVESTMENTS
WHERE is_active_investment = TRUE
ORDER BY remaining_value DESC NULLS LAST
LIMIT 200
```

## Query 2 -- New Investments by Year

```sql
SELECT
    YEAR(investment_date)  AS investment_year,
    fund_name,
    issuer_name,
    asset_class_type,
    total_cost             AS invested_amount,
    investment_date
FROM FUND_ADMIN.AGGREGATE_INVESTMENTS
WHERE YEAR(investment_date) = {year}
ORDER BY investment_date DESC
LIMIT 200
```

## Query 3 -- Investment Activity Summary by Year and Fund

```sql
SELECT
    YEAR(investment_date)  AS investment_year,
    fund_name,
    COUNT(DISTINCT issuer_name) AS companies,
    SUM(total_cost)             AS total_invested,
    SUM(remaining_value)        AS current_value,
    SUM(total_proceeds)         AS total_realized
FROM FUND_ADMIN.AGGREGATE_INVESTMENTS
GROUP BY 1, 2
ORDER BY investment_year DESC, total_invested DESC NULLS LAST
LIMIT 100
```

## Query 4 -- Top Investments by MOIC

```sql
SELECT
    fund_name,
    issuer_name,
    asset_class_type,
    investment_date,
    total_cost_basis,
    remaining_value,
    total_proceeds,
    ROUND((remaining_value + total_proceeds) / NULLIF(total_cost_basis, 0), 2) AS moic,
    total_unrealized_gain_loss
FROM FUND_ADMIN.AGGREGATE_INVESTMENTS
WHERE is_active_investment = TRUE
  AND total_cost_basis > 0
ORDER BY moic DESC NULLS LAST
LIMIT 50
```

## Presentation

1. Lead with a summary -- "Your firm has N active investments across M portfolio companies with a combined value of $X"
2. Currency -- `$X,XXX`; MOIC -- `X.XXx`; gain/loss -- positive in green framing, negative in parentheses
3. Group by fund when multiple funds are in scope
4. Flag unrealized losses -- highlight when `total_unrealized_gain_loss < 0`
5. Use Carta voice -- "your investments", "your portfolio", not "query results"
