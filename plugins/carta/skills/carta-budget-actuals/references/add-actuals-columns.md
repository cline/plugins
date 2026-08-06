# Reference: interleave Budget / Actual / Variance columns per month (Layout A)

The Budget tab is restructured so each month has three columns side by side (Budget / Actual / Variance), plus a YTD block on the right.

## When to use

Default -- `add-actuals` Gate 2 marks this `<- recommended`. Triggers: "add 2026 actuals by month", "interleave actuals", "Budget vs Actual on the same tab", "variance by month".

## When NOT to use

- Separate Actuals tab -> [`add-actuals-tab.md`](add-actuals-tab.md).
- Refresh existing Layout A cells -> [`refresh-existing.md`](refresh-existing.md).
- Only next single month -> [`add-period.md`](add-period.md).

## Workflow

### 1. Backup question -- ASK BEFORE WIPING

This layout replaces the Budget tab. Irreversible without a backup. Ask via `ask the user`:

> "This will rebuild `Budget FY<year>` with interleaved Budget / Actual / Variance columns per month. Current layout will be replaced. Keep a backup tab first?"

1. Keep backup `Budget FY<year> (pre-rebuild)` <- recommended
2. Rebuild in place
3. Cancel

Cancel -> stop cleanly. Yes -> write payload starts with `create_sheet` + `write_range` cloning the current tab into the backup name BEFORE any wipe.

### 2. Read the existing Budget tab

`excel-addin`: add-in's read tools. `local-file`: `uv run "${CLAUDE_PLUGIN_ROOT}/scripts/read_workbook.py" "<PATH>" --sheet "Budget FY<year>"`.

Capture every row label, monthly header, and Budget value per (account, month). Budget values are preserved verbatim into the new `B` columns -- never recompute.

### 3. Pull actuals

Via [`get-actuals.md`](get-actuals.md). `<period_start>` = first day of year. `<period_end>` = today or last completed month (ask).

### 4. Match accounts

Name first, GL code as tiebreaker. Two outputs:
- Matched accounts -- Budget + DWH activity. Get B/A/V per month.
- DWH-only accounts -- DWH activity, no Budget row. Surface in preview; always ask placement (see Step 7). Never auto-include.

### 5. Build the rebuild payload

Header rows: A1 firm, A2 `<year> Budget / Actual / Variance`, A4 `Amounts in <resolved_currency>`. See [`branding-and-header.md`](branding-and-header.md) for full 4-row band spec (column-A override).

Column structure:
- A: Account label
- B-D: `Jan <year>` Budget/Actual/Variance
- E-G: `Feb <year>` (same), through Dec
- AL-AN: `<year> YTD` Budget/Actual/Variance

Two-row header (rows 6+7):
- Row 6: month labels merged across each triplet (e.g. `Jan <year>` across B-D), bold white-on-black.
- Row 7: `Budget` / `Actual` / `Variance` per triplet -- spelled out in full, never `B/A/V`. Bold, centered.

Row 8+: data rows.

Per cell:
- Budget (col B/E/H/...) -- hardcoded, preserved from Step 2.
- Actual (col C/F/I/...) -- hardcoded from `get-actuals.md`. `0` for months with no activity; blank for future months after `<period_end>`.
- Variance (col D/G/J/...) -- `=Budget - Actual`, formula.

Per section: subtotal row, bold, top thin border, `=SUM(...)` across each triplet.

Bottom rows: `Total Income` / blank / `Total Expenses` / blank / `Net Operating Income` (= Income - Expenses), per column.

DWH-only placement depends on Q1 answer:
- Inline (default <- recommended) -- sort into Income/Expense by GL prefix, insert above section total, Budget cells blank. Extend section subtotal SUM ranges.
- Italic below NOI -- append actual-only, no budget, no variance.
- Skip -- don't add.

Use `fill_formula_horizontal` and `fill_formula_vertical` for variance/YTD formulas -- one seed, the script translates relative refs. Avoids the single-cell-overlay problem (thousands of individual writes).

Formatting: accounting locale-token currency format. No freeze panes. Column A fixed ~180pt for labels; `autofit_columns` on B:AN after data write (fixed widths < 16pt show `####` for 5+ digit currency).

#### Variance column color coding

Conditional formatting (never hard-code per cell):
- Positive -> green `#0A8A4A`
- Negative -> red `#C0392B`
- Zero / blank -> default

`excel-addin`: two `cellValue` rules per V-column range (`greaterThan 0` / `lessThan 0`), applied to D/G/J/M/P/S/V/Y/AB/AE/AH/AK + AN.
`local-file`: use the bundled `write_workbook.py` `conditional_format` operation with two rules per range: `operator: "greaterThan"`, `formula: "0"`, `font_color: "#0A8A4A"` and `operator: "lessThan"`, `formula: "0"`, `font_color: "#C0392B"`.

### 6. Tie-out check (before preview)

| Metric | Existing | Proposed | Status |
|---|---|---|---|
| Total Income YTD (Budget) | from Step 2 | sum of B-cols Jan-`<period_end>` | ✅ / ⚠ |
| Total Expenses YTD (Budget) | from Step 2 | sum of B-cols Jan-`<period_end>` | ✅ / ⚠ |
| Total Income YTD (Actual) | from `get-actuals` | sum of A-cols Jan-`<period_end>` | ✅ / ⚠ |
| Total Expenses YTD (Actual) | from `get-actuals` | sum of A-cols Jan-`<period_end>` | ✅ / ⚠ |

If any `⚠ Mismatch`, halt before preview, surface the gap.

### 7. Approval gate (parent SKILL.md Gate 6)

Preview table: Section | Line | Budget YTD | Actual YTD | Variance YTD | Flag.

Plus Key tie-outs block: Total Income YTD, Total Expenses YTD, NOI YTD (Budget vs Actual + Variance).

If DWH-only accounts exist, render their own preview block (Account | GL | YTD Actual | Suggested section) and ask two questions via `ask the user`:

> Q1 -- Where should DWH-only accounts go?
> 1. Inline in main table <- recommended
> 2. Italic below NOI
> 3. Skip

> Q2 -- Backup of original Budget tab?
> 1. Keep `Budget FY<year> (pre-rebuild)` <- recommended
> 2. Rebuild in place
> 3. Cancel

Q1 only fires if DWH-only exist. Q2 always fires.

### 8. Write

Yes to backup -> clone tab first, then wipe + rebuild. No -> wipe + rebuild directly. Wipe = delete the existing `Budget FY<year>` sheet, recreate fresh.

### 9. Summary

> "Rebuilt `Budget FY<year>` with interleaved Budget / Actual / Variance per month plus YTD block. Backup on `Budget FY<year> (pre-rebuild)`. Key tie-outs: Total Income YTD Budget $X vs Actual $Y; Total Expenses YTD Budget $X vs Actual $Y; NOI Budget $X vs Actual $Y. N 2026-only accounts inserted below NOI in italic (if applicable)."

Parent SKILL.md handles the post-action menu.
