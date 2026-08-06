# Balance Sheet -- Excel formatting reference

This reference is the source of truth for the visual layout of the
consolidating Balance Sheet sheet. The SKILL.md workflow loads it inline
at the "Build the output sheet" step.

## Sheet name

`Balance Sheet - <FIRM-SHORT> <MMM-YY>` (e.g. `Balance Sheet - Acme Mar-26`).
Truncate to Excel's 31-character sheet name limit if needed.

## Header rows

This sheet uses the Carta budgeting 4-row metadata band (see
[`branding-and-header.md`](branding-and-header.md)). The standard layout
places labels in column B, not column A. The Carta logo anchors at column E (rows 1-3 height), consistent with the budgeting plugin standard.

| Cell | Content | Style |
|---|---|---|
| B1 | `<FIRM-FULL-NAME>` (e.g. `Acme Ventures`) | bold, size 10 |
| B2 | `Consolidating Balance Sheet · As of <MMM-YY>` (e.g. `Consolidating Balance Sheet · As of Mar-26`) | bold, size 10 |
| B3 | `Source: Carta MCP · DWH journal entries` | italic, size 10 |
| B4 | `Amounts in <fund_currency>` (the currency resolved in Gate 3 -- e.g. `Amounts in EUR`; never hardcode USD) | italic, size 10 |
| Row 5 | blank -- breathing room between header band and column headers |
| Row 6 | entity-column headers -- C6 -> last-entity-col, one per entity, plus the Total column. Bold, white text on black fill (`#000000` fill, `#FFFFFF` font), centered, wrap text |
| Row 7 | blank |
| B8 | `Assets` | underlined section header (first section starts at row 8) |

Total column header (last entity col + 1): the queried month in `MMM-YY` format
(e.g. `Mar-26`). Critical: set the cell's number format to `@` (text)
before writing the value. Excel will otherwise parse `Mar-26` as a date
serial (e.g. `46046`) and you'll lose the literal label.

## Section rows

Section order: Assets -> Liabilities -> Equity. One blank row between sections.
First section header is on row 8 (per the 4-row metadata band + row 5 blank +
row 6 entity headers + row 7 blank).

For each section:

1. Section header row: label in column B (`Assets`, `Liabilities`, `Equity`),
   underlined, no fill.
2. One data row per account. Label = `ACCOUNT_NAME` from the JE row.
   Numeric values across entity columns. Values are written as-is from the
   query result (no scaling).
3. Subtotal row at end of section:
   - Assets -> `Total Assets` -- bold, top thin / bottom medium border.
     `=SUM(<first asset row>:<last asset row>)` per column.
   - Liabilities -> `Total Liabilities` (or `Total Current Liabilities` only
     if the COA distinguishes current vs non-current) -- bold, top thin
     border.
   - Equity -> `Company Equity` -- bold, top thin border.
4. Final grand-total row: `Total Liabilities and Equity` -- bold, top thin /
   bottom medium border. Formula: `=<Total Liabilities row> + <Company
   Equity row>` per column.

## Total column

For every data row, the cell in the Total column is a SUM across that row:

```
=SUM(<first entity col>:<last entity col>)
```

Subtotal and grand-total rows in the Total column follow the same
SUM-across-entities pattern. Same bold / border treatment.

## Number formats

- Data cells: build the format string from `<fund_currency>` resolved in Gate 3's "Resolve the presentation currency" sub-step. For USD: `_([$$-en-US]* #,##0.00_);_([$$-en-US]* (#,##0.00);_([$$-en-US]* "-"??_);_(@_)`. For other currencies use the matching locale token (e.g. `[$€-407]` for EUR, `[$£-809]` for GBP) or the generic accounting pattern `_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)` with the currency code prepended in the header. If `<fund_currency>` was not resolved for any reason, ask the user before writing -- never fall back to USD. Never hardcode `[$$-en-US]` -- that locks all amounts to USD regardless of fund currency. Never use bare `$` or Excel's built-in Accounting format; both resolve to system currency on non-US installs.
- Subtotals / totals: same format, bolded.

## Column widths

| Column | Width (pt) |
|---|---|
| A | 12 |
| B (labels) | 250 |
| Entity columns (C -> last) | 130 |
| Total column | 130 |

Column-width anti-pattern: Do NOT call `autofitColumns()` on a header-only range like `C1:O1` -- header rows are often empty at the moment of write, leaving the autofit width too narrow for 5+ digit currency (`####`). Use `sh.getUsedRange().format.autofitColumns()` after data is written, or target a data range like `C7:N80`. Full recipe: `carta-create-budget/references/from-prior-actuals.md` §6.

## Font

Calibri 10 across the whole sheet.

## Do NOT include

- Eliminations column
- Topside Adjustments column
- Prior-period comparison columns

The only non-entity column in the output is the Total column on the
right.

## Formulas, not hardcoded values

Every total is a `=SUM(...)` formula referencing the underlying cell range.
Never write `=12345.67` -- always sum the range. This is what lets the user
audit the sheet later by clicking into a cell.
