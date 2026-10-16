# Financial Functions

Financial calculations for investment analysis and valuation.

Covers: NPV, XNPV, IRR, XIRR

---

## Quick Reference

| Function | Purpose                                   | Syntax Example                                                                            |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| NPV  | Net present value (periodic)              | `NPV(Rate, CashFlows [, ComputeAllCells] [, RankingDimension])`                           |
| XNPV | Net present value (irregular dates)       | `XNPV(Rate, CashFlows [, ComputeAllCells] [, RankingDimension] [, DaysUsed])`             |
| IRR  | Internal rate of return (periodic)        | `IRR(CashFlows [, InitialGuess] [, ComputeAllCells] [, RankingDimension])`                |
| XIRR | Internal rate of return (irregular dates) | `XIRR(CashFlows [, InitialGuess] [, ComputeAllCells] [, RankingDimension] [, DaysUsed])`  |

> WARNING: Parameter order differs from Excel. `Rate` is only in NPV/XNPV (1st arg); IRR/XIRR take `InitialGuess` as their 2nd (optional) arg. `RankingDimension` (the time dimension) is the 4th positional arg, after `ComputeAllCells` (a boolean), not the 3rd.

---

## Net Present Value Functions

### NPV

Calculate NPV for periodic cash flows.

Syntax: `NPV(DiscountRate, CashFlows [, ComputeAllCells] [, RankingDimension])`

Parameters:

- DiscountRate: Discount rate per period (e.g., 0.1 for 10%). Can be a constant Metric or a Metric dimensioned by RankingDimension for a variable rate.
- CashFlows: Metric with cash flow values (negative for payments, positive for income).
- ComputeAllCells (optional): Boolean, defaults to FALSE. If TRUE, returns the NPV for every item of RankingDimension; if FALSE, returns only for the first non-empty item.
- RankingDimension (optional): Required only when CashFlows is defined on several dimensions.

Examples:

```pigment
// Project NPV with 10% discount rate - single time dimension, RankingDimension implicit
NPV(0.10, 'Cash Flows')

// Monthly cash flows with annual rate
NPV(0.12 / 12, 'Monthly Cash Flows')

// Multi-dimensional CashFlows: compute every cell along Year
NPV(0.10, 'Cash Flows by Country', TRUE, Year)

// Compare projects
IF(NPV(0.10, 'Project A Cash Flow') > NPV(0.10, 'Project B Cash Flow'), "Project A", "Project B")
```

Key Points:

- Cash flows must be on a regular time dimension
- The initial investment (typically negative) must be included in the cash flows for the first period if it occurs at the same time
- Discount rate is per period (annual rate / periods per year)
- The Pigment calculation of NPV excludes the initial investment for the first period; include it in the cash flows explicitly if it occurs at the same time.

---

### XNPV

Calculate NPV for cash flows on irregular dates.

Syntax: `XNPV(DiscountRate, CashFlows [, ComputeAllCells] [, RankingDimension] [, DaysUsed])`

Parameters:

- DiscountRate: Discount rate (constant Metric or Metric on RankingDimension for a variable rate).
- CashFlows: Metric with cash amounts (defined on RankingDimension).
- ComputeAllCells (optional): Boolean, defaults to FALSE. Same semantics as NPV.
- RankingDimension (optional): The Dimension along which payments are discounted. Required when CashFlows is defined on several dimensions.
- DaysUsed (optional): Date Property of RankingDimension; defines the exact day each payment is made. Required when RankingDimension is not a calendar Dimension; defaults to the dimension's Start Date otherwise.

Examples:

```pigment
// Compute on every cell along Month (calendar dimension; DaysUsed defaults to Month start)
XNPV(0.10, 'Investment Cashflow', TRUE)

// Multi-dimensional CashFlows, explicit RankingDimension and DaysUsed
XNPV(0.10, 'Investment Cashflow by Country', TRUE, Month, Month.'Start Date')
```

When to Use: Cash flows on irregular dates (not periodic time dimension).

---

## Internal Rate of Return Functions

### IRR

Calculate IRR for periodic cash flows.

Syntax: `IRR(CashFlows [, InitialGuess] [, ComputeAllCells] [, RankingDimension])`

Parameters:

- CashFlows: Metric with cash flow values (must include at least one negative and one positive value).
- InitialGuess (optional): Starting guess for the iterative solver. Default 0.1. Must be greater than -1.
- ComputeAllCells (optional): Boolean, defaults to FALSE. Same semantics as NPV.
- RankingDimension (optional): Required only when CashFlows is defined on several dimensions.

Examples:

```pigment
// Project IRR (single time dimension, defaults to first non-empty cell)
IRR('Cash Flows')

// Compute IRR for every cell with explicit Guess
IRR('Cash Flows', 0.5, TRUE)

// Multi-dimensional CashFlows: rank on Fiscal Year
IRR('Payment Per Country', 0.1, FALSE, 'Fiscal Year')

// Compare IRR to hurdle rate
IF(IRR('Project Cash Flows', 0.1) > 0.15, "Accept", "Reject")
```

Key Points:

- Returns the discount rate where NPV = 0
- Cash flows must include at least one negative (investment) and one positive (return) value
- InitialGuess parameter is the starting value for the iterative calculation
- Returns BLANK if no solution is found after 200 iterations

---

### XIRR

Calculate IRR for cash flows on irregular dates.

Syntax: `XIRR(CashFlows [, InitialGuess] [, ComputeAllCells] [, RankingDimension] [, DaysUsed])`

Parameters:

- CashFlows: Metric with cash amounts (defined on RankingDimension).
- InitialGuess (optional): Starting guess (default: 0.1).
- ComputeAllCells (optional): Boolean, defaults to FALSE. Same semantics as NPV.
- RankingDimension (optional): Required when CashFlows is defined on several dimensions.
- DaysUsed (optional): Date Property of RankingDimension; defines the exact day each payment is made. Required when RankingDimension is not a calendar Dimension.

Examples:

```pigment
// Compute on every cell along Month (DaysUsed defaults to Month start)
XIRR('Cash Flow', 0.1, TRUE)

// Multi-dimensional, custom dates on a non-calendar dimension
XIRR('Portfolio'.'Cash Flow', 0.12, TRUE, 'Transaction', 'Transaction'.'Date')
```

When to Use: Cash flows on irregular dates.

---

## Function Comparison

### NPV vs XNPV

| Aspect               | NPV                             | XNPV              |
| -------------------- | ------------------------------- | ----------------- |
| Cash Flow Timing | Periodic (Month, Quarter, Year) | Irregular dates   |
| Use Case         | Regular intervals               | Transaction-based |
| Performance      | Faster                          | Slower            |

### IRR vs XIRR

| Aspect               | IRR               | XIRR              |
| -------------------- | ----------------- | ----------------- |
| Cash Flow Timing | Periodic          | Irregular dates   |
| Use Case         | Regular intervals | Transaction-based |
| Performance      | Faster            | Slower            |

---

## Common Patterns

### Pattern 1: Project Evaluation

```pigment
// Calculate NPV and compare to threshold
IF(NPV(0.10, 'Project Cash Flows', TRUE, Year) > 0, "Accept", "Reject")
```

### Pattern 2: Investment Decision

```pigment
// Compare IRR to hurdle rate
IF(IRR('Investment Cash Flows', 0.1, TRUE, Year) > 'Hurdle Rate', "Invest", "Pass")
```

### Pattern 3: Portfolio Analysis

```pigment
// NPV of transactions per portfolio
XNPV(0.12, 'Portfolio'.'Cash Flow', TRUE, 'Portfolio', 'Portfolio'.'Transaction Date')
```

### Pattern 4: Monthly to Annual Rate Conversion

```pigment
// Monthly cash flows with annual discount rate (rate per period)
NPV('Annual Discount Rate' / 12, 'Monthly Cash Flows')
```

---

## Critical Rules

- First cash flow is typically negative - Initial investment
- NPV > 0 = positive return - Above discount rate
- IRR > hurdle rate = accept - Project meets requirements
- Discount rate is per period - Adjust for time period
- XNPV/XIRR for irregular dates - More flexible but slower
- InitialGuess helps convergence - Use reasonable estimate
- Cash flows must change sign - At least one negative and one positive for IRR
- Blank if no solution - IRR/XIRR return BLANK if can't converge
