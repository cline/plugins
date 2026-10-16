# Reference: sheet-wide pacing overview

## When to use

Open prompts like:

- "How are we pacing this year?"
- "Compare YTD to budget."
- "Are we on track?"
- "What's our variance?"

## Workflow

### 1. Read the existing budget from the workbook

- Identify the budget tab (ask if ambiguous).
- Parse line items, sections, monthly columns, annual total column.

### 2. Pull YTD actuals -- `get-actuals.md`

`<period_start>` = first day of budget year, `<period_end>` = last
completed month (ask if the year hasn't ended).

### 3. Match line items to GL accounts

Name first, GL code as tiebreaker -- same logic as `refresh-existing.md`.

### 4. Compute pacing metrics (per line)

```
actual_ytd       = SUM(monthly_actuals from Jan to <period_end>)
budget_ytd       = SUM(monthly_budget from Jan to <period_end>)
variance         = actual_ytd - budget_ytd
pct_consumed     = actual_ytd / annual_budget
pct_year         = months_elapsed / 12
run_rate         = actual_ytd / months_elapsed * 12
projected_var    = run_rate - annual_budget
flag             = "Over"  if pct_consumed > pct_year + 0.10
                   "Under" if pct_consumed < pct_year - 0.10
                   "New activity" if annual_budget == 0 and actual_ytd > 0
                   "OK" otherwise
```

### 5. Output -- depends on Step 1's spreadsheet-state answer

"New tab" -- write a `Budget vs Actuals` tab with columns:

| Section | Line Item | Annual Budget | YTD Budget | YTD Actual | Variance | % Consumed | % Year Elapsed | Run-Rate | Projected Variance | Flag |
|---|---|---|---|---|---|---|---|---|---|---|

All numerical columns as live formulas where possible (so the user
can rerun by editing source data).

"Alongside existing tab" -- append columns `YTD Actual | Variance | % Consumed | Flag` to the right of the existing structure.

"Chat only" -- render the same table inline; don't write.

#### Color coding -- Variance column (applies to both write modes)

Apply font color to the `Variance` cells based on sign:

- Positive value -> green (`#0A8A4A`)
- Negative value -> red (`#C0392B`)
- Zero or blank -> default

Use conditional formatting so the color follows the value if the user edits source data -- never hard-code colors per cell.

- Excel add-in (`<RUNTIME>` = `excel-addin`): add two `cellValue` conditional-format rules on the Variance column range -- one with `operator: "greaterThan"`, `formula1: "0"`, `format.font.color = "#0A8A4A"`; one with `operator: "lessThan"`, `formula1: "0"`, `format.font.color = "#C0392B"`.
- Local file (`<RUNTIME>` = `local-file`): use the bundled `write_workbook.py` `conditional_format` operation with two rules on the Variance column range: `operator: "greaterThan"`, `formula: "0"`, `font_color: "#0A8A4A"` and `operator: "lessThan"`, `formula: "0"`, `font_color: "#C0392B"`.

Apply the same rule to the `Projected Variance` column if it's written -- same sign convention.

#### Color coding -- Flag column (applies to both write modes)

Apply a background fill to the `Flag` column based on the value so users can scan pacing health at a glance. This is a fill rule -- the Flag column carries text, not numbers, so font color (used for Variance) wouldn't add signal.

- `Over` -> red `#F8D7DA`
- `Under` -> yellow `#FFF3CD`
- `New activity` -> blue `#D1ECF1`
- `OK` -> no fill (default)

Use conditional formatting so the fill follows the cell value when the user edits the underlying data -- never hard-code the fill per cell.

- Excel add-in (`<RUNTIME>` = `excel-addin`): add three `cellValue` conditional-format rules on the Flag column range, each with `operator: "equalTo"`, `formula1: "\"Over\""` / `"\"Under\""` / `"\"New activity\""`, and `format.fill.color = "#F8D7DA"` / `"#FFF3CD"` / `"#D1ECF1"` respectively.
- Local file (`<RUNTIME>` = `local-file`): use the bundled `write_workbook.py` `conditional_format` operation with three rules on the Flag column range: `operator: "equal"`, `formula: "\"Over\""`, `fill_color: "#F8D7DA"`; `operator: "equal"`, `formula: "\"Under\""`, `fill_color: "#FFF3CD"`; and `operator: "equal"`, `formula: "\"New activity\""`, `fill_color: "#D1ECF1"`.

### 6. Key tie-outs

Always surface a small Key tie-outs block after the table:

- Total income -- YTD Actual vs YTD Budget.
- Total expenses -- YTD Actual vs YTD Budget.
- Projected full-year Net Operating Income vs budgeted NOI.
- N lines over pace, M lines under pace, K new activity.

### 7. Chat summary

One or two sentences with the worst-pacing line(s) named, plus the
projected full-year NOI delta. Pointer to the analysis tab.
