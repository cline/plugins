# Reference: group budget line items into categories

## When to use

User asks to organize an existing budget tab into a few top-level categories with
subtotals, e.g. *"group the line items into a few intuitive categories"* or
*"add category subtotals to the budget."*

This operates on a budget already in the workbook -- do not re-fetch prior-year actuals.

## Workflow

### 1. Read the existing tab

Read the budget tab via the runtime's read tool. Identify the label column, the amount
columns (monthly and/or total), and any existing subtotal / Total / Net Operating Income
rows (cells where `is_formula: true`). These are load-bearing -- preserve their
`=SUM(...)` semantics; never overwrite a formula cell with a literal.

### 2. Propose a category mapping

Map each detail line to a small set of categories (typical ManCo set below -- adapt to the
actual accounts, and confirm the mapping with the user before writing):

- Compensation & Benefits -- Payroll, Payroll taxes, 401k, Health/Workers' comp insurance, Employee benefits, HR services
- Professional Fees -- Audit, Tax prep, Legal, Other professional, Accounting
- Travel & Entertainment -- Travel (all sub-lines), Meals, Entertainment
- Office & Occupancy -- Rent, Office, Telephone & internet, Insurance, Bank charges, Filing fees, Dues & subscriptions
- Marketing & LP Relations -- Marketing, LP portal, LP meeting, Charitable donation

Present the mapping via `ask the user` (or a preview table) before writing.

### 2a. Gate 5 approval before any write

After the mapping is confirmed, present the standard Gate 5 pre-build review (a preview
of the regrouped tab plus the 3-option `ask the user`) and wait for the `"Approve and
write"` answer. This is what clears the SKILL.md Gate 6 approval-recorded check -- the
mapping confirmation alone does not. Do not write cells until you have the `"Approve and
write"` answer.

### 3. Rebuild the tab with category groups

- Place each category as a section header row, its detail lines beneath, then a category
  subtotal row with `=SUM(<first_detail>:<last_detail>)` per amount column.
- The grand Total Expenses row sums the category subtotals (`=B<cat1>+B<cat2>+...`), not
  the detail rows -- avoid double-counting.
- Income rows and the income subtotal are not part of any expense category -- leave them
  out of the expense grouping so a regrouping loop never rewrites the income subtotal.
- Use Excel row grouping (the `-` outline gutter) so categories collapse, if the runtime
  supports it.

## Hard rules

- Preserve every existing formula cell -- subtotals / Total / NOI stay `=SUM(...)`.
- Category subtotals and the grand total are formulas, never hardcoded duplicates.
- Apply the resolved-currency format (`<CCY_TOKEN>`, see SKILL.md Hard rules) to new
  subtotal rows -- match the existing tab's currency, never default to USD.
- Label/header text beginning with `+`, `=`, `-`, or `@` parses as a formula -- prefix such
  text with a leading `'` (or space), or drop the leading symbol.
