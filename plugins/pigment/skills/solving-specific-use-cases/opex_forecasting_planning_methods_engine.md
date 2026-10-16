# OPEX Planning - Forecasting Methods & Engine

## Purpose

This use case describes how a driver-based OPEX forecasting engine works when there are several predefined methods (e.g. Prior Year, Last X months average, % of Revenue, $ per Headcount, Manual input) and one method per planning line. It covers: method selection (dimension + input metric + SWITCH), the five calculation methods (concept and formula pattern), global modifiers (YoY and blank handling), row lifecycle and validation (new lines, visibility filter, validation flag), and Actual vs Plan windows so that all methods apply only to plan months and the engine can be extended with new methods without rewriting window logic.

When to use this skill

- You are building or extending an OPEX app that uses a central forecast metric (e.g. CALC_Forecast) switching on method ID to pick one of several method-specific metrics (CALC_PYValues, CALC_LastXMonthsAVG, etc.).
- You need to add a new forecasting method or understand how parameters, YoY, and Actual/Plan windows interact with the engine.

When not to use

- Purely manual OPEX with no driver-based methods does not need the SWITCH/method pattern.
- For app layout, PULL layer, folder structure, and naming, see OPEX Planning - Application Architecture & Patterns.

---

## 1. How method selection works

Forecasting Method dimension

- Encodes each method with: ID (Integer, used in SWITCH), Need Input in Parameter? (Boolean), Parameter Unit (e.g. "months", "%", "$/HC").
- Example methods: PY Values (1), Last X months Avg (2), % of Revenue (3), $ per Headcount (4), Manual Input (5).

Input metric: INP_Forecasting Method

- Type: Dimension -> Forecasting Method.
- Dims: Department, PnL_Account, Version, Entity, Line (or your planning grain).
- Holds the user-selected method per line.
- Prefill (optional): When CHK_HasActuals? and SET_Fill_combo_withactuals? are true, fill from SET_FCMethod_by_PnlAccount[BY: Line."1"] so new lines get a default method from config.

Numeric code for SWITCH: CDFM_ID

- CDFM_ID = INP_Forecasting Method.ID so the engine can switch on an integer.

Central engine: CALC_Forecast

```
(
  SWITCH(
    'INP_Forecasting Method'.ID,
    1, CALC_PYValues,
    2, CALC_LastXMonthsAVG,
    3, CALC_%ofRevenue,
    4, CALC_$perHeadcount,
    5, CALC_Manual_Input
  )
  * CALC_YoY_2_fixblanks
)
[EXCLUDE: 'Push_DH_View_Load Actual']
```

- ID selects which method metric is used.
- CALC_YoY_2_fixblanks is a global modifier (YoY uplift and/or blank handling) applied to all methods.
- EXCLUDE: Push_DH_View_Load Actual ensures forecast is never computed for actual months; methods apply only to plan months.

---

## 2. The five calculation methods (patterns)

All method metrics share the planning dimensions (e.g. Department, PnL_Account, Version, Entity, Month, Line). Each is wrapped in IF(INP_Forecasting Method = Forecasting Method."MethodName", ...) so only the selected method contributes.

### 2.1 PY Values (Prior Year)

Intent: Use prior-year actuals (same month, year-1) as the forecast base; optional YoY uplift via global modifier.

Pattern:

```
IF(
  'INP_Forecasting Method' = 'Forecasting Method'."PY Values",
  IFDEFINED(
    'PULL_CR_PnL Data Actual'[ADD: Line][SELECT: Month - 12],
    'PULL_CR_PnL Data Actual'[ADD: Line][SELECT: Month - 12],
    PREVIOUS(Month, 12)
  )
)
```

- SELECT: Month - 12 = same month last year. IFDEFINED uses shifted actuals; fallback PREVIOUS(Month, 12) for robustness when some months are missing.

### 2.2 Last X months average

Intent: Average of the last X actual months as the base for each plan month (e.g. "last 3 months average").

Inputs: INP_Parameter = SET_X_forMA when method = Last X months Avg. Helper metrics: PAR_CountLastMonthsActuals (counter over last actual months), PAR_denominator_forAVG (count or adjusted divisor).

Pattern:

```
IF(
  'INP_Forecasting Method' = 'Forecasting Method'."Last X months Avg",
  (
    'PULL_CR_PnL Data Actual'[ADD: Line]
      [FILTER: PAR_CountLastMonthsActuals <= INP_Parameter]
      [REMOVE: Month]
  )
  /
  PAR_denominator_forAVG[ADD: Month][FILTER: 'Push_DH_View_Load Plan']
)
```

- Numerator: sum of actuals over last X months (filter by counter), then REMOVE Month. Denominator: aligned to plan months so the ratio is per (Dept, Entity, PnL_Account, Version, Line, Month).

### 2.3 % of Revenue

Intent: Forecast = given % of revenue plan.

Inputs: INP_Parameter = SET_%_forREV (e.g. 5 for 5%). PULL_Rev_Revenue Plan Data at Department x Entity x Version x Month.

Pattern:

```
IF(
  'INP_Forecasting Method' = 'Forecasting Method'."% of Revenue",
  INP_Parameter / 100 * 'PULL_Rev_Revenue Plan Data'
)[FILTER: 'Push_DH_View_Load Plan']
```

- Only plan months; no forecast in actual months.

### 2.4 $ per Headcount

Intent: Forecast = $ per head x headcount plan.

Inputs: INP_Parameter = SET_$_forHC. PULL_WF_Headcount Plan Data at Department x Entity x Version x Month.

Pattern:

```
IF(
  'INP_Forecasting Method' = 'Forecasting Method'."$ per Headcount",
  INP_Parameter * 'PULL_WF_Headcount Plan Data'
)[FILTER: 'Push_DH_View_Load Plan']
```

### 2.5 Manual Input

Intent: Users type values by month; engine provides the structure (writable cells) and baseline (e.g. 0).

Pattern:

```
IFDEFINED(
  FIL_Rowfilter,
  IF(
    'INP_Forecasting Method' = 'Forecasting Method'."Manual Input"
    AND 'Push_DH_View_Load Plan',
    0
  )
)
```

- Only when row is visible (FIL_Rowfilter) and method is Manual and month is plan. Baseline 0 creates writable cells; users' edits become the forecast for that line/month. CALC_Forecast then picks CALC_Manual_Input when method = Manual.

---

## 3. Global modifiers: YoY and blank handling

Inputs

- INP_YoY% - numeric YoY adjustment per line (default 0).
- INP_YoY_Month - base Month of Year (e.g. IFDEFINED(INP_YoY%, Month."January")).

CALC_YoY_2_fixblanks

- Referenced in CALC_Forecast as the multiplier after the SWITCH: (SWITCH result) * CALC_YoY_2_fixblanks.
- Typically implements: (1) YoY uplift/decay (e.g. 1 + INP_YoY% for relevant months), and/or (2) blank handling so that method blanks are not turned into zeros and sparsity is preserved.
- One place for YoY and blank logic: adding a new method does not require duplicating this; it applies to all methods uniformly.

---

## 4. Row lifecycle and validation

### 4.1 New line creation (Newline -> Line)

- Users add a new combination (Entity x Department x PnL_Account) via an "Add New Combination" action that writes to a Newline list (properties: Entity, Department, PnL_Account).
- FIL_NewlineAdded maps Newline into the main planning space and flags which Line(s) are new:

```
ISDEFINED(
  Newline.ID
  [BY: Newline.PnL_Account, Newline.Department, Newline.Entity]
)[ADD: Version][BY: Line."1"]
```

- So new (Entity, Department, PnL_Account, Version, Line) combinations are identified and can be shown progressively.

### 4.2 Row visibility: FIL_Rowfilter

- FIL_Rowfilter is a Boolean that controls which lines appear in the input table (e.g. [TBL] Opex Items Control).
- Logic typically combines: FIL_NewlineAdded (show new lines); SET_Allowactuallineonly (show only lines with actuals if desired); SET_Onlyshownewlineaftervalidation (show a new line only after the previous line is validated); CHK_HasActuals?; INP_Validate[SELECT: Line - 1]; ISDEFINED('INP_Forecasting Method'[SET_OpexAccounts][SELECT: Line - 1]).
- Effect: Lines appear progressively (validation of previous line, or creation via Add), avoiding a huge table of unused rows; optional "actual-only" or "new-only-after-validation" policies.

### 4.3 Validation: INP_Validate

- INP_Validate (Boolean per line): IF(SET_Skip_Validation, BLANK, IFDEFINED('INP_Forecasting Method', FALSE)).
- If validation is not skipped, once a method is defined the line defaults to FALSE (pending); users set it to TRUE when the line is reviewed/approved. Used in FIL_Rowfilter and in KPI widgets (e.g. "waiting validation" vs "validated").

---

## 5. Actual vs Plan windows (impact on methods)

Window flags (Version-based)

- Push_DH_View_Load Actual: Month >= Version.'Window Start Month' AND Month <= Version.'Last Actuals Month'.
- Push_DH_View_Load Plan: Month after Last Actuals Month and within Version.'Window End Month' (using month start/end dates).

Usage in the engine

- CALC_Forecast: [EXCLUDE: 'Push_DH_View_Load Actual'] -> no forecast in actual months; only plan months get method results.
- Method metrics: % of Revenue and $ per Headcount use [FILTER: 'Push_DH_View_Load Plan'] so they only compute for plan months. CALC_Manual_Input uses AND 'Push_DH_View_Load Plan' so manual cells exist only in plan months.
- Reporting: ACT + FC and REP_FC + Last Actual Month combine actuals and forecast using these flags so the Actual/Forecast boundary is consistent.

Outcome: Changing Version properties (Last Actuals Month, Window End Month) moves the Actual/Plan boundary without changing any method formula; all methods adapt automatically (e.g. rolling 12+12 forecast).

---

## 6. How to add a new method

1. Add an item to the Forecasting Method dimension with a new ID (e.g. 6) and metadata (Need Input in Parameter?, Parameter Unit).
2. Create a new method metric (e.g. CALC_NewMethod) with the same dimensions as other CALC_* metrics. Formula: IF(INP_Forecasting Method = Forecasting Method."NewMethod", <your logic>)[FILTER: 'Push_DH_View_Load Plan'] if it should only run in plan months.
3. Wire parameters if needed: in INP_Parameter (or SET_*), add a branch for the new method (e.g. IF(... = "NewMethod", SET_NewMethodParam)).
4. Add the case to CALC_Forecast: SWITCH(..., 6, CALC_NewMethod, ...).
5. YoY and blank handling stay in CALC_YoY_2_fixblanks; no change needed unless the new method needs special treatment.

---

## 7. Illustration: [FIN]04 OPEX Template

- Method dimension: Forecasting Method with PY Values (1), Last X months Avg (2), % of Revenue (3), $ per Headcount (4), Manual Input (5). INP_Forecasting Method, CDFM_ID, CALC_Forecast (SWITCH * CALC_YoY_2_fixblanks)[EXCLUDE: Actual].
- Method metrics: CALC_PYValues, CALC_LastXMonthsAVG, CALC_%ofRevenue, CALC_$perHeadcount, CALC_Manual_Input; PULL_CR_PnL Data Actual, PULL_WF_Headcount Plan Data, PULL_Rev_Revenue Plan Data; INP_Parameter, SET_X_forMA, SET_%_forREV, SET_$_forHC.
- Row lifecycle: Newline, FIL_NewlineAdded, FIL_Rowfilter, INP_Validate; SET_Allowactuallineonly, SET_Onlyshownewlineaftervalidation, CHK_HasActuals?.
- Windows: Push_DH_View_Load Actual, Push_DH_View_Load Plan; Version.'Last Actuals Month', Window Start/End Month.

For app structure, PULL layer, folders, and naming: OPEX Planning - Application Architecture & Patterns.