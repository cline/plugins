This guide defines how Dimensions ("pivots") are ordered and split between rows, columns and pages for boards.

It covers:

1. Ordering pivots Dimensions
2. Allocating them to Rows vs Columns

---

# 1. Ordering Rules

## Global Ordering Principles

1. Parent Dimensions before child Dimensions
2. Dimensions Order: Time -> Business -> Metric -> Comparison or Scenario

### Example

Input:

- Month > Year
- Scenario
- Segment
- Country
- Country > Region
- Month

Reordered:

- Month > Year
- Month
- Segment
- Country > Region
- Country
- Scenario

## How Order Maps To Display

Within an axis, the order of pivots determines how the data nests:

- Rows: the first pivot is the outermost (leftmost) grouping; each subsequent pivot nests inside it, the last being the most granular.
- Columns: the first pivot is the top-most header band; each subsequent pivot nests beneath it.
- Pages: order changes the order in which the page selectors appear in the UI but has no impact on the data grouping.

Reordering pivots on an axis changes the grouping hierarchy of the rendered data, not just their listing.

---

# 2. Special Behavioral Rules

## Filtering ("by metric value")

Filtering overrides all display rules:

- They must be placed last (most granular position)
- If multiple filtering pivots exist:
  - Only the first is guaranteed to work
  - Others may lose filters (known limitation)

## Grouping Dimensions

Related dimensions (parent-child or same hierarchy) must always be allocated together. They cannot be split between rows and columns.

### Building a hierarchy in Rows

To expose a multi-level grouping on the same entity, add each level as its own pivot in Rows, ordered from the shallowest path to the deepest (parent chain before children). Do not skip intermediate levels if you want the full drill-down in the grid.

Example on an `Entity` list: `Entity > Grouping L1`, then `Entity > Grouping L2`, then `Entity > Grouping L3`, and so on - one pivot per level, all in Rows, respecting the global ordering (parents before children on that chain).

### Tree layout vs tabular layout (Grid)

For a Grid widget, the product can render the same row pivots either as tabular row headers (one column per pivot level) or as a treeview (single hierarchy column with indentation / expand-collapse). If `create_view` does not accept this display mode, recommend to the user to do it manually in the UI.

---

# 3. Display-Type Driven Allocation

Pivot allocation depends primarily on the display type.

---

## 3.1 KPI

- All pivot Dimensions -> columns
- `metricsLocation` MUST be `Columns` (or `Pages`) - never `Rows`. KPI views have no row pivots, so Rows produces a broken layout. Default to `Columns`.

---

## 3.2 Pie Chart

- Rows define slices (series)
- Dimensions in columns are aggregated

### Rules

- All pivots Dimensions -> rows

---

## 3.3 Line Chart & Bar Chart & Combined Chart

- Columns: horizontal axis
- Rows: series
- If you need to create a comparison, Dimension should be placed in Rows

### With time dimension

- Time dimensions -> columns
- All others -> rows

### Without time dimension

- First non-comparison Dimension -> columns
- Others -> rows

---

## 3.4 Grid

If you need to create a comparison, Dimension should be placed in Columns

### With calendar dimension

- Calendar Dimensions -> columns
- Others -> rows

### Without calendar dimension

- First pivot Dimension (with its parent Dimension) or Comparison Dimension -> columns
- All others -> rows
- Keep related Dimensions together

### Example 1

revenue by segment, country, region

Ordered:

- Segment
- Country > Region
- Country

Allocation:

- Columns: Segment
- Rows: Country > Region, Country

### Example 2

Ordered:

- Country > Region
- Country
- Segment

Allocation:

- Columns: Country > Region, Country
- Rows: Segment

## 3.5 Waterfall Variation

- Similar to grid behavior

## 3.6 Waterfall Contribution

- All pivot Dimensions -> rows
- Dimensions in columns are aggregated

---

# 4. Summary Heuristics

1. Always group pivots first
2. Order: Time -> Business -> Comparison
3. Apply display-type rules
4. Handle filters last
5. Ensure groups Dimensions remain together (in Rows or in Columns)

---
