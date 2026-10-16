# Performance Formula Optimization

## Introduction

Formula optimization is about writing formulas that produce the correct result while minimizing computation time and resource usage. Small changes in formula structure can lead to dramatic performance improvements.

This guide covers the core principles of formula optimization: scope-first, filter-early with deferred aggregations, execution order, and common anti-patterns to avoid.

## Core Optimization Principles

### Principle 1: Scope First

Definition: Start formulas with scoping clauses to limit which cells are computed.

Why it matters: Computing 1% of cells is 100x faster than computing all cells.

Implementation: Use FILTER, EXCLUDE, or IFDEFINED at the beginning of formulas.

### Principle 2: Filter Early, Defer Aggregations

Definition: Apply filtering (`FILTER`, `EXCLUDE`, `SELECT`) as early as possible to shrink the dataset. Defer scope-losing aggregations (`REMOVE`) to the end of the chain to preserve scope.

Why it matters: Filtering reduces cells without losing scope (faster at every subsequent step). `REMOVE` loses scope, so deferring it keeps downstream metrics fast.

Implementation: Apply `FILTER`/`EXCLUDE`/`SELECT` before complex calculations. Push `REMOVE` to the end. `BY` with property mappings can replace `REMOVE + ADD` without scope loss.

### Principle 3: Understand Execution Order

Definition: Pigment executes formulas sequentially, left to right, modifier by modifier.

Why it matters: The order of operations affects how much data is computed.

Implementation: Structure formulas to minimize intermediate computation.

## IF vs FILTER: Understanding Execution Order

### The Problem with Sequential Execution

Anti-pattern:

```pigment
10[ADD: Month][FILTER: Month > VAR_Reference_Month]
```

Execution sequence:

1. `10[ADD: Month]` -> Creates value 10 for every possible Month
2. `[FILTER: Month > VAR_Reference_Month]` -> Removes values where condition is false

Problem: Computation happens for all months, even those that will be filtered out.

Performance: If there are 24 months, computes 24 values but only keeps 12.

### The Solution: Use IF for Conditional Creation

Optimized pattern:

```pigment
// VAR_Reference_Month: input metric, type Dimension
IF(Month > VAR_Reference_Month, 10)
```

Execution sequence:

1. Evaluates condition `Month > VAR_Reference_Month` for each month
2. Creates value 10 only where condition is TRUE

Performance: Computes only 12 values directly.

Improvement: 2x faster, and scales with the selectivity of the condition.

### When to Use IF vs FILTER

Use IF when:

- Creating values conditionally
- The condition is simple
- You want to avoid computing unnecessary cells

```pigment
// Good: Only compute where needed
IF('Product'.'Active' = TRUE, 'Revenue' * 'Growth Rate')
```

Use FILTER when:

- Filtering existing metric values
- You need to preserve dimensionality
- The source metric is already computed

```pigment
// Good: Filter already-computed values
'Revenue'[FILTER: 'Product'.'Active' = TRUE]
```

### IFDEFINED for Boolean Conditions

When working with boolean metrics that hold only TRUE/BLANK values (not FALSE), use IFDEFINED:

Pattern:

```pigment
// Boolean metric: 'Is Active' (TRUE or BLANK, never FALSE)
IFDEFINED('Is Active', 'Revenue' * 'Growth Rate')
```

Why better than IF:

- Cleaner syntax
- Explicitly handles sparse boolean metrics
- Same performance as IF(ISDEFINED())

## Scope-First Patterns

### Pattern 1: Filter Before Computing

Anti-pattern:

```pigment
// Compute first, filter later
('Revenue' * 'Growth Rate' + 'Fixed Costs')[FILTER: 'Product'.'Active' = TRUE]
```

Execution:

1. Multiply Revenue x Growth Rate for all products
2. Add Fixed Costs for all products
3. Filter to active products only

Optimized pattern:

```pigment
// Filter first, then compute
'Revenue'[FILTER: 'Product'.'Active' = TRUE] * 'Growth Rate' + 'Fixed Costs'
```

Execution:

1. Filter Revenue to active products
2. Multiply only active products x Growth Rate
3. Add Fixed Costs only for active products

Improvement: If 20% of products are active, 5x faster.

### Pattern 2: ISDEFINED for Sparse Metrics

Anti-pattern:

```pigment
// Compute for all cells
'Revenue' * 'Adjustment Factor' + 'Base Amount'
```

Problem: If Revenue is sparse (10% of cells), computes 90% unnecessary cells.

Optimized pattern:

```pigment
// Compute only where Revenue exists
IFDEFINED('Revenue',
  'Revenue' * 'Adjustment Factor' + 'Base Amount'
)
```

Improvement: 10x faster for 10% sparse metrics.

### Pattern 3: Chain IFDEFINED for Multiple Metrics

Anti-pattern:

```pigment
// Computes even where one metric is blank
'Revenue' / 'Cost'
```

Problem: Computes for all cells where either metric exists, may create errors or blanks.

Optimized pattern:

```pigment
// Compute only at intersection
IFDEFINED('Revenue',
  IFDEFINED('Cost',
    'Revenue' / 'Cost'
  )
)
```

Improvement: Computes only where both metrics exist.

### Pattern 4: EXCLUDE Early

Anti-pattern:

```pigment
// Complex calculation, then exclude
('Revenue' * 'Growth' + 'Costs')[EXCLUDE: 'Account'.'Type' = "Test"]
```

Optimized pattern:

```pigment
// Exclude first, then calculate
'Revenue'[EXCLUDE: 'Account'.'Type' = "Test"] * 'Growth' + 'Costs'
```

Improvement: Excludes test accounts before any computation.

## Filter-Early Patterns

### Pattern 1: BY Before Complex Calculations (When Equivalent)

When downstream granularity is lower than the source, aggregate with `BY` before computing (only when mathematically equivalent):

```pigment
// Anti-pattern: complex calculation at transaction level, then aggregate
('Transaction Amount' * 'Exchange Rate' + 'Fee')[BY: 'Transaction'.'Customer']

// Optimized: aggregate first, then calculate
'Transaction Amount'[BY: 'Transaction'.'Customer'] * 'Exchange Rate' + 'Fee'
```

Note: Only works if Exchange Rate and Fee are at Customer level, not Transaction level.

Improvement: If 1000 transactions per customer, 1000x less computation.

### Pattern 2: Filter Before Aggregation

Anti-pattern:

```pigment
// Aggregate all, then filter
'Transaction Amount'[BY: 'Transaction'.'Customer'][FILTER: 'Customer'.'Region' = "EMEA"]
```

Optimized pattern:

```pigment
// Filter first, then aggregate
'Transaction Amount'[FILTER: 'Transaction'.'Customer'.'Region' = "EMEA"][BY: 'Transaction'.'Customer']
```

Improvement: Aggregates only EMEA transactions, not all transactions.

### Pattern 3: Use SELECT for Single-Item Filtering

Anti-pattern:

```pigment
// Filter then aggregate
'Revenue'[FILTER: Month = VAR_Reference_Month][REMOVE: Month]
```

Optimized pattern:

```pigment
// VAR_Reference_Month: input metric, type Dimension
'Revenue'[SELECT: Month = VAR_Reference_Month]
```

Improvement: More efficient, cleaner syntax.

## Common Formula Anti-Patterns

### Anti-Pattern 1: Unnecessary Intermediate Calculations

Anti-pattern:

```pigment
// Metric 1
'Step 1' = 'Revenue' * 'Rate'

// Metric 2
'Step 2' = 'Step 1' + 'Fixed'

// Metric 3
'Step 3' = 'Step 2'[FILTER: 'Product'.'Active' = TRUE]
```

Problem: Computes Step 1 and Step 2 for all products, then filters.

Optimized pattern:

```pigment
// Single metric with early filtering
'Result' = ('Revenue'[FILTER: 'Product'.'Active' = TRUE] * 'Rate') + 'Fixed'
```

Or if intermediate metrics are needed:

```pigment
// Metric 1 with early filtering
'Step 1' = 'Revenue'[FILTER: 'Product'.'Active' = TRUE] * 'Rate'

// Metric 2
'Step 2' = 'Step 1' + 'Fixed'
```

### Anti-Pattern 2: Repeated Aggregations

Anti-pattern:

```pigment
// Multiple metrics each aggregating the same data
'Total Revenue' = 'Revenue'[REMOVE: Product]
'Total Cost' = 'Cost'[REMOVE: Product]
'Total Profit' = 'Total Revenue' - 'Total Cost'
```

Problem: Each REMOVE operation loses scope and recomputes.

Optimized pattern:

```pigment
// Calculate profit first, then aggregate once
'Profit' = 'Revenue' - 'Cost'
'Total Profit' = 'Profit'[REMOVE: Product]
```

Improvement: One aggregation instead of two.

### Anti-Pattern 3: Dense Boolean Metrics in Conditions

Anti-pattern:

```pigment
// Dense boolean metric
'Has Revenue' = ISNOTBLANK('Revenue')

// Used in condition
IF('Has Revenue', 'Revenue' * 1.1, 0)
```

Problem: 'Has Revenue' is dense (TRUE/FALSE everywhere), making the IF compute all cells.

Optimized pattern:

```pigment
// Use ISDEFINED directly
IFDEFINED('Revenue', 'Revenue' * 1.1)
```

Improvement: Sparse computation, no dense intermediate metric.

### Anti-Pattern 4: Unnecessary REMOVE

Anti-pattern:

```pigment
// Remove dimension that's not needed downstream
'Aggregated' = 'Transaction Amount'[REMOVE: Transaction ID]
'Result' = 'Aggregated' * 'Rate'
```

Question: Does 'Result' or any downstream metric need Transaction ID?

If no:

```pigment
// Keep the dimension
'Aggregated' = 'Transaction Amount'
'Result' = 'Aggregated' * 'Rate'
// Remove only at the very end if needed for reporting
```

Improvement: Preserves scope through the chain.

### Anti-Pattern 5: Complex Nested IF Statements

Anti-pattern:

```pigment
IF(
  'Condition 1',
  IF(
    'Condition 2',
    IF(
      'Condition 3',
      'Value A',
      'Value B'
    ),
    'Value C'
  ),
  'Value D'
)
```

Problem: Hard to read, hard to maintain, potentially inefficient.

Optimized pattern:

```pigment
// Use separate metrics for clarity
'Meets All Conditions' = 'Condition 1' AND 'Condition 2' AND 'Condition 3'
'Result' = IF('Meets All Conditions', 'Value A', 'Default Value')
```

Or use FILTER:

```pigment
'Value A'[FILTER: 'Condition 1' AND 'Condition 2' AND 'Condition 3']
```

Exception - when nested IF is preferable: If multiple branches (4+) would each use the same FILTER/EXCLUDE conditions with only a varying expression, a nested IF that factors the common logic can be faster than IFBLANK with repeated modifiers. Benchmarks show ~40% improvement in such cases. See [formula_conditionals_style.md](../writing-pigment-formulas/formula_conditionals_style.md) section 2.7.

## Execution Order Optimization

### Understanding Left-to-Right Execution

Pigment executes formulas from left to right, applying each modifier sequentially.

Example:

```pigment
'Revenue'[ADD: Version][FILTER: Version = "Budget"][REMOVE: Product]
```

Execution sequence:

1. Start with 'Revenue' (Product x Month)
2. `[ADD: Version]` -> Expand to Product x Month x Version
3. `[FILTER: Version = "Budget"]` -> Keep only Budget version
4. `[REMOVE: Product]` -> Aggregate to Month x Version

Optimization opportunity: The FILTER could come before ADD to avoid expanding to all versions.

Optimized:

```pigment
'Revenue'[FILTER: 'Product'.'Default Version' = "Budget"][REMOVE: Product]
```

### Order Matters for Performance

Anti-pattern:

```pigment
'Metric'[ADD: Dimension A][ADD: Dimension B][FILTER: Condition]
```

Execution:

1. Expand to all combinations of Dimension A
2. Expand to all combinations of Dimension B
3. Filter (but expansion already happened)

Optimized pattern:

```pigment
'Metric'[FILTER: Condition][ADD: Dimension A][ADD: Dimension B]
```

Execution:

1. Filter first (smaller dataset)
2. Expand filtered data to Dimension A
3. Expand to Dimension B

Improvement: Smaller expansions = faster computation.

## Real-World Optimization Example

### Scenario: Revenue Forecasting Model

Original formula:

```pigment
'Forecast' =
  ('Historical Revenue'[ADD: Scenario] * 'Growth Rate' + 'New Products')[FILTER: 'Product'.'Active' = TRUE]
```

Problems:

1. ADD creates values for all scenarios before filtering
2. Computation happens for inactive products
3. New Products added to all products before filtering

Optimized formula:

```pigment
'Forecast' =
  'Historical Revenue'[FILTER: 'Product'.'Active' = TRUE] * 'Growth Rate' +
  'New Products'[FILTER: 'Product'.'Active' = TRUE]
```

Improvements:

1. Filter to active products first
2. No unnecessary ADD (Scenario comes from source metrics)
3. Both metrics filtered before computation

Performance gain: 5x faster for 20% active products.

### Scenario: Multi-Currency Consolidation

Original formula:

```pigment
'Consolidated Revenue' =
  ('Revenue' * 'Exchange Rate')[REMOVE: Currency][REMOVE: Subsidiary]
```

Problems:

1. Two REMOVE operations lose scope twice
2. Intermediate expansion before aggregation

Optimized formula:

```pigment
'Consolidated Revenue' =
  ('Revenue' * 'Exchange Rate')[REMOVE: Currency, Subsidiary]
```

Improvements:

1. Single REMOVE operation
2. Scope lost only once

Performance gain: 2x faster.

## Formula Optimization Checklist

Before finalizing a formula, check:

- [ ] Are scoping clauses (FILTER, EXCLUDE, ISDEFINED) at the beginning?
- [ ] Are aggregations (REMOVE, BY) deferred to the end?
- [ ] Is IF used instead of ADD + FILTER for conditional values?
- [ ] Are sparse metrics scoped with IFDEFINED?
- [ ] Are unnecessary intermediate calculations eliminated?
- [ ] Is the execution order optimized (filter before expand)?
- [ ] Are dense boolean metrics avoided in conditions?
- [ ] Is ISDEFINED used instead of ISBLANK?
- [ ] Are multiple conditions combined efficiently?
- [ ] Is the formula readable and maintainable?

## Measuring Optimization Impact

### Before Optimization

1. Profile the formula: Note computation time
2. Check scope: Re-run `tool:performance_profile_change`; read effective/output scope per execution
3. Identify bottleneck: Which part is slow?

### After Optimization

1. Profile again: Compare computation time
2. Verify scope: Did scope improve?
3. Check correctness: Does it produce the same result?

### Expected Improvements

Scope optimization:

- 0/3 -> 2/3 scope: 10-100x faster

Sparsity optimization:

- Dense -> Sparse: 10-50x faster

Execution order optimization:

- Better order: 2-10x faster

Combined optimizations:

- All techniques: 100-1000x faster possible

## Best Practices Summary

1. Scope first: Start with FILTER, EXCLUDE, or IFDEFINED
2. Filter early: Apply FILTER/EXCLUDE/SELECT before complex calculations to shrink the dataset
3. Defer aggregations: Push REMOVE to the end of the chain to preserve scope
4. Use IF for conditional creation: Don't create then filter
5. Preserve sparsity: Use ISDEFINED, not ISBLANK
6. Optimize execution order: Filter before expand
7. Profile regularly: Measure before and after
8. Keep formulas readable: Don't sacrifice clarity for micro-optimizations

## See Also

- [Performance Scoping Patterns](./performance_scoping_patterns.md) - Deep dive into scope preservation
- [Performance Sparsity Deep Dive](./performance_sparsity_deep_dive.md) - Sparsity management techniques
- [Performance Profiling](./performance_profiling.md) - profiling tools and output parsing
