# OPEX Planning - Application Architecture & Patterns

## Purpose

This document is a reusable blueprint for an OPEX (operating expense) planning application built around driver-based forecasting at a fixed planning grain (e.g. Entity x Department x PnL_Account x Version x Month), with user overrides on top of calculated forecasts. It describes the data foundation (PULL from Library), configuration layer, forecasting engine (method per line, SWITCH-based), output and reporting, and naming conventions so another modeler can replicate the approach.

What to know when building an OPEX app

- The logic is usually simple: a small set of predefined forecasting methods (Prior Year, Last X months average, % of Revenue, $ per Headcount, Manual input) and a central engine that computes forecast values per line; then users can override those values where needed.
- The main complexity is dimensionality: at which level do you plan? Typically all planning dimensions (Entity, Department, PnL_Account, Version, Month, and often Line) are in the metric structure, unlike Workforce Planning where many axes are mapped dimensions (BY: -> card). In OPEX, you rarely "map" to Entity/Department after the fact; they are structural from the start.

When to use this blueprint

- You are building or extending an OPEX planning app that:
  - Pulls actuals and drivers (P&L actuals, headcount plan, revenue plan) from other apps via PULL_ metrics.
  - Lets users choose a forecasting method per line (per Entity x Department x PnL_Account x Version, with one or more lines per combination).
  - Produces forecast then actual + forecast and variance for reporting and sharing (Push_*).

When not to use

- Pure manual OPEX input with no driver-based methods does not need the full forecasting engine (see OPEX Planning - Forecasting Methods & Engine for the method layer).
- Apps that get all data from in-app lists (no cross-app PULL) will have a different data foundation but can still reuse the engine and folder patterns.

---

## 1. Business scope (summary)

- Planning grain: Entity x Department x PnL_Account x Version x Month, with a Line dimension for multiple forecast lines per combination.
- Data foundation: PULL_ metrics from Library (e.g. PULL_CR_PnL Data Actual, PULL_WF_Headcount Plan Data, PULL_Rev_Revenue Plan Data). No in-app transaction lists for OPEX; actuals and plans come from upstream apps.
- Configuration: Version windows (Last Actuals Month, Window Start/End Month); which months are Actual vs Plan (Push_DH_View_Load Actual / Plan); OPEX account scope; default forecasting methods per account; validation and line-prefill options.
- Forecasting engine: One method per line (Prior Year, Last X months avg, % of Revenue, $ per Headcount, Manual). Central CALC_Forecast = SWITCH on method ID -> method-specific metric; apply YoY/blank modifier; exclude actual months. User overrides on top of calculations (especially for Manual method).
- Output: CALC_Forecast per line -> OUT_FC (line removed for sharing) -> ACT + FC, REP_FC + Last Actual Month, Push_OP_OPEX Plan Data for reporting and cross-app sharing.
- UX: Set-up board (config, PULL connection hints); Manager / Controller input boards (method selection, parameters, manual overrides); OPEX Report (actual vs forecast, variance, version comparison).

---

## 2. Core concepts (generalized)

| Concept | Description |
|--------|-------------|
| Planning dimensionality in structure | Entity, Department, PnL_Account, Version, Month (and Line) are in the structure of most OPEX metrics. There is no "Workforce card" style mapping; reporting slices (e.g. by PnL category) use the same dimensions or their parents (BY: PnL_Account.PnL_Account Category). |
| PULL from Library | Data foundation = PULL_ metrics that reference Push_ metrics from other applications. Set-up board provides formula hints to connect PULL_* to the right Push_* (with REMOVE/FILTER/ADD as needed). |
| Actual vs Plan windows | Version properties (Window Start Month, Last Actuals Month, Window End Month) drive Boolean metrics (e.g. Push_DH_View_Load Actual, Push_DH_View_Load Plan). All forecast logic excludes actual months and filters to plan months where relevant. |
| Method per line | A Forecasting Method dimension (e.g. PY Values, Last X months Avg, % of Revenue, $ per Headcount, Manual Input) with an ID. User selects method per line via INP_Forecasting Method. Central engine SWITCHes on method ID to pick the correct CALC_* metric. |
| Parameters | INP_Parameter (and config SET_* metrics) supply method-specific values (X months, %, $/headcount). One parameter metric, populated by IF/SWITCH based on selected method. |
| Overrides on top | Calculated forecast is the base; users override where needed (especially when method = Manual Input). Override structure is part of the same engine (e.g. CALC_Manual_Input provides writable cells). |
| Naming conventions | INP_ (input/driver), CALC_ (intermediate calculation), OUT_ (primary output), PULL_ / Push_ (cross-app), FIL_ (Boolean filters), REP_ (reporting-only), SET_ (settings/config). |

---

## 3. Pipeline (end-to-end)

```
External apps (Push_*)
  -> PULL_* (PnL actuals, headcount plan, revenue plan) + window flags (Push_DH_View_Load Actual/Plan)
  -> Configuration (SET_*: scope, default methods, validation options)
  -> Line creation (Newline -> FIL_NewlineAdded -> Line dimension)
  -> Inputs per line: INP_Forecasting Method, INP_Parameter, INP_YoY%, INP_Validate, etc.
  -> Method-specific CALC_* (CALC_PYValues, CALC_LastXMonthsAVG, CALC_%ofRevenue, CALC_$perHeadcount, CALC_Manual_Input)
  -> CALC_Forecast = SWITCH(method ID, ...) * YoY/blank modifier [EXCLUDE: Actual months]
  -> OUT_FC -> REMOVE Line for sharing
  -> ACT + FC, REP_FC + Last Actual Month, Push_OP_OPEX Plan Data
  -> Boards: Set-up, Manager/Controller Input, OPEX Report
```

See OPEX Planning - Forecasting Methods & Engine for method selection, the 5 methods, YoY/blank handling, row lifecycle, and Actual vs Plan window usage.

---

## 4. Folder structure (generic)

| Folder / area | Role | Typical content |
|---------------|------|------------------|
| Business Dimensions | Org axes | Department, Entity, Segment, placeholders. |
| Chart of Accounts | P&L (and optionally BS) | PnL_Account, PnL_Account Category, PnL_EBITA, Operator for sign. |
| Calendar | Time | Year, Quarter, Month, Month of Year, Quarter of Year. |
| Actual + Plan View Management | Version & windows | Version (Last Actuals Month, Window Start/End), Data Type; metrics for Push_DH_View_Load Actual / Plan. |
| FX Currency Conversion | Multi-currency | Currency, FX Rate Types, Reporting Currency. |
| Output | Primary outputs | OUT_FC, ACT + FC, REP_FC + Last Actual Month, Push_OP_OPEX Plan Data. |
| Admin / Dimensions | Technical dims | Line (for OPEX lines), Forecasting Method, Newline (for Add New Combination). |
| Admin / Library | Cross-app | Push_OP_OPEX Plan Data, formula hints for connecting PULL_* to upstream Push_*. |
| Security | Access | Role, ARM_*, permissions. |
| Boards | UX | Set-up, Manager OPEX Input, Controller OPEX Input, OPEX Report. |

---

## 5. Data foundation

- No in-app OPEX transaction lists. Data comes from PULL_ metrics that reference Push_ metrics in upstream apps (Hub, Consolidation, etc.).
- Typical PULL_*:
  - PULL_CR_PnL Data Actual (Entity x Department x PnL_Account x Version x Month) - P&L actuals.
  - PULL_WF_Headcount Plan Data (Department x Entity x Version x Month) - for $ per Headcount method.
  - PULL_Rev_Revenue Plan Data (Department x Entity x Version x Month) - for % of Revenue method.
- Window flags:
  - Push_DH_View_Load Actual: Month in [Window Start Month, Last Actuals Month].
  - Push_DH_View_Load Plan: Month after Last Actuals Month and within Window End Month.
  Forecast engine excludes actual months; method metrics filter to plan months where needed.

---

## 6. Dimension framework

- Planning axes: Department, Entity, PnL_Account, Version, Month. Line for multiple forecast lines per (Entity, Department, PnL_Account, Version).
- Forecasting: Forecasting Method (ID, Need Input in Parameter?, Parameter Unit). Newline (Entity, Department, PnL_Account) for "Add New Combination" -> mapped into Line via FIL_NewlineAdded.
- Version: Last Actuals Month, Window Start Month, Window End Month, Close Date. Drives actual vs plan and version-specific windows.
- Time: Year, Quarter, Month, Month of Year, Quarter of Year (with date properties and hierarchy).
- Financial: PnL_Account Category, PnL_EBITA; Operator on category/account for sign. Currency, FX, Reporting Currency.
- Security: User, Role.

---

## 7. Metric layers (summary)

- Input & config: INP_Forecasting Method, INP_Parameter, INP_YoY%, INP_YoY_Month, INP_Description, INP_Validate; SET_* for defaults and scope; CHK_HasActuals?, SET_Fill_combo_withactuals?, SET_FCMethod_by_PnlAccount.
- Row control: FIL_NewlineAdded (Newline -> Line), FIL_Rowfilter (visibility: new lines, actual-only, validation gating); CDFM_ID = INP_Forecasting Method.ID for SWITCH.
- Method-specific CALC_*: CALC_Actuals, CALC_PYValues, CALC_LastXMonthsAVG, CALC_%ofRevenue, CALC_$perHeadcount, CALC_Manual_Input (dims: Department, PnL_Account, Version, Entity, Month, Line).
- Engine: CALC_Forecast = SWITCH(INP_Forecasting Method.ID, 1->PY, 2->LastXAvg, 3->%Rev, 4->$HC, 5->Manual) * CALC_YoY_2_fixblanks [EXCLUDE: Push_DH_View_Load Actual].
- Output: OUT_FC; ACT + FC = OUT_FC[REMOVE: Line] + PULL_CR_PnL Data Actual; REP_FC + Last Actual Month (chart continuity); Push_OP_OPEX Plan Data = OUT_FC[REMOVE: Line].

Details of each method and of YoY/blank, row lifecycle, and window usage: OPEX Planning - Forecasting Methods & Engine.

---

## 8. How to apply this blueprint elsewhere

1. Define planning grain (Entity x Department x PnL_Account x Version x Month [+ Line]) and keep all these dimensions in structure for core metrics (no "mapped dimensions" pattern like WFP).
2. Set up PULL_ metrics and window flags; connect to upstream Push_* via Set-up board hints.
3. Implement the forecasting engine: Forecasting Method dimension, INP_Forecasting Method, INP_Parameter, one CALC_* per method, CALC_Forecast = SWITCH * modifier [EXCLUDE: Actual]. See OPEX Planning - Forecasting Methods & Engine.
4. Allow overrides (e.g. CALC_Manual_Input for manual method; same structure as forecast for edits).
5. Output: OUT_FC, ACT + FC, REP for reporting, Push_ for sharing; all respect Actual/Plan windows.
6. Adopt naming: INP_, CALC_, OUT_, PULL_, Push_, FIL_, REP_, SET_.

---

## 9. Illustration: [FIN]04 OPEX Planning Template

In the Pigment [FIN]04 OPEX Planning template: Business Dimensions (Department, Entity); Chart of Accounts (PnL_Account, PnL_Account Category, PnL_EBITA); Calendar; 01. Actual + Plan View Management; 02. FX; 3. Output (OUT_FC, etc.); 0. Admin (0.0 Dimensions: Line, Forecasting Method, Newline; 0.2 Library: Push_OP_OPEX Plan Data, PULL connection hints). Core tables: [TBL] Opex Items Control (method, parameters, validation, FIL_Rowfilter), [TBL] Forecast (manual overrides), [TBL] Act vs FC (reporting). Boards: Set-up, Manager OPEX Input, Controller OPEX Input, OPEX Report.

Related skill: For forecasting method formulas, method parameters, YoY/blank modifiers, and the step-by-step procedure for adding new methods, read [OPEX Planning - Forecasting Methods & Engine](./opex_forecasting_planning_methods_engine.md).