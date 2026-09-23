# Reference: budget with user-supplied lines not in the CoA

## When to use

User named a line that doesn't exist in the CoA, e.g. *"add AI Tooling & Subscriptions -- $80k in 2026, evenly distributed."*

## Workflow

### 1. Build base budget

Run [`from-prior-actuals.md`](from-prior-actuals.md). Keep proposed budget in memory -- don't write yet.

### 2. For each user-supplied line

- Section. Default mapping (ask if unclear):
  - AI Tooling / Software / Subscriptions / SaaS -> Technology
  - Marketing / Events / Conferences -> Marketing
  - Salaries / Benefits / Bonuses -> Personnel
- Distribution. Parse user intent:
  - "evenly", "across the year" -> annual ÷ 12 per month.
  - "frontloaded", "Q1 heavy" -> biased curve (ask before applying).
  - "$X starting in <month>" -> zero before, even after.
- Flag. Cell comment: `new account -- not yet in CoA`.

### 3. Insert into the budget

Place inside the right section before its subtotal row. Subtotal SUM formulas absorb the new row. NOI updates via its formula.

### 4. Approval gate (parent SKILL.md Gate 5)

Preview must distinguish:

| Source | Meaning |
|---|---|
| `DWH actual` | prior-year actuals |
| `user-supplied` | from user recommendation |

### 5. Chat reminder

> "Three new accounts not yet in your CoA -- flagged in column G. Create them in Carta to keep next year's auto-refresh clean."
