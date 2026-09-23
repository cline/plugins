# BY with Mapping Metrics (->) - Arrow Syntax

When to use this doc: Use this when the mapping is a dimension-typed metric (or you need multiple dimensions/properties in the BY mapping). For simple property-based BY (e.g. `Country.Region`, `Product.Category`), see [formula_modifiers.md](./formula_modifiers.md).

---

## 1. PURPOSE

Explain how to use the BY modifier with mapping metrics via the arrow syntax (`->`):

- When and why to use it instead of simple attribute-based BY
- How dimension replacement and addition work
- How to avoid silent over-aggregation (e.g. on Version, Time, Scenario)

This complements the main formula modifiers documentation and assumes you already know basic BY, REMOVE, and dimension alignment.

Concept in one sentence: "BY with `->` replaces specific source dimensions using one or more dimension-typed mapping metrics and/or properties, adds any extra grouping dimensions, and aggregates away any remaining dimensions you don't explicitly keep." The last part - implicit aggregation of "unhandled" dimensions - is the main risk.

---

## 2. SYNTAX AND ROLES

### 2.1 General syntax

```
Source[BY Method: SourceDim1, SourceDim2 -> MappingOrProperty1, MappingOrProperty2, ExtraDimOrProp1, ExtraDimOrProp2]
```

| Element | Role |
|--------|------|
| Source | Metric or list expression you start from. |
| Method | Any valid BY aggregation or allocation method (see below). |
| SourceDim1, SourceDim2 (left of `->`) | Dimensions in Source that you intend to replace via mappings. |
| MappingOrProperty\* (immediately after `->`) | One or more mapping metrics (dimension-typed metrics) or dimension properties (e.g. `Country.Region`) that define how to derive new dimensions from the source dimensions. |
| ExtraDimOrProp\* (after mappings) | Additional dimensions or properties you add for grouping (e.g. `Account.Market`, `Product.Family`). |

You can have multiple dimensions before `->` and multiple mappings/properties after `->`.

### 2.2 Aggregation methods (when replacing dimensions, N->1)

SUM, AVG, MIN, MAX, FIRSTNONBLANK, FIRSTNONZERO, FIRST, LASTNONBLANK, LASTNONZERO, LAST, ANY, ALL, COUNT, COUNTBLANK, COUNTALL, COUNTUNIQUE, TEXTLIST. If omitted when replacing dimensions, the default is SUM. (Supported data types follow Pigment's standard rules; see [formula_modifiers.md](./formula_modifiers.md) for full details.)

### 2.3 Allocation methods (when expanding 1->N or adding dimensions)

CONSTANT, SPLIT. If omitted when allocating, the default is CONSTANT.

---

## 3. DIMENSION RULES (CRITICAL BEHAVIOR)

Given Source has some dimensions, `BY ... ->` follows three rules.

### Rule 1 - Replace

Every dimension listed before `->` (SourceDim1, SourceDim2, ...) is:

- Removed from the result, and
- Replaced by the dimension(s) produced by the mappings (e.g. the type of a mapping metric, or a property's referenced dimension).

Example:

```pigment
'Revenue'[BY SUM: Country -> 'Country to Region Map']
```

Country is removed. The dimension from `'Country to Region Map'`'s type (e.g. Region) is added.

### Rule 2 - Add

Every dimension or property listed after `->` that is not serving as the "replacement target" is added to the result.

Examples:

```pigment
'Revenue'[BY SUM: Country -> 'Country to Region Map', Country.Currency]
```

Adds Currency (from `Country.Currency`) as an extra dimension.

```pigment
'Headcount'[BY CONSTANT: -> 'Employee Team Map']
```

No source dimension before `->`: no replacement. The mapping's type dimension (e.g. Team) is added to the result.

### Rule 3 - Aggregate away everything else

Any dimension that:

- Exists in Source, and
- Is not listed before `->` (to be replaced), and
- Is not explicitly added (e.g. via a property), and
- Is not inherently preserved by the mapping,

is aggregated away using the BY method.

Typical "at risk" dimensions: Version, Time dimensions (Month, Year, etc.), Scenario, and optional entity dimensions (e.g. Company, Currency) you forget to mention. If you don't explicitly account for them, they will be collapsed by the aggregation. This rule is the most common source of incorrect results.

---

## 4. WHEN TO USE ARROW (`->`) VS PLAIN BY

### 4.1 Use arrow (`->`) when...

- The mapping lives in a dimension-typed metric (e.g. Account x Version -> Segment, Country x Product -> Team).
- You need to transform from certain source dimensions to a target dimension and must control which dimensions are replaced (left of `->`), kept, or added.
- You use mapping metrics or multiple dimensions/properties in the BY clause.

Examples:

```pigment
'Account_revenue'[BY AVERAGE: Account -> 'Account Segment Map', Account.Market]
'Sales'[BY SUM: Country, Product -> 'Country Product to Team Map', Month]
```

### 4.2 Use plain BY (no arrow) when...

- The mapping is a simple dimension property, not a metric: `Account.Segment`, `Country.Region`, `Month.Quarter`.
- You're just moving along a straightforward hierarchy.

Examples:

```pigment
'Revenue'[BY SUM: Country.Region]
'Account_revenue'[BY AVERAGE: Account.Segment, Account.Market]
```

No `->` needed because the mapping and resulting dimensions are unambiguous and live in properties.

### 4.3 Sparsity

When a dimension-typed metric is used in BY (including as a mapping or grouping dimension), its sparsity is respected automatically. Do not add IF(ISBLANK(metric), BLANK, ...) guards - they are redundant and densify. See [Sparsity via BY + dimension-typed metrics](./formula_modifiers.md#sparsity-via-by--dimension-typed-metrics) in formula_modifiers.md.

---

## 5. CORE PATTERN EXAMPLES

### 5.1 Aggregation using a mapping metric

Goal: Aggregate Sales from Country to Region, keeping Product and Month.

- Setup: Sales dims = Country, Product, Month. `'Country to Region Map'`: dims = Country, type = Dimension(Region).
- Formula:

```pigment
'Sales'[BY SUM: Country -> 'Country to Region Map', Product, Month]
```

Country is replaced by Region via the mapping metric. Product and Month are explicitly kept. Result dims: Region, Product, Month.

### 5.2 Allocation using a mapping metric

Goal: Allocate Region_budget down to Countries via a mapping metric.

- Setup: Region_budget dims = Region, Year. `'Region to Country Map'`: dims = Region, Country, type = Dimension(Country) or numeric weights.
- Formula:

```pigment
'Region_budget'[BY CONSTANT: Region -> 'Region to Country Map', Country]
```

Region is replaced by Country. Year is preserved. CONSTANT copies region budget across mapped countries. Result dims: Country, Year.

### 5.3 Adding a dimension without replacing (classification / filtering)

Goal: Add Team as an extra dimension to a metric defined on Product x Country, without removing existing dimensions.

- Setup: Volume dims = Product, Country, Month. `'Product Country to Team Map'`: dims = Product, Country, type = Dimension(Team).
- Formula:

```pigment
'Volume'[BY CONSTANT: -> 'Product Country to Team Map']
```

No source dims before `->`: no replacement. Team is added. Result dims: Product, Country, Team, Month.

---

## 6. COMMON PITFALL: UNINTENDED AGGREGATION (VERSION / TIME / SCENARIO)

Setup: Metric_X dims = Account, Version. `'Account to Segment Map'`: dims = Account, Version, type = Dimension(Segment). Account.Market property.

Correct intention: Metrics by Segment, Market, and Version.

Correct formula:

```pigment
Metric_X[BY COUNT: Account -> 'Account to Segment Map', Account.Market]
```

Account is replaced by Segment. Account.Market adds Market. Version is preserved (shared, not replaced). Result dims: Segment, Market, Version.

Wrong formula (over-aggregation):

```pigment
Metric_X[BY COUNT: 'Account to Segment Map', Account.Market]
```

Here, `Account` is not listed before `->`, so the replacement rule does not apply as intended. Version appears in the mapping metric but is never mentioned in the BY clause. According to Rule 3, Version is aggregated away. You effectively count (Account, Version) combinations per (Segment, Market), not distinct Accounts per (Segment, Market, Version). If most Accounts exist in multiple Versions, counts are inflated.

Principle: If a dimension exists in your source or mapping and you do not replace it (left of `->`), add it as a grouping dimension, or ensure it's preserved by shared structure, BY will aggregate over it.

---

## 7. CHECKLIST FOR USING BY ... ->

When designing or reviewing a formula with `BY ... ->`:

1. List all source dimensions - Write out dims of Source and all mapping metrics involved.
2. Decide for each source dimension: Replace -> put it before `->`. Keep as axis -> ensure it's present where needed and not listed before `->`. Add new/grouping dimension -> include as property or extra dim after `->`.
3. Watch for "silent" dims (Version, Time, Scenario, Company, Currency). If they must be in the result, ensure they're preserved; if not, confirm you intend to aggregate them away.
4. Choose the BY method - Pick the appropriate aggregation or allocation method from the supported list (see section 2 and [formula_modifiers.md](./formula_modifiers.md)).
5. Quick check: "What are the final dimensions of this expression?" If any expected axis is missing, revisit Rules 1-3.

---

## 8. SEE ALSO

- [formula_modifiers.md](./formula_modifiers.md) - Core documentation for BY, REMOVE, KEEP, etc., including full method lists and data type support.
- Lookup / mapping-pattern docs - For building and maintaining mapping metrics used with `->`.
- [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md) - Conceptual guidance on mapping metrics and dimension transformations.
