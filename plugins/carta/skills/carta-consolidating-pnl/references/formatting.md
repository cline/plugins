# P&L -- Excel formatting reference

This reference is the source of truth for the visual layout of the
consolidating P&L sheet. The SKILL.md workflow loads it inline at the
"Build the output sheet" step.

## Sheet name

`P&L - <FIRM-SHORT> <MMM-YY>` (e.g. `P&L - Acme Mar-26`). Truncate to
Excel's 31-character sheet name limit if needed.

## Header rows -- 4-row metadata band + shifted block headers

This sheet follows the Carta budgeting 4-row metadata standard (see
[`branding-and-header.md`](branding-and-header.md)). Rows 1-4 are reserved
for the firm/title/source/context band; the existing merged P&L header
band and sub-headers shift down by 4 rows so the Carta logo at column E
(rows 1-3 height) has clear space.

| Cell | Content |
|---|---|
| B1 | `<FIRM-FULL-NAME>` -- bold, size 10 (e.g. `Acme Ventures`) |
| B2 | `<YYYY> P&L · <MMM-YY> Consolidating` -- bold, size 10 |
| B3 | `Source: Carta MCP · DWH journal entries` -- italic, size 10 |
| B4 | `Amounts in USD` -- italic, size 10 |
| Row 5 | blank -- breathing room |
| D8:H8 | Month header `<MMM-YY>` -- bold, white text on black fill, centered, merged D:H |
| M8:Q8 | YTD header `YTD <MMM-YY>` -- same styling |
| J8 | `<MMM-YY> Comments` -- bold, white-on-black |
| S8 | `YTD Comments` -- bold, white-on-black |
| Row 9 | D9/M9=`Actual`, E9/N9=`Budget`, G9/P9=`Variance`, H9/Q9=`%`. Bold, centered. F and O are spacers. |
| Row 10 | Revenue section header in B10 -- bold + underlined |

Data rows below start at row 11 (instead of the legacy row 7). All
row-number references downstream (subtotals, totals, formula targets)
shift down by the same +4 offset. When the SKILL.md or `summary-tab.md`
quotes a specific row number (e.g. "row 7" or "B6"), translate to the
new origin (`+4`) before writing.

## Data rows -- Revenue

One row per Revenue account starting at row 11. Label in column B =
`ACCOUNT_NAME` from the JE row.

| Column | Formula / value |
|---|---|
| D | month Actual = `MONTH_AMT * -1`, raw dollars |
| E | Budget -- blank |
| G | `=D{row}-E{row}` |
| H | `=IF(E{row}>0, IF(G{row}/E{row}>1000, "1000+%", G{row}/E{row}), "n/a")` |
| M | YTD Actual = `YTD_AMT * -1` |
| N | YTD Budget -- blank |
| P | `=M{row}-N{row}` |
| Q | `=IF(N{row}>0, IF(P{row}/N{row}>1000, "1000+%", P{row}/N{row}), "n/a")` |

After the last Revenue row: `Investment Income` subtotal -- bold, top
thin border, `=SUM(...)` per numeric column.

## Data rows -- Expenses

Each expense section opens with a bold + underlined section header in
column B. One row per GL account in the section (sorted by `ACCOUNT_TYPE`),
label = `ACCOUNT_NAME`, values in raw dollars.

End each section with `Total <Section Name>` (bold, top thin border,
`=SUM(...)`).

Section order is fixed -- see `section-map.md`. Always include `Other` even
if empty. One blank row between sections.

## Totals

- `Total expenses (pre-tax)` -- bold, top thin / bottom medium border.
  Sums the seven section subtotals:
  `=<HC>+<Contractor>+<Occupancy>+<ProfSvc>+<Travel>+<Tech>+<Other>` per
  numeric column.
- Blank row.
- `Net Income /(loss), pre tax` -- bold, top thin / bottom medium
  border. `=<Revenue subtotal> - <Total expenses>` per numeric column.
  Set `numFmt="@"` on the column-B label so Excel doesn't re-interpret the
  slash.

## Comments + Budget columns

- Comments columns (J, S): blank in all data rows. The user fills
  these in by hand.
- Budget columns (E, N): blank in all data rows. Variance and %
  formulas already guard against this: `IF(E>0, ...)` returns `"n/a"` when
  Budget is blank.

## Number formats (match exactly)

| Cell content | Number format |
|---|---|
| Currency | `_([$$-en-US]* #,##0.00_);_([$$-en-US]* (#,##0.00);_([$$-en-US]* "-"??_);_(@_)` |
| Variance / Difference (no $) | `_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)` |
| Percent | `0.0%;(0.0%)`, right-aligned |
| Subtotals / totals | same formats, bold |

Currency-format locale gotcha: use the `[$$-en-US]` locale token, NOT
a bare `$` or `"$"`. Excel collapses `"$"` to `$`, which then resolves to
system currency on non-US locales (`R$` on pt-BR, `£` on en-GB). The
`[$$-en-US]` token locks the symbol to USD regardless of the workbook's
locale.

## Borders

| Row type | Border |
|---|---|
| Section header | bold + underlined font only, no cell borders |
| Subtotal | top thin border on numeric columns, bold |
| `Total expenses (pre-tax)` | top thin + bottom medium border, bold |
| `Net Income /(loss), pre tax` | top thin + bottom medium border, bold |

## Column widths

| Column | Width (pt) |
|---|---|
| A | 12 |
| B (labels) | 250 |
| C | ~5 (spacer) |
| D, E, G, H, M, N, P, Q (numeric) | 70 each |
| F, O (spacers) | ~5 |
| J, S (comments) | 350 |

Column-width anti-pattern: Do NOT call `autofitColumns()` on a header-only range like `C1:O1` -- header rows are often empty at the moment of write, leaving the autofit width too narrow for 5+ digit currency (`####`). Use `sh.getUsedRange().format.autofitColumns()` after data is written, or target a data range like `C7:N80`. Full recipe: `carta-create-budget/references/from-prior-actuals.md` §6.

## Formulas, not hardcoded values

Every total is `=SUM(...)`. Every Variance is `=Actual-Budget`. Net Income
is `=Revenue subtotal - Total expenses` per column.
