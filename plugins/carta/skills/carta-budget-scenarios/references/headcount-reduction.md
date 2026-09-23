# Reference: model a headcount reduction scenario

Example prompt: *"We need to reduce headcount spend by 10% to preserve cash. Based on our current team structure and YTD actuals, propose 3 options."*

## Workflow

### 1. Find the personnel lines in the base budget

Lookup priority:

1. A dedicated `Headcount` / `Personnel` tab if present.
2. Lines in the budget tagged Personnel by section.
3. GL accounts matching personnel patterns: Salaries, Wages,
   Bonuses, Benefits, Payroll taxes, 401k, Health insurance,
   Leased-employee guaranteed payments.

### 2. Pull YTD personnel actuals -- `get-actuals.md`

So scenarios reflect real run-rate, not just budget. Apply the
sparse-history check from `get-actuals.md`.

### 3. Generate three scenarios

Default trim distributions:

| Scenario | Distribution | When to recommend |
|---|---|---|
| Across-the-board | Apply target % uniformly to every personnel line | Fast, simplest to explain to LPs |
| Junior-heavy | Larger trim on lower-paid lines, lighter on senior | Preserves leadership, hits new hires hardest |
| Senior-heavy | Larger trim on top earners, lighter on junior | Maximizes savings on smallest headcount impact |

For each scenario, write each personnel line as a formula:

```
Scenario 1 cell  =  Base cell  *  (1 - <trim_factor>)
```

`<trim_factor>` is derived to hit the overall target -- solve so that
`SUM(scenario_lines) / SUM(base_lines) = 1 - target_pct`. Show the
solver inputs in the preview so the user can sanity-check.

### 4. Cash-impact summary

For each scenario:

- `Annual personnel spend Δ` = scenario total - base total.
- `Projected cash at year-end` = current cash + projected NOI under scenario (pull current cash from the workbook if present, else flag as user-supplied).
- `NOI Δ` = base projected NOI - scenario projected NOI.

### 5. Pick the recommended scenario

Default heuristic:

- If user explicitly named a constraint ("preserve leadership", "no senior cuts"), honour it.
- Otherwise: the scenario that hits the target with the smallest absolute % trim per line (smoother), tie-break on largest cash preservation.

Write `<- recommended` next to the chosen scenario in the cash-impact
summary, plus a one-sentence rationale.

### 6. Approval gate -> write -> chat summary

Standard parent-skill flow.
