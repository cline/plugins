# Workforce Planning - Workforce Cards & Mapped Dimensions

## Purpose

This use case describes the 4.0 layer of a workforce planning application: Workforce Cards that provide a unified view at Version x Month x Workforce, and the mapped-dimensions pattern that lets you report by Entity, Department, PnL, etc. without adding those dimensions to every core metric. The core model stays on Employee x Month x Version (existing employees) and TBH Requests x Month x Version (to-be-hired); the Workforce layer lifts both into a single dimension and attaches attributes via card metrics; reporting then uses BY: -> Card_Attribute to project metrics along those attributes when needed.

When to use this pattern

- You have two populations (e.g. Existing Employees and To-Be-Hired) that must be reported together as one workforce (headcount, FTE, comp, events).
- You want flexible reporting by Entity, Department, or other axes without hard-coding those dimensions into every stats/comp metric.
- You want to keep core metrics on a small set of driver dimensions (Employee, TBH Requests, then Workforce) and only "map" to richer dimensions where needed.

When not to use

- Single-population models (e.g. only employees, no TBH) may not need a unified Workforce dimension; a single "card" layer per population can suffice.
- If every report always needs the same fixed axes (e.g. always Dept x Entity), you might embed those in the metric structure-at the cost of sparsity and complexity; the mapped pattern is still usually preferable.

---

## 1. Problem in plain terms

- Core data lives at: Version x Employee x Month (EE) and Version x TBH Requests x Month (TBH). Adding Entity, Department, PnL, etc. as structural dimensions to every metric would create huge sparsity, complex formulas, and heavy access-rights logic.
- Need: A single "total workforce" view (headcount, FTE, comp, events) that can be sliced by Entity, Department, or other axes on demand, without bloating the core.
- Design: Introduce a Workforce dimension that unifies Employee and TBH (each Workforce item is either employee-backed or TBH-backed). Build Workforce Card metrics (WF_Card_Entity, WF_Card_Department, WF_Card_Currency, ...) that hold the attribute of each Workforce item for that Version x Month. Keep stats and comp at Workforce only. When you need a breakdown, map the metric using BY: -> WF_Card_Department, WF_Card_Entity (and similar). No extra structural dimensions on the core metric.

---

## 2. Core concepts (generalized)

| Concept                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workforce dimension | A dimension that unifies the two populations. Each item is either employee-backed (linked via a property to Employee) or TBH-backed (linked to TBH Requests). Mapping: Employee -> Workforce via e.g. Workforce[BY FIRSTNONBLANK: Workforce.Employee]; TBH Requests -> Workforce via Workforce[BY FIRSTNONBLANK: Workforce.TBH].                                                                                                                                |
| Workforce Cards     | Metrics at Version x Month x Workforce that hold one attribute per Workforce item (Entity, Department, Currency, etc.). They are calculated: for employee-backed rows, pull from `EE_Card_*` [BY CONSTANT: Workforce.Employee]; for TBH-backed rows, use a TBH-side card (e.g. WF_Card_Entity_TBH from TBH_Stats_FTE or TBH Requests.Entity). So Workforce is "decorated" by attributes without adding Entity/Department as structural dimensions to the app. |
| Mapped dimensions   | Reporting axes (Entity, Department, PnL_Account, etc.) that are not in the structure of core metrics. You get them by mapping: Core_metric [BY: -> WF_Card_Department, WF_Card_Entity]. This redistributes the metric along the card values (each Workforce item contributes to the Dept x Entity implied by its cards).                                                                                                                                      |
| Core stays lean     | Core stats and comp metrics are defined only at Workforce (and Version, Month, Validation Status where relevant). Entity, Department, etc. appear only in derived metrics that use BY: -> cards. So the "engine" has minimal dimensions; richness comes at the mapping step.                                                                                                                                                                                      |

---

## 3. What Workforce Cards do (4.0 layer)

Role: For any (Version, Month, Workforce item), answer: "What is this item's Entity / Department / Currency / ...?" so downstream metrics and reports never need to know whether the row is EE or TBH.

Pattern for a unified attribute (e.g. Entity):

- WF_Card_Entity = IFDEFINED(EE_Card_Entity[BY CONSTANT: Workforce.Employee], EE_Card_Entity[BY CONSTANT: Workforce.Employee], WF_Card_Entity_TBH)
  -> If this Workforce row is employee-backed, use EE_Card_Entity; else use the TBH-side entity card.

- WF_Card_Entity_TBH = IFDEFINED(TBH_Stats_FTE[REMOVE: Validation Status][BY: TBH Requests.Workforce], TBH Requests.Entity[BY CONSTANT: Workforce.TBH])
  -> If there is FTE for this TBH row, use it to carry the mapping; else use the list property TBH Requests.Entity mapped to Workforce via Workforce.TBH.

Pattern for Department: Same idea: IFDEFINED(EE_Card_Department[BY CONSTANT: Workforce.Employee], ..., IFDEFINED(WF_Stats_FTE[REMOVE: Validation Status], TBH Requests.Department[BY CONSTANT: Workforce.TBH])).

So for any Workforce item (employee or TBH), you have a single set of card metrics (Entity, Department, Currency, ...) that give its attributes for that Version x Month. All "decoration" is computed, not structural.

---

## 4. How this keeps the core on Employee x Month x Version (and TBH x Month x Version)

- Heavy logic (events, FTE, compensation) stays where it's natural:
  - EE: Version x Employee x Month
  - TBH: Version x TBH Requests x Month

- Lift to Workforce with simple aggregation:
  - WF_Stats_Headcount = EE_Stats_Headcount[BY: Employee.Workforce][BY: Validation Status."Approved"] + TBH_Stats_Headcount[BY: TBH Requests.Workforce]
  - Same idea for FTE, new hires, terminations, transfers, comp.

- Do not add Entity, Department, etc. as structural dimensions to `WF_Stats_*` or `WF_Comp_*`. Instead:
  - Keep them at Workforce (plus Version, Month, Validation Status where needed).
  - When you need a breakdown: Metric at Workforce then map via cards: e.g. WF_Stats_Headcount_Dep_Entity = WF_Stats_Headcount [BY: -> WF_Card_Department, WF_Card_Entity].

So the core engine has only Employee, TBH Requests, and Workforce as the main driver dimensions; all richer axes come from mapping.

---

## 5. Mapped dimensions in practice

Headcount by Dept & Entity

- WF_Stats_Headcount_Dep_Entity = WF_Stats_Headcount [BY: -> WF_Card_Department, WF_Card_Entity]
  Source: at Workforce. Target: Department x Entity (and remaining dims). Each Workforce item contributes to the (Department, Entity) given by its cards.

Push to P&L / financial

- Push_WF_Workforce Plan Data = WF_Comp Plan Data [BY: Workforce -> WF_Card_Entity, WF_Card_Department]
  Compensation at Workforce is mapped to Entity x Department (and then typically to PnL_Account in a later step) via the same card pattern.

Why not add structural dimensions everywhere

- If you put Entity x Department (and more) into every stats/comp metric you get: large sparsity, bigger formulas, more complex filters and access rights, and harder refactoring when you add a new axis. With mapped dimensions, you only project when needed.

---

## 6. Why unify Employee & TBH into one Workforce dimension

- Single set of "total" metrics: One WF_Stats_Headcount (and FTE, new hires, terms, transfers, comp) that already combines EE + TBH. All further analysis (by Dept, Entity, cost, etc.) works on that single number.

- Consistent events & KPIs: `WF_Stats_*` metrics map `EE_Stats_*` via Employee.Workforce and add `TBH_Stats_*` via TBH Requests.Workforce. From the reporting layer there is only "workforce events," not two parallel trees.

- Unified UX: Boards can show one grid at Version x Month x Workforce or by mapped dimensions, without separate Employee vs TBH sections.

- Security & governance: Security mapping metrics (e.g. `SEC_WF_Card_Entity` = WF*Card_Entity, SEC_WF_Card_Department = WF_Card_Department) let you express access rights once at Workforce level; they apply consistently to EE- and TBH-backed rows and to all `WF_Stats*_`, `WF*Comp*_`, and push metrics that use the cards.

---

## 7. How to apply elsewhere

1. Define a Workforce dimension that links to both populations (e.g. Workforce.Employee, Workforce.TBH). Ensure every Employee and every TBH request maps to exactly one Workforce item (BY FIRSTNONBLANK).
2. Build Workforce Card metrics at Version x Month x Workforce for every attribute you need for reporting (Entity, Department, Currency, ...). Use IFDEFINED(`EE_Card_*`[BY CONSTANT: Workforce.Employee], ..., TBH_side_card) so both populations are covered.
3. Keep core stats and comp at Workforce (plus Version, Month, Validation). Do not add Entity/Department/etc. to their structure.
4. Create "breakdown" metrics only where needed: Core_metric [BY: -> WF_Card_Department, WF_Card_Entity] (and similar for PnL, etc.).
5. Use the same cards for security (e.g. SEC_WF_Card_Entity, SEC_WF_Card_Department) so access rights are defined once and apply to all metrics that depend on Workforce.

---

## 8. Pitfalls and reminders

- Do not add Entity, Department, or other "rich" axes as structural dimensions to `WF_Stats_*` or `WF_Comp_*`. Use `BY: -> WF_Card_*` for breakdowns; structural dimensions bloat every metric and complicate access rights.
- Every Employee and TBH Request must map to exactly one Workforce item (BY FIRSTNONBLANK). Duplicate or missing mappings silently break totals.
- `WF_Card_*` metrics must cover all Workforce items (both EE- and TBH-backed). If the TBH-side card is blank for some rows, mapped breakdowns will lose those rows.
- Security cards (`SEC_WF_Card_*`) must mirror `WF_Card_*`. If they diverge, access rights will not match the actual data groupings.

---

## 9. Illustration: Workforce Planning Template

In the Pigment Workforce Planning Template, the 4.0 Total Workforce folder implements this pattern as follows (names are template-specific):

- Workforce Cards: WF_Card_Entity, WF_Card_Department, WF_Card_Currency at Version x Month x Workforce. WF_Card_Entity = IFDEFINED(EE_Card_Entity[BY CONSTANT: Workforce.Employee], ..., WF_Card_Entity_TBH). WF_Card_Entity_TBH = IFDEFINED(TBH_Stats_FTE[REMOVE: Validation Status][BY: TBH Requests.Workforce], TBH Requests.Entity[BY CONSTANT: Workforce.TBH]).
- Core stats at Workforce only: WF_Stats_Headcount, WF_Stats_FTE, WF_Stats_New Hires, WF_Stats_Terminations, WF_Stats_Transfer In/Out. No Entity or Department on these metrics.
- Mapped breakdowns: WF_Stats_Headcount_Dep_Entity = WF_Stats_Headcount [BY: -> WF_Card_Department, WF_Card_Entity]. Push_WF_Workforce Plan Data = WF_Comp Plan Data [BY: Workforce -> WF_Card_Entity, WF_Card_Department].
- Security: SEC_WF_Card_Entity, SEC_WF_Card_Department mirror the cards for access rights at Workforce level.

When extending or replicating this design, use the generic concepts and pipeline above and map them to your own block and dimension names.

Related skills: [Workforce Planning - Application Architecture & Patterns](./workforce_planning_architecture_patterns.md); [Workforce Planning - Changelog to Override Metrics](./workforce_planning_changelog_overrides.md); [Workforce Planning - Snapshot Spread Logic](./workforce_planning_snapshot_spread.md).
