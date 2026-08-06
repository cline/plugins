# Formula Modifiers

Dimensional transformations using modifiers for aggregation (N->1 or N->none) and allocation (1->N or none->N).

Key Concept: Modifiers are used for dimensional transformations and require square brackets with a colon: `[BY: ...]`, `[REMOVE: ...]`, `[KEEP: ...]`, `[ADD: ...]`, `[SELECT: ...]`, `[FILTER: ...]`, `[EXCLUDE: ...]`, `[TOPARENTLIST: ...]`, `[TOSUBSET: ...]`.

---

## Understanding Source and Target

- Source: The Metric or List you are pulling data FROM (referenced in your formula)
- Target: The Metric or List you are writing the formula IN

Both have dimensions. When dimensions differ, use modifiers to control how values are calculated or distributed.

---

## Dimension Flow Rules

To verify dimensional alignment, trace how dimensions change through each operation.

How Operations Change Dimensions:

| Operation        | Effect                              | Example                                         |
| ---------------- | ----------------------------------- | ----------------------------------------------- |
| `[REMOVE: X]`    | Removes X                           | `/*Prod,Reg,Mo*/[REMOVE: Prod]` -> `/*Reg,Mo*/`  |
| `[BY: Prop]`     | Replaces dim with property's parent | `/*Prod*/[BY: Prod.Category]` -> `/*Category*/`  |
| `[ADD: X]`       | Adds X (densifies!)                 | `/*Reg*/[ADD: Mo]` -> `/*Reg,Mo*/`               |
| `[KEEP: X, Y]`   | Keeps only X and Y                  | `/*Prod,Reg,Mo*/[KEEP: Prod]` -> `/*Prod*/`      |
| `[SELECT: cond]` | Filters AND removes dimension       | `/*Prod,Month*/[SELECT: Month = VAR_Reference_Month]` -> `/*Prod*/`    |
| `[FILTER: cond]` | Filters, keeps all dimensions       | `/*Prod,Month*/[FILTER: Month = VAR_Reference_Month]` -> `/*Prod,Month*/` |
| `[TOPARENTLIST: Subset]` | Subset dimension -> parent list (1:1; parent items outside subset -> blank) | `/*Subset,Month*/` -> `/*Parent,Month*/` |
| `[TOSUBSET: Subset]`     | Parent dimension -> subset (1:1; filters to subset members only)           | `/*Parent,Month*/` -> `/*Subset,Month*/` |

Combining Expressions (union rule):

When combining expressions (`A + B`, `IF(cond, A, B)`, `IFBLANK(A, B)`), the result has the union of all dimensions from all operands.

Note: `[BY: dim.prop]` removes `dim` and adds `prop`'s dimension - no need to REMOVE separately.

---

## Four Relationship Types

| Source->Target           | Type                    | Modifier | Available Methods         | Example            |
| ----------------------- | ----------------------- | -------- | ------------------------- | ------------------ |
| N -> 1               | Aggregation             | `BY`     | SUM, AVG, MIN, MAX, COUNT | Country->Region     |
| N -> none            | Aggregation             | `REMOVE` | SUM, AVG, MIN, MAX, COUNT | Remove Product     |
| N -> none (filtered) | Conditional Aggregation | `SELECT` | SUM, AVG, MIN, MAX, COUNT | Filter & aggregate |
| 1 -> N               | Allocation              | `BY`     | CONSTANT, SPLIT           | Region->Country     |
| none -> N            | Allocation              | `ADD`    | CONSTANT, SPLIT           | Add Country        |

Default Aggregation: SUM | Default Allocation: CONSTANT

---

## Understanding Parent Dimensions (Hierarchies)

Lists can have properties of type "Dimension" that reference other dimension lists, creating hierarchies:

- Country list has "Region" property -> Country -> Region
- Month list has "Quarter" property -> Month -> Quarter -> Year
- Product list has "Category" property -> Product -> Category

### BY with Parent Dimensions

#### Aggregation (N->1): Going Up

```pigment
'Country Revenue'[BY SUM: Country.Region]              // Countries -> Regions
'Monthly Sales'[BY SUM: Month.Quarter]                 // Months -> Quarters
'Product Revenue'[BY SUM: Product.Category]            // Products -> Categories
'Employee Salary'[BY SUM: Employee.Department]         // Employees -> Departments
```

#### Allocation (1->N): Going Down

```pigment
// Replicate (CONSTANT - default)
'Region Budget'[BY CONSTANT: Country.Region]           // Same value to all countries
'Category Price'[BY CONSTANT: Product.Category]        // Same price to all products

// Split equally
'Region Revenue'[BY SPLIT: Country.Region]             // Equally distribute
'Quarterly Target'[BY SPLIT: Month.Quarter]            // Equally distribute

// Seed a specific dimension member (MP02) - VAR_Actual_Version: input metric, type Dimension
'ActualData'[BY CONSTANT: VAR_Actual_Version]          // not Version."Actual"
```

#### Multi-Level Hierarchies

```pigment
'Monthly Revenue'[BY: Month.Quarter][BY: Quarter.Year]
'City Revenue'[BY: City.Country][BY: Country.Region]
```

---

## TOPARENTLIST and TOSUBSET (list subsets)

Use these when a metric is on a list subset dimension and you need the same values on the parent list (or the reverse). They perform a 1:1 dimensional remap (each subset item maps to its parent item); they do not aggregate or allocate, so you do not specify `SUM`, `BY CONSTANT`, etc.

- TOPARENTLIST - subset dimension -> parent dimension. Parent items not in the subset become blank on the result.
- TOSUBSET - parent dimension -> subset dimension. Data on parent items outside the subset is dropped from the result.

Syntax (spaces around `:` are optional in the product docs):

```pigment
'Metric on Subset'[TOPARENTLIST: 'My Subset']
'Metric on Parent'[TOSUBSET: 'My Subset']
```

When to prefer these vs `[BY: ...]` on a mapping property

- Prefer TOPARENTLIST / TOSUBSET for the straight subset <-> parent remap of the same list's items (natural 1:1 identity between subset row and parent row).
- Keep `[BY: Parent.'Subset Mapping']` (or similar) when you need a custom mapping, multiple subsets feeding one structure, or other shapes the subset modifiers do not cover - see [List Subsets](../modeling-pigment-applications/modeling_subsets.md).

The compiler enforces valid combinations (e.g. the expression must be dimensioned by the subset for TOPARENTLIST with that subset, and structural rules about which dimensions may appear together). If a formula is rejected, read the error and fall back to an explicit mapping + `BY` pattern when appropriate.

---

## Modifier Reference

### BY Modifier

Most versatile - aggregates up or allocates down using mapping attributes.

Syntax: `Block[BY: mapping_attribute]`

Only list dimensions whose grain is changing. BY only transforms the dimension(s) you specify; it doesn't remove other dimensions. List in BY only the dimensions (or hierarchy steps) you are aggregating or allocating over. Do not re-list dimensions that are already on the metric and unchanged - that is unnecessary and verbose (over-explicit BY).

If a dimension already exists on the metric and you don't reference it in BY, it stays as-is. To remove dimensions, use REMOVE.

Example - avoid over-explicit BY: Metric is dimensioned by Employee and Month. To normalize by year total, only the time grain changes (Month -> Year). Put only `Month.'Year'` in BY:

```pigment
// BAD: Over-explicit: re-listing Employee and Month.'Year' when only year grain changes
'Metric' / 'Metric'[BY SUM: Employee, Month.'Year'][BY CONSTANT: Employee, Month.'Year']

// GOOD: Correct: only the dimension whose grain changes
'Metric' / 'Metric'[BY SUM: Month.'Year'][BY CONSTANT: Month.'Year']
```

Aggregation (child -> parent):

```pigment
'Country Revenue'[BY: Country.Region]              // Sum by default
'Product Price'[BY AVERAGE: Product.Category]      // Average
```

Allocation (parent -> child):

```pigment
'Region Budget'[BY: Country.Region]                // Constant by default
'Region Revenue'[BY SPLIT: Country.Region]         // Split equally
```

Add dimension:

```pigment
'Global Price'[BY: Product]                        // Add Product dimension
```

#### Sparsity via BY + dimension-typed metrics

When one of the BY arguments is a dimension-typed metric (e.g. `'CALC_Employee_Tenure_Month_Index'` typed as a time or index dimension), that metric's sparsity is respected automatically: the result is only defined where the metric is defined.

Do not add IF(ISBLANK(metric), BLANK, ...) or similar guards - they are redundant and harmful (ISBLANK densifies).

Anti-pattern (redundant guard, densifies):

```pigment
IF(
  ISBLANK('CALC_Employee_Tenure_Month_Index'),
  BLANK,
  'ASM_Ramp_Schedule'[BY: Employee.Segment, 'CALC_Employee_Tenure_Month_Index']
)
```

Correct (BY alone; sparsity preserved):

```pigment
'ASM_Ramp_Schedule'[BY: Employee.Segment, 'CALC_Employee_Tenure_Month_Index']
```

Methods:

- Aggregation: SUM (default), AVERAGE, MIN, MAX, COUNT
- Allocation: CONSTANT (default), SPLIT

BY with mapping metrics (arrow `->`): When the mapping is a dimension-typed metric (e.g. `'Country to Region Map'`) rather than a simple property, use the arrow syntax: `Source[BY Method: SourceDim -> MappingMetric, ...]`. See [formula_by_mapping_arrow.md](./formula_by_mapping_arrow.md) for full syntax, rules, and pitfalls (e.g. unintended aggregation on Version, Time, Scenario).

---

### REMOVE Modifier

Remove dimension and aggregate to remaining dimensions.

```pigment
'Revenue'[REMOVE: Product]                         // Remove Product (sum)
'Sales'[REMOVE SUM: Region]                        // Explicit SUM
'Salary'[REMOVE AVERAGE: Employee]                 // Average
```

Note: Loses scope (performance impact). Prefer BY when possible.

For the tiered/banded lookup pattern (assign each item to a band or tier based on thresholds on a dimension, e.g. account segmentation, salary bands), see [formula_segmentation_tiered_lookup.md](./formula_segmentation_tiered_lookup.md) - it uses `IF(...)[REMOVE FIRSTNONBLANK: Dim]` or `LASTNONBLANK`.

---

### KEEP Modifier

Retain specific dimensions, aggregate away the rest.

Syntax: `Block[KEEP [METHOD]: Dimension1, Dimension2, ...]`

```pigment
'Revenue'[KEEP: Country] // Keep only Country, sum over all other dimensions
'Revenue'[KEEP AVG: Month] // Keep Month, average over all other dimensions
'Revenue'[KEEP FIRSTNONBLANK ON RANK(Product): Country, Month] // Keep Country and Month
```

Methods: SUM (default), AVG, MIN, MAX, FIRST, FIRSTNONBLANK  
Note: FIRST/FIRSTNONBLANK with multiple dimensions require `ON RANK(Dimension)`

---

### SELECT Modifier

Conditional aggregation - filters by condition AND removes the filtered dimension.

```pigment
// Sum only items matching condition (removes dimension)
// VAR_Labor_Type: input metric, type Dimension
'Labor_Cost' = 'Cost'[SELECT SUM: Type = VAR_Labor_Type]

// Multiple conditions - VAR metrics for item-specific members
'Q1_North' = 'Revenue'[SELECT SUM: Month.Quarter = VAR_Selected_Quarter AND Region = VAR_Selected_Region]

// With parent dimensions - prefer property-based filter when semantic
'Category_Revenue' = 'Revenue'[SELECT SUM: Product.'Include Category']
```

Key Behavior: SELECT with condition = FILTER + REMOVE in one operation

Methods: SUM (default), AVERAGE, MIN, MAX, COUNT

Note: SELECT with condition removes the filtered dimension (use FILTER to keep dimension)

#### SELECT with Dimension Offsets (Different Behavior)

Offset SELECT is different - it shifts the dimension value but keeps the dimension.

Syntax: `Block[SELECT: Dimension +/- N]`

Works with any ordered dimension (time dimensions, ranked lists, etc.). The offset shifts by N positions in the dimension's sort order.

Examples:

```pigment
// Time dimension offsets (most common)
'Revenue'[SELECT: Month-1]                    // Previous month's value
'Revenue' - 'Revenue'[SELECT: Month-1]        // Month-over-Month change
'Revenue'[SELECT: Month-12]                   // Same month last year

// Other ordered dimensions
'Sales Rank'[SELECT: Product-1]               // Previous product in ranking
'Score'[SELECT: Employee+1]                   // Next employee in order

// Specific item selection - VAR_Reference_Month: input metric, type Dimension
'Revenue'[SELECT: Month = VAR_Reference_Month]     // Value for specific month (keeps Month dimension)
```

Time Dimensions: For prior period lookups, SELECT is fast (parallel). PREVIOUS/PREVIOUSOF are slow (iterative) - only use when current value depends on calculating prior value first (e.g., running balances). See [functions_iterative_calculation.md](./functions_iterative_calculation.md) for when and how to use PREVIOUS/PREVIOUSOF.

See [functions_time_and_date.md](./functions_time_and_date.md) for SELECT vs PREVIOUS and time function guidance.

---

### FILTER Modifier

Filter data based on a boolean condition. Keeps the dimension (unlike SELECT which removes it).

Syntax: `Block[FILTER: BooleanCondition]`

Style: Prefer separate FILTERs for readability (e.g. one FILTER per condition) instead of one FILTER with a long AND. See [formula_conditionals_style.md](./formula_conditionals_style.md).

MP02 - dimension members in conditions: MUST NOT hard-code `Dimension."Item"`. Create a `VAR_` input metric of type Dimension; the item literal may appear only in its default value.

Examples:

```pigment
// Filter by dimension member via VAR metrics
'Revenue'[FILTER: Country = VAR_Selected_Country]
'Revenue'[FILTER: Country = VAR_Selected_Country AND Product = VAR_Selected_Product]

// Filter multiple members - prefer a boolean property or mapping metric
'Revenue'[FILTER: Country.'Include in Report']

// Filter by value threshold
'Revenue'[FILTER: 'Revenue' > 1000]
'Revenue'[FILTER: CurrentValue > 1000]                // CurrentValue = same as expression

// Filter by boolean metric
'Revenue'[FILTER: 'Is Active']

// Filter via parent-dimension property (semantic, MP02-safe)
'Revenue'[FILTER: Product.'Include Category']
```

CurrentValue Keyword: Use `CurrentValue` to reference the filtered expression itself, avoiding repetition:

```pigment
// Instead of repeating the expression:
('Revenue' * 'Margin')[FILTER: ('Revenue' * 'Margin') > 1000]

// Use CurrentValue:
('Revenue' * 'Margin')[FILTER: CurrentValue > 1000]

// More complex example - filter after aggregation
'Revenue'[REMOVE: Product][FILTER: CurrentValue > 100000]
// Equivalent to:
'Revenue'[REMOVE: Product][FILTER: 'Revenue'[REMOVE: Product] > 100000]
```

When to Use CurrentValue:

- When filtering on the result of a complex expression
- When filtering after an aggregation (REMOVE, BY)
- To avoid recalculating the same expression in the condition

When subsetting a computed expression by its value, prefer this pattern over `IF(Expression > threshold, Expression, BLANK)` - it evaluates once per cell and is often faster. See [formula_performance_patterns.md](./formula_performance_patterns.md) (Pattern 4, Case B).

Key Points:

- Keeps dimension - Result has same dimensions as source
- Returns values where condition is TRUE, BLANK elsewhere
- Blanks in condition result in BLANK output (not included)

---

### EXCLUDE Modifier

Exclude data based on a boolean condition. Opposite of FILTER - removes matching rows.

Syntax: `Block[EXCLUDE: BooleanCondition]`

Examples:

```pigment
// Exclude specific dimension members via VAR metric or boolean property
'Revenue'[EXCLUDE: Country = VAR_Excluded_Country]
'Revenue'[EXCLUDE: Country = VAR_Excluded_Country AND Product = VAR_Excluded_Product]

// Exclude multiple members - prefer boolean property
'Revenue'[EXCLUDE: Country.'Exclude from Report']

// Exclude by value threshold
'Revenue'[EXCLUDE: 'Revenue' > 1000]                  // Keep values <= 1000 or BLANK
'Revenue'[EXCLUDE: CurrentValue > 1000]               // CurrentValue = same as expression

// Exclude by boolean metric
'Revenue'[EXCLUDE: 'Is Inactive']
```

CurrentValue Keyword: Same as FILTER - use to reference the expression being filtered.

FILTER vs EXCLUDE:

```pigment
// These are equivalent:
'Revenue'[FILTER: Country = VAR_Selected_Country]
'Revenue'[EXCLUDE: NOT(Country = VAR_Selected_Country)]

// But they differ on BLANK handling:
// FILTER: condition must be TRUE -> BLANKs excluded
// EXCLUDE: condition must be TRUE to exclude -> BLANKs included
```

When to Use EXCLUDE vs FILTER:

- Use EXCLUDE when you want to keep BLANKs (recommended for readability and performance)
- Use FILTER when you want to remove BLANKs
- Always prefer EXCLUDE for exclusions - do not use `FILTER: NOT(...)`. NOT over a boolean that can be BLANK densifies; EXCLUDE preserves sparsity. See [formula_conditionals_style.md](./formula_conditionals_style.md).

---

### ADD Modifier

Add dimension where source has none. Creates values for all items in the added dimension.

Syntax: `Block[ADD: Dimension]` or `Block[ADD SPLIT: Dimension]`

```pigment
'Global Price'[ADD: Country]                       // Same value for every country
'Total Budget'[ADD SPLIT: Country]                 // Equally distribute across countries
```

Methods: CONSTANT (default), SPLIT

WARNING: Performance Warning: ADD creates dense structures (all combinations). Prefer BY when a mapping exists. Make sure to check [formula_performance_patterns.md](./formula_performance_patterns.md) for guidance.

---

## Aggregation & Allocation Methods

Aggregation Methods (work with BY, REMOVE, KEEP, SELECT):

| Data Type          | Available Methods                                                                  |
| ------------------ | ---------------------------------------------------------------------------------- |
| Number/Integer | SUM (default), AVG, MIN, MAX, FIRSTNONZERO                                         |
| Date           | MIN, MAX                                                                           |
| Boolean        | ANY, ALL                                                                           |
| Text           | TEXTLIST                                                                           |
| All types      | FIRST, LAST, FIRSTNONBLANK, LASTNONBLANK, COUNT, COUNTBLANK, COUNTALL, COUNTUNIQUE |

Allocation Methods (work with BY, ADD):

- CONSTANT (default) - Same value for all items
- SPLIT - Equally distribute based on number of items

---

## Implicit Behavior (No Modifiers)

When dimensions differ without modifiers:

- Fewer target dims -> Implicitly sums (like `REMOVE SUM`)
- More target dims -> Implicitly replicates (like `ADD CONSTANT`)

Best Practice: Use explicit modifiers when you need to change grain or alignment. "Explicit" means specifying the transformation you need (e.g. `BY SUM: Month.'Year'`), not repeating dimensions that are already on the metric and unchanged - avoid over-explicit BY.

---

## Common Patterns

```pigment
// Multi-level aggregation
'Product Revenue'[BY: Product.Category][BY: Category.Division]

// Weighted average
('Revenue' * 'Margin')[BY SUM: Country.Region] / 'Revenue'

// Normalization (ratio to total): double BY in denominator - only list dimensions whose grain changes
// Metric is on Employee and Month; normalize to year total -> only Month.'Year' in BY
'Metric' / 'Metric'[BY SUM: Month.'Year'][BY CONSTANT: Month.'Year']

// Percentage of total
'Country Revenue' / 'Country Revenue'[REMOVE: Country]

// Allocation: equally distribute
'Region Revenue'[BY SPLIT: Country.Region]

// Transaction aggregation with TIMEDIM
'Transactions'.'Amount'[BY: TIMEDIM('Transactions'.'Date', Month)]

// Transaction aggregation with TIMEDIM and other dimensions
'Orders'.'Amount'[BY: TIMEDIM('Orders'.'Date', Quarter), Customer]

// Transaction aggregation with filtering
'Transactions'.'Amount'[SELECT: 'Transactions'.'Date' >= DATE(2024,1,1)][BY: TIMEDIM('Transactions'.'Date', Month)]
```

---

## Critical Rules

### Transaction List Properties in Metrics

A Transaction List is not a dimension and cannot be used as a structural dimension of a metric. For the distinction between Dimension list and Transaction list, see [modeling_fundamentals](../modeling-pigment-applications/modeling_fundamentals.md) (section 2.3). To use Transaction List data in a metric, reference the list's properties in the formula and aggregate with BY (e.g. list properties of type Dimension, or TIMEDIM for dates).

When using a transaction list property in a METRIC formula, you MUST aggregate it.

Transaction lists are unbounded - they have rows but no dimensions. Metrics have dimensions. To use a list property in a metric, you must aggregate to align dimensions.

```pigment
// BAD: WRONG: List property without aggregator in a metric
'Orders'.'Amount'  // Error! No dimensions to align

// GOOD: CORRECT: Aggregate list property to metric dimensions
'Orders'.'Amount'[BY: TIMEDIM('Orders'.'Date', Month)]
'Orders'.'Amount'[BY: 'Orders'.'Customer', TIMEDIM('Orders'.'Date', Month)]

// GOOD: CORRECT: Multiple aggregation dimensions
'Transactions'.'Value'[BY: 'Transactions'.'Product', 'Transactions'.'Region']
```

Note: This rule applies to metrics. Within the same list's property formulas, you can reference other properties directly without aggregation.

Common Error Pattern:

```pigment
// BAD: In a metric formula - ERROR
'Transactions'.'Amount' * 'Exchange Rate'

// GOOD: In a metric formula - CORRECT
'Transactions'.'Amount'[BY: TIMEDIM('Transactions'.'Date', Month), 'Transactions'.'Currency'] * 'Exchange Rate'
```

### WARNING: NEVER Chain BY on Transaction Lists

When aggregating by multiple dimensions, use a SINGLE BY with comma-separated expressions.

After `list[BY: dim1]`, the result is on `dim1` only - the list's other properties are LOST.

```pigment
// BAD: WRONG: Chaining BY loses list properties
'Orders'.'Amount'[BY: TIMEDIM('Orders'.'Date', Month)][BY: 'Orders'.'Product']
// After first BY, result is on Month only - 'Orders'.'Product' is no longer accessible!

// GOOD: CORRECT: Single BY with multiple dimensions
'Orders'.'Amount'[BY: TIMEDIM('Orders'.'Date', Month), 'Orders'.'Product']
// Both dimensions applied together, result is on Month AND Product
```

Key Rule: Always use the LIST column name (e.g., `'Orders'.'Customer'`) in modifiers, not just the dimension name (`Customer`).

### Transaction List Column Types

Dimension-typed columns: Use directly in BY

```pigment
'Orders'.'Amount'[BY: 'Orders'.'Customer']  // Customer is dimension-typed
```

Text columns referencing dimensions: Convert with ITEM() first

```pigment
// 'Orders'.'ProductCode' is TEXT, but matches 'Products'.'Code'
'Orders'.'Amount'[BY: ITEM('Orders'.'ProductCode', 'Products'.'Code')]
```

Date columns: Convert with TIMEDIM()

```pigment
// 'Orders'.'OrderDate' is DATE type, not a dimension
'Orders'.'Amount'[BY: TIMEDIM('Orders'.'OrderDate', Month)]
```

---

### Parent Dimensions (Hierarchies)

- Dimension properties create hierarchies - Country.Region, Month.Quarter
- BY works both ways - Child->Parent aggregates UP, Parent->Child allocates DOWN
- Chain for multi-level - `[BY: Month.Quarter][BY: Quarter.Year]`

### Modifier Behavior

- BY - Most versatile (aggregation and allocation with hierarchies)
- REMOVE - Always aggregates, loses scope (prefer BY)
- KEEP - Retain only specified dimensions
- SELECT - Conditional aggregation, filters + removes dimension
- FILTER - Keeps dimension, includes matching rows, excludes BLANKs
- EXCLUDE - Keeps dimension, excludes matching rows, keeps BLANKs
- ADD - Creates dense structure (prefer BY for sparsity)
- Default aggregation: SUM | Default allocation: CONSTANT
- SPLIT - Equally distribute based on number of items

### Performance (CRITICAL)

- Prefer BY over ADD - BY is sparse (uses mappings), ADD is dense (all combinations)
- BY CONSTANT over ADD CONSTANT - Same value replication but sparse vs dense
- BY SPLIT over ADD SPLIT - Same splitting but sparse vs dense
- Prefer BY over REMOVE or KEEP - Preserves scope
- Explicit > Implicit - Better control; but in BY list only dimensions whose grain is changing - avoid over-explicit BY (re-listing unchanged dimensions).

The BY vs ADD Rule: If a mapping property exists, use BY. Only use ADD as last resort when no mapping exists.

---

## See Also

- [formula_by_mapping_arrow.md](./formula_by_mapping_arrow.md) - BY with mapping metrics (arrow `->`): when and how to use it, dimension rules, pitfalls
- [functions_basic_aggregations.md](./functions_basic_aggregations.md) - OF functions (SUMOF, AVGOF, etc.)
- [formula_writing_workflow.md](./formula_writing_workflow.md) - 8-step formula writing process
- [formula_performance_patterns.md](./formula_performance_patterns.md) - Performance optimization
