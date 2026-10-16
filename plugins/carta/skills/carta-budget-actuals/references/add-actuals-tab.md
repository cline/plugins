# Reference: add a peer `<year> Actuals` tab (Layout B)

Adds `<year> Actuals` alongside the existing `Budget FY<year>` -- mirrors the `<prior_year> Actuals` tab from `carta-create-budget`. Budget tab untouched.

## When to use

User picked Layout B in `add-actuals` Gate 2. Triggers: "add separate `<year> Actuals` tab", "track this year's actuals on its own tab", or keeping Budget clean for pacing via `carta-budget-vs-actuals`.

## When NOT to use

- Interleaved B/A/V per month -> [`add-actuals-columns.md`](add-actuals-columns.md).
- Cells exist, just stale -> [`refresh-existing.md`](refresh-existing.md).
- Only next single month -> [`add-period.md`](add-period.md).

## Workflow

### 1. Read existing structure

`excel-addin`: add-in's read tools. `local-file`: `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/read_workbook.py" "<PATH>"`.

Capture row labels + section headers from `Budget FY<year>`. If a `<prior_year> Actuals` tab exists, use its layout as template; else fall back to Budget tab layout.

### 2. Pull actuals

Via [`get-actuals.md`](get-actuals.md). `<period_start>` = first day of year. `<period_end>` = today / last completed month (ask).

### 3. Match accounts

Name first, GL code tiebreaker.
- Matched -> go into new tab.
- DWH-only -> activity but no Budget row. Surface in preview, ask whether to include (default yes -- Actuals should be complete).

### 4. Build new tab payload

Tab name: `<year> Actuals`. Position: immediately after Budget tab.

Header rows: A1 firm / A2 `<year> Actuals` / A4 `Amounts in <resolved_currency>` (see [`branding-and-header.md`](branding-and-header.md) for full 4-row band, column-A override).

Row 6 column headers: `Account | Jan <year> | ... | Dec <year> | <year> Total`. Bold, white-on-black.

Data rows:
- Same section order as Budget tab.
- One row per matched account, sorted by `gl_code`.
- Actual = hardcoded from `get-actuals.md`. `0` for no activity; blank for future months.
- Annual total: `=SUM(B<row>:M<row>)`.
- Subtotal per section: bold, top thin border, `=SUM(<section>)` per column.

Bottom rows: `Total Income` / blank / `Total Expenses` / blank / `Net Operating Income` (= Income - Expenses), per column.

Formatting: accounting locale-token currency format. No freeze panes. `autofit_columns` on B:N (fixed widths < 16pt show `####`). Column A fixed ~30.

### 5. Approval gate

Preview: Section | Line | Jan | Feb | ... | YTD Total. Plus count: "N line items × M months filled; future months left blank." Surface DWH-only accounts separately if any.

### 6. Write

Don't touch the Budget tab. Only `create_sheet` + `write_*` on the new `<year> Actuals` tab.

### 7. Summary

> "Added `<year> Actuals` alongside `Budget FY<year>` and `<prior_year> Actuals`. Jan through `<last month>` populated; future months left blank. N DWH-only accounts included (or held back)."

Parent SKILL.md handles post-action menu -- `carta-budget-vs-actuals` will now compare Budget vs `<year> Actuals` directly.
