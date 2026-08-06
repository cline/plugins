# Journal entries -- column contract

The Carta DWH journal-entries table is denormalized. Every row
carries enough metadata to classify and aggregate without joins.

| Column | Type | Notes |
|---|---|---|
| `FIRM_ID` | UUID | Firm-level scope. Filter on this. |
| `FUND_NAME` | string | Entity display name. Use as the column header in the output. |
| `FUND_UUID` | UUID | Entity stable id. Useful for de-duping if two entities share a name. |
| `EFFECTIVE_DATE` | date | The date the entry hits the books. Use this, not `POSTED_DATE`. |
| `ACCOUNT_TYPE` | string | Numeric string, e.g. `'1100'`. Leading digit drives the classification (see below). |
| `ACCOUNT_NAME` | string | Human label. Use directly as the row label -- don't rename or consolidate. |
| `NORMAL_BALANCE` | string | `'DEBIT'` or `'CREDIT'`. Informational only. |
| `AMOUNT` | decimal | Single signed column. Assets store debits as positive. Liabilities and Equity store credits as negative. |

## Classification by leading digit

| Leading digit | Section | Sign treatment |
|---|---|---|
| `1xxx` | Assets | Keep as-is |
| `2xxx` | Liabilities | Multiply by `-1` for positive display |
| `3xxx` | Equity | Multiply by `-1` for positive display |
| `4xxx+` | Revenue / Expense | Exclude -- Balance Sheet skill filters these out in the SQL |

## Period semantics

- Cumulative as-of (default for BS): `EFFECTIVE_DATE <= <month_end>`.
  Balances roll forward from inception, which is what makes a Balance Sheet
  balance.
- Period-only (opt-in only): `EFFECTIVE_DATE BETWEEN <month_start> AND
  <month_end>`. Will not balance, because BS accruals booked during the
  month have offsetting P&L entries that the `ACCOUNT_TYPE BETWEEN '1000' AND
  '3999'` filter excludes. Warn the user up front before running this variant.

## Why no COA join

`ACCOUNT_TYPE` and `ACCOUNT_NAME` are denormalized onto every JE row. There
is no need to join against a chart of accounts table. Don't write joins --
they slow the query and risk dropping rows for accounts with missing COA
metadata.
