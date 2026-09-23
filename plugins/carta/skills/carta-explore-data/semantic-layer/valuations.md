# 409A Valuations & Fair Market Value

Query 409A valuation history for portfolio companies -- effective dates, FMV price per share, expiration, and common stock price history.

## Common Aliases

`409A_VALUATIONS`, `FAIR_MARKET_VALUE`, `FMV`, `COMMON_STOCK_PRICE`, `409A_HISTORY`

> Do not look for this data in `SUMMARY_CAP_TABLE`, `FINANCING_HISTORY`, or `FUND_CORPORATION_OWNERSHIP` -- those tables do not contain 409A valuation records.

## Table: IRC409A_VALUE

Each row is a single 409A valuation record for a corporation. A company may have multiple rows representing historical valuations.

| Column | Description |
|--------|-------------|
| `legal_name` | Legal name of the corporation -- use this to filter by company name |
| `effective_date` | Date the 409A valuation became effective |
| `expiration_date` | Date the 409A valuation expires |
| `stale_date` | Date the valuation becomes stale |
| `price` | Fair market value per share (the 409A price) |
| `currency_code` | Currency of the price (e.g. `USD`) |
| `is_common` | `TRUE` if valuation applies to common stock |
| `source` | Source of the valuation report |
| `corporation_id` | Unique identifier for the corporation |
| `corporation_uuid` | UUID identifier for the corporation |
| `share_class_id` | Identifier for the associated share class |
| `fmv_id` | Unique identifier for the FMV record |

> Filter by company: use `legal_name` (ILIKE for fuzzy match) or `corporation_uuid`.
> There is no `corporation_name` or `company_name` column -- use `legal_name`.

## Query 1 -- 409A Valuation History for a Company

```sql
SELECT
    legal_name,
    effective_date,
    expiration_date,
    price          AS fmv_per_share,
    currency_code,
    is_common,
    source
FROM FUND_ADMIN.IRC409A_VALUE
WHERE LOWER(legal_name) ILIKE '%{company_name}%'
ORDER BY effective_date DESC
LIMIT 50
```

## Query 2 -- All Current 409A Valuations (latest per company)

```sql
SELECT
    legal_name,
    effective_date,
    expiration_date,
    price          AS fmv_per_share,
    currency_code,
    source
FROM FUND_ADMIN.IRC409A_VALUE
WHERE is_common = TRUE
QUALIFY ROW_NUMBER() OVER (
    PARTITION BY corporation_uuid
    ORDER BY effective_date DESC
) = 1
ORDER BY legal_name
LIMIT 200
```

## Query 3 -- Price Change Between Valuations

```sql
SELECT
    legal_name,
    effective_date,
    price                                                              AS fmv_per_share,
    LAG(price) OVER (PARTITION BY corporation_uuid ORDER BY effective_date) AS prior_fmv,
    price - LAG(price) OVER (PARTITION BY corporation_uuid ORDER BY effective_date) AS change_amount,
    ROUND(
        (price - LAG(price) OVER (PARTITION BY corporation_uuid ORDER BY effective_date))
        / NULLIF(LAG(price) OVER (PARTITION BY corporation_uuid ORDER BY effective_date), 0) * 100,
    2)                                                                 AS change_pct
FROM FUND_ADMIN.IRC409A_VALUE
WHERE LOWER(legal_name) ILIKE '%{company_name}%'
  AND is_common = TRUE
ORDER BY effective_date DESC
LIMIT 50
```

## Presentation

1. Lead with the current price -- "The most recent 409A valuation for [Company] is $X.XX per share, effective [date]"
2. Show history as a table -- Date | FMV / Share | Change | Source
3. Currency -- `$X.XX` per share (4 decimal places for low-priced shares)
4. Flag expiration -- note if the most recent valuation is past its `expiration_date`
5. Use Carta voice -- "your 409A valuation history", not "query results"
