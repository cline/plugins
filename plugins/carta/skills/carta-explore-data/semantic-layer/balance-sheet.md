# Balance Sheet

Build a fund balance sheet as of a specific date by summing journal entries cumulatively through that date.

An as-of date is required -- ask the user if not provided.
A fund name filter is optional -- omit the `HAVING` clause to query all funds.

## Table: JOURNAL_ENTRIES

Balance sheet = `SUM(amount)` for all entries where `effective_date <= as_of_date`.
Each `account_type` range maps to a balance sheet section:

| Range      | Category | Balance Sheet Section |
|------------|----------|-----------------------|
| 1000-1099  | Cash & Equivalents | Assets |
| 1100       | Investments at Cost | Assets |
| 1101       | Unrealized Gain/Loss | Assets |
| 1200-1899  | Other Assets | Assets |
| 2000-2999  | Liabilities (LOC: accounts 2000, 2001) | Liabilities |
| 3000-3999  | Partners' Capital | Equity |

## Query -- Balance Sheet as of a Date

> Input safety: Validate `{fund_filter}` contains only alphanumeric characters, spaces, hyphens,
> and periods -- escape single quotes by doubling them (`'` -> `''`). Validate `{as_of_date}` matches
> `YYYY-MM-DD` -- if invalid, ask the user to re-enter rather than executing the query.

```sql
WITH funds AS (
    SELECT fund_uuid, MAX(fund_name) AS fund_name
    FROM FUND_ADMIN.ALLOCATIONS
    WHERE entity_type_name IN ('Fund', 'SPV')
    GROUP BY fund_uuid
    HAVING LOWER(MAX(fund_name)) ILIKE '%{fund_filter}%'
    -- Remove the HAVING clause to query all funds
),
balances AS (
    SELECT
        j.fund_uuid,
        CASE
            WHEN j.account_type BETWEEN 1000 AND 1099 THEN 'Cash & Equivalents'
            WHEN j.account_type = 1100               THEN 'Investments at Cost'
            WHEN j.account_type = 1101               THEN 'Unrealized Gain/Loss'
            WHEN j.account_type BETWEEN 1200 AND 1899 THEN 'Other Assets'
            WHEN j.account_type BETWEEN 2000 AND 2999 THEN 'Liabilities'
            WHEN j.account_type BETWEEN 3000 AND 3999 THEN 'Partners'' Capital'
            ELSE 'Other'
        END AS line_item,
        SUM(j.amount) AS balance
    FROM FUND_ADMIN.JOURNAL_ENTRIES j
    INNER JOIN funds f ON j.fund_uuid = f.fund_uuid
    WHERE j.effective_date <= TO_DATE('{as_of_date}', 'YYYY-MM-DD')
    GROUP BY j.fund_uuid, line_item
)
SELECT
    f.fund_name,
    b.line_item,
    ROUND(SUM(b.balance), 2) AS balance
FROM balances b
JOIN funds f ON b.fund_uuid = f.fund_uuid
GROUP BY f.fund_name, b.line_item
ORDER BY f.fund_name,
    CASE b.line_item
        WHEN 'Cash & Equivalents'   THEN 1
        WHEN 'Investments at Cost'  THEN 2
        WHEN 'Unrealized Gain/Loss' THEN 3
        WHEN 'Other Assets'         THEN 4
        WHEN 'Liabilities'          THEN 5
        WHEN 'Partners'' Capital'   THEN 6
        ELSE 7
    END
LIMIT 200
```

## Presentation

1. Group rows into sections -- Assets / Liabilities / Partners' Capital -- with subtotals per section
2. Add a reconciliation line -- NAV = Total Assets - Total Liabilities; Partners' Capital should approximately equal NAV
3. Currency -- `$X,XXX`; negatives in parentheses: `($X,XXX)`; bold totals: `$X,XXX`
4. Use Carta voice -- "your fund's balance sheet", not "query results"

### Layout

```
Assets
  Cash & Equivalents          $X,XXX
  Investments at Cost         $X,XXX
  Unrealized Gain/Loss        $X,XXX
  Other Assets                $X,XXX
Total Assets               $X,XXX

Liabilities
  Liabilities                 $X,XXX
Total Liabilities          $X,XXX

Partners' Capital
  Partners' Capital           $X,XXX
Total Partners' Capital    $X,XXX

NAV (Assets - Liabilities) $X,XXX
```
