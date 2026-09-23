---
name: solving-specific-use-cases
description: Always use this skill when building or extending models for specific planning domains - FP&A, Workforce Planning, Sales Performance Management, Supply Chain Planning, or Financial Consolidation. Covers proven modeling patterns and domain-specific best practices. This skill includes supporting files in this directory - explore as needed.
metadata:
  skill_path: /solving-specific-use-cases/SKILL.md
  base_directory: /solving-specific-use-cases
  includes:
    - "*.md"
---


# Pigment Use Cases - Introduction

Pigment is a business planning platform used across multiple domains. Each domain has its own modeling patterns, dimensions, and reporting needs, but they all share Pigment's core building blocks: lists, metrics, formulas, tables, and boards.

This skill introduces the five primary use cases and explains what each one typically involves so the agent can orient itself when helping users build or extend a model. The list of patterns is not complete.

## When to Use This Skill

Read this skill when:

- You are deciding which patterns, dimensions, and structures are appropriate for a specific use case
- You want to understand how different planning domains connect within a single Pigment organization
- You are designing or integrating FX currency conversion (Hub app, rates by version, entity mapping, AVG/END, reporting currency)

> Planning-cycle topics (Version Dimension, Budget vs Actual, Forecast, Reforecast, switchover, Actual/Plan layering, scenarios, snapshots) are NOT covered here. They are owned by `skill:planning-cycles-pigment-applications`. Most patterns below (Centralized Reporting Metric, OPEX, Workforce, FX) assume a Version Dimension already exists; consult that skill before building the planning-cycle layer of the model.

---

## 1. FP&A - Financial Planning & Analysis

Pattern #1 - Centralized Financial Reporting Metric (Nexus): The recommended approach is to use a centralizing metric that aggregates upstream calculations, maps them to a reporting structure (e.g. a Chart of Accounts), and serves as the sole source of truth for financial statement boards and tables. It blends multiple data sources into one single metric with an Account dimension. This decouples reporting from model internals and provides a clean security boundary. Only use for financial reporting (P&L, Balance Sheet, Cash Flow), not for operational models.
Required reading for this pattern: [Centralizing Financial Reporting Metric (Nexus Pattern)](./finance_nexus_financial_statements.md)

Pattern #2 - OPEX Planning Application Architecture: Overall structure of a driver-based OPEX planning app: data foundation (PULL layer from Library), configuration layer (version windows, account scope), output pipeline (OUT_FC -> ACT+FC -> Push), folder structure, and naming conventions (INP_, CALC_, OUT_, PULL_, Push_). Load when building the overall structure of an OPEX planning app or working on its data, configuration, or output layers. For forecasting method formulas and how to add new methods, see Pattern #3.
Required reading for this pattern: [OPEX Planning - Architecture & Patterns](./opex_planning_application_architecture.md)

Pattern #3 - OPEX Forecasting Methods & Engine: Implementation reference for the OPEX forecasting engine internals. Contains: method formula patterns and parameters, YoY and blank-handling modifiers, Actual vs Plan window interactions, and the step-by-step procedure for adding new methods. Load when adding, modifying, or debugging individual forecasting methods and their parameters.
Required reading for this pattern: [OPEX Planning - Forecasting Methods & Engine](./opex_forecasting_planning_methods_engine.md)

Pattern #4 - FX Currency Conversion (Hub): Centralized, version-aware FX engine in a dedicated Hub app. Dimensions: Currency, FX Rate Types (AVG for P&L, END for Balance Sheet), Reporting Currency (Local, Group). Layers: FX_01 (raw input by Version) -> FX_02 (fill-forward if needed) -> Push_DH_FX_Entity Currencies (entity -> currency mapping) -> Push_DH_FX_FX Rates (only metric referenced by P&L/BS). Use when building or connecting multi-currency models (Nexus, OPEX, Workforce, consolidation).
Required reading for this pattern: [FX Currency Conversion (Hub pattern)](./fx_currency_conversion.md)

---

## 2. Workforce Planning

Pattern #1 - Application Architecture & Patterns: Full blueprint for employee-based workforce planning: layered metric architecture (Data -> Card -> Stats -> Comp -> Push/KPI), dimension roles, EE + TBH data flows, override-first staging, naming conventions, and folder structure. Load when building or extending a workforce planning app end-to-end.
Required reading for this pattern: [Workforce Planning - Architecture & Patterns](./workforce_planning_architecture_patterns.md)

Pattern #2 - Workforce Cards & Mapped Dimensions: The 4.0 layer that unifies Existing Employees and To-Be-Hired into a single Workforce dimension, with card metrics (`WF_Card_Entity`, `WF_Card_Department`, etc) and mapped-dimension reporting via `BY: -> WF_Card_...`. Load when you need to consolidate two populations into one workforce view or report by Entity/Department without adding those as structural dimensions.
Required reading for this pattern: [Workforce Planning - Cards & Mapped Dimensions](./workforce_planning_cards_mapped_dimensions.md)

Pattern #3 - Changelog to Override Metrics: Models discrete change requests (transfers, salary updates, term dates) as Changelog dimension rows, projects them into override metrics at planning grain, and applies override-first staging. Load when users submit change requests with effective dates and an approval workflow.
Required reading for this pattern: [Workforce Planning - Changelog to Override Metrics](./workforce_planning_changelog_overrides.md)

Pattern #4 - Snapshot Spread Logic: Bridges snapshot-based source data (e.g. HRIS with sparse load months) to a dense planning grid (Version x Employee x Month). Covers snapshot selection, FILLFORWARD propagation, history-vs-plan toggle, and version windows. Load when the source provides as-of snapshots and planning needs values on every month.
Required reading for this pattern: [Workforce Planning - Snapshot Spread Logic](./workforce_planning_snapshot_spread.md)

---

## 3. Sales Performance Management (SPM)

Pattern to be added Use your general knowledge to answer questions on this use case

---

## 4. Supply Chain Planning (SCP)

Pattern to be added Use your general knowledge to answer questions on this use case

---

## 5. Financial Consolidation

Pattern to be added Use your general knowledge to answer questions on this use case

---

## Cross-References

- Modeling foundations: `skill:modeling-pigment-applications` (dimensions, folder structure, Push/Pull)
- Planning cycles, Versions, Scenarios, Snapshots: `skill:planning-cycles-pigment-applications` -- always use this when a use case involves a Version Dimension, Budget vs Actual, Forecast, Reforecast, switchover, or Actual/Plan layering (most FP&A, OPEX, and Workforce patterns do)
- Formula implementation: `skill:writing-pigment-formulas` (BY modifier, aggregation functions)
- Performance: `skill:optimizing-pigment-performance` (large aggregation optimization)
- FP&A pattern - Centralized Reporting Metric (Nexus): [finance_nexus_financial_statements.md](./finance_nexus_financial_statements.md)
- Workforce Planning - Architecture & Patterns: [workforce_planning_architecture_patterns.md](./workforce_planning_architecture_patterns.md)
- Workforce Planning - Cards & Mapped Dimensions: [workforce_planning_cards_mapped_dimensions.md](./workforce_planning_cards_mapped_dimensions.md)
- Workforce Planning - Changelog to Override Metrics: [workforce_planning_changelog_overrides.md](./workforce_planning_changelog_overrides.md)
- Workforce Planning - Snapshot Spread Logic: [workforce_planning_snapshot_spread.md](./workforce_planning_snapshot_spread.md)
- OPEX Planning - Architecture & Patterns: [opex_planning_application_architecture.md](./opex_planning_application_architecture.md)
- OPEX Planning - Forecasting Methods & Engine: [opex_forecasting_planning_methods_engine.md](./opex_forecasting_planning_methods_engine.md)
- FP&A pattern - FX Currency Conversion (Hub): [fx_currency_conversion.md](./fx_currency_conversion.md)
