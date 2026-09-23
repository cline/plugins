# Budget templates

Authored Carta templates shipped inside this skill so the skill is
zip-and-installable.

| File | Audience | Notes |
|---|---|---|
| `manco-budget-template.xlsx` | Management company | Income / Operating Expenses / Personnel / Tech & Subscriptions / Net Operating Income. |
| `fund-budget-template.xlsx` | Fund | Income / Fund Operations / Insurance & Compliance / Financing / Other / Net Operating Income. |

Both templates carry the same conventions as the
`carta-consolidating-pnl/references/formatting.md` reference:

- Header rows -- B1 firm name, B2 `<year> Budget`, B4 `Amounts in $`
  (italic).
- Two tabs -- `Budget <year>` (primary, hardcoded values) and
  `<prior_year> Actuals` (reference, hardcoded actuals). No Provenance
  tab.
- No frozen panes -- the Carta standard does not freeze.
- Accounting locale-token currency format:
  `_([$$-en-US]* #,##0.00_);_([$$-en-US]* (#,##0.00);_([$$-en-US]* "-"??_);_(@_)` --
  never a bare `$` (renders as system locale, e.g. `R$` on pt-BR).
- SUM-based subtotals and `Total Income` / `Total Expenses`.
- Live `Net Operating Income` formula = Total Income - Total Expenses.
- A `Comments` column for Carta CoA match notes (only on `Carta
  Actuals` cross-reference tab if `from-template.md` writes one).

> The actual `.xlsx` files are produced by the budget-tooling team and
> committed alongside this README. Until then, the `from-template`
> reference falls back to `from-prior-actuals` and warns the user that
> no Carta template is bundled yet.
