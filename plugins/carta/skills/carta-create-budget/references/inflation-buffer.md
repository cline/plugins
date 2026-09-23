# Reference: apply an inflation / contingency buffer

## When to use

User asks to pad an existing budget's expenses by a percentage, e.g.
*"add a 5% inflation buffer to all expense values"* or *"apply a 3% contingency."*

Buffered budgets are this skill's domain (`carta-fetch-budget` never applies a buffer).
This operates on a budget already in the workbook -- do not re-fetch prior-year actuals.

## Workflow

### 1. Read the existing tab

Identify the label column, the expense detail rows, the expense amount columns, and the
existing subtotal / Total / Net Operating Income rows (cells where `is_formula: true`).

### 2. Add the buffer as an editable input cell

Write the buffer percentage to a single labeled input cell near the header band (e.g.
`Inflation buffer %` with the value in blue input style). Every buffered cell references it
so the user can flex one cell and have the whole budget recompute. Note in the `A2`/`A4` band that the budget includes the buffer (e.g. `Budget includes 5% expense buffer`) so downstream pacing/actuals skills can surface the basis.

### 2a. Gate 5 approval before any write

After the buffer % is confirmed, present the standard Gate 5 pre-build review (a preview
of the buffered tab plus the 3-option `ask the user`) and wait for the `"Approve and
write"` answer. This is what clears the SKILL.md Gate 6 approval-recorded check -- the buffer
confirmation alone does not. Do not write cells until you have the `"Approve and write"`
answer.

### 3. Apply the buffer to expense detail rows only

- Each expense detail cell becomes `= <raw_value> * (1 + <buffer_cell>)`.
- Do NOT buffer: income rows, the income subtotal, expense subtotals, Total Expenses,
  or Net Operating Income. Subtotals/totals stay `=SUM(...)` and pick up the buffered
  detail automatically. Scope the buffer write to the expense detail range explicitly --
  never a whole-column or whole-sheet loop that catches income/subtotal rows.

### 4. Preserve the raw values reversibly

Keep the pre-buffer values recoverable so the buffer is fully reversible (set the buffer
cell to 0%). Either:

- Preferred: keep the raw number inside each formula (`= <raw> * (1 + buffer)`), so the
  raw value is visible in the formula itself -- no separate sheet needed; or
- if a helper sheet holds the raw values, convert every buffered formula to its computed
  value (or re-point it) before deleting the helper sheet -- deleting a sheet that other
  cells reference leaves them as `#REF!`. Never delete a referenced helper sheet while live
  formulas still point at it.

## Hard rules

- Buffer applies to expense detail rows only -- never income, subtotals, totals, or NOI.
- The buffer is an editable input cell; buffered cells reference it (no hardcoded ×1.05).
- Subtotals / Total / NOI remain `=SUM(...)` -- never overwrite a formula cell.
- If a helper sheet is used, convert formulas to values (or re-point them) before deleting
  it -- a deleted referenced sheet orphans dependents into `#REF!`.
- Apply the resolved-currency format (`<CCY_TOKEN>`, see SKILL.md Hard rules) -- match the
  existing tab's currency, never default to USD.
