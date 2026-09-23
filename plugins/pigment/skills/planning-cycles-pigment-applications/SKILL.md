---
name: planning-cycles-pigment-applications
description: Always use this skill when the user mentions or implies versions, Actual, Actuals, Budget, Budgeting, Forecast, Reforecast, Rolling Forecast, Version, Versioning, Plan, switchover, scenarios, snapshots, planning cycles, Actual/Plan layering, plan vs actual, "create version dimension", "set up versioning", or asks for Actual Budget Forecast best practices - or when they extend realized data into a plan or budget (Actual/Budget/Plan layering, forward forecast from actuals) or need to combine or compare actual and plan versions and periods. Covers Version Dimensions (foundational to all planning applications), Native Scenarios (what-if), and Snapshots (freeze data).
metadata:
  skill_path: /planning-cycles-pigment-applications/SKILL.md
  base_directory: /planning-cycles-pigment-applications
  includes:
    - "*.md"
---

# Planning Cycles in Pigment

Three features handle planning cycles, scenarios, and lifecycle in Pigment. They are complementary, not alternatives. Read first to pick the right one. Jump to the linked deep dives for the procedures.

## When to Use This Skill

Read this skill whenever the user touches metric structure or mentions:

- Versions, Budget, Actual, Forecast, Reforecast, Rolling Forecast
- "Create version dimension", "set up versioning", "best practices for Actual Budget Forecast"
- Switchover, lock, layering Actual with Plan, IsActual / IsPlan / IsVersion
- Native Scenarios, what-if, Optimistic / Pessimistic / Stress
- Snapshots, archiving, closing a planning cycle

---

## Mental Model

Planning lifecycle in Pigment is three orthogonal features at the application level:

- Version Dimension -- custom structural dim on metrics, modeler built
  - Default bootstrap items: `Actual`, `Budget`, `Forecast` (semantic names, no year suffix)
  - For rolling forecast / multi-cycle: cycle-explicit names (`Budget FY<n>`, `Reforecast Q<n> FY<n>`)
  - Mandatory companion: `Version Type` Dimension (Actual, Budget, Forecast, Reforecast, Rolling Forecast, Long Range Planning)
  - Properties: Start / End Month, Switchover Month, Active Version, Lock Version, Version Type
  - Boolean Metrics: IsVersion, IsActual, IsPlan (gate Actual vs Plan layering)
- Native Scenarios -- app-level overlay, not a dimension
  - Optimistic, Pessimistic, Stress
  - Formula Groups for safe formula trials
- Snapshot -- point-in-time copy of the app, used for closed cycles and archives

Invariants:

- The Version Dimension is a custom dimension built by the modeler. It sits in metric structures and drives cross-version formulas, locking, and AR.
- Version Type is mandatory. It enables T&D-safe formula references and avoids hard-coding Version items.
- Native Scenarios are not a dimension. They are an application-level overlay for ad-hoc sensitivity on top of an existing plan.
- Snapshots are copies of an app. They never replace a Version. They freeze a state.
- Do not use the calendar's Actual vs Forecast toggle for planning cycles. Use the Version Dimension Switchover pattern.

---

## Three Distinct Features

| Feature | Use it for | Identity | Read |
|---|---|---|---|
| Version Dimension | Modeling planning cycles (Budget, Forecast, Reforecast, Rolling Forecast). Cross-version formulas, governance, locking. | Regular Dimension created by the modeler. Part of the Metric structure. | [./planning_cycles_versions.md](./planning_cycles_versions.md) |
| Native Scenario | Quick what-if sensitivity on top of an existing model. Safe trialing of formula changes via Formula Groups. | Application-level feature. Not a Dimension. | [./planning_cycles_scenarios.md](./planning_cycles_scenarios.md) |
| Snapshot | Freezing the state of an Application. Closing planning cycles. Archiving. | Point-in-time copy of an Application. | [./planning_cycles_snapshots.md](./planning_cycles_snapshots.md) |

---

## Decisions in Order

1. Identify the intent. Structured plan with governance and cross-plan formulas -> Version Dimension. Ad-hoc sensitivity -> Native Scenario. Archiving a state -> Snapshot.
2. Build the Version Dimension with its mandatory companion `Version Type` Dimension. Default items: `Actual`, `Budget`, `Forecast`. Use cycle-explicit names (`Budget FY<n>`) only for rolling forecast / multi-cycle setups.
3. Add all mandatory properties in one pass: `Start Month`, `End Month`, `Switchover Month`, `Active Version` (Bool), `Lock Version` (Bool), `Version Type` (Dimension). Populate values immediately using calendar and current date.
4. Build the three Boolean Metrics: IsVersion (inside window), IsActual (inside window up to Switchover Month inclusive), IsPlan (inside window after Switchover Month).
5. Deliver everything atomically. Dimension + companion Version Type + properties populated + boolean metrics. Nothing is "phase 2."
6. Wire Access Rights from `Active Version` and `Lock Version`: locked Versions are read-only, active Versions are open for edit. See `skill:securing-pigment-applications`.
7. Use Native Scenarios only for overlays (Optimistic, Pessimistic, Stress) or for trialing formula changes in a Formula Group.
8. Snapshot at lifecycle boundaries. Closing a Budget cycle, year-end, or before a structural rework.
9. Govern the live set. Regularly review and clean up the Version list. Archive locked or outdated Versions via Snapshots.

---

## Versions vs Native Scenarios: Decision

Use a Version Dimension for any structured plan, any cross-plan formula reference, and any per-plan access control.

Use a Native Scenario only for ad-hoc sensitivity (Optimistic, Pessimistic, Stress) on top of an existing plan, or for trialing a new formula in a Formula Group before porting it back to the main model.

MG12: model planning cycles as a Dimension, never as a Native Scenario.

---

## Calendars vs Versions: Do Not Confuse Them

Calendars define the time structure of an application: Month, Quarter, Year, fiscal year, date range. They are configured once via the calendar tools.

Versions are a modeling pattern. A Dimension you create to hold Budget, Actual, Forecast, etc., with Switchover properties and Boolean metrics that gate Actual vs Plan data.

Before setting up versions, ensure the calendar is configured with `Month`, `Quarter`, and `Year`, with Quarter and Year available as properties on Month. If they are missing, complete the calendar setup first. For calendar setup see [`../modeling-pigment-applications/modeling_time_and_calendars.md`](../modeling-pigment-applications/modeling_time_and_calendars.md).

Do not use Calendar tools (`calendar_create`, `calendar_expand`, `calendar_add_time_dimension`, etc.) to implement planning cycles. They configure time, not planning cycles. Do not use the calendar's built-in "Actual vs Forecast" toggle for version-level switchover. For calendar setup see [`../modeling-pigment-applications/modeling_time_and_calendars.md`](../modeling-pigment-applications/modeling_time_and_calendars.md).

---

## Glossary

- Version Dimension: the custom Dimension holding planning cycles. Business-friendly name (`Version`), no `LST_` prefix unless the workspace already uses it.
- Version Item: one row of the Version Dimension. Default bootstrap: `Actual`, `Budget`, `Forecast` (semantic names). Rolling forecast variant: `Budget FY<n>`, `Reforecast Q<n> FY<n>` (cycle-explicit names).
- Version Type: mandatory companion Dimension. Items: `Actual`, `Budget`, `Forecast`, `Reforecast`, `Rolling Forecast`, `Long Range Planning`. Referenced via `VAR_` input Metrics in formulas for T&D / MP02 safety.
- Switchover Month / Year: per-version property marking the last month (or year) of actual data. Plan picks up after it. Only `Month` or `Year`; not Quarter or Date.
- Start Month / End Month: per-version properties defining the planning window of that Version.
- Active Version: Boolean property flagging Versions currently displayed for input or reporting.
- Lock Version: Boolean property flagging Versions locked from edits once approved. Drives the read-only AR rule.
- IsVersion / IsActual / IsPlan: three Boolean metrics over Version x Time. IsVersion = inside the window. IsActual = inside the window up to Switchover Month inclusive. IsPlan = inside the window after Switchover Month.
- Layering: combining Actuals up to Switchover Month with Plan beyond it, inside a single metric.
- Formula Group: a set of formula overrides scoped to a Native Scenario, used to trial alternative logic without touching the base model.
- Shared vs Local Scenario: scope of a Native Scenario (shared across users, or private to one user).
- Live Version: a Version Item currently in active use. Regularly clean up locked or outdated ones.
- Snapshot: point-in-time copy of an Application. Read-only by default.

---

## Critical Rules

- Always read the matching document before building. Do not rely on this SKILL.md summary alone.
- Never use Calendar tools to implement versioning.
- Never use the calendar Actual vs Forecast toggle for version-level switchover. Use the Version Dimension Switchover pattern.
- Never model Budget, Actual or Forecast as Native Scenarios. Use a Version Dimension.
- Never hard-code Version Items in formulas (MP02). Use IsActual / IsPlan or `VAR_` metrics - see [planning_cycles_versions.md](./planning_cycles_versions.md).
- Never use `REMOVE` on Version. Use `FILTER` or `SELECT`.
- Keep the Version Dimension lean. Only keep active Versions in use and locked Versions needed for reference. Regularly review and clean up; archive older Versions via Snapshots.
- Deliver the full setup atomically. Dimension + Version Type + properties populated + boolean metrics in one pass.

---

## Deeper Dives

| Need | Doc |
|---|---|
| Version Dimension setup, bootstrap checklist, switchover, boolean metrics, layering, Do Not, multi-app | [./planning_cycles_versions.md](./planning_cycles_versions.md) |
| Native Scenarios: when to use, Shared vs Local, anti-patterns, combining with Versions | [./planning_cycles_scenarios.md](./planning_cycles_scenarios.md) |
| Snapshots and lifecycle: when to snapshot, cycle workflow, performance budget | [./planning_cycles_snapshots.md](./planning_cycles_snapshots.md) |
| Calendar setup (fiscal year, granularity, date range) | [`../modeling-pigment-applications/modeling_time_and_calendars.md`](../modeling-pigment-applications/modeling_time_and_calendars.md) |
| Modeling foundations (mental model, core concepts) | `skill:modeling-pigment-applications` |
| Architecture (Version Dimension in Hub app) | [`../modeling-pigment-applications/modeling_architecture_design.md`](../modeling-pigment-applications/modeling_architecture_design.md) |
| Access Rights on locked versions | `skill:securing-pigment-applications` |
| Formula patterns (cross-version, layering, MP02) | `skill:writing-pigment-formulas` |
