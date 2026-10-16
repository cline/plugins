# Board Page Selectors

Board Pages in the UI are Board Page Selectors - default selections applied at the Board level (not View Filters).

## What They Are

Board Page Selectors define the analytical context users expect when opening the Board. Which widgets actually follow a given Board Page Selector depends on each widget's View, not on the Board alone.

### Board-to-Widget Page Compatibility Rule (critical)

A board-level page selector on dimension D affects only widgets whose underlying View has a compatible page on D:

- A simple Page on D (`dimensionId` = D's ID), or
- A Grouping Page whose `listPropertyPath` resolves to D (see Board Pages and Grouping Pivots in a View's Pages below).

To make one board-level selector (e.g. Year) drive multiple widgets together, every target widget's View must include that same page (or a compatible grouping page on D). If a View has no Year in Pages (e.g. only Version, or no time page at all), the board's Year selector does not filter that widget's data.

Workflow implication: Before relying on Board Pages, verify or edit each widget View so Pages align with the dimensions you want at board level. Creating the Board first and only then discovering mismatched Views is a common source of "the board filter does nothing."

Key rule (configuration): Board Page selectors come from the union of Pages on the Views you add to the Board. You cannot invent a new Page selector on the Board that no View has. In case of comparison, you must  configure default selected items for each Board Page at board level (default modalities = compared items). When the user names specific modalities in the prompt - either a single value ("for FY 26") or a subset to compare ("FY 26 and FY 27", "Actuals vs Budget") - those exact modalities are the defaults, single- or multi-select accordingly.

After defaults are set, users can change Board Page selections; widgets whose Views are linked and compatible will update accordingly.

### Unlinking a Page at the Widget Level

Widgets whose Views do have a compatible page can still opt out of the Board Page by Unlinking that page. For example, if the Board has a Board Page for `Year`, a widget can unlink its `Year` Page so it is no longer driven by the board-level Year selector; that page then behaves as a normal view-level page.

Note: "No effect from the board Year selector" is different from unlinking: if the View never had a compatible Year page, the board Year filter never applied to that widget-unlinking is not required to explain that behavior.

### Page Selector Visibility

Page selectors can be shown, minimized, or hidden. Never hide a page selector unless the user explicitly asks for it.

---

## Page Selector strategy by Board purpose

| Board Purpose             | Time Page Selector | Version Page Selector   | Scenario Page Selector                   |
| ------------------------- | ------------------ | ----------------------- | ---------------------------------------- |
| Monthly Review            | Month=Current   | Version=Actuals         | Scenario=Default                         |
| Quarterly Business Review | Quarter=Current | Version=Actuals,Budget  | Scenario=Default                         |
| Annual Planning           | Year=Next       | Version=Budget,Forecast | Scenario=Default                         |
| Variance Analysis         | Month=Current   | Version=Actuals,Budget  | Scenario=Default                         |
| Scenario Planning         | Year=Current    | Version=Forecast        | Scenario=Baseline,Optimistic,Pessimistic |
| Executive Overview        | Quarter=Current | Version=Actuals         | Scenario=Default                         |
| YTD Performance           | Year=Current    | Version=Actuals,Budget  | Scenario=Default                         |
| Year-over-Year / Period Comparison | Year=FY N-1, FY N (multi) | Version=Actuals | Scenario=Default                  |

Adapt based on which Dimensions your Views actually have. Skip any column that doesn't apply. Values like "Current" and "Next" are conceptual - resolve them to actual modality IDs from the Dimension's items.

---

## Common Filter Dimensions

### 1. Time-Related Dimensions

Choose based on Board purpose. Only if Views have time Dimensions:

- Single period: `Month=Jan 24`, `Quarter=Q1 24`, `Year=FY 24`
- Comparison (when the user asks to compare specific periods, e.g. "FY 24 vs FY 25", "YoY", "this year vs last year"): multi-select default with exactly those periods, e.g. `Year=FY 24, FY 25`. Use this whenever the same dimension is on a chart axis to span those modalities - the Board Page lets the user change the compared set without editing the View.

### 2. Version Dimension

Only if Views have a Version Dimension:

- Single version: `Version=Actuals` or `Version=Budget` or `Version=Forecast`
- Comparison: `Version=Actuals,Budget` (for variance analysis)
- Multi-version: `Version=Actuals,Budget,Forecast`

### 3. Scenario Dimension

Only if Views have a Scenario Dimension:

- Single scenario: `Scenario=Default`
- Comparison: `Scenario=Baseline,Optimistic` (for scenario planning)

### 4. Other Dimensions

Any business Dimensions your Views have in Pages: Region, Department, Product Line, etc.

---

## Examples

### Standard: Quarterly Variance Analysis

```
Board Purpose: Compare actual vs budget performance for Q1 24

Board Pages:
- Time: Quarter=Q1 24
- Version: Actuals,Budget
- Scenario: Default
```

### Edge Case: Views With Only Time Dimensions

```
Board Purpose: Track monthly sales trends

Views have: Month Dimension
Views don't have: Version, Scenario

Board Pages:
- Time: Month=Jan 24 to Dec 24
(No Version or Scenario filters needed)
```

### Edge Case: Views With No Standard Dimensions

```
Board Purpose: Product catalog dashboard

Views have: Product, Category, Region
Views don't have: Time, Version, Scenario

Board Pages:
- Region=All
- Category=All
(Only filter the Dimensions that actually exist)
```

### Edge Case: Mixed Dimension Availability

```
Board Purpose: Mixed KPI dashboard

Some Views have: Year, Version, Scenario
Other Views have: Only Region, Product
Some Views have: No Dimensions at all

Board Pages:
- Year=FY 24
- Version=Actuals
- Scenario=Default

Note: A Board Page only affects widgets whose Views have a compatible
page on that dimension. Widgets whose Views lack Year / Version / Scenario
in Pages are not filtered by those board-level selectors-align Views first
if you need every widget to follow the same board context.
```

---

### Board Pages and Grouping Pivots in a View's Pages

A Board Page on Dimension D can drive a View Page if that Page is:

- A simple Page on D (`dimensionId` = D's ID), or
- A Grouping Page whose `listPropertyPath` resolves to D (e.g., base Dimension Month with property path `["_year"]` leading to Year).

When a Board Page selects a value on the target Dimension (e.g., Year = FY 2024), the Grouping Page filters its base Dimension items (e.g., Months) to only those whose property chain matches the selected value (Months whose `_year` = FY 2024).

Example: Board Page on Year driving a Month-based Grouping Page

```
Metric base Dimension: Month
Month has a Dimension Property _year -> Year

View Page:
  dimensionId = <Month GUID>
  listPropertyPath = ["_year"]    (Grouping Page targeting Year)

Board Page:
  pageIdentifier: { pageIdentifierType: "Dimension", dimensionId: <Year GUID> }
  defaultModalityReferences: [{ type: "Fixed", fixedValue: <FY-2024-modality-id> }]

Result: Only Months whose _year = FY 2024 are included.
The user sees a Year filter, even though the View is modeled at Month level.
```

When to use Grouping Pages:

Use when Views are modeled at a fine grain (Month, Store, Employee) but you want Board-level filters on higher-level Dimensions (Year, Region, Division). This requires clean Dimension Properties defining the hierarchy.

Important: The `listPropertyPath` in the Grouping Page must correctly resolve to the same target Dimension as the Board Page's `dimensionId`. Use technical property names, not display names.
