# Workforce Planning - Application Architecture & Patterns

## Purpose

This document is a reusable pattern for an employee-based workforce planning application. It describes the layered metric architecture, dimension roles, data flows (Existing Employees + To-Be-Hired), override and validation patterns, and naming conventions so another modeler can understand the design and replicate it in new applications.

When to use this pattern

- You are building or extending a workforce planning app that combines:
  - Existing employees (HRIS actuals, spread logic, cards, events, compensation)
  - To-Be-Hired (TBH) (request list, FTE/salary/dates, validation, stats, compensation)
  - Consolidated workforce (headcount, FTE, transfers, comp at Workforce x Dept x Entity x Version x Month)
  - Overrides (Changelog -> override metrics -> staging)
  - Governance (validation status, version close, access rights, merit cycles)
  - Financial alignment (PnL/BS mapping, FX, merit and tax assumptions)

When not to use

- Purely headcount-only models with no compensation or TBH may not need the full layering (e.g. Comp layer, TBH flow).
- Applications that do not use version/scenario dimensions or validation workflows will not need the full scenario and governance patterns described here.

---

## 1. Business scope (summary)

The application covers end-to-end workforce planning:

- Master data: Entities, departments, job positions, chart of accounts (PnL, BS).
- Existing employees: HRIS import -> staging (with spread and history/plan logic) -> overrides (Changelog) -> cards -> events (hires, terms, transfers) -> stats at Employee then Workforce.
- To-Be-Hired: TBH request list with FTE, salary, hire/term date, job position -> validation -> TBH stats (headcount, FTE, terminations) -> mapping to Workforce.
- Total workforce: Consolidated Workforce Cards (entity, department, currency, etc.) and stats at Version x Month x Workforce; reporting by Dept x Entity (and other axes) via mapped dimensions (BY: -> `WF_Card_*`), not by adding those dimensions to every metric. See Workforce Planning - Workforce Cards & Mapped Dimensions.
- Compensation: Salary, bonus, benefits, taxes for EE and TBH; merit and tax assumptions; mapping to PnL/BS; FX conversion for multi-currency.
- Scenario & security: Version dimension (windows, close date), Data Type (Actual/Budget/Forecast), validation dimensions, access rights (ARM/ARC) for edit and approval.

---

## 2. Core concepts (generalized)

| Concept                                 | Description                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layered metric architecture         | Clear separation: Data (load/staging) -> Card (canonical attributes per entity/month) -> Stats (events: hires, terms, transfers) -> Comp (salary, bonus, benefits, taxes) -> Push/KPI (export, counts) and Security (ARM/ARC). Each layer consumes the layer below; no skipping.                                                                                                |
| Two populations                     | Existing Employees (EE): from HRIS (and spread logic) + Changelog overrides. To-Be-Hired (TBH): from a request/list with inputs (FTE, dates, salary). Both feed Workforce-level cards and stats.                                                                                                                                                                                        |
| Data -> Card -> Stats                 | Data resolves raw sources (HRIS, TBH list) to a consistent grain (e.g. Version x Entity x Month). Card fixes attributes at a single "planning load" reference (e.g. one snapshot month per version/month). Stats derive events by comparing cards across months (e.g. entity or department change = transfer).                                                                      |
| Override-first staging              | For EE, staging metrics use IFDEFINED(Override, Override, HRIS_logic). Overrides come from Changelog projection (see skill "Changelog to Override Metrics"). Cards and stats only see the post-override view.                                                                                                                                                                                       |
| Validation dimension                | A dimension (e.g. Validation Status: Draft/Submitted/Approved/Rejected) tags rows or versions. Plan metrics and KPIs filter to Approved only; access rights control who can change status.                                                                                                                                                                                                          |
| Version & scenario dimensions       | Version (or equivalent) holds window start/end, close date, last actuals month. Data Type (Actual/Budget/Forecast) can drive FX or display. Metrics and access rights respect version close and windows.                                                                                                                                                                                    |
| Workforce Cards & mapped dimensions | The 4.0 layer unifies EE + TBH at Version x Month x Workforce. `WF_Card_*` metrics hold each Workforce item's attributes (Entity, Department, Currency). Core stats/comp stay at Workforce only; breakdowns (Dept x Entity, PnL push) use BY: -> `WF_Card_*` so Entity/Department are mapped, not structural. See Workforce Planning - Workforce Cards & Mapped Dimensions. |
| Naming conventions                  | Prefix by domain: `EE_` (existing employee), `TBH_` (to-be-hired), `WF_` (workforce total), `Asm_` (assumptions), `Push_` (export), `KPI_`, `ARM_`/`ARC_` (access rights). Suffix by layer: `_Data`, `_Card`, `_Stats`, `_Comp`, `_Input`, `_Calc`, `_Req_`, `_Rep_`, `_View`.                                                                                                              |

---

## 3. Pipeline (end-to-end)

Existing Employees

```text
HRIS load list -> Data layer (EE_Data_*: resolve by snapshot, history/plan toggle, override-first)
  -> Spread logic (effective snapshot month, FILLFORWARD dates, version window)
  -> Override metrics (EEO_* from Changelog)
  -> Card layer (EE_Card_*: canonical attributes at Version x Employee x Month)
  -> Stats (EE_Stats_*: new hires, terminations, transfer in/out via card comparison)
  -> Workforce aggregation (EE_Stats_* [BY: Employee.Workforce] -> WF_Stats_*)
```

To-Be-Hired

```pigment
TBH request list + TBH_Req_Input_* -> Validation status
  -> TBH_Stats_* (headcount, FTE, terminations; PRORATA by hire/term; filter Approved, plan months; exclude hired)
  -> Workforce mapping (TBH_Stats_* [BY: TBH Requests.Workforce] -> WF_Card_*, WF_Stats_*)
```

Consolidation & output (4.0 Workforce layer)

```pigment
WF_Card_* (unified attributes at Version x Month x Workforce: EE_Card_* or TBH-side cards)
  -> WF_Stats_* at Workforce only (EE_Stats_* [BY: Employee.Workforce] + TBH_Stats_* [BY: TBH Requests.Workforce])
  -> Breakdowns via mapped dimensions: WF_Stats_Headcount [BY: -> WF_Card_Department, WF_Card_Entity], etc.
  -> WF_Comp_* -> WF_Comp Plan Data -> Push_* (map to Entity/Dept/PnL via cards)
  -> KPI_* (export, filled TBH count, changelog count)
```

See Workforce Planning - Workforce Cards & Mapped Dimensions for why core metrics stay at Workforce and how mapping works.

Governance throughout: Validation Status = Approved; version close excluded; ARM/ARC for edit and approval; merit/tax assumptions and FX in dedicated layers.

---

## 4. Folder structure (generic)

A typical ordering that supports the pipeline:

| Folder / area                     | Role                               | Typical content                                                                                                                                                                     |
| --------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin / Dimensions            | Structural and scenario dimensions | Entity, Department, Workforce, Employee, Job Position, Grade, Changelog, TBH Requests, Version, Data Type, Validation Status, Calendar (Month, Quarter), PnL/BS accounts, Currency. |
| Library                       | Cross-app mapping                  | `Push_*` mapping metrics for job position, FTE, etc.                                                                                                                                |
| Actual + Plan View Management | Version and view control           | Version, Data Type, plan window metrics, view load flags.                                                                                                                           |
| FX Currency Conversion        | Multi-currency                     | Currency, FX rate types, FX rates, triangulation, entity currencies.                                                                                                                |
| Data                          | Load and staging                   | HRIS load list; EE spread logic; `EE_Data_*` (override-first); `EEO_*` (Changelog overrides).                                                                                       |
| Existing Employee Planning    | EE cards and events                | `EE_Card_*`; `EE_Stats_*` (new hires, terminations, transfers).                                                                                                                     |
| TBH Planning                  | TBH inputs and stats               | `TBH_Req_Input_*`, `TBH_Req_Calc_*` (validation, TBH ID); `TBH_Stats_*`; `TBH_Comp_*`.                                                                                              |
| Total Workforce               | Consolidation                      | `WF_Card_*`; `WF_Stats_*`; `WF_Comp_*`; WF_Comp Plan Data.                                                                                                                          |
| KPI                           | Counts and governance              | KPI_TBH_Rep_Filled Count, KPI_ChangelogCount_emp, completeness flags.                                                                                                               |
| Security                      | Access rights                      | `ARM_*`, `ARC_*`, `MAP_*` (e.g. merit cycle, TBH approval).                                                                                                                         |
| Boards                        | UX                                 | Homepage, Employee Directory, TBH Requests, Merit Management, Settings, Security.                                                                                                   |

---

## 5. Metric layers (patterns)

### 5.1 Data layer (`EE_Data_*`, resolution to Version x Employee x Month)

Role: Resolve HRIS (and spread) to planning grain; apply history vs plan; apply override-first.

Pattern (schematic):

```text
IF(Populate_History?,
  Source_list.'Attribute'
    [BY LASTNONBLANK: Entity_Mapping, Snapshot_Date]
    [ADD: Version][FILTER: Is_Actual]
    [BY CONSTANT: Spd_Effective_Snapshot_History],
  Source_list.'Attribute'
    [BY LASTNONBLANK: Entity_Mapping, Snapshot_Date]
    [ADD: Version][FILTER: Is_Actual]
    [BY CONSTANT: Spd_Effective_Snapshot_Plan]
)
```

Override-first is applied when the attribute can be overridden: IFDEFINED(`EEO_*`, `EEO_*`, <above>). See "Snapshot Spread Logic" and "Changelog to Override Metrics" skills.

### 5.2 Card layer (`EE_Card_*`, `WF_Card_*`)

Role: Canonical attributes at Version x Entity x Month (EE) or Version x Month x Workforce (WF). EE cards fix to one "planning load" snapshot; WF cards unify EE + TBH so every Workforce item has Entity, Department, Currency, etc. without adding those dimensions to core metrics.

Pattern (EE): Card_Attribute = Data_Attribute [BY CONSTANT: Spd_Effective_Snapshot_Month].

Pattern (WF): WF_Card_Attribute = IFDEFINED(EE_Card_Attribute[BY CONSTANT: Workforce.Employee], same, WF_Card_Attribute_TBH). TBH-side cards use TBH_Stats_FTE or list properties mapped via Workforce.TBH. Breakdowns (e.g. headcount by Dept x Entity) use core metric [BY: -> WF_Card_Department, WF_Card_Entity]. Full pattern: Workforce Planning - Workforce Cards & Mapped Dimensions.

### 5.3 Stats layer (`EE_Stats_*`, `TBH_Stats_*`, `WF_Stats_*`)

Role: Events (new hire, termination, transfer in/out) and levels (headcount, FTE).

EE events (schematic): Compare cards across months. Example transfer out:

```text
IF(
  (EE_Card_Entity <> EE_Card_Entity[SELECT: Month + 1]) OR
  (EE_Card_Department <> EE_Card_Department[SELECT: Month + 1]),
  -1
)
```

New hire / termination: presence in current month but not previous (or reverse). Use +1/-1 flags then aggregate at Workforce.

TBH stats: `PRORATA(Month, STARTOFMONTH(Hire Date), STARTOFMONTH(Term Date + 1)) * ROUNDUP(FTE, 0) [Set_Plan Month View] [BY: Validation Status -> Approved]`. Exclude rows already linked to a hired employee.

WF stats: `EE_Stats_... [BY: Employee.Workforce] [FILTER: Validation Status = Approved] + TBH_Stats_... [BY: TBH Requests.Workforce]`. Keep `WF_Stats_...` at Workforce only. Breakdowns: `WF_Stats_Headcount_Dep_Entity = WF_Stats_Headcount [BY: -> WF_Card_Department, WF_Card_Entity]` (mapped dimensions). See Workforce Planning - Workforce Cards & Mapped Dimensions.

### 5.4 Comp layer (`WF_Comp_*`, `TBH_Comp_*`)

Role: Salary, bonus, benefits, taxes by Workforce (or TBH) x Version x Month; apply merit and tax assumptions; map to PnL/BS.

Pattern (PnL export): `(WF_Comp_01_Salary[BY: PnL_Account."6001"] + WF_Comp_01_Bonus[BY: PnL_Account."6002"] + ...) [SELECT: Validation Status."Approved"] [Push_DH_View_Load Plan]`.

### 5.5 KPI & Security layers

KPI: Counts (e.g. filled TBH per Dept/Entity; pending changelog per Employee). IFDEFINED(...) or IFBLANK(Changelog[BY: ...][FILTER: ...][REMOVE COUNT: Changelog], 0).

Security: `ARM_*` (read/write by User, optionally Department/Entity). `ARC_*` (input flags for approval). `MAP_*` (e.g. merit cycle: editable only when cycle month matches and version not closed). ACCESSRIGHTS(TRUE, TRUE) / ACCESSRIGHTS(TRUE, BLANK) with IF(Admin, ..., IF(ARC_Input, ..., BLANK)).

---

## 6. Dimension framework

- Structural: Entity, Department, Workforce, Employee, Job Position, Grade, State, Country. Used for org and reporting axes.
- Scenario: Version (window start/end, close date, last actuals month), Data Type (Actual/Budget/Forecast). Version drives which months are calculated and whether a version is frozen.
- Time: Month, Quarter, Month of Year, Quarter of Year. Properties: Start Date, End Date, mapping to Year.
- Financial: PnL_Account, PnL_Account Category, BS_Account, BS_Account Class/Category. Operator for sign. Currency, FX Rate Types, Reporting Currency.
- Validation / workflow: Validation Status (Draft/Submitted/Approved/Rejected). Used to filter plan metrics and KPIs and to drive access (who can approve).
- Security: User (Name, Email, ID). Access rights metrics by User (and optionally Department, Entity).

Metrics rarely use Pigment native Scenarios for business logic; Version and Data Type dimensions model scenarios; application-level Scenarios can be used for sandboxing.

---

## 7. Key modeling patterns

- Driver-based events: Derive hires, terms, transfers from card comparison across months (SELECT: Month + 1), not from manual event flags.
- PRORATA for FTE: Allocate FTE across months from hire to term using PRORATA(Month, STARTOFMONTH(Hire Date), STARTOFMONTH(Term Date + 1)); use TIMEDIM for date-period alignment.
- Validation filtering: All plan-facing metrics and exports filter to Validation Status = Approved (and exclude after version close where relevant).
- Override-first: Staging = IFDEFINED(Override, Override, Source). Cards and stats never implement override logic; they consume staging.
- Access rights by cycle/version: Merit (or similar) inputs editable only when (e.g.) Month of Year matches merit cycle and Version has no Close Date. Use `MAP_*` metrics with EXCLUDE/ADD to scope ACCESSRIGHTS.
- Workforce Cards & mapped dimensions: Keep core stats/comp at Workforce (plus Version, Month, Validation). Attach Entity, Department, Currency via `WF_Card_*`. Report by Dept x Entity (or PnL, etc.) with BY: -> `WF_Card_*` so those axes are mapped, not structural. See Workforce Planning - Workforce Cards & Mapped Dimensions.
- Naming: Prefix by domain (`EE_`, `TBH_`, `WF_`, `Asm_`, `Push_`, `KPI_`, `ARM_`/`ARC_`); suffix by layer (`_Data`, `_Card`, `_Stats`, `_Comp`, `_Input`, `_Calc`, `_Req_`, `_Rep_`, `_View`). Folder order: Admin/Dimensions -> Data -> EE Planning -> TBH Planning -> Total Workforce -> KPI -> Security -> Boards.

---

## 8. How to apply this pattern elsewhere

1. Replicate the layered folder structure: Data -> Cards -> Stats -> Comp -> Push/KPI -> Security; keep Admin/Dimensions and Calendar/FX at the top.
2. Define dimension roles clearly: Structural (org, workforce), scenario (Version, Data Type), time (Month, Quarter), financial (PnL/BS, Currency), validation, User.
3. Model events from cards: Use card comparison (SELECT: Month + 1) for transfers and presence for hires/terms; avoid ad-hoc event flags.
4. Isolate assumptions: Keep user inputs in `Asm_*` or `_Input_*` metrics and dedicated lists; reference them in Comp and driver logic.
5. Use validation and access rights: Validation Status dimension; filter to Approved in plan metrics; ARM/ARC for edit and approval; version close and cycle-based access (`MAP_*`).
6. Implement the 4.0 Workforce layer: Unify EE + TBH in a Workforce dimension; build `WF_Card_*` for attributes; keep `WF_Stats_*` and `WF_Comp_*` at Workforce only; use BY: -> `WF_Card_*` for breakdowns (mapped dimensions). See Workforce Planning - Workforce Cards & Mapped Dimensions.
7. Adopt the naming conventions: Prefix by domain, suffix by layer; consistent folder ordering.

---

## 9. Pitfalls and reminders

- Do not skip layers. Every layer builds on the one below (Data -> Card -> Stats -> Comp -> Push/KPI). Jumping from Data directly to Stats bypasses overrides and card canonicalization.
- Override-first belongs in staging only. Cards and stats consume staging; they never reference Changelog or override metrics directly.
- Keep WF_Stats and WF_Comp at Workforce only. Use `BY: -> WF_Card_*` for breakdowns (mapped dimensions); do not add Entity or Department as structural dimensions to core metrics.
- Naming discipline. Consistent prefixes (`EE_`, `TBH_`, `WF_`, `Asm_`, `Push_`, `KPI_`, `ARM_`/`ARC_`) and suffixes (`_Data`, `_Card`, `_Stats`, `_Comp`) prevent confusion as the model grows.
- Version close. Ensure all relevant metrics and access rights respect version close; a single missing filter can allow edits on a frozen version.

---

## 10. Illustration: Workforce Planning Template

In the Pigment [FIN]02 Workforce Planning - Employee based application, the pattern above is implemented as follows (names are template-specific).

Folders: 0. Admin (Dimensions, Library); 01. Actual + Plan View Management; 02. FX Currency Conversion; Calendar; 10. Business Dimensions; 11. Chart of Accounts; 1. Data (EE*Load_HRIS, spread 1.3, overrides 1.4); 2. Existing Employee Planning (`EE_Data*_`, `EE*Card*_`, `EE*Stats*_`); 3. TBH Planning (`TBH*Req*_`, `TBH*Stats*_`, `TBH*Comp*_`); 4. Total Workforce (`WF*Card*_`, `WF*Stats*_`, `WF*Comp*\_`, WF_Comp Plan Data); 5. KPI; Security (`ARM\_\_`, `ARC\_\*`, MAP_Cycle2); Boards.

Key blocks: `EE_Load_HRIS` (HRIS load list); Changelog (change requests -> `EEO_...`); TBH Requests (TBH list + `TBH_Req_Input_...`, `TBH_Req_Calc_...`); `EE_Spd_...` (spread logic); `EE_Data_...`, `EE_Card_...`, `EE_Stats_...`; `EEO_...`; `TBH_Stats_...`, `TBH_Comp_...`; `WF_Card_...`, `WF_Stats_...`, `WF_Comp_...`; `KPI_ChangelogCount_emp`, `KPI_TBH_Rep_Filled Count`; ARM_Department_Read/Write, ARM_Entity x Department_Read/Write, ARM_Valid_TBH Req Approval_Write, MAP_Cycle2 (merit).

Flows: HRIS -> `EE_Data_...` (with Populate*History?, EE_Spd_99 / EE_Spd_03) -> `EEO_` override-first -> `EE_Card_...` -> `EE_Stats_...` -> `WF_Stats_...[BY: Employee.Workforce]`. TBH Requests -> TBH_Req_Calc_03_Validation ->`TBH_Stats_...` (PRORATA, Set_Plan Month View, Approved) -> WF_Card_Entity_TBH,`WF_Stats_...`. Changelog -> `EEO_...`->`EE_Data_...` (IFDEFINED). Merit/tax:`Asm_Input_...`, `EE_MI_...`, `TBH_MI_...` -> `WF_Comp_...`, `TBH_Comp_...`; MAP_Cycle2 controls merit edit access. The 4.0 Total Workforce layer (`WF_Card_...`, stats at Workforce only, breakdowns via BY: -> `WF_Card_...`) is detailed in Workforce Planning - Workforce Cards & Mapped Dimensions.

Related skills: [Workforce Planning - Snapshot Spread Logic](./workforce_planning_snapshot_spread.md); [Workforce Planning - Changelog to Override Metrics](./workforce_planning_changelog_overrides.md); [Workforce Planning - Workforce Cards & Mapped Dimensions](./workforce_planning_cards_mapped_dimensions.md).
