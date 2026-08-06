# Reference: refresh actuals in an existing budget

## When to use

User has a budget open with stale actuals columns and wants the latest
numbers from Carta without breaking layout, formulas, or budget cells.

## Workflow

### 1. Detect the sheet's structure

Read the active workbook:

- Find the actuals columns by parsing column headers as date serials.
- Find each line item's row + the GL account name in the row label.
- Find the Total / Net Income / subtotal formula rows so you don't
  accidentally overwrite them.

### 2. Pull actuals

Call [`get-actuals.md`](get-actuals.md) with `<period_start>` =
earliest actuals column in the sheet, `<period_end>` = latest.

### 3. Match each sheet line to a CoA account

1. Exact name match on `account_name`.
2. Case-insensitive fuzzy match (strip "and"/"&"/punctuation).
3. GL-code match if the row exposes one.

Lines with no match: leave actuals alone, flag in the preview.

### 4. Zero out lines with no activity

If a line has a row in the sheet but no activity in the period,
set its actuals to 0 -- that clears stale values. Note it in the
"Cells zeroed" group of the preview.

### 5. Approval gate (parent SKILL.md Step 5)

Render the four-group preview:

- Existing rows updated -- `Line Item | Old Value | New Value | Source (DWH actual)`.
- Cells zeroed -- `Line Item | Old Value | Reason`.
- New rows to insert -- only if the user asked for them; default is to flag-only.
- DWH accounts with no row in the sheet -- `Account | Total in period`. Default action: surface to user, do not auto-insert (preserves the original layout). User can ask Cline to insert.

### 6. Write -- actuals cells only

- Do not touch budget cells.
- Do not touch the layout, formulas, or formatting.
- Match each line to the corresponding GL account by name first,
  then by GL code if there's ambiguity.

### 7. Chat summary

> Updated <N> lines in <Sheet Name>. Zeroed <M> lines (no activity in period). <K> GL accounts found in JOURNAL_ENTRIES with no corresponding row -- listed in the preview.
