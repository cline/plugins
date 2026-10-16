# Cash Flow Statement

Query period-specific cash flows using journal entries within a date range.

> For *cumulative* totals (e.g. "total LP contributions to date"), use `nav.md` instead --
> it reads pre-aggregated totals from `MONTHLY_NAV_CALCULATIONS`.

A date range is required -- ask the user if not provided.

> Date field note: `effective_date` is the accounting/posting date -- the date the entry was recorded
> in the general ledger. For "cash-basis" or "funded in [year]" investment queries, this reflects when
> cash moved. For "investments made in [year]", prefer `AGGREGATE_INVESTMENTS.investment_date` (see
> `investments.md`) which is the deal date, not the GL posting date.

## Table: JOURNAL_ENTRIES

The `event_type` column classifies what caused each entry and drives cash flow categorization.
Values vary by firm -- run the discovery query below when they are unknown.

### Event Type Reference

| event_type pattern                    | Cash Flow Category |
|---------------------------------------|--------------------|
| Capital Call / LP Contribution        | Financing -- Inflows |
| Distribution                          | Financing -- Outflows |
| Management Fee                        | Operating -- Expenses |
| Audit Fee / Legal Fee / Fund Expense  | Operating -- Expenses |
| Portfolio Investment                  | Investing -- Outflows |
| Portfolio Realization / Sale Proceeds | Investing -- Inflows |
| Interest Income                       | Operating -- Income |

### Discovery Query

Run this first when event_type values are unknown for the firm:

```sql
SELECT event_type, SUM(amount) AS total_amount, COUNT(*) AS entry_count
FROM FUND_ADMIN.JOURNAL_ENTRIES
WHERE effective_date BETWEEN DATE_TRUNC('quarter', CURRENT_DATE) AND CURRENT_DATE
GROUP BY event_type
ORDER BY ABS(SUM(amount)) DESC
LIMIT 50
```

## Query -- Cash Flow Statement by Period

```sql
WITH funds AS (
    SELECT fund_uuid, MAX(fund_name) AS fund_name
    FROM FUND_ADMIN.ALLOCATIONS
    WHERE entity_type_name IN ('Fund', 'SPV')
    GROUP BY fund_uuid
)
SELECT
    f.fund_name,
    j.event_type,
    SUM(j.amount)  AS net_cash_flow,
    COUNT(*)       AS entry_count
FROM FUND_ADMIN.JOURNAL_ENTRIES j
JOIN funds f ON j.fund_uuid = f.fund_uuid
WHERE j.effective_date BETWEEN {start_date} AND {end_date}
GROUP BY f.fund_name, j.event_type
ORDER BY f.fund_name, ABS(SUM(j.amount)) DESC
LIMIT 500
```

Replace `{start_date}` / `{end_date}` with actual dates:

| Period | start_date | end_date |
|--------|-----------|----------|
| This quarter | `DATE_TRUNC('quarter', CURRENT_DATE)` | `CURRENT_DATE` |
| Specific quarter | `'2024-10-01'` | `'2024-12-31'` |
| Full year | `DATE_TRUNC('year', CURRENT_DATE)` | `CURRENT_DATE` |
| Last year | `'2023-01-01'` | `'2023-12-31'` |

## Presentation

1. Lead with a summary -- "Your firm had $X in net cash flows this quarter"
2. Group rows by fund, sort `event_type` rows by absolute value descending
3. Label direction clearly -- inflows (positive `net_cash_flow`) and outflows (negative)
4. Currency -- `$X,XXX`; outflows in parentheses: `($X,XXX)`
5. Use Carta voice -- "your LP contributions", not "query results"
