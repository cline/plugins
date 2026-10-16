# Reference: build a budget from prior-year actuals

## Workflow

### 1. Discovery -- one call

`fetch("dwh:list:tables")`. Identify the Carta DWH journal-entries table. Optionally `dwh:get:table_schema` once. Don't probe other tables.

### 2. Queries

Use the canonical SQL in [`../queries/chart-of-accounts.sql`](../queries/chart-of-accounts.sql) and [`../queries/prior-year-monthly-activity.sql`](../queries/prior-year-monthly-activity.sql). Substitute `<entity_name>`, `<prior_year>`, `<lookback_start_year>` before calling `fetch("dwh:execute:query", {"sql": "..."})`.

- q1 chart of accounts (wide window) -- distinct GL codes (`ACCOUNT_TYPE`) + names (`ACCOUNT_NAME`) that posted activity in lookback.
- q2 monthly activity (narrow window) -- sum of signed amounts grouped by `(ACCOUNT_TYPE, MONTH)` for the prior year.
- q3 mgmt-fee schedule -- optional, fund entities only.

### 3. Section mapping (by leading GL digit)

| Prefix | Section |
|---|---|
| `4xxx` | Income |
| `5xxx` / `6xxx` / `7xxx` | Expenses |
| `1xxx` | Investments / Other |

Order: Income -> Expenses -> Investments -> Other -> Net Operating Income.

### 4. Proposed amount per (account, month) -- first match wins

1. q3 mgmt-fee schedule if present and account is a mgmt-fee account.
2. q2 prior-year actual for the same calendar month.
3. Zero default.

### 4a. Sparse-history confidence flag

For each account, count distinct months with non-zero activity. If < 6, mark Source = `low-confidence -- sparse history`. The flag surfaces in:
- Gate 5 preview (Source column + count callout above the table).
- Written workbook -- cell comment on the column-A label cell (NOT fill/color/border). Body: *"Less than 6 months of activity in `<prior_year>`. Best-effort projection -- review before locking the budget."*

Rows still get a proposed value (zero if no months matched).

### 5. Layout -- two tabs

Tab 1: `Budget <budget_year>` (primary). 4-row header band per [`branding-and-header.md`](branding-and-header.md) (A1 firm / A2 `<year> Budget (based on <prior_year> actuals)` / A3 source / A4 `Amounts in <resolved_currency>`). Row 6 column headers: `Account | Jan <year> | Feb <year> | ... | Dec <year> | <year> Total`. Bold, white-on-black.

Data rows:
- Bold + underlined section header row per section.
- One row per GL account, sorted by `gl_code`. Label = `account_name`.
- Budget values = hardcoded numbers (= prior-year actual for that month). No buffer-% multiplier.
- Section subtotal row: bold, top thin border, `=SUM(<section_range>)` per column.
- Annual total column per line: `=SUM(B<row>:M<row>)`.

Bottom rows:
- `Total Income` -- bold, top thin border, `=SUM(<income subtotals>)`.
- (blank)
- `Total Expenses` -- bold, top thin / bottom medium, `=SUM(<expense subtotals>)`.
- (blank)
- `Net Operating Income` -- bold, top thin / bottom medium, `=<Total Income> - <Total Expenses>` per column. `numFmt="@"` on the label if it has a slash.

Do not freeze panes. Do not hide a GL-code column. Do not add a buffer-% cell.

Tab 2: `<prior_year> Actuals` (reference, same shape). Same 4-row header band (A2 = `<prior_year> Actuals (source data)`). Same section blocks, same accounts. Values = hardcoded prior-year actuals from the DWH.

### 6. Number format & column widths

Currency: `_(<CCY_TOKEN>* #,##0.00_);_(<CCY_TOKEN>* (#,##0.00);_(<CCY_TOKEN>* "-"??_);_(@_)` (the resolved currency's locale token -- derive from data, never default USD). Never a bare `$`. Percent (if used): `0.0%;(0.0%)`.

Column widths -- autofit the label and amount columns after the data is written. This is the single most important readability step: if the amount columns aren't autofit, 5+ digit currency renders as `####` and the user has to widen each column by hand.

Excel add-in (proven recipe): the last statements in the cell-write `execute_office_js` block (Gate 6 Call 1), in this exact order -- restore automatic calc, force a full recalc, *then* autofit, *then* the block's existing final `await context.sync()`. Keep them in the same block, not a separate call (a separate `execute_office_js` is a wasted round-trip):

```javascript
// LAST lines of the Gate 6 cell-write block -- ORDER MATTERS
context.application.calculationMode = Excel.CalculationMode.automatic;   // in case the bulk write suspended calc
context.workbook.application.calculate(Excel.CalculationType.full);      // evaluate every =SUM(...) NOW
sheet.getRange("A:A").format.columnWidth = 180;                          // account-name column -- fixed; prevents long names from driving it too wide
sheet.getRange("B:N").format.autofitColumns();                           // size amounts (B:M) + total (N) to the REAL values
await context.sync();
```

Recalc before autofit -- both halves matter:
- Force the recalc. Without it, the `=SUM(...)` subtotals / Total Income / Total Expenses / Net Operating Income cells stay at 0 -- which the accounting format renders as `-`, forcing the user to click each cell and press Enter to recompute. Setting `calculationMode = automatic` alone does not reliably recalc within the same batch; call `application.calculate(...)` explicitly.
- Autofit must run after the recalc. If autofit runs while those cells still show `-`, the amount columns get sized to the width of a dash and the real figures overflow as `####` the moment they compute.

Set a fixed width on the account-name column (A) rather than autofitting it -- long account names would otherwise drive column A excessively wide. Autofit only the numeric columns (`B:N`). You already know the last amount column from the layout you just wrote -- don't read the sheet back to find it.

Local-file mode (`write_workbook.py`): add a `set_column_width` op on column A (width 160) then an `autofit_columns` op over `B:N` after the write ops. Floor the monthly currency columns at 14pt first so sparse tabs (mostly-blank months) don't render `####`.

Unit trap -- only if you set a width by hand instead of autofitting: Office.js `range.format.columnWidth` is in points (1/72"), NOT Excel's character-width unit. `columnWidth = 30` is 30 points ≈ 4 characters, not 30 characters -- it truncates labels and amounts alike. Convert: Excel-width *N* characters ≈ `N × 7 + 5` points. Autofit avoids this entirely -- prefer it.
