# Expense account -> section map

Case-insensitive substring match against `ACCOUNT_NAME`. Order
matters -- first match wins. Every non-zero expense account must land in
exactly one section. `Other` is the catch-all and is always included even
if empty (so misclassifications surface for review).

| Section header | Match `ACCOUNT_NAME` containing |
|---|---|
| Human Capital | salary, salaries, bonus, employee benefit, health insurance, 401k, payroll tax, team building |
| Contractor Expenses | contractor, recruit, 1099 |
| Occupancy & Office Expenses | rent, office suppl, business insurance, communication, shipping, postage, utilities |
| Professional Services | tax prep, legal, professional, bank charge, bank fee, audit, compliance, fund admin, licenses and permits |
| Travel & Marketing | travel, meals, entertainment, marketing, branding, fundraising, industry assoc, dues, membership |
| Technology & Data | software, technology, subscription, data, it |
| Other | catch-all (always include, even if empty) |

## Within-section sort

Sort by `ACCOUNT_TYPE` ascending.

## Revenue

Revenue accounts (4xxx) are not run through this map. They form their own
section. The revenue subtotal label is `Investment Income`.

## Section order in the output

1. Revenue (`Investment Income` subtotal)
2. Human Capital
3. Contractor Expenses
4. Occupancy & Office Expenses
5. Professional Services
6. Travel & Marketing
7. Technology & Data
8. Other

One blank row between sections. Each non-revenue section ends with `Total
<Section Name>` (bold, top thin border, `=SUM(<first>:<last>)`).

## Total expenses + Net Income

After the last section:

- `Total expenses (pre-tax)` -- bold, top thin / bottom medium border. Sums
  the seven expense-section subtotals.
- Blank row.
- `Net Income /(loss), pre tax` -- bold, top thin / bottom medium border.
  Formula: `=<Revenue subtotal> - <Total expenses>` per numeric column.
  Apply `numFmt="@"` on the column-B label to keep the slash from being
  reinterpreted.

## Editing the map

If the firm's COA introduces new keywords (e.g. a new "Cloud Infrastructure"
account name), add the keyword to the matching section. If you're not sure
which section a new account belongs to, leave it falling into `Other` and
flag it to the user in Gate 8's verification block -- let the accountant
decide.
