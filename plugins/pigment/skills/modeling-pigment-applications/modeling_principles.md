# Become a Pigment Pro: Modeling Principles & Palette


## Proper operation ordering
Modeling involves CRUD operations performed in the correct order (solve sub-components, then create target with sub-components assigned).
When constructing a target block -> check if the target sub-components exist -> if they do not exist, create them -> finally create the target with the sub-components assigned.

This avoids creating blocks and then modifying them.

For example:
- When a new dimension/list is needed with properties that clearly represent entities (e.g. Product, Customer, Country, Region, SKU, Store, Employee), you must:
First, search for any existing dimensions that match or are closely related.
If none exist, create new dimensions for these entities.
Then make the properties Dimension-typed referencing those new dimensions.

- When creating a metric. Check if its assigned dimensions exist. Create those which do not exist. Then, create the target metric with dimensions assigned.

Resolving objects in the live application: Reading skills and using `grep` on documentation is not enough to know which metrics, lists, and properties exist in the user's workspace or to obtain their IDs. Use `tool:search` (Application Expert)-the intended, fast path to retrieve workspace inventory and disambiguate blocks; combine with `kind` / `regexp` filters when several names are similar.

## 1. Folder Structure

Never create blocks in "No Folder". Every new block (metric, dimension list, transaction list, table) must be created in an explicit folder. "No Folder" is a system default placeholder, not a valid target; blocks left there are hard to find and clutter the application. Before creating any block, determine the target folder and create (or assign) the block there. For how to choose the right folder and where to place each block type, see [Working with Folders](./modeling_working_with_folders.md).

For comprehensive guidance on folder structure and organization, see [Working with Folders](./modeling_working_with_folders.md).

---

## 2. The Library Folder: Sharing Metrics

The Library folder helps track data flow and manages security between applications.

- Push Metrics: Sanitized output metrics shared _to_ other applications. Name with `PUSH_` prefix (see [Naming Conventions - Metrics](./modeling_naming_conventions.md#metrics)).

- Pull Metrics: Data received _from_ other applications. Name with `PULL_` prefix (see [Naming Conventions - Metrics](./modeling_naming_conventions.md#metrics)).

Process for Sharing:

1.  Duplicate the metric to be shared and rename with `PUSH_` prefix.

2.  Move to the Library folder and replace the formula with a reference to the original metric.

3.  Sanitize: Use `REMOVE` modifiers to strip dimensions not needed outside the app.

4.  Share: Toggle "Share this Block" in settings.

5.  Pulling: In the destination app, create a `PULL_` metric referencing the shared metric and use `RESETACCESSRIGHTS()` to ensure users can see the data.

---

## 3. Naming Conventions

Consistent naming aids navigation and formula writing. When you create blocks, use the current application's naming conventions in priority. Boards (Pigment dashboards) have their own folders; do not create a block folder for Boards.

For Applications, Folders, Blocks (metrics and lists), Tables, and Boards naming-including numeric prefixes, metric prefixes (e.g. PUSH_, PULL_, CALC_, INPUT_), and the [TBL] table prefix-see [Naming Conventions](./modeling_naming_conventions.md).

---

## 4. Formula Best Practices

- Formatting: Use line breaks, tabs, and comments (`//`) to make formulas readable.

- Structure: Indent sub-calculations and end parentheses at the start of a new line.

Deployment-safe and maintainable formulas

MP02 (hard constraint): Do not hard-code values or dimension items in formulas - especially on Time and Version. Do not use `DATE(...)` for planning period bounds or embed fixed periods in metric names. Never write `Dimension."Item"` in formulas; use a `VAR_` input metric of type Dimension or Date, or a structural boolean (e.g. IsActual).

When a formula depends on a specific member: (1) Create a `VAR_` input metric of type Dimension. (2) Set its default to the item - the only place the literal may appear. (3) Reference the metric in formulas. (4) Expose it on a Board. For Version semantics (actual vs plan), prefer IsActual / `'Version Type'` - see `skill:planning-cycles-pigment-applications`.

Metric names: Use relative temporal labels (`'Next Period Forecast'`, `'Budget Current Year'`) - not absolute years or months (`Forecast 2026`). User mentions of a period in the request are context; do not copy them into formulas or names.

Exceptions: User may explicitly accept a one-off hard-code after you propose the compliant alternative. Stable type/class/category dimensions may stay hard-coded in formulas (e.g. `'FX Rate Types'."AVG"`) - not Time, Version, countries, or planning periods.

See MP02 - No Hard-Coding (section 8). Formula patterns: `skill:writing-pigment-formulas` ([formula_modifiers](../writing-pigment-formulas/formula_modifiers.md), [formula_writing_workflow](../writing-pigment-formulas/formula_writing_workflow.md)).

---

## 5. Data Loading: Where does it go?

- Transaction Lists: For transactional data (multiple fields, frequent reloads, generated IDs). Examples: Order transactions, inventory movements, customer interactions, employee events.

- Dimension Lists: For Meta Data (Products, Customers, Suppliers, Warehouses, Employees, Accounts).

- Metrics: For analytical data already structured by dimensions (e.g., Sales by Product x Region x Month, Inventory levels by Warehouse x Product x Week). A metric must never be dimensioned over a Transaction List-only dimension lists define metric structure; see [modeling_fundamentals](./modeling_fundamentals.md) for details.

---

## 6. Multi-Application Architecture

Using multiple applications (Distributed Planning) allows for segregation of duty, cleaner models, and different planning cadences.

The Hub:
A mandatory application containing shared Dimensions (Time, Country, etc.) and central settings (FX rates). It acts as the single source of truth.

For comprehensive guidance on multi-application architecture and the Hub pattern, see [Modeling Architecture Design](./modeling_architecture_design.md).

---

## 7. Multi-Dimensional Modeling

Pigment uses modifiers to handle dimension mismatches between source and target metrics.

- Aggregation: Use `[BY SUM: Dimension]` to aggregate data (e.g., Employee -> Country).

- Allocation: Use `[BY CONSTANT: Dimension]` or `[ADD CONSTANT: Dimension]` to apply a value across a new dimension.

- Mapping: Use `[BY: Mapping_Metric]` when transforming dimensions based on a relationship (e.g., Shipping Rate by Region applied to Warehouse, or Discount Rate by Customer Segment applied to Order).

- Remove: Use `[REMOVE SUM: Dimension]` to strip a dimension from the structure.

---

## 8. Pigment Modeling Best Practices Rules

The Pigment Modeling Best Practices consists of 28 rules organized into three categories: MG (Modeling in General), MS (Modeling for Speed), and MP (Modeling for Posterity).

### MG - Modeling in General

#### MG01 - Explicit Dimensions: Always Define Dimension Alignment

Always use explicit modifiers when the grain or dimensions differ between source and target. In BY, specify only the dimensions you are transforming (aggregating or allocating); do not re-list dimensions that are already on the metric and unchanged (avoid over-explicit BY).

For comprehensive guidance on dimension alignment, modifiers, and formula writing, see [Writing Pigment Formulas - Formula Modifiers](../writing-pigment-formulas/formula_modifiers.md).

#### MG02 - Structure: Keep Dimensions Minimal

The dimensional structure of every Metric is of capital importance. Give it a lot of thought. It needs to have the right Dimensions, no more. If a Metric has more than 8-10 Dimensions, check if you really need all those Dimensions.

Questions to ask:
- Are they needed for reporting purposes?
- Are they independent Dimensions, or can we leverage Dimension Properties instead?
- Is the user experience still good with so many selectors?
- Are the calculations performant enough with so many Dimensions?

Dimension Properties as Dimensions:

When creating a dimension with properties, never default all properties to Text. Prefer creating reusable property dimensions over Text properties for categorical or enumerable fields. Then assign those property dimensions to your target dimensions.

Workflow:
- Create the dimension-properties first (or reuse existing ones)
- Then create your target dimensions and assign them their properties

Use Dimension Properties instead:

Using Properties of existing Dimensions as Dimensions in the Pivot or Page selector is unlimited, and this is the preferred option whenever possible.

Examples:
- Metrics by Employee: Contract Type isn't required in the structure if it's a Property of the Employee Dimension
- Metrics by Product: Category isn't required in the structure if Category is a Property of the Product Dimension
- Metrics by Warehouse: Region isn't required in the structure if Region is a Property of the Warehouse Dimension
- Metric by Month: Year Dimension isn't required in its structure as it's a Property of Month Dimension

#### MG04 - Justify Metrics: Think Twice Before Creating

Leverage existing Metrics:

Before creating a new Metric, check if existing Metrics, Views, or Properties are available to meet your needs. This avoids having unnecessary Metrics that consume storage and resources, and require maintenance and documentation.

Justify Metric creation:

You should only create a Metric when it's essential:
- For importing or inputting data
- To break down complex calculations for clarity or performance
- For specific Boards or reporting needs
- To share and use in other Applications

Unnecessary Metrics creation leads to heavy, hard-to-audit models and hidden maintenance costs.

When Views Can Replace Metrics: Avoid "Display-Only" Metrics

Modeling and Views are different teams, but in practice modeling and reporting are tightly linked and shouldn't be designed in isolation. Many requirements that seem to require new Metrics can actually be handled by Views, which are more flexible, performant, and easier to maintain.

Critical Principle: Only create Metrics when the dimensionality or calculation is needed for downstream calculations. If the requirement is purely for display or visualization, use Views instead.

Common Anti-Patterns: Creating Metrics That Views Can Handle

1. Aggregated Metrics "For Display Only"

Anti-Pattern:
- Revenue metric is structured by `Country x Month`
- Country dimension has a `Region` property (dimension-type)
- Modeler creates a new metric: `Revenue by Region` with formula `Revenue [BY: Country.Region]`
- This metric is only used for visualization, not in any downstream calculations

Correct Approach:
- Keep Revenue metric structure as `Country x Month`
- In Views, add `Country.Region` to pages, and to rows or columns
- Views automatically aggregate Revenue by Region using the metric's default aggregator
- No additional metric needed

Why This Matters:
- Views can pivot by dimension-type properties without changing metric structure
- Multiple aggregation levels can be shown in different Views of the same metric
- Metric structure remains minimal and performant
- See `skill:creating-and-editing-pigment-views` for details

2. Percentages, Variations, and Cumulates "For Display Only"

Anti-Pattern:
- Creating metrics like `EBIT%`, `EBIT Growth YoY`, or `Cumulated Revenue` when these are only needed for display
- These metrics are not referenced in any downstream calculations

Correct Approach:
- For percentage-like metrics built from two base metrics (a ratio A / B, or relative variance / growth such as (A - B) / B): create or reuse a dedicated Metric with a Pigment formula (for example GM% = Gross Margin / Revenue), add it to the Table together with both operand Metrics, then use Views on Tables with Advanced Aggregators on that ratio Metric everywhere it must roll up correctly. That order (Metric on the Table first, then View configuration) is the default for cross-metric ratios and relative variances.
- Show value as has many modes. Only % of ... metric and % growth from ... metric overlap the rollup behavior that Advanced Aggregators (Ratio / Growth) address-use Advanced Aggregators on Table views for those cases instead of those two SVA modes. All other Show value as options (cumulative, % of grand total, % of parent, and the rest) stay on Show value as.
- Calculated Items suit derived rows or columns on a dimension (for example a total row). They are not a substitute for a dedicated ratio Metric between two Metrics: do not replace the ratio Metric with a Calculated Item on the value axis, duplicate an operand Metric as an extra value field, or try to "fix" rollups by putting Advanced Aggregators on that Calculated Item.
- See [MG09 - Ratios and percentage-like metrics: create the Metric, then Advanced Aggregators](#mg09---ratios-and-percentage-like-metrics-create-the-metric-then-advanced-aggregators) and [View design process](../creating-and-editing-pigment-views/view_design_process.md) for the workflow.

Examples of View-Based Calculations:
- Two-metric ratio, rate, percentage, growth, or variance on a Table: dedicated ratio Metric with formula on the Table, then View on a Table -> Advanced Aggregators (Ratio, Growth, or Absolute growth) on that ratio Metric with operands on the two base Metrics (see MG09). Prefer this over Show value as -> % of ... metric or % growth from ... metric for those rollups.
- % of grand total, % of parent, and other share-of-axis modes: Show value as (not Advanced Aggregators)
- Cumulative and other SVA modes: Show value as as appropriate
- Other derived dimension logic: Calculated Items where appropriate

3. Mapped Dimensions for Reporting

Anti-Pattern:
- Creating aggregated metrics when the requirement is to report across different dimensional structures
- Example: Creating `Revenue by Region` metric when Revenue is by `Country x Month` and Country has Region property

Correct Approach:
- When the parent-child relationship varies by period, create a mapping metric and use Mapped Dimensions in Views (Joined Pivot)
- When the relationship is static, use dimension-type properties in Views for grouping without changing metric structure
- Multiple Views can show the same metric at different aggregation levels

4. Filtering and Sorting Requirements

Anti-Pattern:
- Creating separate metrics for filtered or sorted views
- Example: Creating `Top 10 Products Revenue` metric

Correct Approach:
- Use View filters (by items or by value) to restrict visible data
- Use View sorting to order data by metric value or properties
- Use "top N" or "bottom N" filters for ranking analysis
- See `skill:creating-and-editing-pigment-views`

5. Variance Analysis Considerations

When designing for variance analysis (Actuals vs. Plan, Plan vs. Budget, etc.), consider:
- Are Actuals and Plan data in the same metrics or separate?
- What type of variance analysis is typically done?
- Can Views handle the comparison using Show Value As or Calculated Items?

Decision Framework: Metric vs. View

Create a Metric when:
- GOOD: Data needs to be imported or input
- GOOD: Calculation is needed for downstream formulas
- GOOD: Metric needs to be shared across Applications
- GOOD: Calculation logic is complex and benefits from being in the model
- GOOD: Dimensionality is required for calculation accuracy

Use a View when:
- GOOD: Requirement is purely for display/visualization
- GOOD: Aggregation can be done via dimension-type properties
- GOOD: Calculation is a percentage, ratio, growth, or variance
- GOOD: Filtering or sorting is the main requirement
- GOOD: Multiple aggregation levels are needed from the same base metric

Key View Capabilities to Leverage

Before creating a metric, consider if Views can handle the requirement using:
- Dimension-type properties for hierarchical reporting (see `skill:creating-and-editing-pigment-views`)
- Advanced Aggregators on Views on Tables for two-metric ratios, percentages, and growth or relative variance-after the ratio Metric exists on the Table (see [MG09 - Ratios and percentage-like metrics: create the Metric, then Advanced Aggregators](#mg09---ratios-and-percentage-like-metrics-create-the-metric-then-advanced-aggregators) and `skill:creating-and-editing-pigment-views`)
- Calculated Items for derived dimension logic where they fit
- Filters for data restriction (by items, by value, top/bottom N) (see `skill:creating-and-editing-pigment-views`)
- Sorting for data ordering (by metric value, by property) (see `skill:creating-and-editing-pigment-views`)
- Page selectors for user-controlled filtering (see `skill:creating-and-editing-pigment-views`)

Reference Documentation

For comprehensive guidance on View capabilities, see:
- `skill:creating-and-editing-pigment-views` - Definitions, draft workflow, and where to read next
- `skill:creating-and-editing-pigment-views` - Step-by-step configuration (reuse, draft, validate)
- `skill:creating-and-editing-pigment-views` - Pivots, filters, and sorting; [Pivoting rules](../creating-and-editing-pigment-views/view_pivoting.md) and [Display modes](../creating-and-editing-pigment-views/view_display_modes.md) for layout and widget constraints

#### MG05 - Simple Flows: One-Way Data Flow

Ensure one-way data flow:

Design data to flow towards a central consolidation point that combines Actuals and Planning data for reporting on Boards. Reference the correct Block directly and use the dependency diagram to maintain clarity and simplicity.

For comprehensive guidance on financial statement modeling and data flow patterns, see [Core P&L reporting (Nexus pattern)](../solving-specific-use-cases/finance_nexus_financial_statements.md).

#### MG06 - Block Usage: Proper Role Assignment

Understanding Block roles is key in deciding which type of Block to use and when to use it. For definitions and characteristics of each block, see [modeling_fundamentals section 2 - Building Blocks](./modeling_fundamentals.md#2-pigment-modeling-building-blocks).

- Dimension: Represents business structure
- Transaction List: Handles transactional data loads
- Metric: Manages end-user inputs and calculation logic
- Table: Serves as the user interface for inputs and reporting, and is placed on Boards

You should manage end-user planning inputs and logic primarily within Metrics and Tables. Metrics offer the right Dimensions, scenario Applications, full auditability, and accurate execution. Reporting is based on Metrics. End-user inputs should only be used in Lists if there is a valid exceptional reason.

#### MG07 - Imports: Lists First, Metrics Second

Importing data into Lists offers greater flexibility. Lists allow you to create additional Properties for data cleaning and transformation. Importing data into a Metric and changing its structure can result in data loss. This is avoided when you import data into Lists.

Benefits of List imports:
- Importing into Lists as the TEXT data type allows you to extract codes from a chain of characters using functions like LEFT(), RIGHT(), CONTAIN(), and MID()
- You can then identify Dimension Items afterward using the ITEM() function
- Lists support scoped imports, enabling selective updating and cleaning of Dimension intersections

When Metric imports are useful:
- If you need to leverage the Clone data to feature
- To load historical planning data during implementation
- To import large volumes of non-transactional data with consistent structure that doesn't require Item creation or drill-down features (can significantly improve calculation speed)

Apart from these exceptions, always use Lists for data loading. This approach is safer, more powerful, and enhances model clarity for future audits.

#### MG08 - Iterative Functions: Use Only for Calculations

To support iterative calculations, Pigment provides two functions:

- PREVIOUS(): Creates an iterative calculation while referencing the same Metric
- PREVIOUSOF(): Creates an iterative calculation while referencing another Metric

Note: `PREVIOUSBASE()` is deprecated. Use `PREVIOUSOF()` instead.

These functions perform sequential calculations. For example, if PREVIOUS() is used on a Calendar Dimension, the calculation will first complete January before calculating February.

Critical rule: These functions are designed to be used for the purpose of performing iterative calculation only, and not to facilitate user inputs. Using PREVIOUS() and PREVIOUSOF() to project user input assumptions onto other Items prevents you from deleting initial input Items, and as a result complicates model maintenance.

Example: Setting assumptions for FY23 and calculating subsequent years prevents the deletion of FY23 from the Calendar Dimension. This contradicts the goal of keeping your Calendar as small as possible.

For comprehensive guidance on iterative calculations (PREVIOUS vs PREVIOUSOF, circular dependencies, configuration, when to use), see [Iterative Calculation (PREVIOUS & PREVIOUSOF)](../writing-pigment-formulas/functions_iterative_calculation.md). For performance optimization (subsetting, FILLFORWARD, CUMULATE), see [Performance - Iterative Calculations](../optimizing-pigment-performance/performance_iterative_calculations.md). For when and how to use List Subsets (including data-loss risks and safe patterns), see [List Subsets](./modeling_subsets.md).

#### MG09 - Ratios and percentage-like metrics: create the Metric, then Advanced Aggregators

The problem: A ratio Metric (A / B) or relative variance ((A - B) / B) evaluates correctly at the finest grain shown in the view. If the Table view rolls it up like an ordinary additive measure, aggregated totals are wrong (for example sum of ratios instead of ratio of sums).

Step 1 - Create or locate the ratio Metric. The ratio must be a real Pigment Metric with a formula (for example GM% = Gross Margin / Revenue). Add it to the Table with both operand Metrics. Avoid: duplicating an operand Metric as a second value field to simulate the ratio; using a Calculated Item on the value axis instead of that Metric for a cross-metric ratio; relying on Show value as -> % of ... metric or % growth from ... metric as the default substitute for Advanced Aggregators on Table views (those two SVA modes overlap the rollup shape but Advanced Aggregators are the explicit fix).

Step 2 - Configure Advanced Aggregators in each Table view where the ratio must roll up. Add value fields for the ratio Metric and both operand Metrics. Set Ratio, Growth, or Absolute growth on the ratio Metric's value field with the two operand value fields as operands (same A and B as in the formula). Apply on Rows, Columns, and Hidden dimensions aggregation as needed. Details: [View aggregators](../creating-and-editing-pigment-views/view_aggregators.md).

Show value as remains appropriate for many single-metric or axis-relative displays (cumulative, % of grand total, % of parent, YoY-style references where that mode fits, and other SVA options not listed here).

Agent rule (Tables only): When a View on a Table shows such a ratio or relative-variance Metric, you must verify the dedicated Metric exists (create it if not), ensure it and both operands are on the Table, then configure Advanced Aggregators as above. This does not apply to view types without Advanced Aggregators (such as Views on Metrics); use a Table view when correct rollups are required.

#### MG10 - Security: Start Restrictive

Pigment is most likely to contain sensitive information. Always start with the most restrictive security settings. Grant authorizations only when necessary and continuously evaluate the need for each permission. Regularly review and challenge the necessity of granted permissions to maintain a high level of security and minimize risks.

Key Principles:
- Use the Restrict domain feature
- Use the Group feature to give Members access to only the required Applications
- Give access to only relevant Boards per Role. Board permissions should be set to None for all non-Admin Roles
- Share the minimum number of Blocks in the Library. Regularly check the Library to ensure there aren't any unnecessary shared Blocks
- Setup centralized, clear, and robust access rights rules that can be easily audited

For comprehensive guidance on access rights and security, see:
- `skill:securing-pigment-applications` ([securing_access_rights.md](../securing-pigment-applications/securing_access_rights.md))
- [Performance - Access Rights](../optimizing-pigment-performance/performance_access_rights.md)

#### MG11 - Sharing: Only What's Necessary

Create targeted Metrics for sharing:

When sharing Application outputs, create dedicated Metrics to be shared and reused in different Applications. This establishes a single source of truth and reduces the risk of errors. Use clear and explicit naming for shared Metrics to avoid duplication and confusion.

Avoid unnecessary Dimensions:

Exclude unnecessary Dimensions from these shared Metrics to enhance security and simplify the Workspace. Regularly review and update shared Blocks in the Workspace Library. This practice maintains optimal organization, ensures data hygiene, reduces maintenance costs, and minimizes the risk of errors.

#### MG12 - Planning Cycle: Use Version Dimension

The Scenario feature that Pigment offers natively, as opposed to a classical Dimension that would be called Scenario or Version, is a robust tool designed to facilitate "What if?" analyses. It allows you to model each planning cycle exercise (Actual, Budget, Forecast) as separate Scenarios. It doesn't support cross-Scenario calculations or data referencing through formulas, but it allows for powerful comparisons between Scenario Snapshots and live data.

Recommendation: For more flexibility and to fully accommodate your planning needs, using a normal Dimension to model your planning cycle is recommended. Begin by creating a Version Dimension in your central hub Application. Incorporate this Dimension into your Metrics structure, either for input data (usually in Tables) or for building your calculation logic. Maintain a live version of data that is regularly updated, and couple it with the Clone data to functionality, which replicates inputs across various planning phases. Finally, configure read and write access rights to effectively manage visibility and editing permissions for the different planning stages.

ALWAYS read `skill:planning-cycles-pigment-applications` before structuring any planning metric. The Version Dimension is foundational: switchover semantics, the IsActual / IsPlan / IsVersion Boolean metrics, and Actual/Plan layering must be wired correctly upfront. Treat that skill as a required companion to this one, not an optional reference.

### MS - Modeling for Speed

Performance optimization rules. For comprehensive guidance, see:
- [Performance - Sparsity Deep Dive](../optimizing-pigment-performance/performance_sparsity_deep_dive.md) - MS01, MS02
- `skill:writing-pigment-formulas` - MS03, MS05, MS06, MS10
- [Iterative Calculation (PREVIOUS & PREVIOUSOF)](../writing-pigment-formulas/functions_iterative_calculation.md) - When and how to use PREVIOUS/PREVIOUSOF (MS10)
- [Performance - Iterative Calculations](../optimizing-pigment-performance/performance_iterative_calculations.md) - Optimizing iterative calculations (MS10)

Quick Reference:
- MS01 - Sparse Engine: Avoid `IF(..., 0)` or `ISBLANK` (which returns False) as they fill sparse cells with data. Use `ISDEFINED` or leave `ELSE` blank. For the underlying concept, see [Sparsity in modeling_fundamentals](./modeling_fundamentals.md#3-sparsity-core-engine-principle).
- MS02 - Cardinality: Minimize the number of items in dimensions used in metrics. High cardinality slows performance.
- MS03 - Calculate Once: Calculate a value in one metric and reference it elsewhere. Don't repeat formulas.
- MS04 - Aggregate Loads: Aggregate Transaction List data into a single `DATA_` staging metric, then reference that metric.
- MS05 - Scope: Filter data _early_ in the formula (using `FILTER` or `SELECT`) before aggregating.
- MS06 - Split Metrics: If a formula is too complex to read in one go, split it into multiple metrics to avoid timeouts.
- MS07 - Monitor Time: Formulas should take seconds. If >15 seconds, investigate.
- MS08 - Small Dimensions: Keep Calendars and Versions lean. Archive historical data to static snapshots.
- MS09 - Dependency: Understand that independent metrics calculate in parallel. Break live calculations (e.g., disable Auto Save) if necessary.
- MS10 - Heavy Functions: Avoid heavy functions like `CUMULATE`, `MOVINGSUM`, or text manipulation (`FIND`, `SUBSTITUTE`) on large lists.
- MS11 - Engine vs. View: Prefer Calculated Items and Show value as where they replace redundant metrics-but for two-metric ratio or relative-variance rollups on Tables, create the ratio Metric on the Table first and use Advanced Aggregators (not SVA's % of ... metric or % growth from ... metric for that job, and not duplicate value fields or Calculated Items on the value axis as a substitute). Keep all other SVA modes on Show value as where they apply.
- MS12 - Split Access Rights: Split security rules into smaller, dimension-specific metrics rather than one complex rule.

### MP - Modeling for Posterity

- MP01 - Readability: Indent formulas and use comments (`//` or `/* */`).

- MP02 - No Hard-Coding: Hard constraint - see section 4.

- MP03 - Naming: Adhere strictly to the naming convention.

- MP04 - Limit Views: Keep public views under 10 per block.

- MP05 - Admin Boards: Create documentation boards for maintenance tasks (e.g., "Start new planning cycle").

- MP06 - Hygiene: Regularly delete unused apps, boards, snapshots, and inactive members.

- MP07 - Dynamic Variables: Use `VAR_` metrics for workspace-wide variables (e.g., Current Month).

- MP08 - Production Changes: Use "Test & Deploy" or duplicate metrics to test new formulas before replacing the old ones.

- MP09 - Next Modeler: Build simply and document via text widgets on boards so others can understand the model.

- MP10 - Direct Security: Apply Access Rights directly to blocks/lists rather than relying on inheritance, which is harder to audit.

- MP11 - Import Best Practices: Load unique IDs, remove zeros, map dates twice (as date and time dimension), and scope imports.

---

## 9. When Test & Deploy is used

When Test & Deploy is enabled (deployment across environments, e.g. Dev -> Prod), MP02 (section 4) is always enforced - hard-coded dimension items break deployment across environments. Test & Deploy adds one additional hard constraint (Rule 2 below). Determine Test & Deploy context before applying Rule 2.

### MP02 - always enforced

MP02 applies whether or not Test & Deploy is active. See section 4.

Disallowed patterns (never emit in formulas unless the user explicitly overrides after you propose a `VAR_` alternative):

```pigment
Country."France"
IF(Country = Country."France", 1, 0)
'Sales'[FILTER: Country = Country."France"]
IF(Country = Country."France", 'Revenue', 0)
'Revenue'[SELECT SUM: Country = Country."France"]
IF(Version = Version."Budget", 'Actual_Revenue', 'Plan_Revenue')
'Revenue'[FILTER: Country = Country."France" OR Country = Country."UK"]
```

Agent behavior: Refuse to produce or keep such formulas. Propose compliant alternatives per section 4 (`VAR_` metrics, property-based filters, IsActual).

### Determining Test & Deploy context

- Test & Deploy status: Consider Test & Deploy active when the user or application context indicates use of Test & Deploy, or when the user mentions deploying from Dev/Staging to Production or working across multiple environments. If unclear, assume T&D is active when the user refers to multiple environments or deployment.
- Dimension connectivity (for Rule 2): Use information from the user or application context to know whether each dimension is connected (synchronized across environments) or disconnected (items may differ between environments). If connectivity is unknown and Rule 2 might apply, ask the user before creating or modifying a property.

### Rule enforcement

| Test & Deploy status | Enforcement |
| -------------------- | ----------- |
| Active           | MP02 (section 4) is a hard constraint. Rule 2 is a hard constraint. |
| Not active       | MP02 (section 4) is still a hard constraint. Rule 2 does not apply. |

### Rule 2 - No disconnected dimension as property type on a connected dimension (T&D only)

Terminology: Connected and disconnected describe whether items in the dimension are synchronized across environments (connected) or may differ between them (disconnected).

When Test & Deploy is active, a disconnected dimension must not be used as the type of a property on a connected dimension. Using a disconnected dimension as the property type on a connected one can cause deployment failures or inconsistent structure across environments.

Agent behavior: When T&D is active and you create or modify dimension properties, ensure the property type is not a disconnected dimension when the host dimension is connected. If whether items are connected or disconnected is unknown, ask the user before proceeding.
