# Workforce Planning - Changelog to Override Metrics

## Purpose

This use case describes how to model change requests for master data (e.g. employee transfers, salary updates, term dates) as rows in a Changelog dimension, then project those rows into override metrics at planning grain (e.g. Version x Employee x Month). Staging metrics use an override-first pattern (IFDEFINED(Override, Override, Source)), so cards and stats consume a single, consistent view of data without caring whether it came from the changelog or from the primary source (e.g. HRIS).

When to use this pattern

- Users request discrete changes to master data (new department, entity, job position, salary, term date) with an effective period (e.g. "active as of month X").
- You want to separate data collection and workflow (who requested, validation status, audit) from impact on planning (overrides applied in staging, then cards and stats).
- You need governance: only approved changes apply; changes after version close are excluded; inputs can be locked after "send for validation."

When not to use

- If all master data is edited directly on the source (e.g. HRIS) with no approval workflow, you may not need a Changelog dimension.
- If changes are bulk imports without per-row effective dates or workflow, a simpler override or replace logic may suffice.

---

## 1. Problem in plain terms

- Need: Users submit change requests (e.g. "Move Jane to Department X as of March") that must become effective in planning at a given time, often after validation.
- Challenge: The primary source (e.g. HRIS) is snapshot-based; change requests are events (one row per change). Planning metrics are on a grid (Version x Employee x Month). You must turn events into overrides on that grid.
- Design choice: Model each change as a row in a dimension (Changelog) with properties: who is affected, which version, what new value, when effective, workflow status. Then use calculated metrics to project those rows into override metrics at planning grain. Staging uses override-first: if an override exists, use it; else use primary source. Downstream (cards, stats) only see the result.

### Discover blocks in this workspace

Template names in this skill are illustrative. Before creating a Changelog dimension, override metrics, or governance formulas, resolve real objects in the customer app:

- Use `tool:search` to find existing Worker, Employee, Scenario / Version, Department, and any primary-source blocks (e.g. HRIS or staging metrics) you must reference; use `kind` or `regexp` when names are similar.
- Confirm freeze / validation and effective date properties on Scenario and Changelog-property API names differ by app; use `tool:search` (and filters) until returned summaries show the property names you need.
- Prefer extending existing lists and metrics that match the pattern over introducing duplicate blocks with new names.

---

## 2. Core concepts (generalized)

| Concept                    | Description                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changelog dimension    | A dimension where each item = one change request. Properties hold: target entity (e.g. Employee), target version (Version), effective period (e.g. Active as of -> Month), new values (New Department, New Entity, New Salary, New Term Date, etc.), workflow (Send for validation, Validation Status), and audit (Created on, Created by).                                            |
| Effective period       | When the change applies. Often "active as of" a given month: the change affects that month and all future months in scope. Some attributes (e.g. term date) are a single date; projection logic may differ.                                                                                                                                                                               |
| Override metrics       | Metrics at planning grain (Version x Entity x Month) that hold the new value from the changelog where a change applies, and are blank elsewhere. Built by projecting Changelog rows: filter to approved, exclude after version close, ADD Month, EXCLUDE months before effective, then BY LASTNONBLANK per entity to get "latest applicable change" per (Version, Entity, Month). |
| Projection             | Turning dimension rows (change events) into time-series overrides: extend each row over months from "active as of" onward, then pick the latest change per entity per month.                                                                                                                                                                                                              |
| Override-first staging | Staging metrics that feed cards use: IFDEFINED(Override_metric, Override_metric, Primary_source_logic). So the primary source (e.g. HRIS) is only used when there is no override.                                                                                                                                                                                                         |
| Governance             | Filters and access rights: only approved rows contribute to overrides; rows created after version close are excluded (Changelog_Excludeversion); inputs locked after "send for validation"; only certain roles can set Validation Status.                                                                                                                                     |

---

## 3. Pipeline (generic)

| Layer                    | Role                            | Typical content                                                                                                                                                                                                                |
| ------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Changelog dimension  | Change requests                 | Properties: target entity, version, effective month, new values (department, entity, job position, salary, term date, etc.), workflow flags, validation status, audit (created on, by).                                        |
| Governance metrics   | Filter & security               | Which rows are valid (approved, not after version close); who can edit vs approve; lock after submit.                                                                                                                          |
| Override metrics     | Projection to planning grain    | One metric per overridable attribute. Formula: Changelog.'New X' [FILTER: Approved] [EXCLUDE: after version close] [ADD: Month] [EXCLUDE: Month < Active as of] [BY LASTNONBLANK: Entity]. Result at Version x Entity x Month. |
| Staging              | Override-first                  | IFDEFINED(Override, Override, Primary_source). Primary source = e.g. HRIS or spread logic.                                                                                                                                     |
| Cards                | Canonical attributes            | Built from staging (and spread helpers if needed). Already contain overrides.                                                                                                                                                  |
| Stats & aggregations | Transfers, headcount, FTE, etc. | Use only cards (and derived metrics). They automatically respect overrides.                                                                                                                                                    |

---

## 4. Pattern: three building blocks

### 4.1 Changelog row structure

Each changelog item represents one change request. Typical properties:

- Identity & target: Entity (e.g. Employee), Version.
- Effective timing: Active as of -> Month (and optionally a derived "effective date" from that month's start).
- New values: One property per overridable attribute (New Department, New Entity, New Job Position, New Salary, New Term Date, etc.).
- Workflow: Send for validation (Boolean), Validation Status (e.g. Pending / Approved / Rejected).
- Audit: Created on, Created by (and optionally "current state" at creation time, e.g. current department at Created on, for context).

This gives every row enough information to know who is affected, which version, what the change is, when it becomes active, and whether it is valid to apply.

### 4.2 Projecting changes to planning grain (override metrics)

Goal: For each (Version, Entity, Month), get the latest approved change that is effective in that month (i.e. Active as of <= Month), if any.

Generic pattern for "from month X onward" attributes (e.g. entity, department, job position, salary):

```pigment
Changelog.'New [Attribute]'
  [FILTER: Changelog.'Validation Status' = Validation_Status."Approved"]
  [BY: -> Changelog.Version]
    [EXCLUDE: Changelog_Excludeversion]     // exclude rows created after version close
  [ADD: Month]
    [EXCLUDE: Month < Changelog.'Active as of']   // only from effective month onward
  [BY LASTNONBLANK ON Changelog.'Created on': Changelog.Entity]   // or ON Changelog.ID
```

- FILTER: Only approved rows.
- EXCLUDE Changelog_Excludeversion: Implemented as a metric (e.g. TRUE when Changelog.'Created on' > Version.'Close Date'); excludes rows that must not affect a closed version.
- ADD Month then EXCLUDE Month < Active as of: Each change is extended over all months from its effective month onward; before that, the change does not apply.
- BY LASTNONBLANK: For each (Version, Entity, Month), keep the latest change (by Created on or ID). That yields one override value per (Version, Entity, Month) where a change applies.

Single-date attributes (e.g. term date): The override may represent a single date per employee per version, but is still exposed at (Version x Entity x Month) so downstream can use it per month (e.g. for prorata, headcount). Use LASTNONBLANK by Created on or ID to pick the latest approved term-date change per employee, then map to Month as needed (e.g. BY LASTNONBLANK on TIMEDIM(Created on, Month)) so the result is at planning grain.

### 4.3 Override-first in staging

Staging metrics that feed cards should not duplicate workflow or projection logic. They only choose between override and primary source:

```pigment
IFDEFINED(
  Override_metric,      // e.g. EEO_Entity
  Override_metric,
  Primary_source_logic  // e.g. HRIS or spread-layer attribute
)
```

Cards and stats then reference staging (and spread helpers if needed). They always see the post-override value; no need to reference the Changelog or override metrics directly.

---

## 5. Governance (filters and access rights)

- Which rows apply:
  - Validation Status = Approved.
  - Changelog_Excludeversion: exclude rows where Created on > Version.'Close Date' (or equivalent) so closed versions are not affected.

- Who can do what:
  - Lock after submit: When "Send for validation" is TRUE, set write access to BLANK so the row cannot be edited.
  - Who can approve: A separate metric (e.g. Allow_validation_write) grants write on Validation Status only to Admins or users with an approval role; other users have BLANK.

- Monitoring: A KPI per entity (e.g. count of changelog rows "pending" - sent for validation but not yet approved/rejected) helps users see what is awaiting action.

Implement these once; override and staging formulas only reference the result of governance (e.g. FILTER Approved, EXCLUDE Changelog_Excludeversion), not the full workflow logic.

---

## 6. How to apply this elsewhere

1. Define the Changelog dimension with properties: target entity, version, effective period (e.g. Active as of -> Month), new values for each overridable attribute, workflow (submit, validation status), audit (created on, by).
2. Add governance metrics: Validation Status = Approved; exclude rows after version close; access rights to lock after submit and to control who can approve.
3. Build one override metric per overridable attribute using the projection pattern: Approved only, EXCLUDE after version close, ADD Month, EXCLUDE Month < Active as of, BY LASTNONBLANK per entity (and adjust for single-date attributes like term date).
4. Implement staging as override-first: IFDEFINED(Override, Override, Primary_source). Do not repeat projection or workflow logic in staging.
5. Drive cards and stats only from staging (and spread logic). They must not reference Changelog or overrides directly; they consume the post-override view.
6. Close the loop: KPIs for pending changes; access rights for edit vs approve; version close respected in Changelog_Excludeversion.

---

## 7. Pitfalls and reminders

- Do not duplicate governance in every formula. Filter to approved and exclude-after-close once in the override metrics; staging and downstream stay simple.
- Override-first in one place. Staging is the only layer that chooses override vs primary source; cards and stats stay agnostic.
- Single-date vs from-month-onward. Most attributes "apply from month X onward"; term date (and similar) may need a different projection (latest event per entity, then expose at Month grain for downstream).
- Version close. Exclude changelog rows created after version close so frozen versions are not modified by late entries.

---

## 8. Illustration: Workforce Planning Template

In the Pigment Workforce Planning Template, this pattern appears as follows (names are template-specific):

- Changelog dimension: Items = change requests. Properties include Employee, Version, Active as of -> Month, New Department, New Entity, New Job Position, New Salary (FY), New Term Date, Send for validation, Validation Status, Created on, Created by, etc. "Current Department (AR)" / "Current Entity" are contextual metrics (card value at Created on) for display.
- Governance: ARM_LockInputs_Changelog (lock write when Send for validation); ARM_Changelog_Allow_validation_write (who can set Validation Status); Changelog_Excludeversion (TRUE when Created on > Version.'Close Date'); KPI_ChangelogCount_emp (pending count per employee).
- Override metrics (`EEO_*`): EEO_Entity, EEO_Department, EEO_JobPosition, EEO_Salary, EEO_Term_Date, EEO_TransferDate. Same projection pattern: approved only, EXCLUDE Changelog_Excludeversion, ADD Month, EXCLUDE Month < Active as of, BY LASTNONBLANK (on Created on or ID) per Employee. EEO_Term_Date uses a variant for single-date (LASTNONBLANK by ID and by TIMEDIM(Created on, Month)).
- Staging (`EE_Data_*`): e.g. EE_Data_Term Date = IFDEFINED(EEO_Term_Date, EEO_Term_Date, HRIS term date logic). Same for Entity, Department, Job Position, Salary.
- Cards (`EE_Card_*`): Built from `EE_Data_*` and spread helpers (e.g. BY CONSTANT: EE_Spd_99_HRIS Load Month). Already include overrides.
- Stats (`EE_Stats_*`, `WF_Stats_*`): Transfer and headcount logic compare `EE_Card_Entity`, `EE_Card_Department` across months; they automatically respect `EEO_*` because cards already do.

When extending or replicating this design, use the generic concepts and pipeline above and map them to your own block and dimension names.

Related skills: [Workforce Planning - Application Architecture & Patterns](./workforce_planning_architecture_patterns.md); [Workforce Planning - Workforce Cards & Mapped Dimensions](./workforce_planning_cards_mapped_dimensions.md); [Workforce Planning - Snapshot Spread Logic](./workforce_planning_snapshot_spread.md).
