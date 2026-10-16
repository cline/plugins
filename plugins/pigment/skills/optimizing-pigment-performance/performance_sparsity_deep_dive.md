# Performance Sparsity Deep Dive

## Introduction

Sparsity is a fundamental concept in Pigment that dramatically affects performance, memory usage, and computation efficiency. Understanding the difference between sparse and dense metrics, and knowing which functions preserve sparsity, is critical for building performant applications.

This guide provides a deep technical dive into sparsity management, common densification anti-patterns, and best practices for preserving sparsity.

## What is Sparsity?

### Sparse vs Dense Metrics

Sparse metric: Only stores cells that have values. Blank cells are not stored.

Example:

- Dimension: 1000 products x 12 months = 12,000 possible cells
- Values: Only 500 products sold in any given month
- Stored cells: 500 (sparse)
- Memory savings: 95.8%

Dense metric: Stores all cells, including those with blank or zero values.

Example:

- Same dimensions: 12,000 possible cells
- Stored cells: 12,000 (dense)
- Memory usage: 24x larger than sparse version

### Why Sparsity Matters

Performance benefits:

1. Memory efficiency: Store only meaningful data
2. Computation speed: Compute only cells with values
3. Query performance: Smaller datasets to scan
4. Scalability: Models can handle larger dimensions

Real-world impact:

- Sparse metric: 100ms computation time
- Same metric densified: 2,400ms computation time
- Performance degradation: 24x slower

### How Blanks Interact with Operators

Pigment's sparse engine has specific rules for how blanks behave with arithmetic and logical operators. Understanding these rules helps predict when formulas preserve sparsity vs. when they might densify.

Quick summary:

- Additive operators (`+`, `-`, `OR`): `blank + value = value`
- Multiplicative operators (`*`, `/`, `AND`): `blank x value = blank`
- Constants don't fill blanks: `'Revenue' + 100` keeps blank cells blank

For detailed behavior including dimension alignment effects, see [How Blanks Behave with Operators](../writing-pigment-formulas/functions_logical.md#how-blanks-behave-with-operators).

## Functions That Affect Sparsity

### Functions That Preserve Sparsity

#### ISDEFINED

Behavior: Returns TRUE if a value is defined, otherwise returns BLANK (not FALSE).

```pigment
ISDEFINED('Revenue')
```

Output:

- Where Revenue has a value: TRUE
- Where Revenue is blank: BLANK (not stored)

Sparsity: GOOD: Preserved - blank cells remain blank.

#### IFBLANK

Behavior: Returns the first argument if defined, otherwise returns the second argument.

```pigment
IFBLANK('Revenue', 'Backup Revenue')
```

Output:

- Where Revenue has a value: Revenue value
- Where Revenue is blank AND Backup Revenue has a value: Backup Revenue value
- Where both are blank: BLANK

Sparsity: GOOD: Preserved - but only when both arguments have the same dimensions.

Important note: Despite the name similarity to ISBLANK, IFBLANK does NOT densify when used correctly.

WARNING: Warning: IFBLANK can densify when arguments have mismatched dimensions (first argument more dimensional than second). See [IFBLANK dimension rules](../writing-pigment-formulas/functions_logical.md#ifblank) for details.

#### IFDEFINED

Behavior: Shortcut for IF(ISDEFINED(...), ..., ...).

```pigment
IFDEFINED('Revenue', 'Revenue' * 1.1)
```

Output:

- Where Revenue has a value: Revenue \* 1.1
- Where Revenue is blank: BLANK

Sparsity: GOOD: Preserved - computes only where defined.

### Functions That Destroy Sparsity (Densification)

#### ISBLANK

Behavior: Returns TRUE if blank, FALSE if defined.

```pigment
ISBLANK('Revenue')
```

Output:

- Where Revenue has a value: FALSE
- Where Revenue is blank: TRUE

Sparsity: BAD: DESTROYED - all cells now have a value (TRUE or FALSE).

Impact: A metric with 1% data becomes 100% dense.

#### ISNOTBLANK

Behavior: Returns TRUE if defined, FALSE if blank.

```pigment
ISNOTBLANK('Revenue')
```

Output:

- Where Revenue has a value: TRUE
- Where Revenue is blank: FALSE

Sparsity: BAD: DESTROYED - all cells now have a value.

Impact: Same as ISBLANK - complete densification.

Densification cost over large spaces: ISBLANK/ISNOTBLANK over large dimension spaces (e.g. many products x months, or employees x time) force full evaluation and storage of TRUE/FALSE for every cell. This can cause order-of-magnitude slowdowns and memory growth compared to sparse alternatives.

Preferred pattern - use dimension-typed metrics in BY to drive sparsity: When a metric is dimension-typed and used in BY (e.g. `Source[BY: DimOrProp, DimensionTypedMetric]`), the engine only computes where that metric is defined; no predicate is needed. This is both cleaner and more performant than guarding with IF(ISBLANK(...), BLANK, ...). Avoid ISBLANK/ISNOTBLANK for sparsity; use BY with dimension-typed metrics or ISDEFINED/IFDEFINED/IFBLANK/EXCLUDE instead.

## Common Anti-Patterns and Solutions

### Anti-Pattern 1: Using ISBLANK Instead of ISDEFINED

Anti-pattern:

```pigment
IF(ISBLANK('Revenue'), 0, 'Revenue')
```

Problem: ISBLANK densifies the metric, creating FALSE values everywhere Revenue is blank.

Solution:

```pigment
IFDEFINED('Revenue', 'Revenue')
// or simply
'Revenue'
```

Why better: ISDEFINED preserves sparsity. Blank cells remain blank.

Performance impact: 10-100x faster for sparse metrics.

### Anti-Pattern 2: Using IF(ISBLANK()) Instead of IFBLANK

Anti-pattern:

```pigment
IF(ISBLANK('Revenue'), 'Backup Revenue', 'Revenue')
```

Problem:

1. ISBLANK densifies the metric
2. More complex database computation
3. Harder to read

Solution:

```pigment
IFBLANK('Revenue', 'Backup Revenue')
```

Why better:

- Cleaner formula
- Preserves sparsity
- More efficient computation

Performance impact: 5-20x faster for sparse metrics.

### Anti-Pattern 3: Creating Dense Boolean Metrics

Anti-pattern:

```pigment
// Flag metric
ISNOTBLANK('Revenue')
```

Problem: Creates a dense boolean metric (TRUE/FALSE everywhere).

Solution:

```pigment
// Flag metric that preserves sparsity
ISDEFINED('Revenue')
```

Output:

- Where Revenue exists: TRUE
- Where Revenue is blank: BLANK (not stored)

Why better: Only stores TRUE values, not FALSE values.

### Anti-Pattern 4: Unnecessary Densification for Defaults

Anti-pattern:

```pigment
// Set default value of 0
IF(ISBLANK('Revenue'), 0, 'Revenue')
```

Problem: Forces every blank cell to store 0.

Solution:

```pigment
// Let blanks remain blank
'Revenue'
```

Why better: In Pigment, blank and 0 are different. If you need 0 for calculations, use IFBLANK only where necessary:

```pigment
// Only densify where actually needed
IFBLANK('Revenue', 0) + 'Fixed Costs'
```

### Anti-Pattern 5: Checking for Blank in Conditions

Anti-pattern:

```pigment
IF(ISBLANK('Revenue'), 'No Data', 'Revenue' * 1.1)
```

Problem: ISBLANK densifies, and "No Data" text creates dense text values.

Solution:

```pigment
// Only compute where defined
IFDEFINED('Revenue', 'Revenue' * 1.1)
```

Why better: Blank cells remain blank, no text values stored.

### Anti-Pattern 6: Guarding BY with IF(ISBLANK(dimension_typed_metric), BLANK, ...)

Anti-pattern:

```pigment
IF(
  ISBLANK('CALC_Employee_Tenure_Month_Index'),
  BLANK,
  'ASM_Ramp_Schedule'[BY: Employee.Segment, 'CALC_Employee_Tenure_Month_Index']
)
```

Problem: When a dimension-typed metric is in BY, its sparsity is respected automatically. The IF(ISBLANK(...), BLANK, ...) guard is redundant and harmful (ISBLANK densifies).

Solution:

```pigment
'ASM_Ramp_Schedule'[BY: Employee.Segment, 'CALC_Employee_Tenure_Month_Index']
```

Why better: BY alone preserves sparsity; no densifying predicate. See [Sparsity via BY + dimension-typed metrics](../writing-pigment-formulas/formula_modifiers.md#sparsity-via-by--dimension-typed-metrics) in the writing-pigment-formulas skill.

## Best Practices for Sparsity Management

### Practice 1: Prefer ISDEFINED Over ISBLANK

Rule: Use ISDEFINED when you want to check if a value exists.

Example:

```pigment
// Bad
IF(ISBLANK('Revenue'), BLANK, 'Revenue' * 1.1)

// Good
IFDEFINED('Revenue', 'Revenue' * 1.1)
```

When to use ISBLANK: Only when you specifically need FALSE as an outcome (rare).

### Practice 2: Use IFBLANK for Fallback Values

Rule: Use IFBLANK when you want to provide a fallback value.

Example:

```pigment
// Bad
IF(ISBLANK('Forecast'), 'Historical Average', 'Forecast')

// Good
IFBLANK('Forecast', 'Historical Average')
```

Benefit: Cleaner and more efficient.

### Practice 3: Avoid Storing Zero Unnecessarily

Rule: Let blank cells remain blank unless zero has a different meaning than blank.

Example:

```pigment
// Bad: Forces all cells to have a value
IF(ISBLANK('Revenue'), 0, 'Revenue')

// Good: Let blanks remain blank
'Revenue'
```

When zero is needed: Use IFBLANK only in the specific calculation:

```pigment
// Calculation that needs zero
IFBLANK('Revenue', 0) / IFBLANK('Units', 1)
```

### Practice 4: Chain IFDEFINED for Multiple Conditions

Rule: Use nested IFDEFINED to check multiple metrics.

Example:

```pigment
// Only compute where both metrics exist
IFDEFINED('Revenue',
  IFDEFINED('Cost',
    'Revenue' - 'Cost'
  )
)
```

Benefit: Computation only happens at the intersection of defined cells.

### Practice 5: Use ISDEFINED for Early Scoping

Rule: Start formulas with ISDEFINED to scope to defined cells only.

Example:

```pigment
// Without scoping
'Revenue' * 'Growth Rate' + 'Fixed Costs'

// With scoping
IFDEFINED('Revenue',
  'Revenue' * 'Growth Rate' + 'Fixed Costs'
)
```

Benefit: If Revenue is sparse (10% of cells), computation is 10x smaller.

### Practice 6: Use EXCLUDE Instead of ISBLANK for "Where B Is Blank"

Rule: When the condition is "A is true and B is blank", use the EXCLUDE modifier instead of AND + ISBLANK.

Example:

```pigment
// Bad: ISBLANK densifies B
IF(A AND ISBLANK(B), TRUE)

// Good: EXCLUDE restricts scope without densifying
IF(A [EXCLUDE: B], TRUE)
```

Benefit: EXCLUDE tells the engine to skip cells where B is defined. No intermediate boolean metric is created, so B stays sparse and the formula runs on fewer cells.

## Understanding the Technical Differences

### ISBLANK vs ISDEFINED: Database Behavior

ISBLANK:

```
Input: Revenue (sparse, 100 cells with values out of 10,000)
Process: Database generates FALSE for 9,900 blank cells
Output: Dense metric with 10,000 cells (100 FALSE, 9,900 TRUE)
Storage: 10,000 cells
```

ISDEFINED:

```
Input: Revenue (sparse, 100 cells with values out of 10,000)
Process: Database returns TRUE only for existing cells
Output: Sparse metric with 100 cells (all TRUE)
Storage: 100 cells
```

Performance difference: 100x more efficient with ISDEFINED.

### IFBLANK vs IF(ISBLANK()): Computation Behavior

IF(ISBLANK()):

```
Step 1: ISBLANK densifies the metric (10,000 cells)
Step 2: IF evaluates all 10,000 cells
Step 3: Output may be sparse, but computation was dense
Computation cost: 10,000 cells
```

IFBLANK:

```
Step 1: Check if first argument is defined
Step 2: If yes, return first argument; if no, return second argument
Step 3: Only compute where at least one argument is defined
Computation cost: Only defined cells
```

Performance difference: 10-100x more efficient with IFBLANK.

## Real-World Sparsity Example

### Scenario: Sales Forecasting Application

Dimensions:

- Products: 10,000
- Regions: 50
- Months: 24
- Total possible cells: 12,000,000

Actual data:

- Only 5,000 products are active
- Active products sold in average 30 regions
- Data exists for 18 months
- Actual cells with data: ~2,700,000 (22.5% sparse)

### Anti-Pattern Implementation

```pigment
// Check if forecast exists, otherwise use historical
'Forecast Flag' = ISNOTBLANK('Forecast')
'Final Forecast' = IF(ISBLANK('Forecast'), 'Historical Average', 'Forecast')
```

Result:

- 'Forecast Flag': 12,000,000 cells (100% dense)
- 'Final Forecast': 12,000,000 cells (100% dense)
- Memory usage: 24,000,000 cells stored
- Computation time: 45 seconds per update

### Optimized Implementation

```pigment
// Use sparsity-preserving functions
'Final Forecast' = IFBLANK('Forecast', 'Historical Average')
```

Result:

- 'Final Forecast': ~3,500,000 cells (29% sparse - only where either metric exists)
- Memory usage: 3,500,000 cells stored
- Computation time: 2 seconds per update

Improvement:

- Memory: 85% reduction
- Performance: 22x faster

## Sparsity and Aggregation

### Aggregation Preserves Sparsity

```pigment
// Sparse input
'Transaction Amount' // 1,000 transactions out of 1,000,000 possible

// Sparse output
'Customer Total' = 'Transaction Amount'[BY: 'Transaction'.'Customer']
```

Result: Only customers with transactions have values. Sparsity preserved.

### Densification Through Allocation

```pigment
// Dense input
'Total Budget' // One value per department

// Dense output
'Employee Budget' = 'Total Budget'[BY: 'Department'.'Employee']
```

Result: All employees in departments with budgets get values. Partial densification.

## Monitoring Sparsity

### Signs of Densification

1. Metric size increases dramatically without data increase
2. Computation time increases for simple formulas
3. Memory usage spikes in the application
4. Profiler shows long computation for boolean metrics

### Checking Sparsity

Agent: Use `tool:get_top_blocks_by_performance` with `CombinedCardinality` on suspect blocks. After a change, `tool:performance_profile_change` shows whether executions stayed scoped (partial compute) vs full recompute.

User handoff (if needed): Ask for metric cell count vs dimension cardinality product. Sparsity % approx (actual cells / possible cells) x 100.

Expected sparsity:

- Transaction data: 0.1% - 5% (very sparse)
- Planning data: 10% - 50% (moderately sparse)
- Configuration data: 80% - 100% (dense, expected)

## When Densification is Acceptable

### Scenario 1: Small Dimensions

If total possible cells < 10,000, densification impact is minimal.

```pigment
// Acceptable: Only 120 possible cells (10 products x 12 months)
ISBLANK('Revenue')
```

### Scenario 2: Already Dense Metrics

If a metric is already 90%+ dense, densification has little impact.

```pigment
// Acceptable: Configuration data is already dense
ISBLANK('Default Value')
```

### Scenario 3: Required Boolean Logic

Sometimes you need FALSE, not BLANK.

```pigment
// Acceptable: Need explicit FALSE for logic
'Has Revenue' = ISNOTBLANK('Revenue')
'Needs Attention' = NOT('Has Revenue')
```

Mitigation: Keep these metrics isolated, don't reference them in many places.

## Sparsity Best Practices Summary

1. Use ISDEFINED instead of ISBLANK - Preserves sparsity
2. Use IFBLANK instead of IF(ISBLANK()) - Cleaner and more efficient
3. Let blanks remain blank - Don't force zeros unnecessarily
4. Chain IFDEFINED - Scope to intersection of defined cells
5. Use IFDEFINED for early scoping - Restrict computation to defined cells
6. Use EXCLUDE instead of AND + ISBLANK - For "A and B blank", `IF(A [EXCLUDE: B], TRUE)` avoids densifying B
7. Monitor metric sizes - Watch for unexpected densification
8. Profile regularly - Check computation time for boolean metrics
9. Accept densification when necessary - But isolate dense metrics

## Common Mistakes

### Mistake 1: Assuming Blank = Zero

```pigment
// Wrong assumption
IF(ISBLANK('Revenue'), 0, 'Revenue')

// Correct understanding
// Blank means "no data", not "zero revenue"
'Revenue'
```

### Mistake 2: Using ISBLANK for Existence Checks

```pigment
// Bad: Densifies
IF(ISBLANK('Forecast'), "Missing", "Present")

// Good: Preserves sparsity
IFDEFINED('Forecast', "Present")
```

### Mistake 3: Not Considering Downstream Impact

```pigment
// Bad: Densifies early in chain
Step 1: 'Has Data' = ISNOTBLANK('Revenue')
Step 2: 'Adjusted' = IF('Has Data', 'Revenue' * 1.1, 0)
// Step 2 is now dense because Step 1 is dense

// Good: Avoid densification
Step 1: 'Adjusted' = IFDEFINED('Revenue', 'Revenue' * 1.1)
```

## See Also

- [Performance Formula Optimization](./performance_formula_optimization.md) - Formula-level optimization including sparsity
- [Performance Scoping Patterns](./performance_scoping_patterns.md) - Relationship between scoping and sparsity
- [Pigment Formulas & Functions: Logical Functions](../writing-pigment-formulas/functions_logical.md) - Detailed function syntax
