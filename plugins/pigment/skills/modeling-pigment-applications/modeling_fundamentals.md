# Pigment Core Concepts

## 1. General Vision: Pigment as a Multidimensional Engine

Pigment is an in-memory multidimensional engine designed for planning, simulation, and real-time analysis. It is built on four core principles:

- Everything is multidimensional: Metrics exist within a dimensional space, where a cell represents a combination of elements from a set of dimensions.

- Real-time calculations: Changes to inputs, parameters, or imports trigger instant recalculations of dependent formulas.

- Granular models + scenarios: Supports detailed models (transactions, employees) alongside native version/scenario support.

- Collaborative interface: Data is exposed through boards containing multi-metric tables, charts, and workflows.

---

## 2. Pigment Modeling Building Blocks

Pigment applications are built from four core components:

- Dimensions: Analysis axes containing items (Product, Employee, Month) with properties
- Metrics: Multidimensional grids for calculations, inputs, and reporting
- Transaction Lists: High-volume granular data storage (orders, invoices, movements)
- Tables: Containers organizing multiple metrics with shared dimensions for analysis

### 2.1 Dimensions and Properties

Dimensions are analysis axes (Month, Account, Product, Employee) containing items (rows) and Properties (columns).

#### Property Data Types

Properties can be Number, Boolean, Text, Date, or Dimension type (referencing another dimension).

Property Type Selection:

- Number: Monetary values, quantities, measurements, ratios
- Date: Temporal fields, timestamps
- Text: Free-form descriptive content
- Dimension: Categorical, hierarchical, reference fields that group/classify items
- Boolean: True/false flags

Selection Rule:

Use Dimension type when property values reference or categorize items (Department, Region, Category, fields ending in Id/Code). Use Text/Number/Date/Boolean for measures, attributes, and free-form content (Discount %, Lead time, descriptions).

#### Cardinality-Based Property Type Selection

Use data-driven cardinality analysis to determine property types:

Step 1: Calculate Cardinality Ratio

```
For each property:
  cardinality_ratio = (number of unique values) / (total number of rows)
```

Step 2: Apply Classification Rules

| Cardinality Pattern                           | Data Characteristics                                    | Property Type      | Action Required                                                        |
| --------------------------------------------- | ------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| Categorical (< 0.8 with repeating values) | Values repeat across rows, indicating categories/groups | Dimension      | Create parent dimension with unique values as items, then reference it |
| Numeric                                   | Numbers: integers, decimals, percentages, quantities    | Number/Integer | Use directly                                                           |
| Temporal                                  | Dates, timestamps, time values                          | Date           | Use directly                                                           |
| Binary                                    | True/false, yes/no, 0/1                                 | Boolean        | Use directly                                                           |
| High-cardinality (> 0.8, mostly unique)   | Unique per row, free-form text, descriptions            | Text           | Use directly                                                           |

Key Rule: If ANY value repeats across rows (ratio < 1.0), check if it's categorical. Even at 0.5-0.8 cardinality, repeating values indicate categories -> use Dimension type.

Step 3: Detect Hierarchical Patterns

Indicators that suggest Dimension type:

- Dot notation in property names (e.g., `Parent.Child`, `Group.Subgroup`)
- Property names ending in common grouping terms
- Values that represent categories, groups, or classifications

Step 4: Workflow for Dimension-Type Properties

When cardinality analysis indicates Dimension type:

1. Extract unique values from the property
2. Create parent dimension using those unique values as items
3. Reference parent dimension ID when creating child dimension property
4. Populate child dimension data

Example Cardinality Analysis:

| Property    | Unique Values | Total Rows | Ratio | Pattern              | Type          |
| ----------- | ------------- | ---------- | ----- | -------------------- | ------------- |
| Name        | 10            | 10         | 1.0   | Unique identifiers   | Text          |
| GroupA      | 4             | 10         | 0.4   | Repeating categories | Dimension |
| GroupB      | 7             | 10         | 0.7   | Repeating categories | Dimension |
| Rate        | 8             | 10         | 0.8   | Numeric measures     | Number        |
| Description | 10            | 10         | 1.0   | Free-form text       | Text          |

#### Other Property Considerations

Unique Properties: Dimensions can have properties marked as "unique" (e.g., Code, Name) to identify items for imports and integrations.

Calendar: Each application includes a calendar made up of time dimensions and properties. Always reuse these existing calendar dimensions instead of creating new ones to ensure consistency and optimal performance.

### 2.2 Metrics

Metrics are the central blocks for modeling, data input, calculation, and reporting. Like properties, a metric is defined by a data type (Number, Boolean, Text, Date, Dimension).

Metric Type Selection Guide:

- Number: Financial values, KPIs, quantities, forecasts, calculations
- Date: Milestones, deadlines, temporal tracking fields
- Text: Status indicators, categorical outputs, labels
- Dimension: Reference fields linking to dimension items
- Boolean: Flags, toggles, binary states

Anatomy of a Metric:

- Structure: The structure is defined by dimension lists creating a multidimensional grid (e.g., Country x Product x Month). Remember: transaction lists CANNOT be used as structural dimensions-only regular dimensions (dimension lists) are allowed.

- Data Input: Can be manual (overrides computed values), imported, or computed via formula.

- Scenarios: Tracks multiple versions of the same metric.

- Sparsity: Only relevant combinations store values; blanks are not stored.

Default Aggregators:

Metrics define how values aggregate across dimensions (Sum, Avg, Min, Max, Count, First/Last Non Blank).

Common Use Cases:

- Input & Calculation: Capturing assumptions and performing intermediate logic (e.g., seasonality adjustments, allocation rules).

- Reporting: KPIs, dashboards, and analytical views across multiple dimensions.

- Planning: Financial planning (budget, cash flow), workforce planning (headcount, capacity), supply chain planning (inventory, orders), sales planning (forecasts, quotas), and operational planning (utilization, resources).

### 2.3 Transaction Lists

Transaction Lists store granular, atomic records (e.g., invoices, orders, HR events, inventory movements) and act as the "fact tables" of the system.

Key Characteristics:

- Non-Structural: They cannot be used as structural dimensions in a Metric. WARNING: Critical: A metric must NEVER be dimensioned over a Transaction List. Transaction Lists are fundamentally different from Dimensions (dimension lists). They are data containers, not structural axes.

- High Volume: Designed to hold millions of rows, unlike standard Dimensions.

- No Unique ID: Unlike Dimensions, they do not require a unique identifier per item.

#### Dimension list vs Transaction list: impact on metrics

Common points: Both are types of Lists in Pigment. Both contain Items and can have Properties. Both organize and structure data in the model.

Differences:

- Dimension list: Defines the structure of your data (analysis axes: Country, Product, Month, etc.). Each Item must be unique. Can be used as dimensions in Metrics and Tables. Reusable across the Application.
- Transaction list: Stores events or transactional data (orders, HR records, accounting entries). Items do not need to be unique. Cannot be used as dimensions in Metrics-only referenced in formulas. Designed for high-volume, transactional data.

A Transaction List (TL) is not a dimension. It therefore cannot be a structural dimension of a metric. Only dimension lists can appear in a metric's structure. Transaction lists are referenced inside metric formulas to aggregate their properties toward dimensions (via the `BY` modifier).

Correct pattern: With a Transaction List `Sales` that has properties `Country` and `Month` (both of type Dimension) and a numeric property `Value`, the correct syntax for a metric that aggregates by Country and Month is:

```pigment
Sales.Value[BY SUM: Sales.Country, Sales.Month]
```

The metric is dimensioned by Country x Month (or by the dimensions referenced by those properties), and the formula references the TL and aggregates with BY.

Anti-pattern: Using the list itself as a dimension in BY:

```pigment
Sales.Value[BY SUM: Sales]  // BAD: Error: Sales is not a dimension
```

This causes a syntax error or invalid behavior: `Sales` is not a dimension, so you cannot aggregate "by Sales". You must list the TL's properties that are of type Dimension (or expressions such as `TIMEDIM(...)` for dates) in the BY clause.

Primary Usage:

- Data Imports: The main destination for granular ERP/CRM/data warehouse data.

- Aggregation: Data is rolled up into Metrics using formulas (e.g., `Orders.Amount [BY SUM: Orders.Product, Orders.Month]`).

- Drill-Down: Allows users to view underlying details contributing to aggregated metrics.

Best Practices:

- Never dimension a metric over a Transaction List. Unlike regular Dimensions (dimension lists), Transaction Lists cannot be used in a metric's dimensional structure. Only dimension lists can be structural elements of metrics.
- Use transaction lists for high-volume transactional data instead of creating massive dimensions
- Always aggregate transaction list data to metrics for analysis and reporting
- Consider versioning strategies when transaction data needs historical tracking

### 2.4 Tables

Tables are containers that group multiple metrics together, enabling unified analysis and consistent dimensional structure.

Key Characteristics:

- Shared Dimensions: All metrics in a table share at least a common dimension
- Calculated Items: Create derived rows/columns using formulas across table metrics
- Single View: Present related metrics together (Revenue, Cost, Margin in one table)

Primary Usage:

- Financial Statements: P&L, Balance Sheet, Cash Flow with multiple line items
- Planning Models: Combine inputs, calculations, and outputs in one structure
- Reporting: Multi-metric dashboards with consistent dimensional breakdown

Table vs Standalone Metrics:

| Aspect               | Table                                     | Standalone Metrics                     |
| -------------------- | ----------------------------------------- | -------------------------------------- |
| Structure        | Shared dimensions across all metrics      | Each metric has independent dimensions |
| Calculated Items | Formula-based rows/columns across metrics | Not available                          |
| Presentation     | Unified view of related metrics           | Individual metric views                |
| Use Case         | Financial models, complex reports         | Simple KPIs, intermediate calculations |

Best Practices:

- Use tables for metrics that belong together logically (P&L Metrics)
- Leverage calculated items for derived metrics (Revenue - Cost = Margin)
- Keep intermediate calculations as standalone metrics, not in reporting tables

---

## 3. Sparsity: Core Engine Principle

Pigment is a sparse engine: it only stores and processes cells with actual values. Empty cells remain blank (not zeros or FALSE).

Core principle: Only relevant dimensional combinations carry values.

Why it matters:

- Not every product sells in every country in every period
- Not every employee works in every department
- Sparse storage enables billions of potential cells with only millions actually stored

Advantages over dense engines:

- Faster calculations (only populated cells processed)
- Better scalability (less storage)
- No dimension limits (competitors often cap at 10-12 dimensions)

Working with sparsity:

- Use `IFDEFINED` - Checks values exist without densifying
- Avoid `ISBLANK` - Returns TRUE/FALSE for ALL cells, creates density
- Leave ELSE blank - `IF(condition, value)` without ELSE preserves sparsity
- Avoid `IF(..., 0)` patterns - Fills sparse cells unnecessarily

For detailed performance optimization: See [modeling_performance_considerations.md](./modeling_performance_considerations.md)
