# Excel -> Pigment Modeling Specification

## Purpose

Take one or more Excel files (of any complexity) and produce a comprehensive, implementation-ready
modeling specification for rebuilding the entire workbook as a Pigment application. The spec must
be detailed enough that a Pigment modeler can build the app without referring back to the Excel.

## Why This Skill Exists

Excel models used in enterprise planning are often messy, undocumented, and fragile. They contain
implicit dimensional structures, hidden cross-references, hardcoded assumptions, and accumulated
technical debt. Converting them to Pigment requires careful reverse-engineering - not just listing
the sheets, but understanding the *intent* behind the structure and mapping it to Pigment's
multidimensional paradigm. This skill codifies that reverse-engineering process.

---

## Workflow Overview

The workflow has 4 phases. Complete them in order. Each phase produces artifacts that feed the next.

```
Phase 1: DISCOVERY     -> Inventory the Excel structure
Phase 2: ANALYSIS      -> Identify dimensions, data and calculation flows, errors
Phase 3: MAPPING       -> Map Excel concepts and data to Pigment
Phase 4: SPECIFICATION -> Write the detailed modeling spec
```

---

## Phase 1: DISCOVERY - Inventory the Excel Structure

Goal: Build a complete picture of what's in the file before making any modeling decisions.

### 1.1 Read the Excel File(s)

For each sheet, including hidden, collect:

- Sheet metadata: name, dimensions (used range), row/column count
- Sheet intent: brief description of the sheet role
- Merged cells: count and locations (merged cells are a strong signal of reporting/dashboard sheets)
- Headers: identify header rows (may not be row 1 - look for the first row where most cells are non-empty strings)
- Data types per column: sample 20+ rows to determine types (numeric, text, date, boolean, dimension)
- Formulas: count, complexity, cross-sheet references
- Named ranges: list all, flag any that resolve to #REF!
- Data validation / dropdowns: list ranges with validation rules
- Independent grids on this sheet: note every separate contiguous data or report block (different headers, spacing, or unrelated topics); assign a region id for the spec (section 1.2)
- Charts: count embedded chart objects; note sheet vs. regions (section 1.2). For each, capture section 1.4: intention, format, source data range.

### 1.2 Classify Each Sheet

Assign each sheet to one of these categories:

| Category | Description | Pigment mapping |
|---|---|---|
| DATA_SOURCE | Flat tabular data with headers and rows (imports from ERP, HRIS, etc.) | Transaction List or Dimension import |
| REFERENTIAL | Lookup/mapping table (accounts, org hierarchy, FTE types) | Dimension List with properties |
| CALCULATION | Sheet dominated by formulas computing intermediate or final results | Metrics with formulas |
| REPORTING | Dashboard/summary with merged cells, charts, formatting | Board / Table / View |
| INPUT | Cells meant for user entry (highlighted, validated, sparsely filled) | Input Metrics on Boards |
| PARAMETERS | Configuration sheet (reference year, dropdown lists, settings) | Settings folder, Dimension items, or Input metrics |
| NAVIGATION | Menu/separator sheet | For navigation boards |
| MACRO_SUPPORT | Objective, Role, VBA timing, logging, or macro control sheet | Modeled only if core calculation/validation process  |

Heuristics for classification:
- If >80% of non-empty cells are formulas -> CALCULATION
- If merged cells > 10 and sheet has "Reporting", "Overview", "Summary", "Dashboard" -> REPORTING
- If sheet has flat headers in row 1 and uniform data below -> DATA_SOURCE or REFERENTIAL
- If sheet name starts with "Source_" or "Data" -> DATA_SOURCE
- If sheet name contains "Master Data", "Ref_", "List", "Mapping" -> REFERENTIAL
- If sheet has data validation or highlighted input areas -> INPUT
- If sheet contains navigation buttons or links -> NAVIGATION
- If sheet has embedded charts (see section 1.4) -> strong signal for REPORTING (or mixed regions)

Multiple grids on one tab. A single sheet may contain several independent data or report areas (e.g. two unrelated tables one under the other, a small parameters block next to a ledger, one pivoted block and one flat table on the same tab). Do not assume *one sheet -> one* Pigment Transaction List, metric, or Table. Split the tab into logical regions (give each a stable id in the spec, e.g. `SheetName + cell range` or `SheetName::Region_A`), classify each region separately (it may be DATA_SOURCE, pivoted facts, REPORTING, etc.), and plan separate TLs, metrics, Tables, charts, and/or Boards as needed. Data source imports and build order in the written spec (Phase 4 - Excel migration annex and Implementation) apply per region, not only per sheet name.

### 1.3 Map Cross-Sheet Dependencies

Build a dependency graph:
- For each formula with "!", record source_sheet -> target_sheet
- For named ranges, record which sheets reference which
- Identify circular dependencies (rare but critical)
- Identify the "flow direction": data sources -> calculations -> reporting

Output: a dependency summary showing which sheets feed which.

### 1.4 Chart inventory (for REPORTING / dashboards)

When a sheet contains embedded charts, record each chart in a compact list. section 3.6 and spec section 8 carry Pigment design (pivot, metrics, board placement).

For each chart:

- Intention: what it is meant to convey (e.g. "revenue by month", "mix by product", Actual vs Budget by cost center).
- Format: Excel chart type (line, column, bar, stacked column, pie, doughnut, area, scatter, combo, waterfall, ...).
- Source data range: workbook reference for the chart's data - cell range(s), pivot chart source, or named range(s) Excel binds to the series and categories.

---

## Phase 2: ANALYSIS - Identify Dimensions, Data Flows, Errors

### 2.1 Extract Candidate Dimensions

Scan DATA_SOURCE and REFERENTIAL sheets for columns that are categorical (repeating values), per logical region when a tab holds multiple grids (section 1.2).
Apply the cardinality analysis from Pigment fundamentals:

```
For each column:
  cardinality_ratio = unique_values / total_rows
  
  If ratio < 0.8 and values repeat -> candidate Dimension
  If ratio approx 1.0 and text         -> candidate Text property
  If numeric                       -> candidate Number property / Metric value
  If date                          -> candidate Date property
  If boolean or yes/no             -> candidate Boolean property
```

Cross-validate dimensions across sheets. If "Cost Center" appears as a column in 5 different source sheets,
it's almost certainly a dimension. If "Cost Center" also appears in a REFERENTIAL sheet with properties like
"Cost Center name", "Entity", "Division" -> that's the dimension definition.

Canonical names: master data wins. When different Excel labels refer to the same entity (abbreviation vs full name, "Region A" in a DATA_SOURCE vs "Region A - North" on a REFERENTIAL row, typos, or legacy synonyms), do not treat each spelling as a different Pigment item. Pick the name (or code) defined on the master / REFERENTIAL sheet as the single canonical value for specs, imports, `tool:add_list_items` rows, and `tool:set_metric_input` coordinates. List every alias discovered in the workbook in the spec (Excel raw value -> canonical master name) so execution never forks duplicate members.

### 2.2 Identify Hierarchies

Look for patterns that indicate parent-child hierarchies:
- REFERENTIAL sheets with columns like "L4 -> L3 -> L2 -> L1 -> Account" (multi-level account hierarchy)
- Organization tables with "Cost Center -> Entity -> Division"
- Named ranges with "List_xxx" that enumerate dimension items
- Columns whose values are a subset of another column's values

### 2.3 Identify the Time Dimension

Look for:
- Column headers that are years (2025, 2026, ...) or months (Jan, Feb, Jul-25, ...)
- Columns named "Year", "Month", "Quarter", "Period"
- Named ranges referencing years
- Fiscal year patterns (FY26, Q1/26, H1)

Determine the time granularity needed: annual, quarterly, monthly, or mixed.
Note any fiscal year offsets (e.g., FY starting in July).

### 2.4 Identify Metrics vs Properties

Long-format / "database" columns (each numeric column is one measure or each row adds one fact with dimension values in dedicated columns):

- If the column represents a *measure* that varies by the dimensional combinations (Amount, FTE count, Cost) and each row is a grain you will keep in Pigment -> it is usually modeled as a Property (Dimension or Transaction) and aggregated into metrics with formulas
- If the column represents a *fixed attribute* of a dimension item (Account code, Sort order) -> it's a Property on a Dimension or on list items.

Pivoted / "matrix" layouts (two categorical axes: one dimension along rows, another along columns - e.g. products down, months across - with numeric values only in the interior cells). A sheet may contain more than one such block; treat each as its own mapping target (section 1.2).

- This shape matches a Metric or Table view in Pigment: row header dimension x column header dimension (often including time in the column headers).
- The practical load path for that grid is usually `set_metric_input`: each non-empty cell becomes a coordinate (row item, column item) plus a value. See section 3.8 for volume: very large grids may require multiple `set_metric_input` calls (chunking) or a redesign (unpivot -> Transaction List + formulas).

Table-shaped DATA_SOURCE (header row + many data rows; every column is a field, no measure "spread" across a second dimension in the header row); scope to one logical region if the sheet has several (section 1.2):

- Model as Transaction List (or Dimension items + properties when it is master data).
- To import rows: use `add_list_items` only - successive tool calls with at most 100 rows per `rows` payload until all Excel rows are loaded (large sheets require many batches).

Calculated properties on dimension or transaction lists (formula columns on REFERENTIAL or table-shaped sheets, not only CALCULATION sheets):

- Inspect each column: if every populated cell uses the same formula (same structure; only row-relative references differ), create the property, exclude that column from import, and set a list property formula once input properties on that list exist.
- If formulas vary materially across rows (different functions, layouts, or row-specific logic), do not force one property formula - import the column values with `add_list_items` as an input property instead.
- In the spec, label each list property input or calculated (with the Pigment formula when calculated).

### 2.5 Detect Errors and Red Flags

This is critical for building user trust. Actively look for:

| Error type | How to detect | Severity |
|---|---|---|
| #REF! in named ranges | Named range attr_text contains "#REF!" | HIGH - broken references, likely from deleted sheets |
| #REF! in formulas | Cell values containing "#REF!" | HIGH - broken calculations |
| #DIV/0!, #VALUE!, #NAME? | Cell values or formula errors | MEDIUM - formula bugs |
| "Check to zero" cells != 0 | Cells labeled "check to zero" or "control" with non-zero values | HIGH - model doesn't balance |
| Missing dimension values | Null/empty cells in categorical columns | MEDIUM - incomplete data |
| Inconsistent naming | Same entity spelled differently across sheets (e.g., "Nearshoring PL" vs "Nearshoring Poland") | MEDIUM - must normalize to the master / REFERENTIAL name (or code) before import; see section 2.1 |
| Orphan sheets | Sheets not referenced by any formula and not referencing others | LOW - possibly obsolete |
| Excessive merged cells | >50 merged cell ranges in a sheet | LOW - complicates parsing |
| 100% empty Projet column | A dimension column that is empty in all rows | HIGH - missing mandatory dimension |
| Broken named ranges ratio | >30% of named ranges are #REF! | HIGH - significant technical debt |
| Hardcoded values in formulas | Formulas containing literal numbers instead of cell references | LOW - reduces flexibility |
| Circular references | Formulas that reference themselves (directly or indirectly) | HIGH - may produce incorrect results |

Report errors prominently at the start of the spec. This builds confidence.

### 2.6 Detect Calculation Logic Patterns

Scan CALCULATION sheets for common patterns:
- Aggregation: Use views to naturally aggregate across dimension properties, or BY mapping in formula
- VLOOKUP/INDEX-MATCH/XLOOKUP: Dimension properties in formulas or ITEM()
- IF/IFS/SWITCH:  IF/SWITCH formulas
- OFFSET/INDIRECT: Combination of properties and BY mappings
- SUMPRODUCT/SUMIFS: BY modifier
- Cumulative (running totals): -> CUMULATE function
- Year-over-year/shifts: SELECT modifier (e.g. `Revenue[SELECT: Month - 12]`)
- Sensitivity toggles: Cells that select an item in a list -> Input metric of type Dimension

---

## Phase 3: MAPPING - Map Excel Concepts to Pigment Concepts

### 3.1 Dimension List Design

For each identified dimension, define:
- Name: follow Pigment naming conventions
- Source: which Excel sheet/column provides the items
- Properties: columns from the REFERENTIAL sheet that become properties
- Property types: apply cardinality analysis to determine Dimension-type vs Text/Number
- Unique property: which property identifies items for imports (usually Code or Name)
- Aliases: any non-master labels seen in DATA_SOURCE or CALCULATION sheets -> map each to the canonical name/code from this REFERENTIAL (section 2.1)

### 3.2 Transaction List Design

For each distinct table-shaped DATA_SOURCE region on a tab (see section 1.2 and section 2.4 - not pivoted matrices; those belong under Metric Design):

- Region / Source: which Excel sheet and range (or named area) defines this single grid
- Name: follow Pigment naming conventions (one Transaction List per region, not necessarily per sheet)
- Dimension-type properties: which columns link to which Dimension Lists (values normalized to canonical master names per section 2.1)
- Numeric properties: which columns hold measure values
- Expected row count: approximate volume for performance planning (informs the load path in section 3.8)

### 3.3 Metric Design

For each metric (calculated or input), including each pivoted fact block when a tab holds several grids (section 1.2) - each block may be its own metric or feed a distinct structure:

- Name follow Pigment naming conventions
- Type: Number, Date, Text, Boolean, Dimension
- Structure (dimensions): which Dimension Lists define the metric structure (max 5 recommended)
- Formula logic: describe in natural language + pseudo-Pigment syntax
- Aggregator: Sum, Avg, Advanced Aggregator, etc.
- Data source: if populated from a Transaction List, specify the BY aggregation
- Input vs Calculated: is this user-entered or formula-driven?
- Planned write path: for user-entered (input) metrics, state whether values should be loaded via `tool:set_metric_input` (moderate cell counts) or derived from lists/metrics instead (see section 3.8). Pivoted Excel grids (section 2.4) are the primary case for `tool:set_metric_input`.
- Excel region (when the tab has multiple blocks): sheet + range for this metric's source grid (section 1.2)

### 3.4 Table Design

For reporting views that group metrics (P&L, Summary). One Excel tab may contain several unrelated report layouts (side-by-side blocks, stacked summaries): model one Pigment Table (and associated views) per distinct reporting region (section 1.2), not one Table per sheet by default.

For each table:
- Excel region (optional but required when the sheet has multiple grids): sheet name + range identifying this report block (section 1.2)
- Name: follow Pigment naming conventions
- Metrics included: list the metrics
- Calculated items: any derived rows (e.g., "Net Revenue = Gross Sales - Trade Investment")
- View pivot (target layout): for the table's primary View, specify which dimensions belong on rows, columns, and pages (page = selectors / filters that scope the whole view without adding a row or column axis). Align with how the Excel report is read left-to-right and top-to-bottom.
- Sorting: default sort on row and/or column axes where it matters (e.g. hierarchy order, chronological time, custom account sequence); note any Excel-implied order to preserve.
- Filtering: view- or axis-level filters to mirror the workbook (slices, excluded members, "actuals only", version, etc.) and whether null/zero rows or columns should be hidden for parity with Excel.

### 3.5 Board Design (high-level)

For each REPORTING sheet, suggest:
- Board name: mapped from the Excel sheet name
- Widgets: metrics, tables, charts (each specified in section 3.6), KPI cards, text
- Page Selector: dimensions in page selectors at board level
- Layout: ordered widget list

### 3.6 Chart design (Board-ready visualizations)

Expand section 1.4 (intention, format, source data range) into a full Pigment plan for each chart (and any chart implied by a REPORTING region without a formal chart object but built from a pivot chart range):

- Analysis - what is shown: clear description for implementers (trend, composition, variance, ranking, correlation, etc.) and the business question the chart answers.
- Excel chart format -> Pigment chart type: map Excel line / column / bar / stacked / pie / doughnut / area / scatter / combo (etc.) to the closest Pigment visualization; call out secondary axis, stacked vs clustered, and 100% layouts where relevant.
- Underlying data: which Pigment metrics, Table, or View must power the chart (names / ids); ensure those blocks exist before the chart is wired.
- Chart pivot (mirror View configuration): specify dimensions on rows, columns, and pages (selectors); which field drives series / color / legend; category axis ordering (time order, hierarchy, custom); filters (versions, scenarios, top members) so the dataset matches the Excel slice.
- Formatting parity (when important): notable colors, data labels, axis titles - only what affects readability or sign-off.
- Board placement: target Board (section 3.5), slot in the widget order, and spatial relationship to neighboring tables (e.g. "chart above Table X as in Excel").

### 3.7 Calendar Configuration

Based on the time analysis:
- Granularity: monthly, quarterly, annual
- Range: start year to end year
- Fiscal year: does it align with calendar year?
- Properties: Quarter, Half-Year, Year as properties of Month

### 3.8 Data load mapping

Goal: After the conceptual mapping (lists, metrics, calendars), the implementation plan must name how data lands in Pigment when an agent executes the migration. Pick tools by volume and shape (grid inputs vs tabular rows).

| Need | MCP tool | When to use | Limits / notes |
|------|----------|-------------|----------------|
| Metric input values (user-entered cells on a defined metric structure) | `tool:set_metric_input` | Pivoted Excel grids (section 2.4) and other low-to-moderate coordinate sets: each call carries rows of dimension values + cell values. | Not for table-shaped fact sheets (use lists). Very large pivots: chunk multiple calls or unpivot -> TL + formulas (section 2.4). |
| Append rows to a Dimension or Transaction List | `tool:add_list_items` | Table-shaped list imports: data is supplied as headers + row arrays in the tool payload. | At most 100 rows per tool call (maximum length enforced on the `rows` argument). Larger sheets: only repeated calls with <=100 rows each until the dataset is exhausted. |

Guidelines

- Pivoted sheets (section 2.4) -> `tool:set_metric_input` on the target input metric; table-shaped sources -> `tool:add_list_items` in batches of <=100 rows per call.
- For every table-shaped DATA_SOURCE region (section 1.2), the spec must spell out `tool:add_list_items` batching (row order, headers, and how many calls for the expected row count).
- `tool:add_list_items` and `tool:set_metric_input` payloads must use canonical dimension item names/codes from master data (section 2.1)
- Formula-driven metrics are not "written" row-by-row with these tools; they are defined with formulas (other MCP tools). Reserve `tool:set_metric_input` for input metrics.
- Calculated list properties (section 2.4): omit from `add_list_items`; set the property formula after the list and its input properties exist.

---

## Phase 4: SPECIFICATION - Write the Detailed Modeling Spec

### 4.1 Spec document structure (aligned with `tool:rewrite_specifications`)

The written spec MUST follow this outline: ## Summary, ## Architecture, then one `## Application: ...` block per Pigment application, each with Blocks and Folders -> Views -> Boards

Cross-read [modeling_architecture_design.md] (Pillars 3-4: data cycle, governance, Hub vs spokes) and [modeling_principles.md] (Hub pattern, Library folder) before fixing Architecture and deciding which blocks live in Hub vs spoke apps.

```markdown
# Pigment Modeling Specification
## Source: [Excel filename(s)]
## Generated: [date]

## Summary
[Narrative goal of the Excel migration.] Key outcomes, scope, and risks (data quality, complexity, deadlines).

## Architecture
Applications & Hub decision:
- Single app vs multi-app: State whether the workspace uses one application or Hub + one or more spokes (use cases, ownership, sensitivity per architecture skill).
- Hub / master data:: a Hub holds shared dimensions (referential / master lists, Version if used, organizational & chart-of-accounts dimensions reused across apps, Calendar-related structural choices when centralized). Spoke apps hold use-case-specific metrics, transaction lists loaded for that process, tables, and reporting views/boards, unless transactional data must be shared across apps (then Hub placement may apply - state why).
- Excel mapping: Which REFERENTIAL / DATA_SOURCE regions (section 1.2) land in Hub dimensions vs spoke TLs; call out canonical names (section 2.1).
- Data flow: Short diagram in words: Excel -> imports (section  Data source imports) -> lists/metrics -> tables -> views/charts -> boards; mention Library / `PUSH_` / `PULL_` if multi-app sharing applies.

## Excel migration annex (traceability - optional subsection before Application blocks)
Use this block so Excel specifics are not lost; keep it after Architecture and before the first `## Application`.

### Error & quality report
[Brief reference to Phase 2 findings - or "clean".]

### Multi-grid & chart index
- Regions per sheet (section 1.2); charts (section 1.4 recap: intention, format, source range).

### Data source imports (execution)
- Per Excel region (section 1.2): pivoted -> `tool:set_metric_input`; table-shaped -> `tool:add_list_items` in batches of <=100 rows; order after target blocks exist.
- Do not merge unrelated regions on one tab into a single list/metric.

---

## Application: `Hub` - *omit this heading when everything fits a single non-Hub app; use `Hub` or `Master data` display name when a separate Hub is required*

### Blocks and Folders

| Action | Object | Type | Role | Reason |
|--------|--------|------|------|--------|
| create/reuse/edit/delete | `name` (mention if known) | dimension, transaction list, metric, table, block folder, board folder | input/processing/output / shared master | e.g. shared referential from Excel REFERENTIAL sheets; Version dimension in Hub per scenarios skill |

*Do not list view or board rows here - use Views and Boards below.*

### Views (when this app has reporting widgets)

| # | Action | View | Block | Rows | Columns | Pages | Chart type |
|---|--------|------|-------|------|---------|-------|------------|
| 1 | create/reuse/... | `View name` | `Metric or table` (metric/table) | ... | ... | ... | Grouped Bar chart, Stacked Bar chart, Line chart, Combined chart, Pie Chart, Waterfall chart, or `-` |

*For charts, align View name with Boards widget plan; chart type column matches Pigment chart types.*

### Boards (when relevant)
Repeat per board with a `### Board: ...` heading. Widget plan: one row per widget, screen order (left -> right, top -> bottom).

| # | Action | Widget | View | Widget type | Width x Height |
|---|--------|--------|------|-------------|----------------|
| 1 | create/edit | Label | same `View` as in Views or `-` | Grid, Chart, List, KPI, spacer, action, image, single text, dimensioned text | e.g. 12x3 |

---

## Application: `[Primary planning / use-case app]` - *repeat the three subsections for each spoke*

### Blocks and Folders
[Same table pattern - TLs and metrics consumed by this use case, folders per modeling_principles.]

### Views
[Same Views table - include chart types on views that feed Chart widgets.]

### Boards
[Same Boards widget plan - reference section 3.6 / Excel chart intentions.]

---

## Application: `[Second spoke if any]`
*Same three subsections - omit when not applicable.*

---

## Implementation
### Phase 1 (and further phases as needed)
- Build order: Hub shared dimensions (and shared blocks) before spoke metrics that reference them; imports after target lists/metrics exist.
- Call out Excel region -> Pigment object for major loads.
- Reporting: underlying metrics/tables/views before Board chart/table widgets.

## Notes (optional)
Open questions, parity exceptions.

## Appendix
- Sheet classification & multi-grid tab index (section 1.2)
- Named ranges inventory (errors #REF!, etc.)
- Cross-sheet dependency summary
- Full error list
```

### 4.2 Guidelines for a Successful Plan

- Be specific. Don't write "create a metric for costs" - write `CALC_Total_Cost` dimensioned by `CostCenter x AccountREP x Month x Version` with formula `LOAD_Budget_Charges.Total_Cout_KEUR[BY SUM: ...]`.
- Include the Excel-to-Pigment mapping for every element. The reader should be able to trace any Pigment object back to the exact Excel sheet/cell/column it came from.
- Flag decisions. When the mapping is ambiguous (e.g., a column could be a dimension or a property), explain both options and recommend one with reasoning.
- Use Pigment naming conventions from the modeling-pigment-applications skill.
- Challenge structures with >5 dimensions. If a metric would need 6+ dimensions, suggest alternatives (properties, mapped dimensions).
- Always propose to model "the Pigment way". Importing an Excel file does not mean useing the literal idiosyncracies of Excel, and you should always plan to use idiomatic Pigment patterns instead of a direct translation.

---

## Critical Reminders

- Written spec shape: Phase 4 output must match `rewrite_specifications` (Summary, Architecture with Hub vs spoke, then per-app Blocks and Folders -> Views -> Boards). Shared master / referential dimensions from Excel usually belong in a Hub when multiple apps or reuse are anticipated - see modeling_architecture_design.md Pillar 4.
- Always read the writing-pigment-formulas skill before writing formula pseudo-code. Pigment has its own formula language - never use Excel syntax in the spec.
- Never assume a clean Excel. Headers may not be in row 1. Data may start at row 7. Columns may be hidden. Sheets may be named misleadingly.
- The error report is not optional. Even if the file is clean, state that explicitly. If there are errors, report them prominently - this builds trust.
- Cross-validate dimensions across all sheets. A dimension that appears in 1 source sheet is suspect; one that appears in 5 is reliable.
- One canonical name per entity. When labels differ, use the master / REFERENTIAL name (or code) everywhere (section 2.1).
- Multiple grids on one tab (section 1.2): plan separate Pigment objects and import sequences per region - don't assume one sheet -> one TL or one Table.
