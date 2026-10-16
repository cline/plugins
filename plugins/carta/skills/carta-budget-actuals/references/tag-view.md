# Reference: Layout E -- tag-view actuals tab (category-grouped)

Loaded by `carta-budget-actuals/SKILL.md` Gate 2.5 and Gate 7 when the user chose
Layout E and the entity has tagged journal data.

---

## Output shape

A new tab named `<PERIOD_LABEL> Actuals by Reporting Tag` (e.g. `2026 Actuals by Reporting Tag`,
`Q2 2026 Actuals by Reporting Tag`). One tab per run, all categories side by side.

### Three-row nested header (period -> category -> tag)

```
Row 6 (period band):    |         | 2026                                                                                                                            |
Row 7 (category band):  |         | Department                            | Function                            | Geography                                          |
Row 8 (tag header):     | Account | Eng | Mkt | G&A | IT | Untag | Total | R&D | Sales | Ops | Untag | Total  | US | EMEA | APAC | Untag | Total                |
Row 9+ data:            | Salary  | 148k|  42k| 187k| 165k|   0  |  542k |130k |  42k  | 370k|   0  |  542k  |380k|  162k|   0  |   0   |   542k               |
```

- Row 6 -- period band: one merged cell per period block spanning all category sub-blocks within that period. Bold, white-on-black, centered. Write the period label (`2026`, `Q2 2026`, `Jan 2026`) into the first column of the block; the merge makes it span visually.
- Row 7 -- category band: one merged cell per category spanning its tag-value columns + the per-category Total column. Bold, light gray fill (`#D3D3D3`), centered. One band per category in the firm's tag taxonomy.
- Row 8 -- tag header: one cell per tag value within each category, plus one `Total` cell at the end of each category block. Bold, no fill. `Account` label sits in column A. `Section` is NOT used as a column -- section grouping happens via the band rows in the data area (`Revenue`, `Expenses`).
- Data rows start at row 9.

### Column layout (wide pivot)

```
A         B        C        D    ...    E+M    E+M+1
Account   <tag 1>  <tag 2>       <tag M>  <category Total>
          <- category 1 block spans B:E+M+1 ->
```

After the last tag column of category 1, the Total column closes that category's block. Then category 2 starts. Repeat for every category. If the run has multiple period blocks (Quarter or Month aggregation across a multi-period window), the whole category × tag + total structure repeats inside each period block.

### Per-category Total column -- invariant

For any given account row, every category's Total equals the same number -- the underlying account total for that period. The categories are alternative breakdowns of the same dollars. If you see two category Totals diverging on the same row, one category has `Untagged` rows that the other doesn't -- surface as a data-quality note in Gate 8, not as a discrepancy in the tie-outs.

### Long format (when total tag columns > 36)

If the sum of (distinct values per category) + (number of category-Total columns) exceeds 36, switch to long format. (For runs in the 25-36 range, Gate 2.5 asks the user wide-vs-long; only > 36 defaults to long without asking -- see the Cardinality guard table below.)

```
A         B          C          D           E       F      ...
Account   Category   Tag value  <period 1>  <period 2>   ...
```

Each (account × category × tag value) pair occupies one row. Period columns hold signed amounts. No merging needed in long format.

---

## Metadata band (rows 1-4)

Same 4-row band as all other budget skills (`branding-and-header.md`):

| Row | Cell | Content |
|---|---|---|
| 1 | A1 | Entity name |
| 2 | A2 | Tab title, e.g. `2026 Actuals by Reporting Tag` |
| 3 | A3 | `Source: Carta DWH (actuals pulled <ISO date>)` (italic, size 10) |
| 4 | A4 | `Amounts in <resolved_currency>` (italic, size 10) |
| 5 | A5 | blank |

Data headers start at row 6 (period band), row 7 (category band), row 8 (tag header); data at row 9+.

---

## SQL

See [`../queries/actuals-by-account-tag-period.sql`](../queries/actuals-by-account-tag-period.sql).

Two query shapes -- pick by the JSON-vs-flat detection in Gate 2.5:

- JSON path (`REPORTING_TAGS_JSON` populated) -- `LATERAL FLATTEN` builds a categories CTE, `CROSS JOIN` produces one row per (entry × category), `GET(json, key)::TEXT` extracts the value or falls back to `'Untagged'`.
- Flat path (only `REPORTING_TAGS` TEXT populated) -- single synthetic category labeled `Reporting Tag` so the 3-row header still renders.

Substitute `<entity_name>`, `<period_trunc>` (`YEAR` / `QUARTER` / `MONTH`), `<period_start>`, `<period_end>`. The JSON path discovers categories at query time; the Python pivot reads them from the query result.

All existing hard rules apply unchanged:
- `FUND_NAME = '<entity_name>'` entity scoping (never `FIRM_NAME ILIKE`)
- `EFFECTIVE_DATE` (books date), not `POSTED_DATE`
- Revenue (`4xxx`) sign-flipped; expenses kept as-is
- `ACCOUNT_TYPE >= '4000'` -- P&L only, no balance sheet
- Reversals preserved as negative postings

---

## Building the pivot

After the query returns rows shaped `(gl_code, account_name, category, tag_value, period, signed_amount)`, build the pivot in memory:

```
pivot[gl_code][account_name][period][category][tag_value] = signed_amount
```

- Periods: sorted ascending.
- Categories: sorted alphabetically (firm-stable ordering -- same categories appear in the same order across runs).
- Tag values within a category: sorted alphabetically, with `Untagged` always last within each category block.

Column index (wide):

```
col_A = "Account"
for each period (sorted):
    for each category (sorted):
        for each tag_value (sorted, Untagged last):
            next column = tag_value amount
        next column = category Total (SUM formula across this category's tag columns in this row)
```

No per-period total column -- the per-category totals collectively give that view (they're all equal to the account total).

---

## Writing the workbook (local-file runtime)

Build an operations payload for `write_workbook.py`:

1. `create_sheet` -- tab name `<PERIOD_LABEL> Actuals by Reporting Tag`. On re-runs against an existing workbook, first read the sheet list and, if a sheet with this name already exists, issue `delete_sheet` *before* `create_sheet`. Otherwise the script returns `status: "exists"` without recreating the sheet, the old period and category band merges stay in place, and step 3 / step 4's `merge_cells` ops will overlap them -- openpyxl raises `ValueError: Cannot merge cells that overlap existing merged cells`, leaving the workbook in a partially-written state.
2. Metadata band: four `write_cell` ops for A1-A4.
3. Period band (row 6): one `write_cell` per period block (first column of the block) with the period label, then one `merge_cells` spanning the full block (all categories + their totals within that period). E.g. `{"op": "merge_cells", "sheet": "...", "ref": "B6:P6"}`.
4. Category band (row 7): one `write_cell` per category block (first column of the block) with the category name, then one `merge_cells` spanning that category's tag columns + Total column. E.g. `{"op": "merge_cells", "sheet": "...", "ref": "B7:G7"}` for a 5-tag category.
5. Tag header (row 8): `write_range` for the full header row including `Account`, all tag labels, and `Total` per category block.
6. Data rows: `write_range` starting at row 9. Each row: account_name (col A), signed amounts per tag per category per period, category Total formula per category block.
7. Section subtotal rows (after each section's last account): bold, currency format, `=SUM(...)` formula spanning the section's data rows per column.
8. Net Operating Income row (after all sections): bold, formula `Income - Expenses` per column.
9. `set_bold` on rows 6, 7, 8 and all subtotal + NOI rows.
10. `set_format` on all amount columns, rows 9+. Always use the `<CCY_TOKEN>` locale token -- never a bare `$`:
    ```json
    {
      "op": "set_format",
      "sheet": "<tab name>",
      "ref": "B9:<last col><last row>",
      "number_format": "_(<CCY_TOKEN>* #,##0.00_);_(<CCY_TOKEN>* (#,##0.00);_(<CCY_TOKEN>* \"-\"??_);_(@_)"
    }
    ```
11. Column widths -- apply two ops in this order:
    - `{"op": "set_column_width", "sheet": "<tab name>", "column": "A", "width": 30}` -- fixed Account column.
    - `{"op": "autofit_columns", "sheet": "<tab name>", "columns": "B:<last col>"}` -- autofit the data columns *after* the data write.
    Account names vary in length and `autofit_columns` caps at `max_width=50`, which makes column A creep wide run-to-run; the fixed ~30-char width keeps the label column predictable. Same hybrid pattern as Layout A / Layout B.
12. Do not include `freeze_panes` -- the rest of the Carta budgeting skills follow a no-freeze convention and Layout E aligns with that.

The period and category band merges already happen at steps 3 and 4 (write_cell -> merge_cells, in that order). Do not re-issue merge_cells here.

Merge semantics: `merge_cells` writes the value to the top-left cell before merging. Merged area must not overlap existing merges. Always issue `write_cell` for the band label before the `merge_cells` op for that range.

---

## Writing the workbook (excel-addin runtime)

Use `execute_office_js`. Key points:

```javascript
// Period band -- merge after writing the label
sheet.getRange("B6").values = [["2026"]];
sheet.getRange("B6:P6").merge(true);                      // true = merge across only
sheet.getRange("B6:P6").format.font.bold = true;
sheet.getRange("B6:P6").format.fill.color = "#000000";
sheet.getRange("B6:P6").format.font.color = "#FFFFFF";
sheet.getRange("B6:P6").format.horizontalAlignment = "Center";

// Category bands -- one merge per category block
sheet.getRange("B7").values = [["Department"]];
sheet.getRange("B7:G7").merge(true);
sheet.getRange("B7:G7").format.fill.color = "#D3D3D3";
sheet.getRange("B7:G7").format.font.bold = true;
sheet.getRange("B7:G7").format.horizontalAlignment = "Center";
// ... repeat per category

// Tag header row -- write all tag labels + Total cells in one shot
sheet.getRange("A8:P8").values = [["Account",
  "Eng","Mkt","G&A","IT","Untagged","Total",
  "R&D","Sales","Ops","Untagged","Total",
  "US","EMEA","APAC","Untagged","Total"]];
sheet.getRange("A8:P8").format.font.bold = true;

// Currency format -- ALWAYS use <CCY_TOKEN> locale token, NEVER bare "$"
const dataRange = sheet.getRange("B9:<lastCol><lastRow>");
dataRange.numberFormat = [["_(<CCY_TOKEN>* #,##0.00_);_(<CCY_TOKEN>* (#,##0.00);_(<CCY_TOKEN>* \"-\"??_);_(@_)"]];

// Column widths -- autofit on used range first, then re-assert the
// fixed Account column. `getColumnsAfter` does NOT exist on Excel.Range
// in the Office.js add-in runtime (it lives on RangeAreas in Office
// Scripts only). The established pattern across the Carta skills is to
// autofit the full used range and then override any fixed-width columns.
// ~200pt ≈ 30 char widths in Calibri 11.
sheet.getUsedRange().format.autofitColumns();
sheet.getRange("A:A").format.columnWidth = 200;

// Do NOT freeze panes -- the rest of the Carta budgeting skills follow a
// no-freeze convention and Layout E aligns with that.
```

Issue at least three separate `execute_office_js` calls per Gate 7 (cell writes, brand block, combined currency + branding verification) -- same requirement as Layouts A-D.

---

## Cardinality guard

Compute the total column count as: `(sum of distinct tag values per category) + (number of categories)`. The `+ (number of categories)` term is the per-category Total columns.

| Total tag columns | Default layout | Offer choice? |
|---|---|---|
| <= 24 | Wide | No -- wide is the default |
| 25 - 36 | Wide | Yes -- ask wide vs long at Gate 2.5 |
| > 36 | Long | No -- long is the default, no question (matches the Long-format prose at line 41 and SKILL.md Gate 2.5) |

Multi-period runs (Quarter or Month aggregation) multiply the column count by the number of period blocks. Run the guard against the multiplied total, not the per-period count.

---

## Untagged handling

- Every category gets its own `Untagged` column at the end of that category's block (just before its Total). The category Total column sums across all tag values including Untagged.
- If a category has no `Untagged` rows in the selected period, the Untagged column reads `0` (not omitted) -- keeps headers stable across categories and runs.

---

## Hard rules

- Currency format: always `_(<CCY_TOKEN>* #,##0.00_);_(<CCY_TOKEN>* (#,##0.00);_(<CCY_TOKEN>* "-"??_);_(@_)`. The `<CCY_TOKEN>` locale token locks the display to the resolved presentation currency regardless of the user's Excel locale (derive the currency from the data -- never default to USD). Never use a bare `$`. Apply to every amount cell, subtotal row, and NOI row.
- Never invent categories or tag values -- only use what the JSON-keys probe and the cardinality probe returned at Gate 2.5.
- Each category Total column on a given account row MUST equal every other category's Total on the same row. If they diverge, it's a data-quality signal worth flagging in Gate 8 (an entry is tagged in one category but not the other).
- Slice is additive to entity filter -- `WHERE FUND_NAME = '<entity_name>'` always applies.
- `merge_cells` op in `write_workbook.py` must come after the `write_cell` for the same band-label ref -- merged cells discard non-top-left values.
- Branding (`branding-and-header.md`) applies to this tab exactly as for all other tabs -- logo at column E (rows 1-3 height), metadata band in column A.
