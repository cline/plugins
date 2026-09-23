---
name: carta-equity-scenarios
user-invocable: false
description: Router for Carta equity scenario workflows. Use only when choosing between the detailed conversion calculator and waterfall scenario skills.
---

# Carta Equity Scenarios

Use this skill for scenario analysis around financing conversions and exit waterfalls.

## Scenario Types

| Scenario | Use For |
| --- | --- |
| SAFE conversion | valuation caps, discounts, conversion shares at a priced round |
| Convertible note conversion | principal, accrued interest, discounts, caps, maturity context |
| Waterfall scenario | saved exit models and per-holder payout data |
| Exit comparison | how proceeds shift across exit values or share classes |

## Required Inputs

Resolve the company first. For conversion math, the user must provide at least one of:

- pre-money valuation
- price per share
- round terms
- saved Carta model or scenario to use

If required terms are missing, ask before computing.

## Carta Data vs Cline Analysis

Saved Carta waterfall scenarios are Carta data. New conversion math or hypothetical exit modeling performed by Cline is analysis. Label it clearly:

```text
Cline analysis based on Carta data and the assumptions below.
```

List the assumptions before results. Do not present computed scenarios as official Carta outputs unless Carta returned the model.

## Output

Lead with the result users usually need:

- conversion share count and method used
- payout amount and return multiple
- which holders or classes are most affected
- sensitivity to the key assumption

Keep formulas visible for finance users, but do not bury the answer under derivations.
