# Reference: model an expansion-hire scenario

## When to use

The user wants to see the impact of adding new headcount in the budget
year (or next year).

- "Model hiring 5 FTEs in 2027."
- "What's the P&L impact of adding 3 senior engineers in Q2?"
- "Compare a 3 / 5 / 7 hire ramp."

This is a growth scenario -- it adds Personnel lines to the budget. For
trimming existing headcount, see `headcount-reduction.md`.

## Workflow

### 1. Confirm the hire parameters

Ask via `ask the user` (batched). Defaults in parentheses:

- Hire count(s) -- a single number, or three points to span the 3 scenarios (e.g. `3 / 5 / 7`).
- Base salary per hire -- single average for back-of-envelope, or a list if the role mix is uneven.
- Start date(s) -- single date, or per-hire. Default: Q1 of the budget year (full Y1 cost).
- Loadings -- defaults: payroll tax 8%, benefits 20%, bonus 15% of base. Total ≈ 43% above base. Ask if the firm's loadings differ.

### 2. Compute scenario personnel cost

For each scenario `i`:

```
loading_factor         =  1 + payroll_tax + benefits + bonus
fully_loaded_per_hire  =  base_salary  ×  loading_factor
annual_cost_i          =  hire_count_i  ×  fully_loaded_per_hire  ×  months_after_start  /  12
```

Example: 5 hires × $200k base × 1.43 loading × 12/12 months = $1.43M/year.

### 3. Add to the Personnel section

Find the Personnel section (or fall back to the GL patterns in
`headcount-reduction.md` Step 1). Default layout -- a single combined row
labelled `New Hires -- Y1`. Ask the user if they want it broken out by
loading component (Salaries / Bonuses / Payroll tax / Benefits) instead.

Write scenario columns as live formulas referencing named inputs at the
top of the Scenarios tab:

```
Scenario cell  =  <hire_count_input>  *  <base_input>  *  <loading_input>  *  <months_after_start>  /  12
```

Never hardcode the numbers -- inputs must be editable so the user can flex them.

### 4. Cash-impact summary

| Scenario | New Personnel Y1 | NOI Δ | Projected Cash at Year-End |
|---|---|---|---|

### 5. Recommended scenario

Default heuristic:

- If the user named a cash floor or NOI floor, recommend the largest ramp
  that still meets it.
- Otherwise, recommend the middle scenario and note the user can flex the
  inputs.

Mark `<- recommended` in the cash-impact summary with one sentence of
rationale.

### 6. Approval gate -> write -> chat summary

Standard.

## Stacking with new-fund-raise

If the user mentioned both new hires AND a new fund in the same prompt, also
run [`new-fund-raise.md`](new-fund-raise.md). Scenarios compose: each scenario
shows the net of new revenue minus new personnel cost. The recommended
scenario is whichever combination meets the user's stated goal (e.g. the fund
raise that fully funds the hire ramp).
