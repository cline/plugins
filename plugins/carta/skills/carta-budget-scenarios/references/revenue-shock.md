# Reference: model a revenue-shock scenario

## Workflow

### 1. Identify revenue lines

GL prefix `4xxx` (Income), or section labelled `Income` in the base
budget. Default scope: all income lines. Allow the user to exclude
specific accounts (e.g. exclude `Portfolio interest` because it's
contractually fixed).

### 2. Apply the haircut

For each revenue line, write the scenario column as a formula:

```
Scenario cell  =  Base cell  *  (1 - <haircut_pct>)
```

Default: a single scenario with the user's stated haircut. If the
user said "model 10% / 15% / 25% shocks", produce three scenarios.

### 3. Recompute downstream lines

- Net Operating Income updates automatically because subtotals
  are formulas -- confirm in the preview that NOI flows through.
- Variable expenses (e.g. management fees that scale with AUM,
  performance-based comp): ask the user whether to scale them down
  alongside revenue. Default = leave fixed.

### 4. Cash-impact summary

| Scenario | Income Δ | NOI Δ | Projected Cash at Year-End |
|---|---|---|---|

### 5. Recommended scenario

If multiple -- the smallest haircut that still keeps NOI >= 0 (or the
user's stated cash target). Mark `<- recommended`.

### 6. Approval gate -> write -> chat summary

Standard.
