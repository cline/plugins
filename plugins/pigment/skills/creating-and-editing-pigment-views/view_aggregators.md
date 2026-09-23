# View Aggregators and Totals

This guide explains how aggregation works in Pigment Views: where aggregation applies, what creates visible totals, and when to use simple vs advanced aggregation.

---

## 1. Core mental model

Aggregation in a View exists at two levels:

1. Metric default aggregators
   - Defined on the Metric
   - One for temporal dimensions
   - One for non-temporal dimensions

2. View-level overrides
   - Defined on the View
   - Used either for:
     - visible pivots on Rows / Columns
     - hidden dimensions, including dimensions placed only on Pages

### Critical distinction
- Visible pivot aggregation controls subtotals and grand totals on the grid.
- Hidden dimensions aggregation does not create new total cells. It only determines how visible cells are computed when some metric dimensions are not on Rows / Columns.

---

## 2. Where aggregation applies

| Dimension placement | Visible on grid? | Pivot aggregation allowed? | Uses hiddenDimensionsAggregations? | Creates visible totals? |
|---|---:|---:|---:|---:|
| Rows | Yes | Yes | No | Yes |
| Columns | Yes | Yes | No | Yes |
| Pages | No | No | Yes | No |
| Not shown | No | No | Yes | No |

### Practical rule
- If a dimension is on Rows or Columns, use pivot aggregation when you want visible totals.
- If a dimension is only on Pages or not shown, use hiddenDimensionsAggregations.
- If the Metric defaults are already correct, prefer `Default` / no override.

---

## 3. Totals

### Subtotals
A subtotal is an aggregated value for a visible grouped level on a Row or Column pivot.

### Grand totals
A grand total is the aggregation across all visible modalities on the relevant axis or axes.

### Important
- Rows / Columns aggregation can create visible subtotal and grand total cells.

---

## 4. Metric default aggregators

Every Metric has two default aggregators, set together:

- Temporal default
  - Common choices:
    - `Sum` for additive flows (`Revenue`)
    - `Last` for snapshots (`Headcount`)

- Non-temporal default
  - Common choices:
    - `Sum` for additive measures
    - `Any` / `First` for reference-like values

For rate / percentage / ratio metrics and growth / relative variance metrics, no simple Metric default produces a correct value. These must be aggregated at the View level with Advanced Aggregators (Ratio or Growth). See section 7 and section 10.

### `Default`
At View level, `Default` means: inherit the Metric's own default aggregator.

---

## 5. View-level aggregation

### A. Visible pivot aggregation
Use for dimensions on Rows or Columns.

This controls:
- rollup on the visible axis
- subtotals / grand totals
- aggregation per value field on that pivot

### B. Hidden dimensions aggregation
Use for dimensions:
- only on Pages
- or not shown in the View

This controls:
- how Pigment collapses dimensions that are not on Rows / Columns
- how visible cells are computed before visible totals are shown

---

## 6. Simple aggregators: practical reference

### Decimal / Integer
Common:
- `Sum`
- `Avg`
- `Min`
- `Max`
- `First`
- `Last`
- `FirstNonBlank`
- `LastNonBlank`
- `FirstNonZero`
- `LastNonZero`
- `Count`
- `CountAll`
- `CountUnique`
- `CountBlank`
- `Median`
- `Stdevp`
- `Stdevs`
- `Blank`
- `Default`

Typical use:
- `Sum` for additive metrics
- `Last` for snapshots

For rate / percentage / ratio metrics, do not use simple aggregators (`Avg`, `Sum`, ...). Use Advanced Aggregator Ratio at the View level - see section 7.

### Boolean
Common:
- `Any`
- `All`
- `First`
- `Last`
- `FirstNonBlank`
- `LastNonBlank`
- `Count`
- `CountAll`
- `CountUnique`
- `CountBlank`
- `Blank`
- `Default`

### Text
Common:
- `TextList`
- `First`
- `Last`
- `FirstNonBlank`
- `LastNonBlank`
- `Count`
- `CountAll`
- `CountUnique`
- `CountBlank`
- `Blank`
- `Default`

### Date
Common:
- `Min`
- `Max`
- `First`
- `Last`
- `FirstNonBlank`
- `LastNonBlank`
- `Count`
- `CountAll`
- `CountUnique`
- `CountBlank`
- `Blank`
- `Default`

### Dimension / Permission-like / Access-right-like values
Common:
- `First`
- `Last`
- `FirstNonBlank`
- `LastNonBlank`
- `Count`
- `CountAll`
- `CountUnique`
- `CountBlank`
- `Blank`
- `Default`

### Rare / specialized
- `OnlyOneNotNull`
- `BitAnd`

Use only when the business meaning is explicit.

---

## 7. Recommended patterns

### Additive metrics
Examples:
- Revenue
- Cost
- Units

Recommended:
- Temporal: `Sum`
- Non-temporal: `Sum`

### Snapshot metrics
Examples:
- Headcount
- Ending Inventory
- Balance Sheet values

Recommended:
- Temporal: `Last`
- Non-temporal: often `Sum`, depending on business meaning

### Metrics calculating a Rate / percentage / ratio
Examples:
- Conversion Rate
- Utilization %
- Margin %

Recommended: Advanced Aggregator Ratio

Workflow (Table views):
1. The ratio must exist as a Metric with a Pigment formula (for example `GM% = Gross Margin / Revenue`). Do not fake it by adding the same operand Metric twice as separate value fields.
2. Add the ratio Metric and both operand Metrics to the Table.
3. In the View, include three value fields: ratio Metric plus both operands. Configure Advanced Aggregator Ratio on the ratio Metric's value field; operands are the two operand Metrics' value fields.

Do not use Advanced Aggregators on a Calculated Item value field to stand in for a cross-metric ratio-Calculated Items are for dimension-level derived rows/columns; configure aggregators on Metric value fields instead.

Rates and growth-style percentages that roll up across pivots must use Advanced Aggregators wherever the view aggregates.

### Metrics calculating a Growth or a Relative Variance

Examples:
- YoY growth % between 2 metrics
- Actual vs Budget % variance

Recommended: Advanced Aggregator Growth (A-B/B)

### Reference / lookup values
Examples:
- Owner
- Status
- Category

Recommended:
- `First`, `Last`, `Any`, or `Blank`

---

## 8. Advanced aggregation

Advanced aggregation performs a mathematical operation using two value fields.

Examples:
- `Ratio`
- `Product`
- `Sum`
- `Difference`
- `AbsoluteDifference`
- `Growth`
- `AbsoluteGrowth`

### Applicability

| View type | Simple aggregation | Advanced aggregation |
|---|---:|---:|
| View on a Metric | Yes | No |
| View on a Table | Yes | Yes |
| View on a List | Not applicable in the same way | No |

### Constraints
Advanced aggregation:
- is only supported on Views on Tables
- requires exactly 2 operands
- operands must be metric value fields
- operands must be numeric
- cannot directly self-reference

### Important
Advanced aggregation is a View configuration, not a new Metric.

Advanced Aggregators apply to Metric value fields on Table views. They are not the right lever on Calculated Item value fields when the goal is a ratio between two Metrics-define a ratio Metric with a formula, then set the Advanced Aggregator on that value field.

Do not duplicate an operand Metric as an extra value field and slap an Advanced Aggregator on the duplicate to imitate a ratio; create the ratio Metric and use its value field as the target.

---

## 9. Mapping to tool fields

### Visible pivot aggregation
Applies to:
- Rows
- Columns

Configured with:
- `aggregationConfigurations` on the pivot field

Meaning:
- defines how a value field aggregates on that visible pivot
- controls visible totals

### Hidden dimensions aggregation
Applies to:
- dimensions only on Pages
- dimensions not shown in the View

Configured with:
- `hiddenDimensionsAggregations`

```
HiddenDimensionsAggregation:
    valueFieldId: <uuid>
    temporalDimensionsAggregator: <aggregation config>
    otherDimensionsAggregator: <aggregation config>
```

Meaning:
- defines aggregation across hidden temporal dimensions
- defines aggregation across hidden non-temporal dimensions
- does not create visible totals

### Default inheritance
Configured with:
- `aggregator: Default`

Meaning:
- use the Metric's own default behavior

---

## 10. Common mistakes

- Trying to use pivot aggregation on Pages
  - Page-only dimensions use `hiddenDimensionsAggregations`

- Expecting hidden-dimension aggregation to create subtotal rows
  - It only affects visible cell calculation

- Using `Sum` for snapshot metrics across time
  - Usually `Last` is correct

- Using `Sum` for rates / percentages metrics
  - Use Advanced Aggregator (type Ratio) on all dimensions, with the same numerator and denominator as in the metric formula.

- Using `Sum` for growth / relative variance metrics
  - Use Advanced Aggregator (type Growth A-B/B) on all dimensions, with the same A and B as in the metric formula.

- Using advanced aggregation on a Metric View
  - Advanced aggregation is for Table Views only

- Using Advanced Aggregators on Calculated Items to mimic a ratio between two Metrics
  - Prefer a dedicated ratio Metric plus Advanced Aggregators on its value field. Keep Calculated Items for derived dimension rows/columns where that pattern fits.

- Duplicating the same operand Metric as a second value field to simulate a ratio
  - Does not replace a proper ratio Metric; create the ratio Metric with a Pigment formula and wire operands explicitly.

- Overriding aggregation when Metric defaults are already correct
  - Prefer `Default` / no override unless the View needs different behavior

---

## 11. Quick decision tree

### Step 0
Does the View need a ratio, percentage, or relative variance built from two Metrics (same idea as A / B or (A - B) / B)?
- Yes -> Ensure a dedicated ratio Metric with a Pigment formula exists; add it and both operands to the Table; then configure Advanced Aggregators on the ratio value field (see section 7). Continue to Step 1 for pivot-level aggregation choices.
- No -> Continue

### Step 1
Is the dimension on Rows or Columns?
- Yes -> use pivot aggregation if you want visible totals
- No -> continue

### Step 2
Is the dimension only on Pages?
- Yes -> use hiddenDimensionsAggregations
- No -> continue

### Step 3
Is the dimension not shown anywhere?
- Yes -> use hiddenDimensionsAggregations

### Step 4
Are Metric defaults already correct?
- Yes -> keep `Default` / no override
- No -> define a View-level override

### Step 5
Do you need a math operation between two metrics?
- Yes -> use advanced aggregation on a Table View
- No -> use simple aggregation

---

## 12. Summary

- Metric defaults are the baseline.
- Rows / Columns use pivot aggregation and can create subtotals / grand totals.
- Pages and other hidden dimensions use hiddenDimensionsAggregations.
- Hidden dimensions aggregation does not create visible totals.
- Advanced aggregation is only for Table Views with two numeric value fields.
- Safe defaults:
  - `Sum` for additive metrics
  - `Last` for snapshots
  - Advanced Aggregator Ratio for rates / percentages / ratios
  - Advanced Aggregator Growth (A-B/B) for growth / relative variance
