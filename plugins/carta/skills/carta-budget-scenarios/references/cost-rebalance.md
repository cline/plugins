# Reference: open-ended cost rebalance to hit a cash target

## When to use

The user states a goal rather than a specific lever:

- "Preserve $500k of cash by year-end."
- "Free up $100k for a new hire."
- "Get NOI back to break-even."

## Workflow

### 1. Compute the gap

- Read current cash from the workbook if there's a cash-balance
  cell or a Cash tab; otherwise ask the user.
- Project full-year NOI using YTD actuals + remaining-period budget.
- Gap = user's goal - projected outcome.

### 2. Generate candidate levers -- ranked by feasibility

Defaults (highest feasibility first):

1. Discretionary spend trim -- Travel, Entertainment, Marketing, Software Subscriptions. Apply a uniform haircut across these lines until they cover the gap, capped at 25% per line (avoid unrealistic asks).
2. Deferred hires -- pause new hire ramp if the budget has a hiring schedule.
3. Vendor renegotiation -- flag the top 5 vendors by spend (use the drill-down query) and apply a 5-15% renegotiation assumption.
4. Capital expenditure deferral -- if there are capex lines.

### 3. Propose three scenarios

Each scenario uses a different mix of levers:

| Scenario | Approach |
|---|---|
| Scenario A | Pure discretionary trim (least painful, least leverage) |
| Scenario B | Discretionary + vendor renegotiation (balanced) |
| Scenario C | Discretionary + deferred hires + vendor renegotiation (most aggressive, hits cash target with margin) |

Each scenario column is built as formulas off the base budget,
clearly showing which lines were touched. Lines not touched stay
linked to the base.

### 4. Cash-impact summary + recommended

| Scenario | Annual Spend Δ | Projected Cash at Year-End | Hits Target? |
|---|---|---|---|

Recommended = smallest scenario that still hits the target with at
least a small buffer (default 5%). Mark `<- recommended` with one
sentence of rationale.

### 5. Approval gate -> write -> chat summary

Standard.
