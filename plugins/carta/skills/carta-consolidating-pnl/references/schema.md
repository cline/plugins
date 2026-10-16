# Journal entries -- column contract

The Carta DWH journal-entries table is denormalized. Every row
carries enough metadata to classify and aggregate without joins.

| Column | Type | Notes |
|---|---|---|
| `FIRM_ID` | UUID | Firm-level scope. Filter on this. |
| `FUND_NAME` | string | Entity display name. Not used for P&L grouping -- this skill rolls up across all entities under the firm. |
| `EFFECTIVE_DATE` | date | The date the entry hits the books. Use this, not `POSTED_DATE`. |
| `ACCOUNT_TYPE` | string | Numeric string, e.g. `'5200'`. Leading digit drives classification (see below). |
| `ACCOUNT_NAME` | string | Human label. Use directly as the row label -- don't rename. Section assignment is display-only (see `section-map.md`). |
| `AMOUNT` | decimal | Single signed column. Revenue (4xxx) stored as negative credits. Expenses (5xxx+) stored as positive debits. |

## Classification for P&L

| Leading digit | Section | Sign treatment |
|---|---|---|
| `4xxx` | Revenue | Multiply by `-1` for positive display |
| `5xxx` - `9xxx` | Expenses | Keep as-is |
| `1xxx`, `2xxx`, `3xxx` | Balance Sheet | Exclude -- SQL filter `ACCOUNT_TYPE >= '4000'` handles this |

## Net Income sign

`Revenue (positive)` - `Expenses (positive)` = profit positive, loss
negative. Apply the `*-1` to revenue before computing net income.

## Why no FUND_NAME filter

The P&L skill produces a single consolidated Actual column per period
(Month and YTD) by summing across every entity under the firm. The GROUP BY
on `ACCOUNT_TYPE, ACCOUNT_NAME` rolls up the same COA account across every
fund into one row. If the user wants per-entity P&L columns side-by-side
instead, that's a different output -- clarify before building.

## Period semantics

- Month: `EFFECTIVE_DATE BETWEEN <month_start> AND <month_end>`
- YTD: `EFFECTIVE_DATE BETWEEN <YYYY>-01-01 AND <month_end>`

Both are queried in one round trip using `SUM(CASE WHEN ... THEN AMOUNT ELSE
0 END)` aggregates.

## Why no COA join

`ACCOUNT_TYPE` and `ACCOUNT_NAME` are denormalized onto every JE row.
There's no need to join against a chart of accounts table. Don't write
joins.
