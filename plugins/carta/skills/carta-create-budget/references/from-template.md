# Reference: fill a Carta-authored budget template

## When to use

User said "use the template", "fill this template", or the open workbook already has a budget layout to preserve.

## Workflow

### 1. Pick the template

First match wins:
1. User's own template (open workbook or supplied `.xlsx` with a budget layout). Use it; don't overwrite.
2. Bundled Carta template:
   - ManCo -> `../templates/manco-budget-template.xlsx`
   - Fund -> `../templates/fund-budget-template.xlsx`

Verify bundled file exists (`test -f ...` via Bash) before reading. If neither user nor bundled template is available, route to [`from-prior-actuals.md`](from-prior-actuals.md):

> "I don't have a Carta template bundled for this entity type, and you haven't pointed me at your own. I'll build from prior-year actuals using our standard layout -- say so if you'd rather wait for the template."

### 2. Read the template

Detect section blocks by bold rows and `Total <Section>` / `Net Operating Income` labels. Detect actuals columns by date-serial headers. Detect any `Comments` column.

### 3. Pull actuals

Use [`get-actuals.md`](get-actuals.md). Same SQL, same `FUND_NAME` scoping, same sign convention.

### 4. Match template lines to CoA

1. Exact `ACCOUNT_NAME` match.
2. Fuzzy match (case-insensitive, ignore "and"/"&"/punctuation).
3. GL-code match if template exposes a GL column.

- No Carta match -> leave blank + Comments: `no Carta CoA match`.
- Carta has account not in template -> append row inside the section + Comments: `new from Carta CoA -- review`.

### 5. Add a `Carta Actuals` cross-reference tab

Raw monthly breakdown from DWH -- one row per `(ACCOUNT_NAME, MONTH)` -- so the user can audit.

### 6. Approval gate -> write -> summary

Same as parent SKILL.md Gates 5-7.

## Hard rules

- Don't change template layout, fonts, colors, or column widths.
- Don't touch budget cells -- only actuals cells.
- All total rows use SUM formulas (fix any hardcoded).
- Preserve the template's currency format.
