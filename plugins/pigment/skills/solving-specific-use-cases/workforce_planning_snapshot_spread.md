# Workforce Planning - Snapshot Spread Logic

## Purpose

This use case describes how to model the bridge between snapshot-based source data (e.g. HRIS loads with a "load month" and sparse events like hire/term) and a regular planning grid (e.g. Version x Employee x Month). The "spread logic" layer centralizes snapshot selection, propagation of point-in-time attributes over time, and history-vs-plan behavior so downstream metrics stay simple and maintainable.

When to use this pattern

- The source system provides as-of snapshots (e.g. one row per employee per "HRIS Load Month" with hire date, term date, entity, etc.).
- Planning or reporting requires a dense grid on a regular time dimension (e.g. Month).
- You need a single, consistent rule for "which snapshot applies to each (scenario, entity, period)" and for spreading dates/attributes across periods.

When not to use

- Spreading is optional if the client can provide historical data already at the planning grain (e.g. monthly history). In that case you may not need backward/forward snapshot mapping.
- Backward spreading is never 100% correct; it is a best-effort way to visualize history using snapshot data. Do not rely on it for audit or legal accuracy.
- Forward spreading is mandatory to build a forecast or plan: you need a clear rule for which snapshot drives each future month.

---

## 1. Problem in plain terms

- Source: Snapshot data (e.g. HRIS) with a snapshot date dimension (e.g. "HRIS Load Month"). Each row is "as of" that date: hire date, term date, entity, department, etc. Data is sparse along time (only load months exist).
- Target: A planning grain (e.g. Version x Employee x Month) where every month needs values for attributes and events (hire date, entity, etc.).
- Gap: You must decide, for each (Version, Employee, Month), which snapshot to use and how to propagate point-in-time values (hire, term) so they appear on every relevant month without duplicating logic in dozens of metrics.

The spread logic layer is the small set of helper metrics that answer "which snapshot?" and "what value for this month?" once, so staging and card metrics only reference these helpers.

---

## 2. Core concepts (generalized)

| Concept                            | Description                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Snapshot source                | The list or metric that holds raw snapshot data (e.g. HRIS load list), with a snapshot date dimension (e.g. Load Month) and an entity mapping (e.g. Employee Mapping).                                                                                                                                                                                                                       |
| Planning grain                 | The dimensions you need for planning/reporting (e.g. Version x Employee x Month).                                                                                                                                                                                                                                                                                                                    |
| Snapshot selection             | For each (Version, Entity, Planning Period), which snapshot date to use to pull attributes. This is encoded in one or a few metrics (e.g. "effective load month per (Version, Employee, Month)").                                                                                                                                                                                                |
| Backward propagation (history) | For past periods: "use the snapshot that was actually valid at that time" (e.g. last load month <= this month). Used to approximate historical view when you only have snapshots.                                                                                                                                                                                                             |
| Forward propagation (plan)     | For plan/future periods: "use a fixed or forward-carried snapshot" (e.g. latest known load month, or a chosen reference month). Mandatory for building a forecast.                                                                                                                                                                                                                           |
| Spread layer                   | The set of metrics that: (1) define effective snapshot date per (Version, Entity, Planning Period) for history and for plan, (2) spread point-in-time attributes (hire, term, etc.) over the planning time dimension, (3) provide an active mask (which (Entity, Period) are in scope, e.g. hired and not terminated), (4) apply version windows (only periods inside each version's range). |
| History vs plan                | A global toggle (e.g. "Populate history?") and optionally a cutover month per version. When ON: use backward snapshot selection for historical behavior. When OFF: use forward snapshot selection for a stable plan view. Centralizing this in the spread layer avoids repeating `IF(Populate_History?, ..., ...)` in every staging metric.                                                  |

---

## 3. Pipeline (generic)

| Layer                           | Role                             | Typical content                                                                                                                                                                  |
| ------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Snapshot load            | Raw import                       | List/metric with snapshot date dimension and entity mapping; sparse attributes (hire date, term date, entity, department, etc.).                                                 |
| 2. Spread logic             | Bridge                           | Helpers: effective snapshot date (history + plan), spreaded dates (e.g. FILLFORWARD of hire/term), active mask, plan-month filter; all with version window applied once here.    |
| 3. Data staging             | Map attributes to planning grain | For each attribute: pull from snapshot source using BY CONSTANT: [effective snapshot metric] (history or plan depending on toggle). No repeated FILLFORWARD or window logic. |
| 4. Overrides (optional)     | User overrides                   | Override staging values where users can edit (e.g. plan overrides).                                                                                                              |
| 5. Cards / final attributes | Output for reporting             | IFDEFINED(Override, Staging value), still using spread helpers to anchor to the right snapshot.                                                                                  |
| 6. Stats & aggregations     | Headcount, FTE, events           | Built on top of cards; no direct snapshot logic.                                                                                                                                 |

The spread layer (2) is the only place that implements snapshot selection, date spreading, history vs plan, and version windows. All other layers reference its outputs.

---

## 4. Pattern: two building blocks

### 4.1 Spreading a point-in-time attribute (e.g. hire date)

Goal: Have the attribute available for every (Version, Entity, Month) where it is relevant (e.g. every month after hire), not only the exact month it was set.

Idea: Use FILLFORWARD over the planning time dimension so blanks are filled with the last known value. Then restrict to version window.

Generic pattern:

```text
IFBLANK(
  'Source_Attribute',           // from staging or load, already at planning grain where defined
  FILLFORWARD('Source_Attribute', Planning_Time_Dimension)
)
[FILTER: Version.'Window End' >= Planning_Time_Dimension]
```

Result: downstream metrics can reference this "spreaded" metric and always get a value (e.g. hire date) for every month in scope, without re-implementing fill or window logic.

### 4.2 Choosing snapshot for history vs plan

Goal: For each (Version, Entity, Planning Period), have one metric that represents "the snapshot date to use": backward for history, forward for plan.

Idea: Build two helper metrics: one backward (e.g. "last load month <= this month"), one forward (e.g. "forward-carried load month for plan"). Combine with an active mask and a plan-month filter. Expose a single "effective snapshot date" used by staging.

In staging (data) metrics: Use a single branching point, driven by a global toggle:

```text
IF(
  Populate_History?,   // global toggle
  // History: use backward-propagated snapshot date
  Source_List.'Attribute'
    [BY LASTNONBLANK: Entity_Mapping, Snapshot_Date_Dimension]
    [ADD: Version][FILTER: Is_Actual_Version]
    [BY CONSTANT: 'Spd_Effective_Snapshot_Date_History'],
  // Plan: use forward-propagated snapshot date
  Source_List.'Attribute'
    [BY LASTNONBLANK: Entity_Mapping, Snapshot_Date_Dimension]
    [ADD: Version][FILTER: Is_Actual_Version]
    [BY CONSTANT: 'Spd_Effective_Snapshot_Date_Plan']
)
```

All staging metrics use the same pattern; only the attribute and source change. Snapshot selection and history/plan logic live in the spread layer (`Spd_*` metrics).

### 4.3 Discover blocks and properties in this application

Template names below (e.g. `EE_Load_HRIS`, `Populate_History?`) are illustrative. In a real customer app, lists, toggles, and Scenario / Version properties (such as start and end month for the planning window) have local names and API paths. Before implementing the spread layer:

- Use `tool:search` to locate the snapshot source list, planning dimensions, and any history/plan toggles; read returned summaries and IDs.
- Search again (with `kind` or `regexp` if names collide) for Scenario (or Version) and confirm which properties encode the version window-formulas must reference the actual property names in that workspace.
- After building staging metrics, use `tool:search` to verify that reporting or headcount metrics reference spread-layer metrics only, not the raw snapshot list, if your architecture requires that separation.

Skipping this discovery step often yields a minimal spread layer without version filters, active flags, or downstream metrics that demonstrate the full pattern.

---

## 5. How to apply this elsewhere

1. Identify the snapshot source (list or metric), its snapshot date dimension, and the entity mapping (how to align to your planning entity, e.g. Employee)-using `tool:search` as needed so names match the live app.
2. Define the planning grain (e.g. Version x Employee x Month) and version windows (start/end period per version).
3. Build spread-layer helpers in a dedicated folder:
   - Effective snapshot date for history (backward) and for plan (forward).
   - Spreaded point-in-time attributes (FILLFORWARD + version filter).
   - Active mask (e.g. "entity is active in this period").
   - Plan-month filter to cap the calculation horizon.
4. Implement staging metrics that reference these helpers with `[BY CONSTANT: Spd_Effective_Snapshot_...]` and a single `IF(Populate_History?, ...)` branch.
5. Keep history vs plan and version windows only in the spread layer; do not scatter snapshot selection or window logic in downstream formulas.
6. Cards and stats reference staging (and overrides) and spread helpers only; they do not implement snapshot or time propagation.

---

## 6. Pitfalls and reminders

- Backward spread is approximate: Good for visualizing history from snapshots; not a guarantee of correctness for audit or legal.
- Forward spread is required for planning: Always define a clear rule for which snapshot drives plan/future periods.
- Do not duplicate logic: If every staging metric repeats "which snapshot?" and "history vs plan?", changes become risky and hard to maintain. Centralize in the spread layer.
- Version windows: Apply "only months in version window" once in the spread layer so downstream metrics do not need to repeat version filters.

---

## 7. Illustration: Workforce Planning Template

In the Pigment Workforce Planning Template application, this pattern appears as follows (names are template-specific; the logic is the one described above):

- Snapshot load: `EE_Load_HRIS` with HRIS Load Month and Employee Mapping; attributes include Hire Date, Term Date, Entity, Department, Job Position, Country, State, etc.
- Spread logic (folder 1.3): Metrics such as `EE_Spd_01_Hire Date` (FILLFORWARD of hire date + version window), `EE_Spd_02_Active Employee`, `EE_Spd_03_HRIS Load Month_fwd`, `EE_Spd_04_HRIS Load Month_bwd`, `EE_Spd_99_HRIS Load Month` (effective snapshot month for the view), and `Set_Plan Month View`.
- History vs plan: Toggle `Populate_History?` and optional `Populate_History_Month`; staging metrics use `EE_Spd_99_HRIS Load Month` (history) or `EE_Spd_03_HRIS Load Month_fwd` (plan) via `[BY CONSTANT: ...]`.
- Data staging (1.2): `EE_Data_*` metrics (Entity, Department, Hire Date, etc.) pull from `EE_Load_HRIS` using the spread helpers and the single history/plan branch.
- Cards (2.1): `EE_Card_*` use overrides (`EEO_*`) when defined, else staged data, still anchored via spread helpers.

When extending or replicating this design, use the generic concepts and pipeline above and map them to your own block names and dimensions.

Related skills: [Workforce Planning - Application Architecture & Patterns](./workforce_planning_architecture_patterns.md); [Workforce Planning - Workforce Cards & Mapped Dimensions](./workforce_planning_cards_mapped_dimensions.md); [Workforce Planning - Changelog to Override Metrics](./workforce_planning_changelog_overrides.md).
