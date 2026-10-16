# Modeling Performance Considerations

## Introduction

Performance considerations should be part of modeling decisions from the start. This guide covers dimensional design, table management, and architectural patterns that affect performance.

For comprehensive performance optimization guidance including formula optimization, sparsity management, and troubleshooting slow calculations, see the `skill:optimizing-pigment-performance`.

## Dimension Growth Impact

### The 1G Cells Problem

Having a billion cells in a metric, even if most are blank, can cause increased processing time, memory usage, and slower recalculation or rendering in both formulas and views.

When dimensions grow, total possible cells grow exponentially:

- 1,000 products x 1,000 customers x 1,000 months = 1 billion cells

### Mitigation Strategies

1. Use properties instead of dimensions where possible
2. Use transaction lists for high-cardinality data
3. Apply access rights to limit scope
4. Use formula-driven subsets to limit active data only when appropriate; see [List Subsets](./modeling_subsets.md) for when to use subsets vs filters and for data-loss risks and safe patterns.

## Combination Masks / Boolean scoping

Limit which dimension combinations are valid to reduce cell count.

A combination mask is a technique to ensure calculations only occur for valid combinations of dimension items, improving performance by reducing unnecessary data.
Example with a Multidimensional Metric: Suppose you have a Boolean metric called `IsValidCombination` with multiple dimensions (for example, Product and Region). You can use it in your formula like this:

`IF(IsValidCombination, SalesAmount, BLANK)`

Here, `IsValidCombination` is TRUE only for valid product-region pairs. The formula calculates `SalesAmount` only where the combination is valid, leaving other cells blank. This approach helps keep your model efficient.

## Table Consolidation Strategies

- Split large tables into focused smaller tables
- Use hidden metrics for intermediate calculations
- Consolidate related metrics into tables

## View Management

- Limit dimensions in views (3-5 max)
- Use filters to reduce data volume
- Consider view truncation limits

## See Also

- `skill:optimizing-pigment-performance`
- [Modeling Principles](./modeling_principles.md)
