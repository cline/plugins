# Core P&L Reporting Module - Nexus Pattern

## Purpose

This document explains how to build a P&L reporting hub in Pigment that acts as the central nexus of the workspace: it pulls actual data from ERP and plan data from other planning apps (Revenue, OPEX, Workforce) into a single, consistent structure, then applies FX conversion and feeds reporting metrics and tables. The outcome is a robust Actual + Budget/Plan P&L at monthly grain with built-in reconciliation checks. The architecture is modular so new planning apps can be added by plugging into the Nexus layer.

When to use this pattern

- You are building a central P&L reporting application that consolidates ERP actuals, budget, and plan/forecast from one or more planning apps.
- You need a single reporting metric (e.g. in reporting currency) that supports Actual vs Plan views (e.g. via a Data Type dimension).
- You want extensible dimensionality (Entity, Department, plus optional Product, Customer, Project, Cost Center) agreed with the user before building.
- Plan data is supplied by separate planning applications (Revenue, OPEX, Workforce); this skill covers the receiving hub only.

When not to use

- You are building only a planning app (e.g. Revenue, OPEX, Workforce) with no central reporting hub.
- You need Balance Sheet or Cash Flow reporting (use a dedicated 3-statements or BS/CF skill for those).
- You have a single data source and no need to combine Actual + Budget + multiple plan streams.

---

## 1. Business scope

The pattern delivers:

- Layered architecture: Data (raw inputs) -> Staging (reshape + sign normalization) -> Nexus (Actual, Budget, Plan plugs) -> Unified metric (Actual + Plan by Data Type) -> FX reporting (`Rep_PnL Data`) -> Statement table metrics.
- Single grain: Entity x Version x Month x PnL_Account x Department, plus any extra dimensions the user confirms (Product, Customer, Project, Cost Center, etc.).
- Sign logic via account metadata (Operator on PnL_Account / PnL_Account Category), not hard-coded +/- in formulas.
- Integration: `Pull_*` metrics from a Data Hub (ERP, Budget, FX) and from planning apps (Revenue, OPEX, Workforce); Nexus "plug" metrics receive them at the same grain.
- Reporting: Standard P&L lines (Revenue, COGS, Gross Margin, Operating Expenses, EBITDA drivers-Depreciation, Interest, Tax-Net Other Income, Operating Income, EBT, Net Income) and built-in reconciliation checks between detailed data and the statement, all sourced from `Rep_PnL Data`.

---

## 2. Prerequisites

Before building:

- A working calendar with Month (linked to Quarter and Year).
- Access to ERP P&L actuals (e.g. transaction list or Data Hub view such as `PnL_GL_Load_ERP`), Budget P&L (e.g. `PnL_Load_Budget`), and optionally plan data from other apps (Revenue, OPEX, Workforce).

Discovering blocks in the live application: Names like `PnL_GL_Load_ERP` are illustrative meaning they are examples. In the user's workspace, confirm Company / Entity, Month, StatementAccount or PnL_Account, CostCenter, Version, DataFlavor (or equivalent), and reporting Currency using `tool:search` (optionally with `kind` / `regexp`); results include block summaries and identifiers-use those to align Nexus, staging, and reporting metrics to actual names in that app-do not assume the template's naming.

If any of these are not available, create placeholder metrics at the same grain and replace them later with `Pull_*` from the Data Hub or planning apps. Use Option B in section 5.1 for placeholder signs.

---

## 3. Core concepts

| Concept           | Description                                                                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base grain    | Entity x Version x Month x PnL_Account x Department; extended with user-confirmed extra dimensions (Product, Customer, Project, etc.).                                                                                     |
| Data layer    | Raw inputs: ERP P&L actuals, Budget load, optional plan data from other apps. Each kept close to source structure.                                                                                                         |
| Staging layer | Metrics that reshape raw data onto the common grain and normalize signs (e.g. `PnL_Data_00_GL`, `PnL_Data_02_Roll-up`).                                                                                                    |
| Nexus layer   | Plug-and-play hub: separate metrics for Actuals (`Nexus_01`), Budget (`Nexus_02`), and each plan source (`Nexus_03_*`); a combined Plan metric (`Nexus_04`); and a unified Actual + Plan metric (`Nexus_99`) by Data Type. |
| Data Type     | Dimension (e.g. Actual, Forecast) used to pivot the unified metric so one block supports both Actual and Plan views.                                                                                                       |
| Rep_PnL Data  | Final P&L metric in reporting currency (FX applied); single source for all statement line metrics and tables.                                                                                                              |
| Operator      | Property on PnL_Account or PnL_Account Category (e.g. 1 or -1) to normalize accounting signs; used in staging, not hard-coded in formulas.                                                                                 |
| `Pull_*`          | Metrics that bring data from Data Hub (ERP, Budget, FX) or from other apps (Revenue, OPEX, Workforce) into the core app.                                                                                                   |

---

## 4. Pipeline (generic)

1. Confirm extra dimensions with the user
   Ask: "Which additional breakdowns do you need on your P&L (e.g. Product, Customer, Project, Cost Center, none)?" Turn the answer into a list of extra dimensions. Add them consistently to staging, Nexus, unified (`PnL_Nexus_99`), FX (`Rep_PnL Data`), and P&L table metrics. Whenever the skill shows a dimension set (e.g. Entity, Version, PnL_Account, Month, Department), mentally extend it with the user's extra dimensions.

2. Define dimensions
   - Time: Month (properties: Start Date, End Date, Start of Next Period, Year, Quarter), Quarter, Year.
   - Version: Items e.g. Actuals, Budget, Forecast v1, Forecast v2; properties (Dimension -> Month): Last Actuals Month, Window Start Month, Window End Month. Used by Data Hub pulls to control Actual vs Plan months.
   - Other axes: Entity, Department, Reporting Currency; Data Type (items: Actual, Forecast)-used only in Nexus_99 and reporting metrics.
   - PnL_Account Category: Name; category flags (e.g. Revenue, Cost of Goods Sold, Operating Expenses, Other Income, Other Expenses); Operator (Integer), e.g. 1 for Revenue/Other Income, -1 otherwise.
   - PnL_Account: Name, optional Display Name; PnL_Account Category; Operator = IFBLANK(PnL_Account.'PnL_Account Category'.Operator, 1); optional PnL_EBITDA (Dimension tagging EBITDA components: Depreciations & Amortizations, Interest Expenses, Tax Expenses, etc.).
   - Extra dimensions (only if user confirmed): Product, Customer, Project, Cost Center.

3. Data staging
   Map ERP GL into `PnL_Data_00_GL` at base grain (BY from transaction list). Normalize signs in `PnL_Data_02_Roll-up` = `PnL_Data_00_GL` _ PnL_Account.Operator _ -1. No separate elimination layer in this pattern.

4. Nexus metrics
   - `PnL_Nexus_01_Actual Data`: staging actuals with Version added, gated by a view/pull that limits to actual months.
   - `PnL_Nexus_02_Budget Data`: budget load with Version added, gated by plan view.
   - Plan plugs: `Pull_RE_Revenue Plan Data`, `Pull_OP_OPEX Plan Data`, `Pull_WF_Workforce Plan Data` (same grain; BLANK or PULL from apps).
   - `PnL_Nexus_03_Revenue/OPEX/Workforce Plan Data`: IF Version not Actuals/Budget then respective `Pull_*`, else BLANK.
   - `PnL_Nexus_04_Plan Data`: IF Version = Budget then `Nexus_02`; else sum of `Nexus_03_...`.

5. Unified Actual + Plan
   `PnL_Nexus_99_Actual + Plan Data`: IF Data Type = Actual then Nexus_01 (ADD Data Type, BY SUM Actual); else Nexus_04 (ADD Data Type, BY SUM Forecast). One metric for both Actual and Plan by pivoting on Data Type.

6. FX reporting
   `Rep_PnL Data` = `PnL_Nexus_99_Actual + Plan Data` \* FX rate (e.g. AVG for P&L), in reporting currency. Dimensions include Reporting Currency, Entity, Version, PnL_Account, Month, Data Type, Department, [extra dims].

7. Statement table metrics
   Each line = filter on `Rep_PnL Data` by PnL_Account Category (Revenue, COGS, OPEX, etc.). Derived lines (e.g. Gross Margin) = sum of relevant lines \* Category Operator [REMOVE: PnL_Account]. Add `PnL_Tbl_Check` comparing statement total to Nexus/reporting source.

8. P&L table
   Rows: PnL line or category; Pages: Entity, Department, extra dims; Columns: Month, Data Type, Version; Values: the PnL table metrics.

---

## 5. Patterns

### 5.1 Staging: GL to common grain and sign normalization

```text
PnL_Data_00_GL =
  'PnL_GL_Load_ERP'.Amt_LC
  [BY: Month, Account, Entity, Department
       /* + each extra dimension from source */]

PnL_Data_02_Roll-up =
  'PnL_Data_00_GL' * PnL_Account.Operator * -1
```

Same dimensions for both. Operator on PnL_Account (or Category) drives sign; no hard-coded +/- in formulas.

Sign conventions: Option A (ERP GL) - source revenue negative, expenses positive -> `x Operator x -1`. Option B (mock, budget, plan) - source all positive -> `x Operator` only. Confirm source convention before staging; do not mix.

Operator formulas (sign logic via metadata):

- PnL_Account Category.Operator (Integer): `IF('PnL_Account Category'.IsRevenueCategory OR 'PnL_Account Category'.IsOtherIncomeCategory, 1, -1)`
- PnL_Account.Operator: `IFBLANK(PnL_Account.'PnL_Account Category'.Operator, 1)`

### 5.2 Nexus Actual and Budget

```text
PnL_Nexus_01_Actual Data =
  'PnL_Data_02_Roll-up'
  [ADD: Version]
  ['Pull_DH_View_Load Actual']

PnL_Nexus_02_Budget Data =
  'PnL_Load_Budget'
  [ADD: Version]
  [BY SUM: VAR_Budget_Version]
  ['Pull_DH_View_Load Plan']
```

View/pull metrics restrict which months are Actual vs Plan per Version.

### 5.3 Nexus plan plugs

```text
PnL_Nexus_03_Revenue Plan Data =
  IF(
    NOT Version IN (VAR_Actuals_Version, VAR_Budget_Version),
    'Pull_RE_Revenue Plan Data',
    BLANK
  )
```

Same pattern for OPEX and Workforce (`Pull_OP_OPEX Plan Data`, `Pull_WF_Workforce Plan Data`). If no separate Revenue app, can use Budget filtered to Revenue category instead of `Pull_RE_`.

### 5.4 Nexus combined Plan

```text
PnL_Nexus_04_Plan Data =
  IF(
    Version = VAR_Budget_Version,
    'PnL_Nexus_02_Budget Data',
    'PnL_Nexus_03_Revenue Plan Data'
    + 'PnL_Nexus_03_OPEX Plan Data'
    + 'PnL_Nexus_03_Workforce Plan Data'
  )
```

### 5.5 Unified Actual + Plan by Data Type

```text
PnL_Nexus_99_Actual + Plan Data =
  IF(
    IsActual,
    'PnL_Nexus_01_Actual Data'
      [ADD: 'Data Type']
      [BY SUM: VAR_Actual_Data_Type],
    'PnL_Nexus_04_Plan Data'
      [ADD: 'Data Type']
      [BY SUM: VAR_Forecast_Data_Type]
  )
```

Dimensions include Data Type. One metric serves both Actual and Forecast views.

### 5.6 FX reporting metric

```text
Rep_PnL Data =
  'PnL_Nexus_99_Actual + Plan Data'
  * 'Pull_DH_FX_FX Rates'[SELECT: 'FX Rate Types'."AVG"]
```

Dimensions: Reporting Currency, Entity, Version, PnL_Account, Month, Data Type, Department, [extra dims]. Extend for source vs reporting currency if required.

For full FX engine design (Hub app, dimensions, layers, AVG/END, entity mapping), see [FX currency conversion (Hub pattern)](./fx_currency_conversion.md).

### 5.7 Statement line from Rep_PnL Data

```text
PnL_Tbl_01_Revenue =
  'Rep_PnL Data'
  [FILTER: PnL_Account.IsRevenueCategory]

PnL_Tbl_02_Gross Margin =
  (
    'PnL_Tbl_01_Revenue'
    + 'PnL_Tbl_01_Cost of Goods Sold'
  )
  * PnL_Account.'PnL_Account Category'.Operator
  [REMOVE: PnL_Account]
```

Other lines (OPEX, EBITDA drivers, Net Income) follow the same idea: filter by category or aggregate with Operator, then REMOVE PnL_Account where needed.

---

## 6. How to apply elsewhere

1. Before building: Ask the user which extra breakdowns they need (Product, Customer, Project, Cost Center, none). Create those dimensions and add them to every layer (staging, Nexus, unified, Rep_PnL Data, table metrics).
2. Dimensions: Calendar (Month with Start/End Date, Start of Next Period, Year, Quarter); Entity, Department; Version (Actuals, Budget, Forecast v1/v2...; Last Actuals Month, Window Start/End Month); Reporting Currency; Data Type (Actual, Forecast); PnL_Account Category (Operator: 1 for Revenue/Other Income, -1 else); PnL_Account (Operator = IFBLANK(Category.Operator, 1), optional PnL_EBITDA); extra dimensions as confirmed.
3. Staging: One metric from ERP GL (BY to base grain), one roll-up with sign normalization (Operator). No elimination layer unless the user explicitly needs it.
4. Nexus: `Nexus_01` (Actual), `Nexus_02` (Budget), three plan plugs and `Nexus_03_...` (Revenue, OPEX, Workforce), `Nexus_04` (combined Plan), `Nexus_99` (Actual + Plan by Data Type).
5. FX: One Rep_PnL Data metric with AVG rate (or user-specified rate type).
6. Tables: Statement line metrics as filtered/aggregated views of Rep_PnL Data; one check metric; one P&L table with rows = lines, columns = Month / Data Type / Version.
7. Naming: Keep prefixes (`PnL_Data_*`, `PnL_Nexus_*`, `Rep_PnL Data`, `PnL_Tbl_*`) so the flow stays traceable.

---

## 7. Pitfalls and reminders

- Extra dimensions: Add them everywhere from the start; retrofitting later is error-prone. Confirm with the user once.
- Operator consistency: Operator on PnL_Account (or Category) must be correct for Revenue, COGS, OPEX, etc.; wrong sign breaks all statement totals. Pair input signs with the roll-up option in section 5.1.
- View/pull logic: Nexus_01 and Nexus_02 depend on view or pull metrics that define "actual months" vs "plan months" per Version; align these with Version properties (Last Actuals Month, etc.).
- Plan plugs: If an app (e.g. Revenue) doesn't exist yet, use BLANK or a placeholder; do not build that app inside this skill-this skill is the hub only.
- Single grain: All Nexus and Rep metrics share the same dimension set; mismatched grains cause wrong totals or sparse/blank results.

---

## 8. Illustration (conceptual)

- Staging: PnL_Data_00_GL from PnL_GL_Load_ERP; PnL_Data_02_Roll-up = sign normalization.
- Nexus: PnL_Nexus_01_Actual Data, PnL_Nexus_02_Budget Data; Pull_RE_Revenue Plan Data, Pull_OP_OPEX Plan Data, Pull_WF_Workforce Plan Data; PnL_Nexus_03_Revenue/OPEX/Workforce Plan Data; PnL_Nexus_04_Plan Data; PnL_Nexus_99_Actual + Plan Data.
- Reporting: Rep_PnL Data (FX AVG); PnL_Tbl_01_Revenue, PnL_Tbl_01_COGS, PnL_Tbl_02_Gross Margin, etc.; PnL_Tbl_Check; [Tbl] Income Statement.

Template names (e.g. [FIN]01 Core Reporting) map to this structure; the generic pattern is the layered flow and plug-and-play Nexus design.
