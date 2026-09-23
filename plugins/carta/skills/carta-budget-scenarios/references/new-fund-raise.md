# Reference: model a new-fund-raise scenario

## When to use

The user wants to see the impact of closing a new fund on the management
company's revenue.

- "What if we raise a new $500M fund?"
- "Model the P&L impact of Fund V closing in Q1."
- "Show revenue uplift from a $300M / $500M / $750M close."

This is a growth scenario -- it adds an Income line to the budget. For
trimming revenue, see `revenue-shock.md`.

## Workflow

### 1. Confirm the fund-raise parameters

Ask via `ask the user` (batched). Defaults in parentheses:

- Fund size(s) -- a single number, or three points to span the 3 scenarios (e.g. `$300M / $500M / $750M`).
- Annual management fee rate (default 2.0%).
- Close date (default Jul 1 of the budget year -- so half-year fees in Y1).
- Fund name / label (default `Fund <N+1>` based on the firm's existing funds; ask if unsure).
- Investment-period step-down -- year and reduced rate (default Year 6, 1.5%). Usually irrelevant in Y1; flag only if Y1 falls inside the step-down.

### 2. Compute scenario fees

For each scenario `i`:

```
annualised_fee_i  =  fund_size_i  ×  fee_rate
y1_fee_i          =  annualised_fee_i  ×  months_after_close  /  12
```

Example: $500M × 2% = $10M/year. Close on Jul 1 -> Y1 = $5M.

### 3. Add a new Income line

Find the Income section (GL prefix `4xxx` or the section labelled `Income`).
Insert one new row labelled `Mgmt Fee -- <Fund name>`. Write the scenario
columns as live formulas referencing named inputs at the top of the
Scenarios tab:

```
Scenario cell  =  <fund_size_input>  *  <fee_rate_input>  *  <months_after_close>  /  12
```

Never hardcode the numbers -- the inputs must be editable so the user can flex
them.

### 4. Variable expenses tied to fund size

Ask the user whether to scale these alongside fee revenue (default = leave
fixed unless the budget has an obvious link):

- Fund admin fees -- typically scale with AUM.
- Audit & tax -- partial scaling for new fund.
- LP reporting & travel -- modest uplift if the new fund expands the LP base.

### 5. Cash-impact summary

| Scenario | New-Fund Fees Y1 | Variable Expense Δ | NOI Δ | Projected Cash at Year-End |
|---|---|---|---|---|

### 6. Recommended scenario

Default heuristic:

- If the user named a target (cash floor, NOI floor, overhead coverage),
  recommend the smallest fund size that meets it.
- Otherwise, recommend the middle scenario and note the user can flex the
  inputs.

Mark `<- recommended` in the cash-impact summary with one sentence of
rationale.

### 7. Approval gate -> write -> chat summary

Standard parent-skill flow.

## Stacking with expansion-hire

If the user mentioned both a new fund AND new hires in the same prompt, also
run [`expansion-hire.md`](expansion-hire.md). Scenarios compose: each scenario
shows the net of new revenue minus new personnel cost. The cash-impact summary
should show both legs (fee uplift and personnel cost uplift) so the user sees
the net effect, not each lever in isolation.
