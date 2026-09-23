---
name: creating-and-editing-pigment-views
description: Always use this skill when creating or editing Views, or needing to pick a View.
metadata:
  skill_path: /creating-and-editing-pigment-views/SKILL.md
  base_directory: /creating-and-editing-pigment-views
  includes:
    - "*.md"
---

# How to Use This Skill

Progressive Disclosure Pattern: This `SKILL.md` provides an overview. Most details live in supporting files.

This file alone is often not sufficient

Required workflow:

1. Read this file first - Understand available resources and when to use them
2. Identify relevant topics - Match your task to any of the supporting documents
3. Read supporting files - Use available Cline file-reading or search tools to access detailed documentation
4. Explore as needed - Use available Cline listing and search tools to discover additional resources in this directory (some might not be explicitly mentioned in this file)

## UI and tool semantics (Views)

These notes align the Pigment UI with view creation and edition tools

### `values` (value fields)

Each entry describes what appears in the cells :

- Metrics -> one metric
- Tables -> one value field per table metric
- List -> one value per property

Value labels in Pivot panel in the UI are different:

- for Tables: "Metrics"
- for Lists: "Properties"

### `metricsLocation` (Metric & Table views)

API enum (C# `MetricsLocation`): `Columns` (1), `Rows` (2), `Pages` (3) - which axis carries the metrics in the pivot. Dimensions go under `rows`, `columns`, or `pages`. Metrics are chosen in `values`; they are not duplicated into the arrays for dimensions. Their axis is set only via `metricsLocation`.

KPI rule: `metricsLocation` for a KPI View MUST NOT be `Rows`. KPIs have no row pivots, so Rows yields a broken layout. Use `Columns` (default) or `Pages`.

### `pivotFieldId`

Every pivot field placed in `pages`, `rows`, or `columns` gets a stable id (GUID) assigned by the server. `pivotFieldId` in other structures (filters, sorts, etc.) points to that pivot - read it back from the `tool:create_view` / `tool:update_view_pivots` response, do not invent it.

### `listPropertyPath` on pivots (grouping / hierarchy)

`ListPropertyPath` is the technical name of properties (e.g. in the UI: `Month > Year`, `Country > Region`).

### Other

- Do not create views on sublists.
- The widget's `display_type` (KPI / Grid / Chart) is not stored on the View; configure it on the Board widget.

---

# CRITICAL RULES

- Value and pivot ids - Assigned by the server. For a NEW pivot/value, omit `id`. To KEEP an existing one, echo back the id from a prior `tool:create_view` / `tool:update_view_*` / `tool:get_view` response. Never invent UUIDs.
- Same dimension on Pages and on Rows/Columns is SUPPORTED - When the user asks to "put X on Pages", add to Pages without removing X from Rows/Columns. Page selectors then narrow which modalities appear on the row/column axis. Do not treat this as a conflict. See [view_components.md](./view_components.md) for OK patterns vs. anti-patterns.
- "Filter" from users -> Page Selector first - Restricting to a dimension item (Year, Country, Version, ...) = `pages` + default item, not `filters[]`. View Filters only for top-N-by-metric, exclusion, or logic Page Selectors cannot express. See [view_filtering.md](./view_filtering.md).
- New View (greenfield) - Two-step flow:
  1. Call `tool:create_view`. Leave `pivotLayout` null to let the server build a sensible default layout for the underlying block. To override, send a complete `pivotLayout` with all three axes (`rows`, `columns`, `pages`) populated - each entry is a simplified pivot seed (`dimensionId` + optional `listPropertyPath`); use an empty array for an axis with no pivot. Half-specified layouts are rejected. Values and hidden-dim aggregations are created with sensible defaults; refine them in step 2 if needed.
  2. Iterate with `tool:update_view_pivots`, `tool:update_view_values` (and the other `update_view_*` tools) to refine the configuration. None of those refinements are accepted by `tool:create_view`.
- Editing an existing View - Use the field-specific variants directly on the View id:
  - Values (add/remove value fields, `showValueAsConfiguration`) -> `tool:update_view_values`. Echo back existing value ids to keep them stable.
  - Pivot edits (rows / columns / pages / metricsLocation) -> `tool:update_view_pivots`. 
  - Filters -> `tool:update_view_filters`. Sorts -> `tool:update_view_sorts`. Chart config -> `tool:update_view_chart_config`.
  - Metadata, hidden-dim aggregations, template -> `tool:update_view`.

  If a Draft was auto-created, the agent should:
  - wire the widget to display it via `tool:update_view_widget_overrides` so only this user sees it
  - tell the user they can save the Draft in the Board UI.
- Bulk-save protocol if `tool:save_draft_views` is available - after creating or editing one or more Draft Views:
  1. List the draft view names and ask the user for explicit confirmation before saving.
  2. Once confirmed, call `tool:save_draft_views` once with all draft view IDs.
  3. Report each result: view name, resulting ID, and whether it was merged or promoted to a new view.
- When editing a View in the context of a widget on a Board, you must:
  - use the draft + override workflow to allow safe, user-specific preview before committing changes that affect all users.
  - read: [view_widgets.md](../designing-pigment-boards/view_widgets.md).
- Name (first signal) - "View 1" and similar are often placeholders. Prefer `create_view` with a real name and pivots aligned to this widget and other widgets on the same board unless the existing View already fits.
- Shared / external View (other users, other boards) - Prefer Draft (or a new View) before overwriting something others rely on or displayed in another board, except if asked explicitely.
- Table views - per-view metrics - When adding or removing metrics on Table block views, call `tool:update_view_values` with the full desired value list: add a value entry for new metrics, remove value entries that are not relevant. Prefer removal over hiding - hidden metrics may still compute. Keep a metric hidden (`displayed: false`) only when the view still depends on it, such as for value-field filtering, sort-by-metric-value, or as an advanced-aggregator operand (ratio, growth, etc.). Do not plan a separate step to update the Table block's metric membership first. Do not add every table metric to each view and hide the rest; configure only the metrics each view should show.

# Definitions

## Views

A View is how a Block (Metric, List, Table) is shown: pivots, filters, sort, display. One Block, many Views.

## Draft Views

A private working copy to preview edits before they hit an existing view. On boards, use a Draft + widget overrides when changing the live View behind a widget-see [view_widgets.md](../designing-pigment-boards/view_widgets.md). Not a substitute for `create_view` when you need a new View. Save via bulk-save protocol - list the draft names, wait for user confirmation, then call `tool:save_draft_views` once with all draft view IDs

---

# Reuse vs create

`tool:get_block_views` helps spot candidates; there is no hard rule to "find similar views" before you create. Creating is normal when names are generic or pivots do not match the board. Details: [relevant_views.md](../designing-pigment-boards/relevant_views.md), [view_design_process.md](./view_design_process.md).

# View naming

Grid - no widget suffix. Chart - add chart type, e.g. `... - Waterfall`. KPI - suffix ` - KPI`.

---

# View Design Process

Must read: [view_design_process.md](./view_design_process.md).

# View components, filters, sort, aggregators

- [view_components.md](./view_components.md)
- [view_filtering.md](./view_filtering.md)
- [view_sorting.md](./view_sorting.md)
- [view_display_modes.md](./view_display_modes.md)
- [view_pivoting.md](./view_pivoting.md)
- [view_aggregators.md](./view_aggregators.md)
