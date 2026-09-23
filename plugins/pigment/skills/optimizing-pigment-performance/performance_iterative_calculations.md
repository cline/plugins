# Performance Iterative Calculations

## Introduction

Iterative calculations-where each period depends on the previous period-are common in financial planning but can create significant performance challenges. Functions like PREVIOUS, PREVIOUSOF, CUMULATE, and FILLFORWARD require sequential computation that can become slow over long time horizons.

This guide covers optimization strategies for iterative calculations, subsetting techniques, and when to use alternative approaches. For the full technical spec (circular dependencies, PREVIOUS vs PREVIOUSOF, configuration, syntax, debugging), see [Iterative Calculation (PREVIOUS & PREVIOUSOF)](../writing-pigment-formulas/functions_iterative_calculation.md).

WARNING: IMPORTANT - PREVIOUSOF Prerequisite:
PREVIOUSOF can only be used on metrics that have iterative calculation enabled in the Pigment application settings. This configuration cannot be done via AI tools - the user must set it up in the Pigment UI. Before writing any formula with PREVIOUSOF, confirm with the user that iterative calculation is configured on the target metric. If not, instruct them to enable it first.

Correct PREVIOUSOF pattern for period-end balances:

Split beginning and ending metrics across the iteration cycle:

```pigment
// Metric - 'Beginning Balance'
PREVIOUSOF('Ending Balance')

// Metric - 'Ending Balance'
'Beginning Balance' + 'Inflow' - 'Outflow'
```

## Understanding Iterative Calculation Performance

### Why Iterative Calculations Are Slow

Sequential dependency: To compute period N, you must first compute periods 1 through N-1.

Example (same beginning/ending pattern as above):

Computation sequence:

- Month 1: Beginning_1 = seed -> Ending_1 = Beginning_1 + Inflow_1 - Outflow_1
- Month 2: Beginning_2 = Ending_1 -> Ending_2 = Beginning_2 + Inflow_2 - Outflow_2
- Month 3: Beginning_3 = Ending_2 -> Ending_3 = Beginning_3 + Inflow_3 - Outflow_3

Each additional period adds one more sequential step.

Performance impact: Cannot parallelize, must compute sequentially.

### Scope Loss in Iterative Calculations

Iterative calculations lose scope on the iterating dimension:

```pigment
// Metric - 'YTD Revenue'
YEARTODATE('Monthly Revenue')
```

Profiler result: Scope lost on Month dimension.

Why: If Month 3 changes, Months 3-12 must be recomputed (sequential dependency).

### Performance Factors

Time horizon: Longer horizons = more sequential steps

- 12 months: Fast
- 36 months: Moderate
- 60 months (5 years): Slow
- 1,825 days (5 years daily): Very slow

Granularity: Finer granularity = more steps

- Monthly: 12 steps per year
- Weekly: 52 steps per year
- Daily: 365 steps per year

Dimensions: More dimensions = more cells to iterate

- 1 dimension (Month): Fast
- 2 dimensions (Month x Product): Moderate
- 3 dimensions (Month x Product x Region): Slow

Data density: Dense data = more cells to compute

- Sparse (10% cells): Fast
- Dense (90% cells): Slow

## Optimization Strategy 1: Subset Time Dimensions

### The Problem: Long Time Horizons

Scenario: 5 years of daily data for inventory tracking.

Anti-pattern:

```pigment
// Metric - 'Beginning Daily Inventory'
PREVIOUSOF('Ending Daily Inventory')

// Metric - 'Ending Daily Inventory'
'Beginning Daily Inventory' + 'Purchases' - 'Sales'
```

Performance: 1,825 sequential days x all products x all warehouses = Very slow.

### The Solution: Subset to Relevant Periods

Pattern: Use dimension subsets to limit the iteration window.

Implementation:

```pigment
// Create a subset for recent periods only
// Subset: 'Recent Days' = last 90 days

// Metric - 'Beginning Daily Inventory'
PREVIOUSOF('Ending Daily Inventory'[FILTER: Day IN 'Recent Days'])

// Metric - 'Ending Daily Inventory'
'Beginning Daily Inventory' + 'Purchases' - 'Sales'
```

Performance: 90 days instead of 1,825 days = 20x faster.

### When to Use Subsets

Use subsets when:

- Historical data doesn't change
- Only recent periods need iterative calculation
- Users only interact with recent periods

Design and risks: List Subsets have irreversible data-loss behavior when membership changes and require explicit mapping to the parent dimension. For when to recommend subsets vs filters or another list, data-loss warnings, and safe patterns (STORE/CALC, remap to parent), see [List Subsets (modeling)](../modeling-pigment-applications/modeling_subsets.md).

Example use cases:

- Rolling 90-day inventory
- Current fiscal year YTD
- Last 12 months cumulative
- Current quarter sequential calculations

### Creating Effective Subsets

Time-based subset:

```pigment
// Property on Month dimension - 'Is Current Year' (Boolean)
Month.Year = TIMEDIM('Today', Year)

// Metric - 'YTD Revenue'
YEARTODATE('Monthly Revenue')
```

Dynamic subset:

```pigment
// Days Since Today on the Day dimension
DAYS('Today', Day.'Start Date')
```

## Optimization Strategy 2: Use FILLFORWARD Instead of PREVIOUS

### When FILLFORWARD is Better

FILLFORWARD: Non-iterative blank filling (more efficient).

PREVIOUS: Iterative calculation (less efficient).

Use FILLFORWARD when:

- You only need to fill blanks with the last known value
- No calculation is needed at each step
- The logic is simple forward propagation

### Example: Status Propagation

Anti-pattern -- iterative carry-forward where no per-period calculation is needed:

```pigment
// Metric - 'Current Status' (iterative enabled)
// PREVIOUSOF takes only a metric reference, not a literal.
IFBLANK('Status Input', PREVIOUSOF('Current Status'))
```

Problem: Iterative, computes every period even if no change. Simple carry-forward does not need iteration.

Optimized using FILLFORWARD:

```pigment
// Metric - 'Current Status'
FILLFORWARD('Status Input', Month)
```

Improvement: Non-iterative, much faster.

### Example: Employee Assignment

Anti-pattern -- same carry-forward pattern:

```pigment
// Metric - 'Current Department' (iterative enabled)
IFBLANK('Department Change', PREVIOUSOF('Current Department'))
```

Problem: Iterative, computes every period even if no change.

Optimized using FILLFORWARD:

```pigment
// Metric - 'Current Department'
FILLFORWARD('Department Change', Month)
```

Improvement: Non-iterative, much faster.

When PREVIOUS is required:

- Calculation at each step (e.g., balance + inflow - outflow)
- Conditional logic at each period
- Transformations that depend on previous value

## Optimization Strategy 3: Reduce Dimensionality

### The Problem: High-Dimensional Iterative Calculations

Anti-pattern:

```pigment
// 3 dimensions: Month x Product x Region
// Metric - 'Cumulative Sales'
CUMULATE('Monthly Sales', Month)
```

Performance: Iterates for every Product x Region combination.

If: 1,000 products x 50 regions = 50,000 iteration chains.

### The Solution: Aggregate Before Iterating

Pattern: Reduce dimensions before iterative calculation.

Implementation:

```pigment
// Aggregate to fewer dimensions
// Metric - 'Total Monthly Sales'
'Monthly Sales'[REMOVE: Product, Region]

// Iterate on smaller dataset
// Metric - 'Cumulative Total Sales'
CUMULATE('Total Monthly Sales', Month)
```

Performance: 1 iteration chain instead of 50,000 = 50,000x faster.

Trade-off: Less granular (total only, not by Product x Region).

### When This Works

Use when:

- The cumulative total is what matters
- Product/Region-level cumulative not needed
- Reporting is at aggregate level

Don't use when:

- Need cumulative by Product x Region
- Granular analysis required
- Allocation would be complex

## Optimization Strategy 4: Alternative Calculation Methods

### Pattern 1: Pre-Compute Starting Points

Anti-pattern: Roll forward in a single ending-balance metric from the beginning of time.

```pigment
// Metric - 'Ending Balance'
PREVIOUSOF('Ending Balance') + 'Change'
```

Problem: If data goes back 10 years, iterates from year 1.

Optimized: Use a known starting point.

```pigment
// Metric - 'Beginning Balance'
IF(Month = 'First Month of Window', 'Imported Starting Balance', PREVIOUSOF('Ending Balance'))

// Metric - 'Ending Balance'
'Beginning Balance' + 'Change'
```

Improvement: Iterate only from the window start, not all history.

## Optimization Strategy 5: Granularity Trade-offs

### Consider Monthly Instead of Daily

Scenario: Cash flow forecasting with daily granularity.

Question: Is daily granularity necessary?

Optimized: Use monthly granularity if acceptable.

```pigment
// Metric - 'Beginning Cash Balance'
PREVIOUSOF('Ending Cash Balance')

// Metric - 'Ending Cash Balance'
'Beginning Cash Balance' + 'Monthly Inflows' - 'Monthly Outflows'
```

Improvement: ~30x fewer iterations when moving from daily to monthly (e.g. 1,825 days -> 60 months).

## Common Iterative Calculation Patterns

### Pattern 1: Inventory Balance

```pigment
// Metric - 'Beginning Inventory'
PREVIOUSOF('Ending Inventory')

// Metric - 'Ending Inventory'
'Beginning Inventory' + 'Purchases' - 'Sales'
```

Optimization:

- Subset to relevant periods
- Use monthly instead of daily if possible
- Reduce product dimensionality where appropriate

### Pattern 2: Cash Flow

```pigment
// Metric - 'Beginning Cash Balance'
PREVIOUSOF('Ending Cash Balance')

// Metric - 'Ending Cash Balance'
'Beginning Cash Balance' + 'Inflows' - 'Outflows'
```

Optimization:

- Pre-compute starting balance for current year
- Use monthly granularity
- Consider separate metrics for different cash accounts

### Pattern 3: Employee Headcount

```pigment
// Metric - 'Beginning Headcount'
PREVIOUSOF('Ending Headcount')

// Metric - 'Ending Headcount'
'Beginning Headcount' + 'Hires' - 'Departures'
```

Optimization:

- Use FILLFORWARD for static assignments
- Aggregate by department before iterating
- Subset to current fiscal year

### Pattern 4: Loan Balance

```pigment
// Metric - 'Beginning Loan Balance'
PREVIOUSOF('Ending Loan Balance')

// Metric - 'Ending Loan Balance'
'Beginning Loan Balance' - 'Payment'
```

Optimization:

- Calculate only for active loans
- Use monthly payments instead of daily
- Pre-compute for historical periods

## Performance Monitoring

### Signs of Iterative Calculation Issues

1. Timeouts: Calculation doesn't complete
2. Long computation times: >10 seconds for simple inputs
3. Profiler shows scope loss: On time dimension
4. User complaints: Slow response when updating values

### Measuring Impact

Before optimization:

- Note `Duration` from `tool:performance_profile_change`
- Count number of iteration steps (time periods)
- Check dimensionality (how many chains)

After optimization:

- Compare computation time
- Verify correctness
- Check effective scope in profile output (avoid `no scope, full computation` on time dimension)

Expected improvements:

- Subsetting: 5-20x faster
- FILLFORWARD vs PREVIOUS: 10-50x faster
- Reduced dimensionality: 10-1000x faster
- Granularity change: 10-30x faster

## Best Practices Summary

1. Subset time dimensions: Limit iteration window to relevant periods
2. Use FILLFORWARD when possible: Non-iterative is faster
3. Reduce dimensionality: Aggregate before iterating
4. Pre-compute starting points: Don't iterate from the beginning of time
5. Consider granularity trade-offs: Monthly vs daily vs weekly
6. Use CUMULATE for simple totals: Optimized for summation
7. Split beginning/ending metrics: `Beginning = PREVIOUSOF(Ending)`, then compute `Ending` from flows
8. Profile regularly: Measure impact of optimizations
9. Accept trade-offs: Sometimes granularity or detail must be sacrificed

## When Iterative Calculations Are Unavoidable

Some calculations require iteration:

Cash flow with complex logic:

```pigment
// Metric - 'Beginning Cash Balance'
PREVIOUSOF('Ending Cash Balance')

// Metric - 'Ending Cash Balance'
'Beginning Cash Balance' +
  IF('Beginning Cash Balance' < 'Minimum', 'Credit Line Draw', 0) +
  'Inflows' - 'Outflows'
```

Inventory with reorder logic:

```pigment
// Metric - 'Beginning Inventory'
PREVIOUSOF('Ending Inventory')

// Metric - 'Ending Inventory'
'Beginning Inventory' +
  IF('Beginning Inventory' < 'Reorder Point', 'Order Quantity', 0) +
  'Receipts' - 'Sales'
```

In these cases:

- Optimize what you can (subsetting, dimensionality)
- Accept the performance cost
- Consider if the complexity is truly necessary

## Calendar and Granularity Considerations

Time horizon and granularity are the primary cost drivers for iterative calculations:

| Granularity | Periods/year | 5-year horizon |
|---|---|---|
| Monthly | 12 | 60 (fast) |
| Weekly | 52 | 260 (moderate) |
| Daily | 365 | 1,825 (slow) |

Key decisions:

- Subset iterative calculations to relevant periods (current fiscal year, rolling 90 days, last 12 months).
- Consider whether daily granularity is truly needed; planning typically works at monthly, actuals may need daily, forecasting is often weekly or monthly.
- Pre-compute starting points for the iteration window so the engine does not roll forward from the beginning of time.

For calendar configuration and time dimension structure, see [modeling_time_and_calendars.md](../modeling-pigment-applications/modeling_time_and_calendars.md).

---

## See Also

- [Iterative Calculation (PREVIOUS & PREVIOUSOF)](../writing-pigment-formulas/functions_iterative_calculation.md) - Full spec: circular dependencies, configuration, syntax, debugging
- [Performance Scoping Patterns](./performance_scoping_patterns.md) - Understanding scope loss in iterations
- [Performance Formula Optimization](./performance_formula_optimization.md) - General formula optimization
- [Time and Date Functions](../writing-pigment-formulas/functions_time_and_date.md) - FILLFORWARD, SELECT vs PREVIOUS/PREVIOUSOF
