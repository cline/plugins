# Reference: add the next period (month / quarter) to an existing budget

## When to use

The sheet ends at some completed month and the user wants to extend it
forward -- pull actuals for the new month and propose a budget value.

## Workflow

### 1. Detect the last completed period from existing column headers

Parse existing column-header date serials. The new period is the next
month/quarter after the latest detected date.

> ⚠ Watch for off-by-one -- use the first day of the next month as
> the new column's date serial (April = 46113, not 46112 / Mar 31).

### 2. Determine the column block pattern

Inspect the prior period's block. Common shapes:

- `Actual | Budget | Variance`
- `Actual | Budget`
- `Actual` only

Use the same pattern, the same fonts/colors/number-formatting, and the
same column widths. Shift any year-total / Net Income columns to
the right to make room.

### 3. Pull actuals via `get-actuals.md`

`<period_start>` = first day of new period, `<period_end>` = last day
of new period.

### 4. For each existing line item

- Actual cell. Write the value from the DWH; 0 if no activity.
- Budget cell. Write `=AVERAGE(<prior_3_months_actuals_range>)` as
  a live formula (not a hardcoded value) so the user can audit.
- Variance cell. Wire the same variance formula used in prior
  months (typically `Actual - Budget`).

### 5. Insert new rows for GL accounts with new-period activity but no sheet row

- Place the row inside the correct section (Income / Expenses) using
  the section-mapping rules from `carta-create-budget/references/from-prior-actuals.md`.
- Backfill prior-month actuals from `JOURNAL_ENTRIES` for completeness so subtotals stay correct.
- Budget = trailing-3-month average (or 0 if no history).
- Let Excel auto-expand the section subtotal and year-total formulas
  by inserting rows inside the subtotal's SUM range.

### 6. Update year-total / Net Operating Income / Total Income / Total Expenses

Extend the SUM range to include the new column.

### 7. Approval gate (mandatory)

Preview as two tables:

Existing rows update:

| Line Item | Last 3-Month Avg | Proposed New Actual | Proposed New Budget | Source |
|---|---|---|---|---|

Source: `DWH actual` / `trailing-avg` / `fallback-zero`.

New rows to insert:

| Account Name | Section | Position | New Month Actual | Budget |
|---|---|---|---|---|

Wait for explicit user approval before applying.

### 8. Write

Preserve all existing column structure, formulas, and formatting in
prior columns. Don't touch them.

### 9. Chat summary -- flag suspicious zeros

> Added April 2026 to <Sheet>. Pulled real DWH actuals for 19 lines, zero-default on 4 lines, 1 new row inserted (Recruiter Fees under Operating Expenses). Suspicious: Salary and Leased-employee guaranteed payments dropped to $0 in April -- could be posting lag rather than zero spend. Confirm with your accountant before locking the column.
