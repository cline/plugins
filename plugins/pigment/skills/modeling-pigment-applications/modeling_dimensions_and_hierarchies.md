# Dimensions and Hierarchies

Complete guide for dimensional modeling, hierarchy implementation, and strategic decision-making.

## When to Read This

- Designing metric dimensional structures
- Creating hierarchies with dimension-type properties
- Deciding whether to add dimensions to structure or use properties
- Working with multi-level or ragged hierarchies
- Handling dynamic relationships (mapped dimensions, time-dependent hierarchy)

## Prerequisites

Understand from [modeling_fundamentals.md](./modeling_fundamentals.md): dimensions, properties, dimension-type properties, hierarchy terminology.

---

## Part 1: Dimensional Concepts

### Core Concept: Source vs Target Dimensions

Compare source data dimensions to desired target:

- Same Dimensions: No action required
- More/Different Dimensions: Map or allocate data
- Fewer Dimensions: Sum or remove dimensions

### Dimensional Transformation Cases

Case 0: No Modification

- Source and target have identical dimensions
- Example: `Unit Price x Quantity` (both `Product x Warehouse`)

Case 1: Aggregation

- Use `BY` modifier with operators (SUM, AVERAGE, MIN, MAX, COUNT)
- Example: `'Order List'.Amount [BY SUM: 'Order List'.Product, 'Order List'.Month]`
- Aggregates from `Order x Product x Customer x Month` to `Product x Month`

Case 2: Aggregation via Properties

- Aggregate to parent: `'Inventory Level' [BY SUM: Warehouse.Region, Product, Month]`
- Allocate to children: `'Shipping Rate by Region' [BY: Warehouse.Region] x 'Order Quantity'`
- Note: `BY CONSTANT` distributes single value to multiple items

Case 3: Add/Remove Dimensions

- Add: `'Actual Sales' [ADD CONSTANT: Version]` - Copies value across new dimension
- Remove: `'Sales' [REMOVE SUM: Product]` - Aggregates and drops dimension

Same logical dimension twice (mirror dimension): When one list must appear twice in a structure (e.g. Months as Time and as Cohort month, Company in rows and columns), use List Subsets so a single source list is reused. Subsets behave as separate dimensions and require explicit mapping; see [List Subsets](./modeling_subsets.md) for when to use them and for data-loss and remapping rules.

Modifier syntax reference: [formula_modifiers.md](../writing-pigment-formulas/formula_modifiers.md)

---

## Part 2: Building Hierarchies

### Core Concept

Dimension-type properties create hierarchies without adding dimensions to metric structure. Creates parent-child relationships enabling aggregation at any level without changing metric dimensions.

WARNING: Important: Properties are NOT structural elements of metrics. Only dimension lists (regular dimensions) can be used in a metric's structure. Properties are attributes of dimensions used for grouping, aggregation, and navigation-but they don't define the dimensional grid where data is stored.

### Hierarchy Examples

Product: Product -> Category -> Line

- Product has "Category" property (dimension-type)
- Category has "Line" property (dimension-type)
- Metric: `Product x Month` (not `Product x Category x Line x Month`)

Organizational: Employee -> Department -> Division
Geographic: Store -> Region -> Country

### Property Chaining

Syntax: `Dimension.Property.Property.Property...`

Examples:

- `Product.Category.Line` - 2 levels up
- `Employee.Department.Division` - 2 levels up

Formula aggregation:

```pigment
'Product Revenue' [BY SUM: Product.Category, Month]
'Product Revenue' [BY SUM: Product.Category.Line, Month]
'Sales' [BY SUM: Product.Category, Store.Region, Month]
```

### Benefits

- Report at any level without restructuring
- 5-level hierarchy = 0 added dimensions
- Change hierarchies by updating properties, not formulas

### Mapped Dimensions (Dynamic Relationships)

Also called time-dependent hierarchy, slowly changing hierarchy, or slowly moving dimensions. Parent-child relationships can change across periods; past periods keep the old parent, future ones the new. The mapping metric usually varies by time, sometimes by Version.

When to Use:

Dimension-type properties for static relationships:

- Product -> Category (rarely changes)
- Store -> Region (fixed)

Mapped Dimensions for dynamic relationships (most often varying by Month; sometimes by Version):

- Cost Center -> Department (re-org: historical actuals stay under the old department)
- Employee -> Team (changes monthly)
- Product -> Promotion (varies by period)
- Customer -> Segment (behavior-based)

Implementation (modeler workflow):

1. `tool:create_metric` - mapping metric, Dimension-typed, structured on the source dimensions only (e.g. `Cost Center x Month` -> Department).
2. Populate values with a formula on the mapping metric, or manually via `tool:set_metric_input`.
3. Views - add a Mapped Dimension (Joined Pivot) on the core metric or Table; do not add the parent dimension to every underlying metric.

Example: Salary (`Employee x Month`) mapped to Team via mapping metric. Employees automatically aggregate to correct Team per month.

Comparison:

- Property: Static - updating the parent moves all history with the child; fine when the relationship never changes
- Mapped Dimension: Dynamic - views only, varies by period or version; core metrics stay lean

Reference: [Mapped Dimensions docs](https://kb.pigment.com/docs/mapped-dimensions)

### Ragged/Unbalanced Hierarchies

Types:

1. Variable Depth: Some paths shorter than others (2 vs 5 levels)
2. Multiple Parents: Item belongs to multiple categories (avoid double-counting)
3. Optional Levels: Some items have blank intermediate properties

Recommended Approach: Accept Blanks

Create full hierarchy, accept blank intermediate levels.

Example:

```
Employee: John -> Manager: Jane -> Director: Bob -> VP: Sarah
Employee: Alice -> Manager: [BLANK] -> Director: Bob -> VP: Sarah
Employee: Charlie -> Manager: [BLANK] -> Director: [BLANK] -> VP: Sarah
```

Formula: `'Salary' [BY SUM: Employee.Manager.Director.VP, Month]`
Result: All roll up correctly despite blanks

Multiple Parents:

- Approach 1 (Recommended): One primary parent via property, track others separately
- Approach 2: Transaction list for true multi-parent scenarios

### Performance

- 2-3 levels: Excellent
- 4-5 levels: Very good
- 6+ levels: Test with real data

Workflow:

1. Identify hierarchy structure
2. Create dimensions top-to-bottom
3. Add properties bottom-to-top
4. Test property chains
5. Create metrics with base dimensions only

---

## Part 3: Decision Framework - Property vs Dimension in Structure

### The Core Question

Add dimension to metric structure OR reference through property?

Remember: Only dimension lists can be added to metric structure. Properties and transaction lists cannot be structural elements.

### Decision Tree

```
Is this dimension needed for...

-- Direct user input at this level? -> YES = Add to structure
-- Calculations at this specific level? -> YES = Add to structure
-- Filtering that reduces data volume? -> YES = Consider structure
-- Only reporting/grouping? -> YES = Use property
-- Only drill-down/navigation? -> YES = Use property
```

### Use Dimension-Type Property When

- Hierarchy/Grouping Only: No direct input, only for aggregation
- Reporting Flexibility: View data at multiple levels
- Parent-Child Relationship: Clear hierarchy, input at child level
- Many-to-One: Multiple children to one parent
- Dimension Explosion Risk: Already 6+ dimensions
- Frequently Changing: Relationships change regularly

### Add to Metric Structure When

- Direct Input Required: Users input at this level
- Calculation Logic: Formulas need values at this level
- Significant Filtering: Dimension scopes most calculations
- Independent Dimension: No parent-child relationship (Time, Scenario)
- Dense Data: Most combinations have values
- Allocation Required: Top-down planning
- Cross-Dimensional Calculations: Reference specific items in formulas

### Examples

Sales with Product/Category:

- Input at Product level
- Category only for grouping
- Decision: Property (`Product x Store x Month`, Product.Category property)

Headcount Planning:

- If input/calculation at Department level -> Add to structure
- If only employee input -> Use property

### Trade-offs

| Aspect          | In Structure | Property   |
| --------------- | ------------ | ---------- |
| Performance | Slower       | Faster     |
| Flexibility | Fixed        | Dynamic    |
| Input       | Direct       | Child only |
| Maintenance | Harder       | Easier     |
| Sparsity    | Risk         | Better     |

### Best Practices

1. Start minimal: fewest dimensions, properties for hierarchies
2. Test performance with real data
3. Document decisions
4. Review as model evolves

### Common Mistakes

- Over-Dimensionalizing: Adding all hierarchy levels (10+ dimensions)
- Under-Using Properties: Missing flexible reporting opportunities
- Inconsistent Patterns: Properties for some hierarchies, dimensions for similar ones
- Ignoring Input Patterns: Wrong granularity level

### When to Reconsider

- Complex formulas working around properties -> Add to structure
- Many metrics at different levels -> Use properties
- Performance slow with many dimensions -> Move to properties

---

## Cross-References

- Modifier syntax: [formula_modifiers.md](../writing-pigment-formulas/formula_modifiers.md)
- Performance: [modeling_performance_considerations.md](./modeling_performance_considerations.md)
- Standards: [modeling_principles.md](./modeling_principles.md)
