# Reference: fill the Budget columns on the consolidating P&L

Loaded by `carta-consolidating-pnl/SKILL.md` Gate 9 -- the optional budget-fill step that runs after the P&L detail + Summary tabs are written. Merges a budget dataset onto the existing P&L detail tab.

## Caller's inputs

```
{
  source: "carta-mcp" | "excel-file" | "workbook-tab",
  budget_year: 2026,
  scope: "single-entity" | "firm-wide",
  entity_name: "<entity name>" | null,
  budget_rows: [
    { gl_code, account_name, monthly: {01..12}, annual: <number> },
    ...
  ],
  source_label: "..."
}
```

P&L detail tab columns: D Month Actual, E Month Budget, M YTD Actual, N YTD Budget. Variance/% formulas already guard `IF(E>0, ..., "n/a")`.

## Workflow

### 1. Detect single-entity-vs-firm-wide mismatch

If budget is single-entity but P&L is firm-wide (every consolidating-pnl build is firm-wide), flag before writing via `ask the user`:

> "⚠ Heads up -- the budget is scoped to `<entity_name>`, but this P&L consolidates every entity under `<FIRM>`. Variance numbers will compare a single-entity budget to a firm-wide actual. Proceed anyway?"

Yes/cancel. Skip flag when `scope: "firm-wide"`.

### 2. Match each budget row to a P&L row

First match wins:
1. GL code -- internal lookup against `ACCOUNT_TYPE` map the skill stored when building P&L. The P&L has no GL-code column -- column A is blank, column B is the label only. Do NOT look for a code in column A, do NOT prefix column B with the code after the fact.
2. Account name (case-insensitive exact match on `account_name` = column B label).
3. Account name (case-insensitive prefix match, stripped of trailing parenthetical qualifiers).

Record matches in a `matched = [{gl_code, account_name, pnl_row, monthly_total, annual_total}]` map. Unmatched budget rows become new rows inserted in step 4.

### 3. Write Month Budget (E) + YTD Budget (N) on matched rows

For each matched row:
- E <- budget for the P&L's reporting month.
- N <- sum of monthly budget from `<budget_year>-01` through reporting month inclusive.

Hardcoded numbers, currency format. Never overwrite D / G / H / M / P / Q.

### 4. Insert missing budget rows into the right section

For each unmatched budget row:
1. Classify by leading GL digit (per `section-map.md`): `4xxx` -> Revenue; `5xxx`-`9xxx` -> Expense (keyword table assigns Human Capital / Contractor / Occupancy / Professional Services / Travel & Marketing / Technology / Other).
2. Insert a new row above that section's subtotal, preserving GL-code sort order.
3. Fill: B = `account_name`, D = `0`, E = month budget, M = `0`, N = YTD-to-month sum, G/H/P/Q = same formulas as neighbors (use `fill_formula_vertical` for relative-ref translation).

### 5. Update section subtotals + cross-section totals

Section `=SUM(...)` ranges expand after inserts. Recompute start/end rows of every section, rewrite each subtotal formula per column (D, E, G, M, N, P; H and Q stay variance %).

Then update:
- `Total expenses (pre-tax)` -- re-emit `=<HC>+<Contractor>+<Occupancy>+<ProfSvc>+<Travel>+<Tech>+<Other>` per column with updated row numbers.
- `Net Income /(loss), pre tax` -- re-emit `=<Revenue> - <Total expenses>` per column.

Don't touch the Summary tab -- it's formula-linked and recomputes automatically.

### 6. Fill remaining blank Budget cells with `0`

Every empty cell in E and N (P&L rows the budget didn't match) gets `0`. Without it, Variance/% formulas show `"n/a"` (correct but ambiguous -- user wants explicit `$0` confirmation). Skip only if user opted out in Gate 9.

### 7. Add the source note in B3

`Budget source: <source_label>` (italic, size 10). Move `Amounts in $` to B4 if needed.

### 8. Tie-out check (always run)

| Check | How |
|---|---|
| Revenue budget total | Sum E for Revenue rows; compare to sum of `4xxx` budget rows. Match if diff < $1. |
| Total Expense budget total | Sum E for expense subtotals; compare to sum of non-`4xxx` budget rows. Match if diff < $1. |
| Net Income vs Budget (Month + YTD) | Read D and E of `Net Income /(loss), pre tax` row -> `Actual - Budget` for both. |

### 9. Report

> "The Budget columns on [P&L - Acme Mar-26](<citation:...>) are filled from `<source_label>`.
>
> Key tie-outs (Budget fill ties to source):
> | Line item | P&L | Source | Difference | Status |
> |---|---:|---:|---:|---|
> | Revenue Budget (Month) | $X | $X | $0 | ✅ Match |
> | Total Expense Budget (Month) | $X | $X | $0 | ✅ Match |
> | Net Income vs Budget (Month) | $X | -- | -- | (variance) |
> | Net Income vs Budget (YTD) | $X | -- | -- | (variance) |
>
> N budget rows merged. K new rows inserted. M P&L rows zeroed."

If single-entity-vs-firm-wide flag fired in step 1, repeat it in the closing report.

## Hard rules

- Never overwrite columns D / G / H / M / P / Q -- those are Actual/Variance/% cells.
- Never invent rows -- new rows only from unmatched budget entries, classified into the correct section.
- Never smooth quarterly postings into monthly. If Carta returns Management fee income only in months 1/4/7/10, leave the others blank.
- Currency format: `[$$-en-US]` -- never bare `$`.
- Match precedence: GL code -> exact name -> prefix name. Never reverse (name collision across GL codes would silently merge wrong rows).
- Don't touch the Summary tab.
- Do not auto-retry failed fetches.
