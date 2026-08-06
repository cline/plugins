# Summary P&L tab -- Excel formatting reference

One-page executive summary rolling the detail up into category lines, with Month + YTD blocks. Built after the detail tab, placed at position 0 so the summary appears first. Every amount is a cross-sheet formula -- nothing hardcoded.

## Sheet name + position

Name `Summary P&L`. If taken, append numeric suffix (`Summary P&L (2)`), truncated to 31 chars. Mention rename in Gate 8 report. Insert at index 0; detail stays where it was.

## Header rows

| Cell | Content | Style |
|---|---|---|
| B2 | `<FIRM-SHORT> Executive Summary` | bold, size 24, `#1F4E79` |
| B4:F4 (merged) | `<MMM YYYY> Income Statement` | bold, white on `#1F4E79`, centered |
| B5 | `Amounts in $` | italic, size 10 |
| C5-F5 | `Actual` / `Budget` / `Variance` / `%` | bold, right-aligned, bottom border |
| B17:F17 | `YTD <MMM YYYY> Income Statement` | same styling as B4 |
| B18 | `Amounts in $` | italic |
| C18-F18 | Same headers as C5-F5 |

## Month block (rows 6-15)

Bucket revenue accounts into 3 categories via case-insensitive substring matches on `ACCOUNT_NAME`. Empty bucket -> literal `0` for Actual/Budget; surface in Gate 8 report.

| Row | Label (B) | Actual (C) | Budget (D) |
|---|---|---|---|
| 6 | `Monitoring Fees/Interest` | sum of detail Actuals for accounts containing `interest` or `monitoring` | corresponding Budgets |
| 7 | `Tax & Other Distributions` | accounts containing `flow-through`, `distribution`, or `tax` | corresponding |
| 8 | `Unrealized Gains or (Losses)` | accounts containing `unrealized` (else `0`) | corresponding (else `0`) |
| 9 | `Investment Income` | `=SUM(C6:C8)` | `=SUM(D6:D8)` |
| 11 | `Compensation` | reference to detail Human Capital subtotal | corresponding column |
| 12 | `Other Administrative Expenses` | `=<detail Total expenses> - <detail HC subtotal>` | corresponding |
| 13 | `Total expenses` | `=SUM(C11:C12)` | `=SUM(D11:D12)` |
| 15 | `Net Income / (loss), pre tax` | `=C9-C13` | `=D9-D13` |

(Rows 10, 14 blank.)

Variance (E): `=C<n>-D<n>`.
% (F): `=IF(D<n>>0, IF((E<n>/D<n>)>10, "1000+%", E<n>/D<n>), "n/a")`. For row 8 (Unrealized G/L), F = literal `"-"` -- % on a swing-around-zero figure is meaningless.

## YTD block (rows 17-28)

Identical to Month block but references detail YTD columns (`M` Actual, `N` Budget) instead of `D/E`. Rows: 19 buckets -> 22 `Investment Income` -> 24 Compensation -> 25 Other Admin -> 26 `Total expenses` -> 28 `Net Income`. Rows 23, 27 blank.

## Cross-sheet formula contract

Always reference the detail tab. Use quoted sheet names (apostrophe and spaces appear in the name):

```
='P&L - <FIRM-SHORT> <MMM-YY>'!<column><row>
```

Example (Acme Mar-26, HC subtotal row 24, Total expenses row 72, revenue rows 7-8):

| Summary cell | Formula |
|---|---|
| C6 (Month, Monitoring Actual) | `='P&L - Acme Mar-26'!D7 + 'P&L - Acme Mar-26'!D8` |
| C11 (Month, Compensation Actual) | `='P&L - Acme Mar-26'!D24` |
| C12 (Month, Other Admin) | `='P&L - Acme Mar-26'!D72 - 'P&L - Acme Mar-26'!D24` |
| C19 (YTD, Monitoring Actual) | `='P&L - Acme Mar-26'!M7 + 'P&L - Acme Mar-26'!M8` |
| C24 (YTD, Compensation) | `='P&L - Acme Mar-26'!M24` |
| C25 (YTD, Other Admin) | `='P&L - Acme Mar-26'!M72 - 'P&L - Acme Mar-26'!M24` |

The detail-build gate captures the row map (HC subtotal, Total expenses, each revenue account) so this gate has them available.

## Number formats

- Amounts (C/D/E): `[$$-en-US]#,##0;([$$-en-US]#,##0);-`
- Percent (F): `0.0%;(0.0%);-`

`[$$-en-US]` locale token mandatory. Bare `$` resolves to system locale.

## Borders + widths

| Row | Border |
|---|---|
| Header rows (5, 18) | bottom thin on C:F |
| `Investment Income` (9, 22) | top thin on C:F |
| `Total expenses` (13, 26) | top thin on C:F |
| `Net Income` (15, 28) | top thin + bottom double on C:F, bold |

Column widths: A 12, B 230, C/D/E/F 85 each.

## Sheet-level

- Hide gridlines.
- Do NOT freeze panes.

## Empty-bucket handling

Empty summary category -> literal `0` (not blank) so `Investment Income`'s SUM evaluates. Surface in Gate 8 report so user can extend keyword list.
