---
name: modeling-pigment-applications
description: Always use this skill when designing or modifying Pigment applications. Provides the mental model of a Pigment app (Application, Dimensions, Calendars, Metrics, Transaction Lists, Tables), the core concepts (dimension list vs property vs transaction list, metric vs table, sparsity, scope), the canonical order of architecture decisions, a minimal viable application pattern and pointers to deeper-dive docs (architecture, naming, hierarchies, calendars, principles, folders, subsets, performance).
metadata:
  skill_path: /modeling-pigment-applications/SKILL.md
  base_directory: /modeling-pigment-applications
  includes:
    - "*.md"
---

# Modeling Pigment Applications

Core concepts and architecture for designing Pigment applications. Read first for any modeling task. Jump to the linked deep dives only when the task requires the detail.

## When to Use This Skill

Read this skill before:

- Designing or restructuring an Application (dimensions, metrics, tables, transaction lists, folders)
- Choosing dimension vs property, metric vs transaction list, table vs standalone metric
- Reviewing whether an existing structure is sound (sparsity, scope, T&D safety)
- Onboarding to an unfamiliar workspace before changing anything

---

## Mental Model

Pigment is an in-memory, sparse, multidimensional engine. An Application is a graph of typed blocks plus orthogonal cycle layers. Block types:

- Folders -- organizational only, never logic, optional
- Dimensions (includes the Version dimension) -- analysis axes, items + properties
- Calendar dimensions -- Month / Quarter / Year, plus Date
- Metrics -- multidim grids, typed Number / Date / Text / Dim / Bool
- Transaction Lists (TL) -- high-volume facts, NOT structural
- Tables -- group metrics sharing dimensions
- Boards / Views -- UX layer over metrics and tables

Plus two orthogonal layers that apply across blocks:

- Native Scenarios -- ad-hoc what-if, app-level feature
- Snapshots -- point-in-time copy of the app

Invariants the agent must respect:

- A metric cell is identified by one item per structural dimension. Empty cells are not stored (sparsity).
- Only dimension lists can sit in a metric structure. Transaction lists never can. Aggregate them inside formulas with `BY`.
- The Version Dimension is the planning-cycle dimension (Budget, Actual, Forecast). Whenever you design or modify a planning metric or anything time-bound, also consult `skill:planning-cycles-pigment-applications`.
- Folders are inert. Placement affects discovery and governance, not calculation.

---

## Core Concepts

### Block types

| Concept | What it is | When to pick it |
|---|---|---|
| Dimension list | Analysis axis with unique items and properties. Usable as a structural axis. | Country, Product, Employee, Account, anything you will slice metrics by |
| Property | Column on a dimension. Type Number / Date / Text / Boolean / Dimension. | Static attribute of an item |
| Metric | Multidimensional, sparse, typed grid. Sourced by input, import, or formula. | Anything you compute, plan, or report |
| Transaction List | High-volume row store (orders, journal entries). Items not unique. Not structural. | Granular facts to aggregate into metrics |
| Table | Group of metrics sharing dimensions, with calculated rows or columns. | P&L, Balance Sheet, Cash Flow, multi-metric reporting |
| Calendar | App-level time dimensions (Month, Quarter, Year) plus Date type. | Always reuse. Never re-create time dimensions |
| Version Dimension | Custom Dimension holding Budget / Actual / Forecast plus switchover and gating Boolean metrics. | Any planning cycle, Actual vs Plan layering, cross-version variance |
| List Subset | Constrained view of a parent list. Power tool with irreversible data loss on membership change. | Prefer filters or a separate list unless the subset use case is clear |

### Data visualization types

| Concept | What it is | When to pick it |
|---|---|---|
| View | Configured visual of a Metric or Table (filters, sort, breakdown, display mode). Reusable across Boards. | Whenever you want to show data the same way in multiple places |
| View display mode | How a View renders its data: `Grid` (pivot table), `Chart` (bar / line / pie / etc.), `KPI` (single big number). | Grid for tabular breakdown, Chart for trend or comparison, KPI for a headline metric |
| Board | Container page that lays out one or more Widgets. The unit of user-facing reporting, dashboards, and input screens. | Any user-facing dashboard, report, or input form |
| Widget | An element placed on a Board. Most commonly renders a View; also supports text, image, button, separator. | Anything embedded on a Board |

### Engine vocabulary

- Block: any first-class object in an app (Dimension, Metric, Transaction List, Table, Calendar, Board, Folder).
- Item: a row of a list (Dimension or Transaction List).
- Structural dimension: a Dimension used to define a metric's grid.
- Cell: one value at one combination of structural items.
- Sparsity: only non-blank cells are stored and processed.
- Scope: the dimensional context in which a formula evaluates.

### Sibling decisions the agent gets wrong most often

- Dimension vs Property. Values repeat across rows AND you need to slice metrics by them, use a Dimension. Free text, measure, or boolean, use a Property.
- Dimension vs Transaction List. Need to slice metrics by it with unique items, use a Dimension. Granular events, high volume, not structural, use a Transaction List.
- Metric vs Transaction List as source of truth. Aggregated planning numbers belong in a Metric. Atomic events from ERP or CRM belong in a Transaction List, then aggregate with `BY`.
- Table vs standalone Metric. Multiple metrics share dimensions and you want calculated items or a single view, use a Table. One isolated KPI or intermediate calc stays standalone.

---

## Architecture: Decisions in Order

Decide in this order. Reversing causes rework.

1. Application boundary. One app vs a Hub-and-domain-apps topology. The Hub holds shared Dimensions (Entity, GL, FX, Version, Time) and shared reference/actuals data. Domain apps reference Hub content via shared Blocks (Library), typically metrics with a Push/Pull naming convention.
2. ```
2. Dimensional structure. List the slicing axes. Target 5 or fewer structural dimensions per metric. Challenge anything above.
3. Calendar. Pick fiscal year, granularity (Month or Quarter), and date range. Use the existing app calendar. Never roll your own time list.
4. Version Dimension. If the app holds any planning cycle (Budget, Forecast, Actual), build a Version Dimension and define switchover and gating Booleans now, not later. See `skill:planning-cycles-pigment-applications`.
5. Data sourcing per metric. Input vs Import vs Formula. Data from ERP or CRM lands in a Transaction List, then aggregates into a metric with `BY`.
6. Metric layering. `INPUT_` then `CALC_` then `OUTPUT_` or `RES_`. Reporting metrics stay thin. No cross-cutting calc inside them.
7. Tables for reporting. Group metrics sharing dimensions. One centralized reporting metric per financial view (P&L, Balance Sheet).
8. Folders. Map blocks to numeric-prefixed folders (Dimensions, Library, Data Loads, Assumptions, Reporting). Never place blocks at the root level.
9. Governance. Naming, T&D safety (no direct item refs in formulas), Access Rights, audit.

---

## Minimal Viable Application

Concrete shape of a well-formed micro-app. Generalize from this pattern.

```
Folders:
  01. Dimensions
  02. Library
  03. Data Loads
  04. Reporting

Dimensions:
  Country       items: FR, US, UK         property: Region [Dim]
  Product       items: P1, P2             property: Category [Dim]
  Calendar      Month, Quarter, Year      (existing)
  Version       items: Budget FY26, Reforecast Q2 FY26, ...     (Actual is optional)
                properties: Start_Month, End_Month, Switchover_Month,
                            Active_Version [Bool], Lock_Version [Bool],
                            Version_Type [Dim] (MP02-safe Actual ref)
                Boolean metrics: Is_Version, Is_Actual, Is_Plan (layer Actual vs Plan)

Transaction List:
  LOAD_Sales    props: Country [Dim], Product [Dim], Date, Amount [Number]

Metrics:
  DATA_Sales_Amount    [Country x Product x Month x Version]
    LOAD_Sales.Amount [BY SUM: LOAD_Sales.Country, LOAD_Sales.Product,
                       TIMEDIM(LOAD_Sales.Date, Month)]
  INPUT_Budget         [Country x Product x Month x Version]   user input, scoped via Version_Type = "Budget" (MP02-safe)
  CALC_Variance        [Country x Product x Month x Version]   DATA_Sales_Amount - INPUT_Budget
  OUTPUT_Net_Revenue   [Country x Product x Month x Version]   thin reporting metric

Table:
  P&L (rows = OUTPUT_ metrics, dims = Country x Month x Version)
```

---

## Critical Rules

- Architecture before blocks. Dimensional structure is the single most expensive decision. Design before building.
- Only dimension lists can be structural. Transaction lists never. Aggregate with `BY`.
- Never use `.` or `:` in names. They break formula references.
- Never place a block at the root level.
- Never reference an item directly in a formula when T&D is in use. Use an input metric of type Dimension.
- List Subsets are not a default. Membership change deletes data irreversibly. Prefer filters.
- Reuse the app calendar. Never create parallel time dimensions.
- Always model planning cycles with a Version Dimension. Consult `skill:planning-cycles-pigment-applications` whenever a planning cycle is in scope.

---

## Deeper Dives

Open only when the task requires the detail.

| Need | Doc |
|---|---|
| Engine, sparsity, dimension list vs transaction list, BY pattern, IFDEFINED vs ISBLANK | [./modeling_fundamentals.md](./modeling_fundamentals.md) |
| Hierarchies, ragged hierarchies, mapped dimensions, time-dependent hierarchy, dimension explosion | [./modeling_dimensions_and_hierarchies.md](./modeling_dimensions_and_hierarchies.md) |
| Calendars, fiscal year, date range, time dimension mechanics | [./modeling_time_and_calendars.md](./modeling_time_and_calendars.md) |
| End-to-end architecture design (5 pillars, Hub pattern, UX, data flow, governance) | [./modeling_architecture_design.md](./modeling_architecture_design.md) |
| Naming conventions (prefixes, casing, character rules) | [./modeling_naming_conventions.md](./modeling_naming_conventions.md) |
| Modeling principles, T&D safety, data loading strategy | [./modeling_principles.md](./modeling_principles.md) |
| Folder placement decisions | [./modeling_working_with_folders.md](./modeling_working_with_folders.md) |
| List Subsets: safe patterns and data-loss risks | [./modeling_subsets.md](./modeling_subsets.md) |
| Design-time performance (1G cells, masks, table consolidation) | [./modeling_performance_considerations.md](./modeling_performance_considerations.md) |
| Centralized Reporting Metric (P&L, Balance Sheet aggregation) | [`../solving-specific-use-cases/finance_nexus_financial_statements.md`](../solving-specific-use-cases/finance_nexus_financial_statements.md) |
| FX / currency conversion (Hub pattern, AVG vs END, entity mapping) | [`../solving-specific-use-cases/fx_currency_conversion.md`](../solving-specific-use-cases/fx_currency_conversion.md) |
| Modifier syntax (BY, ADD, REMOVE, SELECT, FILTER) | [`../writing-pigment-formulas/formula_modifiers.md`](../writing-pigment-formulas/formula_modifiers.md) |
