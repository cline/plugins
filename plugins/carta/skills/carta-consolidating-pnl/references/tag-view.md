# Reference: P&L tag-view tab (category-grouped)

Loaded by `carta-consolidating-pnl/SKILL.md` Gate 6 when the user chose
Build a tag-view tab at Gate 4. This file completely replaces the
standard Gate 6 detail-tab build for tag-view mode. Gate 7 (Summary)
does not run.

---

## Output shape

One tab named `P&L by Reporting Tag - <FIRM-SHORT> <MMM-YY>` (e.g.
`P&L by Reporting Tag - Acme Mar-26`). One tab per run, all firm
categories shown side by side under each period band. No Summary tab.

### Three-row nested header (period -> category -> tag)

```
Row 4 (period):     |         | Mar-26 Actual                                                                            | YTD Mar-26 Actual                                                                       |
Row 5 (category):   |         | Department                          | Function                          | Geography      | Department                          | Function                          | Geography      |
Row 6 (tag header): | Account | Eng | Mkt | G&A | Untag | Dept Tot  | R&D | Sales | Ops | Untag | Func Tot| US | EMEA | GeoT| Eng | Mkt | G&A | Untag | Dept Tot  | R&D | Sales | Ops | Untag | Func Tot| US | EMEA | GeoT|
Row 7+ (data):       ...
```

- Row 4 -- period band: one merged cell per period block (Month, YTD) spanning all category sub-blocks within that period. Bold, white-on-black. Labels: `<MMM-YY> Actual` and `YTD <MMM-YY> Actual`.
- Row 5 -- category band: one merged cell per category spanning its tag-value columns + the per-category Total column. Bold, light gray fill (`#D3D3D3`), centered. One band per category in the firm's tag taxonomy. Categories repeat inside both the Month block and the YTD block.
- Row 6 -- tag header: one cell per tag value within each category, plus one Total cell (`Dept Tot`, `Func Tot`, `Geo Tot`, etc.) at the end of each category block. Bold, no fill. `Account` label in column B; column A is the narrow margin.
- Data rows start at row 7.

### Column layout (wide pivot -- default)

```
A         B         C ... C+M    C+M+1     ... | period spacer | next period block (same shape)
(margin)  Account   <cat1 tags>  <cat1 Tot>     ...
                    <- category 1 block ->
```

No per-period total column -- each category's subtotal already gives the period total (they're all equal). The per-period band on row 4 carries the period label only; it does not introduce a Total column of its own.

### Long format (when total tag columns > 36, or by user choice)

If `(sum of distinct values per category) + (number of categories)` per period block, multiplied by the number of period blocks (Month + YTD = 2), exceeds 36, switch to long format. (For runs in the 25-36 range, Gate 4 asks the user wide-vs-long with Wide as the recommendation; for runs > 36, Gate 4 still asks but Long is the recommendation -- see the Cardinality guard table below. Gate 4 never skips the question outright once column count exceeds 24, so accountants can always override the default.)

```
A         B         C            D                E             F
(margin)  Account   Category     Tag value        Month Actual  YTD Actual
```

Each (account × category × tag) triplet occupies one row. No merging needed in long format.

---

## Metadata band (rows 1-3)

Same 3-row band as the standard detail tab (`branding-and-header.md`),
compressed by one row to fit the deeper data header:

| Row | Cell | Content |
|---|---|---|
| 1 | B1 | Firm name |
| 2 | B2 | Tab title, e.g. `P&L by Reporting Tag - Mar-26` |
| 3 | B3 | `Source: Carta DWH (actuals pulled <ISO date>) -- by tag categories` (italic, size 10) |
| 4 | -- | period band (merged Month / YTD) |
| 5 | -- | category band (merged per category within each period) |
| 6 | -- | tag header (account + tag values + per-category Total) |
| 7+ | -- | data |

Carta logo at column D anchored to D1, height = rows 1-3 -- same per-skill override as the standard `carta-consolidating-pnl` detail tab. Gate 6 verification + Hard Rules below assert this anchor; the deeper 3-row data header on rows 4-6 sits to the right of the logo without conflict.

---

## SQL

Two query shapes -- pick by the JSON-vs-flat detection in Gate 2.5:

### JSON path (REPORTING_TAGS_JSON populated)

```sql
WITH categories AS (
    SELECT DISTINCT f.key AS category
    FROM <journal_entries_table>,
         LATERAL FLATTEN(input => REPORTING_TAGS_JSON) f
    WHERE FIRM_ID = '<firm_uuid>'
      AND REPORTING_TAGS_JSON IS NOT NULL
      AND EFFECTIVE_DATE BETWEEN '<ytd_start>' AND '<month_end>'
)
SELECT
    j.ACCOUNT_TYPE                                                     AS gl_code,
    j.ACCOUNT_NAME                                                     AS account_name,
    c.category                                                         AS category,
    COALESCE(GET(j.REPORTING_TAGS_JSON, c.category)::TEXT, 'Untagged') AS tag_value,
    SUM(CASE WHEN j.EFFECTIVE_DATE BETWEEN '<month_start>' AND '<month_end>' THEN j.AMOUNT ELSE 0 END) AS MONTH_AMT,
    SUM(CASE WHEN j.EFFECTIVE_DATE BETWEEN '<ytd_start>'   AND '<month_end>' THEN j.AMOUNT ELSE 0 END) AS YTD_AMT
FROM <journal_entries_table> j
CROSS JOIN categories c
WHERE j.FIRM_ID = '<firm_uuid>'
  AND j.ACCOUNT_TYPE >= '4000'
  AND j.EFFECTIVE_DATE BETWEEN '<ytd_start>' AND '<month_end>'
GROUP BY 1, 2, 3, 4
HAVING SUM(CASE WHEN j.EFFECTIVE_DATE BETWEEN '<ytd_start>' AND '<month_end>' THEN j.AMOUNT ELSE 0 END) <> 0
ORDER BY 1, 2, 3, 4
```

### Flat path (only REPORTING_TAGS TEXT populated)

```sql
SELECT
    ACCOUNT_TYPE,
    ACCOUNT_NAME,
    'Reporting Tag'                       AS category,
    COALESCE(REPORTING_TAGS, 'Untagged')  AS tag_value,
    SUM(CASE WHEN EFFECTIVE_DATE BETWEEN '<month_start>' AND '<month_end>' THEN AMOUNT ELSE 0 END) AS MONTH_AMT,
    SUM(CASE WHEN EFFECTIVE_DATE BETWEEN '<ytd_start>'   AND '<month_end>' THEN AMOUNT ELSE 0 END) AS YTD_AMT
FROM <journal_entries_table>
WHERE FIRM_ID = '<firm_uuid>'
  AND ACCOUNT_TYPE >= '4000'
  AND EFFECTIVE_DATE BETWEEN '<ytd_start>' AND '<month_end>'
GROUP BY 1, 2, 3, 4
HAVING SUM(CASE WHEN EFFECTIVE_DATE BETWEEN '<ytd_start>' AND '<month_end>' THEN AMOUNT ELSE 0 END) <> 0
ORDER BY 1, 2, 4
```

Same hard rules as the standard query (`schema.md`):

- `FIRM_ID = '<firm_uuid>'` -- firm-wide rollup, no `FUND_NAME` filter.
- `EFFECTIVE_DATE` (books date), not `POSTED_DATE`.
- `ACCOUNT_TYPE >= '4000'` -- P&L only.
- Revenue (`4xxx`) -- sign-flip in post-processing (multiply by -1 before rendering), same as standard query.
- `HAVING ... <> 0` -- drop accounts with zero YTD. Tag-view mode does not union with budget rows (no budget in tag-view).

Use `format: "ndjson"` if the row count > 50.

---

## Building the pivot

After the query returns rows shaped `(gl_code, account_name, category, tag_value, MONTH_AMT, YTD_AMT)`, build the pivot in memory:

```
pivot[(gl_code, account_name)][category][tag_value] = {month: <amt>, ytd: <amt>}
```

- Categories: sorted alphabetically (firm-stable ordering).
- Tag values within a category: sorted alphabetically, with `Untagged` always last.
- Classification and section order: identical to the standard build -- load `references/section-map.md` and apply.

Per-category Total invariant: for any account, every category's Total within a given period block equals the same number -- the underlying account total in that period. The categories are alternative breakdowns of the same dollars.

---

## Writing the tab (excel-addin runtime)

Use `execute_office_js`. Same Gate 6 three-call structure as the standard build (cell writes -> brand block -> verification), plus the currency-format readback added at Gate 6 -- four calls total.

### Header construction

```javascript
// Period band (row 4) -- merge per period block
sheet.getRange("C4").values = [["<MMM-YY> Actual"]];
sheet.getRange("C4:<last_month_col>4").merge(true);
sheet.getRange("C4:<last_month_col>4").format.font.bold = true;
sheet.getRange("C4:<last_month_col>4").format.fill.color = "#000000";
sheet.getRange("C4:<last_month_col>4").format.font.color = "#FFFFFF";
sheet.getRange("C4:<last_month_col>4").format.horizontalAlignment = "Center";
// Repeat for the YTD block: write label, then merge.

// Category band (row 5) -- merge per category within each period block
sheet.getRange("C5").values = [["Department"]];
sheet.getRange("C5:<last_dept_col>5").merge(true);
sheet.getRange("C5:<last_dept_col>5").format.fill.color = "#D3D3D3";
sheet.getRange("C5:<last_dept_col>5").format.font.bold = true;
sheet.getRange("C5:<last_dept_col>5").format.horizontalAlignment = "Center";
// Repeat per category within the Month block, then again for the YTD block.

// Tag header row (row 6) -- Account + tag values + per-category Total per period block
sheet.getRange("B6").values = [["Account"]];
sheet.getRange("B6:<last_col>6").format.font.bold = true;
sheet.getRange("B6:<last_col>6").format.horizontalAlignment = "Center";
```

### Currency format -- ALWAYS `[$$-en-US]`

Never a bare `$`. Bare `$` renders as `R$` on pt-BR, `£` on en-GB, etc.

```javascript
const dataRange = sheet.getRange("C7:<lastCol><lastRow>");
dataRange.numberFormat = [["_-[$$-en-US]* #,##0.00_-;_-[$$-en-US]* (#,##0.00);_-[$$-en-US]* \"-\"??_-;_-@_-"]];
```

Apply the same format to subtotal rows and Net Income.

### Column widths -- fixed Account column + autofit on data

Account names vary in length; fixing column B (the Account label column;
column A is the narrow margin) keeps the label column predictable
run-to-run. Autofit the data columns *after* the data has been written --
running `autofitColumns()` on a header-only range collapses to header
width.

```javascript
// Autofit on the full used range first, then re-assert the fixed
// Account column width. `getColumnsAfter` does NOT exist on Excel.Range
// in the Office.js add-in runtime (it lives on RangeAreas in Office
// Scripts only) and would either throw TypeError or autofit empty
// columns *beyond* the data. The established Carta pattern is to
// autofit the used range and override any fixed-width columns after.
// ~200pt ≈ 30 char widths in Calibri 11.
sheet.getUsedRange().format.autofitColumns();
sheet.getRange("B:B").format.columnWidth = 200;
```

### Per-category Total columns

For each row, the per-category Total cell (`Dept Tot`, `Func Tot`, etc.) uses a SUM formula across that category's tag columns in the current period block:

```javascript
// Example: Department block on row 10, tag columns C-F, Dept Tot in G:
sheet.getRange("G10").formulas = [["=SUM(C10:F10)"]];
```

Section subtotals and `Net Income` formulas use the same row-range SUM pattern across all tag + Total columns; total-of-totals cells use `=SUM(<first cat-Total col>:<last cat-Total col>)` over the subtotal row -- but only one of those category-Total columns per period block (they're all equal), so a single `=SUM(G10:G<last>)` against any one category's Total column gives the right number.

### Section subtotals + Net Income

- Subtotal rows per section: bold, top thin border across all data columns.
- `Total expenses (pre-tax)`: bold, top medium border.
- `Net Income /(loss), pre tax`: bold, top medium + bottom double border. Use `numFmt = "@"` on the label cell so Excel doesn't reinterpret the slash.

### Do NOT freeze panes

This skill follows the Carta budgeting no-freeze convention -- same rule as the standard `carta-consolidating-pnl` detail tab and the Summary tab. Even though the 3-row header is deep, do not call `freezePanes.freezeAt(...)` here. If long horizontal scrolling becomes a real problem in practice, surface it as a follow-up and we'll change the convention once across all skills rather than diverging Layout E alone.

### Long-format build (when `<TAG_LAYOUT> == "long"`)

The 3-row nested header above describes the wide pivot. When the user picked long at the Cardinality guard, or when total columns × period blocks > 36, build a flat rows table instead:

```javascript
// Long format -- single header row, one row per (account, category, tag_value).
// Account column is column B (column A is the narrow margin); column A stays empty.
// Header goes on row 4, data starts at row 5 -- rows 1-3 are the metadata
// band (B1 firm name, B2 tab title, B3 source line). Writing the header at
// B3 would silently overwrite B3 and lose the source attribution.
sheet.getRange("B4").values = [["Account", "Category", "Tag value", "<MMM-YY> Actual", "YTD <MMM-YY> Actual"]];
sheet.getRange("B4:F4").format.font.bold = true;
sheet.getRange("B4:F4").format.fill.color = "#000000";
sheet.getRange("B4:F4").format.font.color = "#FFFFFF";
sheet.getRange("B4:F4").format.horizontalAlignment = "Center";

// Data rows start at row 5. One row per pivot triplet:
//   (account_name, category, tag_value, month_amount, ytd_amount).
// Sort: account -> category -> tag_value (alphabetical, Untagged last within category).

// Currency on columns E and F only -- same [$$-en-US] format as wide mode.
const dataRange = sheet.getRange("E5:F<lastRow>");
dataRange.numberFormat = [["_-[$$-en-US]* #,##0.00_-;_-[$$-en-US]* (#,##0.00);_-[$$-en-US]* \"-\"??_-;_-@_-"]];

// Net Income row at the bottom: bold, label in column B, formula
// `=SUMIF(<gl_col>, ">=4000", <month_actual_col>) - ...` (or pre-compute
// and write as literals if SUMIF over the long shape is awkward).

// Column widths -- autofit-then-reset, same pattern as wide.
sheet.getUsedRange().format.autofitColumns();
sheet.getRange("B:B").format.columnWidth = 200;   // Account
sheet.getRange("C:C").format.columnWidth = 120;   // Category
sheet.getRange("D:D").format.columnWidth = 140;   // Tag value
```

No merging in long format -- every row is independent. Skip the Per-category Total columns section and the Header-construction code block above; both are wide-mode only.

For the local-file runtime in long mode, see the "Long-format build" subsection at the bottom of the next section.

---

## Writing the tab (local-file runtime)

Build an operations payload for `write_workbook.py`. Use:

- `create_sheet` -- tab name `P&L by Reporting Tag - <FIRM-SHORT> <MMM-YY>`.
- `write_cell` × 3 -- metadata band B1, B2, B3.
- `write_cell` for each period band label (row 4), then `merge_cells` per period block.
- `write_cell` for each category band label (row 5), then `merge_cells` per category within each period block.
- `write_range` -- row 6 tag header (Account, tag values × categories × periods, per-category Total per period block).
- `write_range` -- data rows (signed amounts).
- `write_formula` -- per-category Total per row, subtotal rows, Net Income.
- `set_bold` on rows 4, 5, 6 + all subtotal and total rows.
- `set_format` with the full `[$$-en-US]` format string on all amount columns and total rows. Never a bare `$`.
- Column widths -- two ops in this order:
  - `{"op": "set_column_width", "sheet": "<tab name>", "column": "B", "width": 30}` -- fixed Account column (column A is the narrow margin).
  - `{"op": "autofit_columns", "sheet": "<tab name>", "columns": "C:<last col>"}` -- autofit the data columns *after* the data write.
  Account names vary in length and `autofit_columns` caps at `max_width=50`, which makes column B creep wide run-to-run; the fixed ~30-char width keeps the label column predictable.
- Do not include `freeze_panes` -- Carta budgeting no-freeze convention applies.

Merge semantics: `merge_cells` writes the value to the top-left cell before merging. Always issue `write_cell` for the band label before the `merge_cells` op for the same range.

### Long-format build (when `<TAG_LAYOUT> == "long"`)

Replace the multi-row header + merges above with a single-row header and one data row per `(account, category, tag_value)` triplet. The ops payload reduces to:

- `create_sheet` -- same tab name.
- `write_cell` × 3 -- metadata band B1, B2, B3.
- `write_range` at `B<header_row>` -- single header row: `["Account", "Category", "Tag value", "<MMM-YY> Actual", "YTD <MMM-YY> Actual"]`.
- `write_range` at `B<data_start>` -- one row per `(account_name, category, tag_value, month_amount, ytd_amount)` tuple, sorted by `account -> category -> tag_value` (alphabetical; `Untagged` last within each category).
- `write_formula` -- Net Income row at the bottom (label in column B, sums over the Month/YTD columns).
- `set_bold` on the header row and the Net Income row.
- `set_format` with the full `[$$-en-US]` format string on columns E and F only (the Account/Category/Tag-value columns are text).
- `set_column_width` ops: B=30 (Account), C=20 (Category), D=24 (Tag value). Then `autofit_columns` on `E:F`.
- No `merge_cells` -- long format has no merged bands.

The metadata band, branding, currency-format readback, shape-geometry verification, and no-freeze-panes rules all apply unchanged.

---

## Cardinality guard

Compute the total column count per period block as: `(sum of distinct tag values per category) + (number of categories)`. The `+ (number of categories)` term is the per-category Total columns. Multiply by 2 for the Month + YTD period blocks.

| Total tag columns (Month + YTD combined) | Default layout | Offer choice? |
|---|---|---|
| <= 24 | Wide | No |
| 25 - 36 | Wide | Yes -- ask wide vs long at the dimension picker |
| > 36 | Long | Yes -- ask wide vs long at the dimension picker |

---

## Untagged handling

- Every category gets its own `Untagged` column at the end of that category's block (just before its per-category Total). The category Total sums across all tag values including Untagged.
- If a category has no `Untagged` rows in the selected period, the Untagged column reads `0` (not omitted) -- keeps headers stable across categories and runs.
- Write `0` (not blank) into cells where a given (account, category, tag) has no amount in the period -- keeps currency formatting and SUM math consistent.

---

## Gate 8 -- verification + report (tag-view variant)

Same brand-verification call as the standard build (with the shape-geometry check that runs the height/left invariants from Gate 6):

```javascript
const sheet = context.workbook.worksheets.getItem("<TAB_NAME>");
sheet.shapes.load("items/name,items/height,items/left");
const rows = sheet.getRange("D1:D3");
rows.load(["height", "left"]);
await context.sync();

const logo = sheet.shapes.items.find(s => s.name === "CartaLogo");
return {
  found:             !!logo,
  heightMatchesBand: logo ? Math.abs(logo.height - rows.height) < 2 : false,
  leftMatchesBand:   logo ? Math.abs(logo.left - rows.left)   < 2 : false,
};
```

All three checks must pass. If not, re-run the verbatim brand block.

### Closing report

> P&L by Reporting Tag built -- [<TAB_NAME>](<citation:<TAB_NAME>!A1>)
>
> - Firm: Acme Ventures
> - Period: Mar 2026 (Month + YTD)
> - Tag categories: Department (4 values), Function (3 values), Geography (3 values) -- 3 categories, 10 unique tags
> - Accounts: 32 with activity in the period
> - Net Income (Month): $X,XXX
> - Net Income (YTD): $X,XXX

Then offer the standard post-action menu via `ask the user` -- the budget tie-out from Gate 9 is not applicable in tag-view mode.

---

## Hard rules

- Currency format always uses `[$$-en-US]` -- never bare `$`. Locale drift on non-US Excel locales (R$, £, etc.) is the single most common formatting bug.
- No Budget / Variance / % columns in tag-view. Carta budgets have no tag dimension -- duplicating one budget value across every tag column is misleading.
- No Summary tab in tag-view. Executive Summary rolls up across all expense categories -- there's no meaningful way to roll up across tag values without losing the tag breakdown.
- All categories side by side, not one-per-run. The categories are discovered from `REPORTING_TAGS_JSON` keys at query time and shown together so analysts can compare slicings of the same dollars.
- Per-category Total invariant: each category's Total column on any row equals every other category's Total on the same row. Divergence is a data-quality signal (an entry is tagged in one category but not the other) -- flag in Gate 8.
- Slice is additive to firm scope -- `WHERE FIRM_ID = '<firm_uuid>'` always applies.
- Sign convention unchanged -- Revenue (4xxx) multiplied by -1 before rendering; expenses kept as-is.
- Section order unchanged -- Revenue -> Human Capital -> Contractor -> Occupancy -> Professional Services -> Travel & Marketing -> Technology & Data -> Other (from `section-map.md`).
- Branding -- column D anchor, rows 1-3 height. Asset access via `blobs.getText("assets/powered_by_carta.b64.txt")` -- NOT `Read`.
- `merge_cells` after `write_cell` -- merged cells discard non-top-left values, so always seed the band label before merging.
