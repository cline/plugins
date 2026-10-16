# Time and Date Functions

Functions for date manipulation, time period calculations, and temporal operations.

Covers: Date Creation, Date Extraction, Date Math, Period Functions, Previous/Fill Functions

---

## Quick Reference

| Category             | Functions                                                               |
| -------------------- | ----------------------------------------------------------------------- |
| Date Creation    | DATE, DATEVALUE, EDATE, EOMONTH, STARTOFMONTH                           |
| Date Extraction  | DAY, WEEKDAY, MONTH, YEAR                                               |
| Date Math        | DAYS, MONTHDIF, NETWORKDAYS                                             |
| Period Functions | INPERIOD, DAYSINPERIOD, PRORATA, MONTHTODATE, QUARTERTODATE, YEARTODATE |
| Temporal         | PREVIOUS, PREVIOUSOF, FILLFORWARD                                       |

> Converting a date to a dimension member (Month, Quarter, Year)? Use `TIMEDIM(Date, TimeDimension)` from [functions_lookup.md](./functions_lookup.md). TIMEDIM returns a dimension element (not a Date value), which is required when mapping transaction dates into time dimensions via the BY modifier or when creating Dimension-typed properties. Prefer TIMEDIM over STARTOFMONTH when the result must be a Month dimension member rather than a plain Date.

MP02 - planning period bounds: Do not use `DATE(YYYY, M, D)` for forecast horizon, seed month, or switchover. Use `VAR_` input metrics (type Date or Dimension Month), e.g. `IF(Month >= VAR_Start_Month AND Month <= VAR_End_Month, 'Revenue')` - not `DATE(2026, 1, 1)`.

---

## Date Functions Reference

| Function         | Syntax                         | Returns            | Example                                              |
| ---------------- | ------------------------------ | ------------------ | ---------------------------------------------------- |
| DATE         | `DATE(Year, Month, Day)`       | Date               | `DATE(2024, 3, 15)` -> 2024-03-15                     |
| DATEVALUE    | `DATEVALUE(Text, Format)`      | Date               | `DATEVALUE("2024-03-15", "yyyy-MM-dd")` -> 2024-03-15 |
| DAY          | `DAY(Date)`                    | Day (1-31)         | `DAY(DATE(2024,3,15))` -> 15                          |
| WEEKDAY      | `WEEKDAY(Date)`                | Weekday (0-6)      | `WEEKDAY(DATE(2024,3,15))` -> 5 (Friday)              |
| MONTH        | `MONTH(Date)`                  | Month (1-12)       | `MONTH(DATE(2024,3,15))` -> 3                         |
| YEAR         | `YEAR(Date)`                   | Year               | `YEAR(DATE(2024,3,15))` -> 2024                       |
| DAYS         | `DAYS(StartDate, EndDate)`     | Days between       | `DAYS(DATE(2024,3,1), DATE(2024,3,15))` -> 14         |
| MONTHDIF     | `MONTHDIF(StartDate, EndDate)` | Months between     | `MONTHDIF(DATE(2024,1,15), DATE(2024,3,15))` -> 2     |
| NETWORKDAYS  | `NETWORKDAYS(Start, End)`      | Business days      | `NETWORKDAYS(DATE(2024,3,1), DATE(2024,3,31))` -> ~22 |
| EOMONTH      | `EOMONTH(Date)`                | Last day of month  | `EOMONTH(DATE(2024,3,15))` -> 2024-03-31              |
| STARTOFMONTH | `STARTOFMONTH(Date)`           | First day of month | `STARTOFMONTH(DATE(2024,3,15))` -> 2024-03-01         |
| EDATE        | `EDATE(Date, Months)`          | Date + N months    | `EDATE(DATE(2024,3,15), 2)` -> 2024-05-15             |

WEEKDAY Values: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday

---

## Period Functions

### INPERIOD

Check if date falls within a time dimension item.

Syntax: `INPERIOD(Date, TimeDimension)`

Examples:

```pigment
// Check if transaction date is in current month
INPERIOD('Transactions'.'Date', Month)

// Filter transactions to specific quarter
IF(INPERIOD('Orders'.'Date', Quarter), 'Orders'.'Amount', BLANK)

// Check if date is in current year
INPERIOD('Events'.'Date', Year)
```

Returns: Boolean (TRUE if date is in period, FALSE otherwise)

Common Uses: Filtering transactions, date-based conditionals, period matching

---

### DAYSINPERIOD

Returns the number of days for each period of time.

Syntax: `DAYSINPERIOD(Time Dimension [, Start Date] [, End Date] [, Working Days] [, Holidays])`

Parameters:

- Time Dimension: Required. Time dimension based on calendar settings (Week, Month, Quarter, Half, Year)
- Start Date: Optional. Start date to count from
- End Date: Optional. End date to count to
- Working Days: Optional. Boolean metric on Day of Week dimension defining working days
- Holidays: Optional. Boolean metric on Day dimension defining holidays

Examples:

```pigment
// Days in each month (28-31 depending on month)
DAYSINPERIOD(Month)

// Days in each quarter
DAYSINPERIOD(Quarter)

// Days in month within a date range
DAYSINPERIOD(Month, DATE(2024,6,1), DATE(2024,12,31))

// Days an employee was present in each month
DAYSINPERIOD(Month, 'Employee'.'Start Date', 'Employee'.'End Date')

// Working days in month (excluding weekends and holidays)
DAYSINPERIOD(Month, DATE(2024,6,1), DATE(2024,12,31), 'Working Days', 'Holidays')
```

Returns: Integer (number of days in period)

Use Cases: Daily averages, FTE calculations, capacity planning, working day calculations

---

### PRORATA

Returns the proportion of days over time dimensions. Useful for prorating values for partial periods.

Syntax: `PRORATA(Time Dimension [, Start Date] [, End Date] [, Working Days] [, Holidays])`

Parameters:

- Time Dimension: Required. Time dimension based on calendar settings (Day, Week, Month, Quarter, Half, Year)
- Start Date: Optional. Start date (included in calculation)
- End Date: Optional. End date (excluded from calculation)
- Working Days: Optional. Boolean metric on Day of Week dimension defining working days
- Holidays: Optional. Boolean metric on Day dimension defining holidays

Examples:

```pigment
// Returns 1 for each month (full period)
PRORATA(Month)

// Returns 1 for each month starting June 1st 2020, BLANK prior
PRORATA(Month, DATE(2020,6,1))

// Prorata of days: June 2020 (16/30) and July 2020 (13/31)
PRORATA(Month, DATE(2020,6,15), DATE(2020,7,14))

// Monthly FTE by employee (end date included, so add +1)
'Employee'.'Salary' * PRORATA(Month, 'Employee'.'Start Date', 'Employee'.'End Date' + 1)

// Monthly headcount (1 if employee present on last day of month)
PRORATA(Month, STARTOFMONTH('Employee'.'Start Date'), STARTOFMONTH('Employee'.'End Date' + 1))

// Open-ended: current employees with no term date (range from start to end of calendar)
PRORATA(Month, 'Employee'.'Start Date')
```

Returns: Number (proportion between 0 and 1)

Use Cases:

- Prorating salaries or costs for partial periods
- FTE (Full-Time Equivalent) calculations
- Allocating annual amounts to partial periods
- Handling employee start/end dates mid-period

Key Points:

- Start Date is included in calculation
- End Date is optional. When omitted (2-argument form), the range is from Start Date to the end of the calendar (open-ended).
- End Date is excluded from calculation (add +1 if end date should be included)
- Respects calendar settings (month length, fiscal year, leap years)

Guideline: Do not use `IFBLANK('Term Date', DATE(9999,12,31))` (or similar) for PRORATA. When there is no end date (e.g. current employees with no term date), use the 2-argument form: `PRORATA(Time Dimension, Start Date)`.

#### Pattern: Presence + Boolean from PRORATA

`PRORATA()` is not only for prorating amounts; it is the canonical pattern for "active within a date range" on time dimensions.

Numeric presence on Day (1 or BLANK):

```pigment
// 1 on active days, BLANK outside the date range
PRORATA(Day, 'Start Date', 'End Date' + 1)
```

This replaces verbose multi-conditional IFs such as:

```pigment
// Avoid this:
IF(
  Day >= 'Start Date'
  AND Day <= 'End Date',
  1,
  BLANK
)
```

Boolean or numeric presence derived from PRORATA (without densifying):

To get a boolean flag from the same logic:

```pigment
// TRUE when the day is within [Start Date, End Date], BLANK otherwise
ISDEFINED(
  PRORATA(Day, 'Start Date', 'End Date' + 1)
)
```

To get an explicit 1/BLANK numeric flag:

```pigment
// 1 on active days, BLANK otherwise
IFDEFINED(
  PRORATA(Day, 'Start Date', 'End Date' + 1),
  1
)
```

Do not use ISBLANK / ISNOTBLANK on this pattern, as they densify.

Use this pattern whenever you have:

- A continuous interval [Start Date, End Date], and
- You need either:
  - A numeric factor for allocations / FTE / costs, or
  - A clean presence flag (boolean or 1/BLANK) built from that factor.

---

### MONTHTODATE (MTD)

Cumulates a metric defined on the Day Time Dimension and resets the cumulation each month.

Syntax: `MONTHTODATE(Metric [, Aggregation])`

Example:

```pigment
// Cumulative sales in the current month
MONTHTODATE('Daily Sales')
```

Returns: Number (cumulative value per day, resets each month)

---

### QUARTERTODATE (QTD)

Cumulates a metric defined on a Time Dimension (Day or Month) and resets the cumulation each quarter.

Syntax: `QUARTERTODATE(Metric [, Aggregation])`

Example:

```pigment
// Cumulative sales in the current quarter
QUARTERTODATE('Monthly Sales')
```

---

### YEARTODATE (YTD)

Cumulates a metric defined on a Time Dimension (Day, Month, or Quarter) and resets the cumulation each year.

Syntax: `YEARTODATE(Metric [, Aggregation])`

Example:

```pigment
// Cumulative sales in the current year
YEARTODATE('Monthly Sales')
```

---

## Temporal Functions

### PREVIOUS and PREVIOUSOF

- PREVIOUS(Dimension [, Offset]): Iterative calculation within a single Block; returns the previous cell of the current metric in the iteration dimension. Use when the formula references itself along that dimension.
- PREVIOUSOF(Metric [, Offset]): Iterative calculation across Blocks; requires an iterative calculation configuration. Use when multiple metrics reference each other in a cycle.

Examples:

```pigment
// Previous month value of the current metric
PREVIOUS(Month)

// Previous value with offset of 2
PREVIOUS(Month, 2)
```

---

### PREVIOUSOF

Returns the value of the previous cell in the iteration dimension of any metric defined in the iterative calculation configuration.

Syntax: `PREVIOUSOF(Metric [, Offset])`

WARNING: PREREQUISITE - Iterative Calculation (PREVIOUSOF) Configuration Required:
PREVIOUSOF can ONLY be used on metrics that have been configured for iterative calculation in the Pigment application settings. Use `tool:create_cycle` when available, or `tool:list_cycles` / `tool:update_cycle` to inspect or adjust an existing cycle. If MCP cycle tools are unavailable, ask the user to configure the cycle in the Pigment UI.

Before writing any formula with PREVIOUSOF:
1. Ask the user whether iterative calculation is already configured for the target metric(s)
2. If not configured, create or update the cycle with available tools.
3. Do NOT apply a PREVIOUSOF formula to a metric that is not configured for iterative calculation - it will fail with: "PREVIOUSOF can only be used in a Metric used by an iterative calculation"

Examples:

```pigment
// Previous month's ending inventory
PREVIOUSOF('Ending Inventory')

// Previous value with offset of 3
PREVIOUSOF('Revenue', 3)
```
Full reference: Syntax, circular dependencies, configuration, performance, and debugging are in [Iterative Calculation (PREVIOUS & PREVIOUSOF)](./functions_iterative_calculation.md).

---

### FILLFORWARD

Fill blank values with most recent non-blank value (forward fill).

Syntax: `FILLFORWARD(Block, Dimension)`

Examples:

```pigment
// Fill missing monthly prices with last known price
FILLFORWARD('Price', Month)

// Fill missing headcount data
FILLFORWARD('Headcount', Month)

// Fill forward on custom dimension
FILLFORWARD('Exchange Rate', Date)
```

Key Points:

- Fills blanks with most recent non-blank value
- Moves forward through dimension (left to right)
- If first value is blank, remains blank until first non-blank
- Common for prices, rates, static values

---

## SELECT vs PREVIOUS/PREVIOUSOF

WARNING: NEVER use PREVIOUS/PREVIOUSOF for simple prior period lookups. ALWAYS use SELECT.

Key question: "Does this period's result depend on calculating the previous period's result first?"

| Answer                                               | Use                 | Example                                         |
| ---------------------------------------------------- | ------------------- | ----------------------------------------------- |
| No - Just need prior period's value              | `[SELECT: Month-N]` | `'Revenue'[SELECT: Month-1]` for MoM comparison |
| Yes - Current depends on prior calculated result | `PREVIOUSOF()`      | Running balance where balance builds on itself  |

### Common Mistakes

```pigment
// BAD: WRONG: Using PREVIOUS for simple lookup - 'Last Month Revenue'
PREVIOUS(Month)

// GOOD: CORRECT: Using SELECT for lookup - 'Last Month Revenue'
'Revenue'[SELECT: Month-1]

// BAD: WRONG: Using PREVIOUSOF for comparison - 'MoM Change'
'Revenue' - PREVIOUSOF('Revenue')

// GOOD: CORRECT: Using SELECT for comparison - 'MoM Change'
'Revenue' - 'Revenue'[SELECT: Month-1]

// GOOD: CORRECT: PREVIOUSOF for true iterative (balance depends on prior balance) - 'Ending Balance'
PREVIOUSOF('Ending Balance', 0) + 'Inflow' - 'Outflow'
```

### When PREVIOUS/PREVIOUSOF is Appropriate

Only use when the current period's calculated result depends on the prior period's calculated result:

```pigment
// Running balance - current balance = prior balance + changes - 'Ending Balance'
PREVIOUSOF('Ending Balance', 0) + 'Inflow' - 'Outflow'

// Compounding - current value depends on prior calculated value - 'Compound Value'
PREVIOUSOF('Compound Value', 'Initial') * (1 + 'Growth Rate')
```

WARNING: REMINDER: These formulas will only work if iterative calculation is configured on the metric. There is no AI tool to configure this - the user must do it in the Pigment UI. Always confirm with the user before applying.

For everything else, use SELECT or specialized functions:

- Running totals -> `CUMULATE()` (not PREVIOUSOF + value)
- Fill blanks -> `FILLFORWARD()` (not IFBLANK + PREVIOUS)
- Prior period lookups -> `[SELECT: Month-N]`

---

## Common Patterns

### Date Math Patterns

```pigment
// Number of days by Month
DAYSINPERIOD(Month)

// Business days by month
NETWORKDAYS(Month.'Start Date', Month.'End Date')

// Months between dates
MONTHDIF('Date 1', 'Date 2')

// Date + number of months
EDATE('Date 1', 6)  // 6 months later

// Month + number of months
Month+1  // Next month

// Penultimate day of the next month
(Month + 1).'End Date' - 1

// Check if the first day of the month is a Sunday
WEEKDAY(Month.'Start Date') = 0
```

### Time Series Patterns

```pigment
// Month-over-Month Change (use SELECT for simple lookups)
'Revenue' - 'Revenue'[SELECT: Month-1]

// Month-over-Month % Change (use SELECT for simple lookups)
('Revenue' - 'Revenue'[SELECT: Month-1]) / 'Revenue'[SELECT: Month-1]

// Year-over-Year Change (use SELECT for simple lookups)
'Revenue' - 'Revenue'[SELECT: Month-12]

// Moving Average (3-month)
MOVINGAVERAGE('Sales', 3)

// Cumulative Total (use CUMULATE, not PREVIOUSOF + value or PREVIOUS + value)
CUMULATE('Monthly Revenue', Month)

// Fill Missing Values (use FILLFORWARD, not IFBLANK + PREVIOUS)
FILLFORWARD('Exchange Rate', Month)

// True iterative: Ending balance depends on prior balance (use PREVIOUSOF)
PREVIOUSOF('Ending Balance') + 'Inflow' - 'Outflow'
```

### Period-to-Date Patterns

```pigment
// MTD Revenue
MONTHTODATE('Amount')

// QTD Revenue
QUARTERTODATE('Amount')

// YTD Revenue
YEARTODATE('Amount')

// Alternative YTD approach
CUMULATE('Monthly Revenue', Month)
```

### Common Use Cases

```pigment
// Transaction aggregation by period
'Transactions'.'Amount'[BY: TIMEDIM('Transactions'.'Date', Month)]

// Same period last year
'Revenue'[SELECT: Month-12]

// Fill missing prices
FILLFORWARD('Product Price', Month)

// Business days for proration
NETWORKDAYS(Month.'Start Date', Month.'End Date')

// Check if date in period
IF(INPERIOD('Order'.'Date', Quarter), 'Order'.'Amount', BLANK)
```

---

## Critical Rules

- Use `[SELECT: Month-N]` for simple lookups - Not `PREVIOUS`/`PREVIOUSOF`. Reserve iterative functions for true iterative calculations (balances, accumulators)
- PREVIOUS/PREVIOUSOF are iterative - Slow, sequential computation. Only use when current value depends on prior calculated value. Requires iterative calculation to be configured on the metric. Use available cycle tools when possible; otherwise ask the user to configure it in the Pigment UI. Always confirm before applying.
- WEEKDAY starts at 0 (Sunday) - Unlike Excel
- PREVIOUS moves on all time dimensions - Use PREVIOUSOF for single dimension
- PREVIOUSOF offset is positive - Always backward movement
- FILLFORWARD fills forward - From past to future, use instead of IFBLANK + PREVIOUS
- CUMULATE for running totals - Use instead of PREVIOUSOF + value or PREVIOUS() + value
- Period-to-date functions use evaluation date - "Current" = when formula runs
- INPERIOD returns Boolean - Use in IF for filtering
- PRORATA End Date is excluded - Add +1 to include the end date
- DAYSINPERIOD returns Integer - Use for day counts, PRORATA for proportions
- NETWORKDAYS excludes weekends by default - Can specify custom working days
- Date calculations are expensive - Pre-calculate when possible

---

## See Also

- [functions_iterative_calculation.md](./functions_iterative_calculation.md) - Full PREVIOUS/PREVIOUSOF spec: circular dependencies, configuration, performance, debugging
- [functions_lookup.md](./functions_lookup.md) - TIMEDIM for calendar integration, SHIFT for time offsets
- [functions_numeric.md](./functions_numeric.md) - CUMULATE, MOVINGSUM, MOVINGAVERAGE
