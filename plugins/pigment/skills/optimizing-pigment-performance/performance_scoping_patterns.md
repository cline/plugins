# Performance Scoping Patterns

## Introduction

Scoping is one of the most important performance optimization concepts in Pigment. Understanding how scope propagates, when it's lost, and how to preserve it can dramatically improve calculation performance.

This guide provides deep technical insight into scope propagation mechanics, early scoping strategies, and scope preservation techniques.

## Core Scoping Concepts

### What is Scoping?

Scoping determines which cells of a metric need to be recomputed when a change occurs. Instead of recalculating every cell in a metric, Pigment computes only the cells affected by the change.

Example:

- Metric: `Revenue` with dimensions `Product` (100 items) x `Month` (12 items) = 1,200 cells
- Change: Update revenue for Product "Widget A" in "January"
- Without scoping: Recompute all 1,200 cells
- With scoping: Recompute only 1 cell
- Performance gain: 1,200x faster

### Scope Propagation

When a metric with scope is referenced by another metric, the scope propagates downstream if no transformations break it.

Example chain:

```
Input: Product "A", Month "Jan" -> scope 2/2
down
Metric 1: 'Revenue' -> scope 2/2 (preserved)
down
Metric 2: 'Revenue' * 1.1 -> scope 2/2 (preserved)
down
Metric 3: 'Revenue' + 'Fixed Cost' -> scope 2/2 (preserved)
```

All metrics maintain scope, so only one cell is computed in each metric.

## When Scope is Preserved

### Simple Arithmetic Operations

Scope is preserved through basic arithmetic:

```pigment
// All preserve scope
'Metric' * 2
'Metric' + 'Other Metric'
'Metric' - 'Baseline'
'Metric' / 'Denominator'
```

Condition: Both metrics must have compatible dimensions.

### Filtering Operations

Filtering preserves scope on the filtered dimension:

```pigment
'Revenue'[FILTER: 'Product'.'Category' = "Electronics"]
```

Result: If input has scope on Product and Month, output maintains that scope.

### Conditional Logic (with caution)

IF statements can preserve scope if both branches maintain it:

```pigment
IF('Condition', 'Metric A', 'Metric B')
```

Scope preserved if:

- Both 'Metric A' and 'Metric B' have the same scope
- The condition doesn't require full computation

## When Scope is Lost

### REMOVE Modifier

The most common cause of scope loss:

```pigment
'Revenue'[REMOVE: Product]
```

Why scope is lost: To aggregate across all products, Pigment must compute all product cells, even if only one product changed.

Scope result: `0/X` on the REMOVE dimension.

### CUMULATE and Time Functions

Sequential calculations lose scope on the cumulating dimension:

```pigment
CUMULATE('Monthly Revenue', Month)
```

Why scope is lost: To compute Month 6, Pigment needs Months 1-5. If Month 3 changes, Months 3-12 must be recomputed.

Same behavior:

- `PREVIOUS`, `PREVIOUSOF`
- `YEARTODATE`, `QUARTERTODATE`, `MONTHTODATE`
- `FILLFORWARD`

### SHIFT Operations

Shifting on a dimension loses scope:

```pigment
'Revenue'[SELECT: Month-1]
```

Why scope is lost: The output cells don't align with input cells (Month 2 output depends on Month 1 input).

### ADD Modifier (Partial Scope Loss)

Adding a dimension creates partial scope:

```pigment
'Revenue'[ADD: Version]
```

Result: Scope `2/3` if original was `2/2`.

Why: The original dimensions maintain scope, but the new dimension has no scope (must compute across all versions).

## Scope Preservation Strategies

### Strategy 1: Start Formulas with Scoping Clauses

Principle: Filter or exclude data at the very beginning of your formula to establish scope early.

Anti-pattern:

```pigment
// Computation happens first, then filtering
('Revenue' * 'Growth Rate' + 'Fixed Costs')[FILTER: 'Product'.'Active' = TRUE]
```

Optimized pattern:

```pigment
// Filter first, then compute
'Revenue'[FILTER: 'Product'.'Active' = TRUE] * 'Growth Rate' + 'Fixed Costs'
```

Why better: The filter establishes scope early, so all subsequent operations work on a smaller dataset.

### Strategy 2: Use ISDEFINED for Early Scoping

Pattern: Use ISDEFINED at the start of formulas to scope to defined cells only.

Example:

```pigment
// Without early scoping
'Revenue' * 'Adjustment Factor'

// With early scoping
IFDEFINED('Revenue', 'Revenue' * 'Adjustment Factor')
```

Benefit: If 'Revenue' is sparse (only 10% of cells have values), computation is limited to those 10%.

### Strategy 3: Defer Aggregations to the End

Principle: Keep scope as long as possible by deferring REMOVE operations.

Anti-pattern:

```pigment
// Early aggregation
Step 1: 'Revenue'[REMOVE: Product]  // Scope lost here
Step 2: 'Step 1' * 'Growth'         // No scope
Step 3: 'Step 2' + 'Costs'          // No scope
```

Optimized pattern:

```pigment
// Late aggregation
Step 1: 'Revenue' * 'Growth'        // Scope preserved
Step 2: 'Step 1' + 'Costs'          // Scope preserved
Step 3: 'Step 2'[REMOVE: Product]   // Scope lost only at end
```

Impact: Steps 1-2 are much faster with scope preserved.

### Strategy 4: Use Mappings Instead of REMOVE + ADD

Anti-pattern:

```pigment
// Remove then add back different dimension
'Employee Salary'[REMOVE: Employee][ADD: Department]
```

Optimized pattern:

```pigment
// Use mapping property
'Employee Salary'[BY: 'Employee'.'Department']
```

Why better:

- BY with mapping can preserve scope better
- Cleaner formula
- More efficient computation

Condition: Requires a dimension-typed property mapping Employee to Department.

### Strategy 5: Avoid Unnecessary REMOVE

Anti-pattern:

```pigment
// Removing dimension that could be kept
'Transaction Amount'[REMOVE: Transaction ID]
```

Question to ask: Do downstream metrics need the Transaction ID dimension?

If yes: Keep it and use BY or SELECT downstream instead of REMOVE.

If no: REMOVE is appropriate.

## Advanced Scoping Patterns

### Pattern 1: Conditional Scoping

Use ISDEFINED to scope based on data presence:

```pigment
// Only compute where both metrics have data
IFDEFINED('Metric A',
  IFDEFINED('Metric B',
    'Metric A' / 'Metric B'
  )
)
```

Benefit: If both metrics are sparse, computation is limited to their intersection.

### Pattern 2: Dimension-Specific Scoping

Scope on specific dimensions while allowing others to compute fully:

```pigment
// Scope on Product but compute all Months
'Revenue'[FILTER: 'Product'.'Active' = TRUE]
```

Result: Scope maintained on Product, all Months computed for active products.

### Pattern 3: Early EXCLUDE for Performance

Use EXCLUDE to remove unwanted data before computation:

```pigment
// Exclude test data early
'Revenue'[EXCLUDE: 'Account'.'Type' = "Test"] * 'Growth Rate'
```

Benefit: Test accounts are excluded before the multiplication, reducing computation.

### Pattern 4: Scoped Aggregation

When aggregation is necessary, scope it to relevant subsets:

```pigment
// Instead of aggregating everything
'Revenue'[REMOVE: Product]

// Aggregate only relevant subset
'Revenue'[FILTER: 'Product'.'Category' = "Electronics"][REMOVE: Product]
```

Benefit: Smaller aggregation scope = faster computation.

## Scope and Modifiers

### BY Modifier Scope Behavior

Aggregation (N->1):

```pigment
'Transaction Amount'[BY: 'Transaction'.'Customer']
```

Scope: Lost on Transaction dimension, preserved on others.

Allocation (1->N):

```pigment
'Budget'[BY: 'Department'.'Employee']
```

Scope: Partially lost (must compute across all target items).

### SELECT Modifier Scope Behavior

Filtering:

```pigment
'Revenue'[SELECT: Product = "Widget A"]
```

Scope: Preserved if input has scope on Product.

Time Offset:

```pigment
'Revenue'[SELECT: Month-1]
```

Scope: Lost on Month dimension (offset breaks alignment).

### FILTER vs SELECT for Scoping

FILTER: Preserves dimensionality and scope

```pigment
'Revenue'[FILTER: 'Product'.'Active' = TRUE]
```

Result: Same dimensions, scope preserved.

SELECT: Removes dimension, may lose scope

```pigment
'Revenue'[SELECT: Product = "Widget A"]
```

Result: Product dimension removed, scope lost on Product.

When to use each:

- Use FILTER when you want to keep the dimension and preserve scope
- Use SELECT when you want to remove the dimension (scope loss acceptable)

## Scope Loss: When It's Unavoidable

### Scenario 1: Percentage of Total

Requirement: Calculate each product's share of total revenue.

Formula:

```pigment
'Revenue' / 'Revenue'[REMOVE: Product]
```

Why unavoidable: The denominator (total) depends on all products. If one product changes, all shares change.

Scope result: `0/X` - full recomputation required.

Mitigation: Place this metric at the end of the computation chain.

### Scenario 2: Ranking

Requirement: Rank products by revenue.

Formula:

```pigment
RANK('Revenue'[REMOVE: Month])
```

Why unavoidable: Ranking requires knowing all values to determine positions.

Scope result: `0/X` - full recomputation required.

Mitigation: Use only for final reporting metrics, not intermediate calculations.

### Scenario 3: Year-to-Date Calculations

Requirement: Calculate YTD revenue.

Formula:

```pigment
YEARTODATE('Monthly Revenue')
```

Why unavoidable: YTD for December depends on all previous months.

Scope result: Partial scope loss on Month dimension.

Mitigation:

- Use subsets to limit the time range
- Consider if period-to-date is truly needed or if monthly is sufficient

### Scenario 4: Complex Conditional Aggregations

Requirement: Sum revenue only for products meeting dynamic criteria.

Formula:

```pigment
'Revenue'[FILTER: 'Revenue' > AVGOF('Revenue')][REMOVE: Product]
```

Why unavoidable: The average depends on all products, and the filter depends on the average.

Scope result: `0/X` - full recomputation required.

Mitigation: Cache the average in a separate metric if it doesn't change often.

## Measuring Scope Impact

### Using the Profiler

1. Before optimization: Note effective scope text from `tool:performance_profile_change`
2. After optimization: Compare scope values
3. Look for: Increased X in X/Y notation

Example:

- Before: `0/3` -> After: `2/3` = Scope improved on 2 dimensions

### Computation Time Correlation

General rule: Better scope = faster computation.

Expected improvements:

- `0/3` -> `1/3`: 10-100x faster (depending on dimension size)
- `0/3` -> `2/3`: 100-1000x faster
- `0/3` -> `3/3`: 1000-10000x faster

Note: Actual improvement depends on dimension cardinality and data sparsity.

## Real-World Scoping Example

### Scenario: Sales Planning Application

Original computation chain:

```
1. 'Sales Input' - scope 3/3 (Product, Region, Month)
2. 'Sales with Growth' = 'Sales Input' * 'Growth Rate' - scope 3/3
3. 'Total Sales' = 'Sales with Growth'[REMOVE: Product, Region] - scope 0/3
4. 'Sales Share' = 'Sales with Growth' / 'Total Sales' - scope 0/3
5. 'Allocated Costs' = 'Total Costs' * 'Sales Share' - scope 0/3
6. 'Profit' = 'Sales with Growth' - 'Allocated Costs' - scope 0/3
```

Problem: Scope lost at step 3, all subsequent steps have no scope.

Optimized chain:

```
1. 'Sales Input' - scope 3/3
2. 'Sales with Growth' = 'Sales Input' * 'Growth Rate' - scope 3/3
3. 'Direct Costs' = 'Sales with Growth' * 'Cost Rate' - scope 3/3
4. 'Profit' = 'Sales with Growth' - 'Direct Costs' - scope 3/3

// Reporting metrics only (scope loss acceptable)
5. 'Total Sales' = 'Sales with Growth'[REMOVE: Product, Region] - scope 0/3
6. 'Sales Share' = 'Sales with Growth' / 'Total Sales' - scope 0/3
```

Result:

- Steps 1-4 maintain full scope
- Only reporting metrics (5-6) lose scope
- User inputs are 50x faster
- Reporting views still calculate correctly but aren't in the hot path

## Best Practices Summary

1. Scope early: Start formulas with FILTER, EXCLUDE, or ISDEFINED
2. Scope often: Add scoping clauses throughout the formula, not just at the start
3. Defer aggregations: Push REMOVE and scope-losing operations to the end
4. Use mappings: Prefer BY with mappings over REMOVE + ADD
5. Profile after changes: Re-run `tool:performance_profile_change` and compare scope text
6. Accept unavoidable loss: Some calculations require full recomputation
7. Isolate scope loss: Keep scope-losing metrics separate from the main computation chain

## Hierarchy-Specific Performance Patterns

### Overview

Hierarchies implemented through dimension-type properties have specific performance characteristics. Understanding these patterns helps optimize calculations involving parent-child relationships, multi-level aggregations, and cross-hierarchy analysis.

### Performance Characteristics of Property-Based Hierarchies

Key Insight: Property-based hierarchies (using dimension-type properties) are generally faster than dimension-based hierarchies (adding dimensions to metric structure).

Why Property-Based Hierarchies Perform Better:

1. Fewer Dimensions in Structure:
   - Metric: `Product x Month` (2 dimensions)
   - vs. `Product x Category x Line x Month` (4 dimensions)
   - Fewer dimensions = smaller cardinality = faster calculations

2. Sparse Engine Optimization:
   - Only base-level combinations need values
   - Parent levels computed on-demand through aggregation
   - No storage overhead for parent-level combinations

3. Scope Preservation:
   - Changes at base level maintain scope
   - Aggregation to parent levels can leverage scope
   - More efficient than multi-dimensional recalculation

Performance Comparison:

| Approach        | Metric Structure                    | Cardinality               | Calculation Speed | Storage |
| --------------- | ----------------------------------- | ------------------------- | ----------------- | ------- |
| Property-based  | `Product x Month`                   | 1,000 x 12 = 12K          | Fast              | Low     |
| Dimension-based | `Product x Category x Line x Month` | 1,000 x 50 x 10 x 12 = 6M | Slow              | High    |

### Pattern 1: Efficient Hierarchy Aggregation

Optimal Pattern: Use BY with property references for aggregation.

```pigment
// Efficient: Direct property-based aggregation
'SKU Revenue' [BY SUM: SKU.Product, Month]

// Efficient: Multi-level aggregation
'SKU Revenue' [BY SUM: SKU.Product.Category, Month]
```

Why Efficient:

- Pigment optimizes property-based BY operations
- Scope can be preserved on non-aggregated dimensions
- No intermediate dimension explosion

Anti-Pattern: REMOVE then ADD approach

```pigment
// Inefficient: Remove and add dimensions
'SKU Revenue' [REMOVE: SKU] [ADD: Category]
```

Why Inefficient:

- REMOVE loses scope on SKU dimension
- ADD creates dense combinations
- Two operations instead of one

Performance Gain: 2-5x faster with property-based BY

### Pattern 2: Multi-Level Hierarchy Navigation

Optimal Pattern: Chain properties in single BY operation.

```pigment
// Efficient: Single operation to aggregate 3 levels up
'SKU Revenue' [BY SUM: SKU.Product.Category.Line, Store, Month]
```

Anti-Pattern: Multiple sequential aggregations

```pigment
// Inefficient: Multiple aggregation steps
Step 1: 'SKU Revenue' [BY SUM: SKU.Product, Store, Month]
Step 2: 'Step 1' [BY SUM: Product.Category, Store, Month]
Step 3: 'Step 2' [BY SUM: Category.Line, Store, Month]
```

Why Inefficient:

- Creates intermediate metrics
- Each step requires full computation
- No optimization across steps

Performance Gain: 3-10x faster with chained properties

Exception: If intermediate levels are frequently used, caching them in separate metrics may be beneficial.

### Pattern 3: Cross-Hierarchy Aggregation

Optimal Pattern: Combine multiple hierarchy aggregations in single operation.

```pigment
// Efficient: Aggregate across two hierarchies simultaneously
'Sales' [BY SUM: Product.Category, Store.Region, Month]
```

Result:

- Product aggregated to Category
- Store aggregated to Region
- Month unchanged
- Single efficient operation

Anti-Pattern: Sequential aggregations

```pigment
// Inefficient: Two separate aggregations
Step 1: 'Sales' [BY SUM: Product.Category, Store, Month]
Step 2: 'Step 1' [BY SUM: Category, Store.Region, Month]
```

Performance Gain: 2-4x faster with combined aggregation

### Pattern 4: Conditional Hierarchy Aggregation

Optimal Pattern: Filter before aggregating up hierarchy.

```pigment
// Efficient: Filter at base level, then aggregate
'SKU Revenue' [FILTER: SKU.Active = TRUE] [BY SUM: SKU.Product.Category, Month]
```

Why Efficient:

- Filters reduce data volume early
- Aggregation operates on smaller dataset
- Scope maintained on filtered dimension

Anti-Pattern: Aggregate then filter

```pigment
// Inefficient: Aggregate all data, then filter
'SKU Revenue' [BY SUM: SKU.Product.Category, Month] [FILTER: Category.Type = "Core"]
```

Why Inefficient:

- Aggregates all SKUs (including inactive)
- More data to process
- Cannot leverage base-level filtering

Performance Gain: 2-10x faster depending on filter selectivity

### Pattern 5: Hierarchy-Level Caching

When to Cache: Frequently-accessed hierarchy levels benefit from caching.

Pattern: Create dedicated metrics for commonly-used aggregation levels.

```pigment
// Base metric
Revenue (SKU x Store x Month)

// Cached aggregations (if frequently used)
Revenue by Product = 'Revenue' [BY SUM: SKU.Product, Store, Month]
Revenue by Category = 'Revenue' [BY SUM: SKU.Product.Category, Store, Month]
Revenue by Line = 'Revenue' [BY SUM: SKU.Product.Category.Line, Store, Month]
```

When to Use:

- Aggregation level used in 5+ other metrics
- Real-time dashboards requiring sub-second response
- Complex calculations at parent level
- High-traffic reporting views

When NOT to Use:

- Aggregation used only once or twice
- Ad-hoc analysis (use property chains directly)
- Infrequently accessed reports
- Storage constraints

Trade-off: Storage and maintenance vs. calculation speed

### Pattern 6: Scope Preservation in Hierarchies

Key Insight: Property-based aggregation can preserve scope on non-aggregated dimensions.

Example:

```pigment
// Input change: SKU "ABC123", Store "NYC", Month "Jan"
// Scope: 3/3 (all dimensions scoped)

// Aggregation to Product level
'Revenue' [BY SUM: SKU.Product, Store, Month]

// Scope result:
// - SKU dimension: Scope lost (aggregating across SKUs)
// - Store dimension: Scope preserved (2/2 - only NYC)
// - Month dimension: Scope preserved (2/2 - only Jan)
```

Optimization: Order operations to preserve scope as long as possible.

```pigment
// Good: Preserve scope on Store and Month
'Revenue' [BY SUM: SKU.Product, Store, Month] * 'Growth Rate'

// Better: Keep scope even longer if Growth Rate is at Product level
'Revenue' * 'Growth Rate' [BY SUM: SKU.Product, Store, Month]
```

### Pattern 7: Deep Hierarchy Performance

Performance by Hierarchy Depth:

| Depth     | Example                                    | Performance | Recommendation               |
| --------- | ------------------------------------------ | ----------- | ---------------------------- |
| 2 levels  | Product -> Category                         | Excellent   | Use freely                   |
| 3 levels  | SKU -> Product -> Category                   | Very Good   | Use freely                   |
| 4 levels  | SKU -> Product -> Category -> Line            | Good        | Test with real data          |
| 5 levels  | SKU -> Product -> Category -> Line -> Division | Acceptable  | Consider caching             |
| 6+ levels | Deep organizational hierarchies            | Variable    | Cache frequently-used levels |

Optimization for Deep Hierarchies:

```pigment
// If 6-level hierarchy is slow, cache intermediate levels
Level_3_Aggregation = 'Base' [BY SUM: Dim.L1.L2.L3, ...]
Level_6_Aggregation = 'Level_3_Aggregation' [BY SUM: L3.L4.L5.L6, ...]
```

Why This Helps:

- Breaks deep chain into manageable chunks
- Can optimize each level separately
- Easier to troubleshoot performance

### Pattern 8: Ragged Hierarchy Performance

Challenge: Ragged hierarchies (variable depth) have special performance considerations.

Pattern: Use IFDEFINED to handle blanks efficiently.

```pigment
// Efficient: Skip blanks in property chain
IFDEFINED('Employee'.'Manager'.'Director'.'VP',
  'Salary' [BY SUM: Employee.Manager.Director.VP, Month]
)
```

Why Efficient:

- Only computes for employees with complete hierarchy
- Avoids processing blank property chains
- Maintains sparsity

Anti-Pattern: Compute all, filter later

```pigment
// Inefficient: Computes all, including blanks
'Salary' [BY SUM: Employee.Manager.Director.VP, Month] [FILTER: VP != BLANK]
```

### Pattern 9: Property-Based Filtering

Optimal Pattern: Filter using property references.

```pigment
// Efficient: Filter using property
'Revenue' [FILTER: Product.Category.Active = TRUE]
```

Why Efficient:

- Pigment optimizes property-based filters
- Can leverage indexes on properties
- Scope preserved on filtered dimension

Comparison with Dimension-Based Filtering:

```pigment
// If Category was in metric structure
'Revenue' [FILTER: Category.Active = TRUE]

// Property-based is similar performance but:
// - Metric structure is simpler (fewer dimensions)
// - More flexible (can filter by any property level)
```

### Pattern 10: Hierarchy Joins

Pattern: Joining data across hierarchies using properties.

```pigment
// Efficient: Join using property relationships
'Product Revenue' * 'Category Margin %' [BY: Product.Category]
```

Why Efficient:

- BY with property handles dimension mismatch
- Single operation
- Pigment optimizes property-based joins

Anti-Pattern: Manual dimension manipulation

```pigment
// Inefficient: Remove and add dimensions manually
'Product Revenue' [REMOVE: Product] [ADD: Category] * 'Category Margin %'
```

### Performance Benchmarks

Typical Performance Characteristics:

| Operation                          | Property-Based | Dimension-Based | Speedup |
| ---------------------------------- | -------------- | --------------- | ------- |
| Single-level aggregation           | 10ms           | 25ms            | 2.5x    |
| Multi-level aggregation (3 levels) | 15ms           | 100ms           | 6.7x    |
| Cross-hierarchy aggregation        | 20ms           | 150ms           | 7.5x    |
| Filtered aggregation               | 12ms           | 40ms            | 3.3x    |
| Deep hierarchy (5 levels)          | 30ms           | 300ms           | 10x     |

Note: Actual performance depends on data volume, cardinality, and sparsity.

### Best Practices Summary

1. Prefer Property-Based Hierarchies:

- Use dimension-type properties for hierarchies
- Keep metric structures minimal
- Aggregate using BY with property chains

2. Optimize Aggregation Order:

- Filter before aggregating
- Combine multiple aggregations in single operation
- Chain properties rather than sequential aggregations

3. Cache Strategically:

- Cache frequently-used hierarchy levels
- Don't cache rarely-used aggregations
- Balance storage vs. computation

4. Preserve Scope:

- Order operations to maintain scope
- Use property-based BY to preserve scope on non-aggregated dimensions
- Avoid unnecessary REMOVE operations

5. Handle Ragged Hierarchies:

- Use IFDEFINED for blanks
- Consider flattening very ragged hierarchies
- Test performance with production data

6. Monitor Deep Hierarchies:

- Test performance with 4+ level hierarchies
- Cache intermediate levels if needed
- Consider breaking into smaller chunks

7. Leverage Property Filters:

- Filter using property references
- Combine filters with aggregations
- Use early filtering for best performance

### Troubleshooting Hierarchy Performance

Issue: Slow aggregation up hierarchy

Diagnosis:

- Check hierarchy depth (4+ levels?)
- Verify property mappings are complete
- Look for ragged hierarchy with many blanks

Solutions:

- Cache intermediate levels
- Flatten hierarchy if possible
- Use IFDEFINED for ragged hierarchies

Issue: Cross-hierarchy calculation is slow

Diagnosis:

- Multiple sequential aggregations?
- Aggregating before filtering?
- Using REMOVE/ADD instead of BY?

Solutions:

- Combine aggregations in single operation
- Filter before aggregating
- Use property-based BY operations

Issue: Property chain not optimizing

Diagnosis:

- Very deep chain (6+ levels)?
- Properties not dimension-type?
- Blanks in property chain?

Solutions:

- Break chain into cached intermediate levels
- Verify all properties are dimension-type
- Handle blanks with IFDEFINED

## Scenario and Version Cardinality

Version and scenario dimensions multiply the total cell count of every metric that carries them. Growing from 3 to 12 scenarios roughly quadruples computation time for any input that propagates across scenarios.

Mitigation strategies:

- Subset inactive scenarios so iterative and AR computations skip them.
- Archive historical versions that are no longer actively planned.
- Use `FILTER` or `SELECT` to limit formulas to the active scenario set when full cross-scenario computation is not needed.

See `skill:modeling-pigment-applications` for version and scenario architecture.

---

## Common Mistakes

### Mistake 1: Removing Dimensions Too Early

```pigment
// Bad: Loses scope immediately, all downstream loses scope
Step 1: 'Revenue'[REMOVE: Product] * 'Growth Rate'
```

```pigment
// Good: Defer REMOVE to a separate, late metric
Step 1: 'Revenue' * 'Growth Rate'                // scope preserved
Step 2: 'Step 1'[REMOVE: Product]                 // scope lost only at end
```

Note: Moving `[REMOVE: Product]` onto a different metric in the same expression (e.g. `'Revenue' * 'Growth Rate'[REMOVE: Product]`) changes semantics; it removes Product from Growth Rate before multiplication, which is a different calculation. Always defer REMOVE to a separate downstream metric.

### Mistake 2: Not Using ISDEFINED

```pigment
// Bad: Computes all cells
'Revenue' * 'Adjustment'

// Good: Computes only defined cells
IFDEFINED('Revenue', 'Revenue' * 'Adjustment')
```

### Mistake 3: Unnecessary ADD Then REMOVE

```pigment
// Bad: Adds then removes dimension
'Metric'[ADD: Dimension][REMOVE: Dimension]

// Good: Don't add it in the first place
'Metric'
```

## See Also

- [Performance Profiling](./performance_profiling.md) - profiling tools and output parsing
- [Performance Formula Optimization](./performance_formula_optimization.md) - Formula-level optimization techniques
- [Performance Sparsity Deep Dive](./performance_sparsity_deep_dive.md) - Sparsity and its relationship to scoping
