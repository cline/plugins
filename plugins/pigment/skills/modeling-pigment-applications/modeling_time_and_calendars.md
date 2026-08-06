# Time and Calendar Modeling

Complete guide for calendar configuration and time dimension usage in Pigment.

## When to Read This

Read when:

- Setting up application calendars
- Configuring fiscal years or time ranges
- Understanding time dimension hierarchy
- Working with time dimensions in metrics and formulas
- Using time-based functions (CUMULATE, LAG, YEARTODATE)

---

## Part 1: Calendar Configuration

### Overview

Every Pigment application has a Calendar that defines the time structure for all time-based operations. The calendar determines how periods are organized, how fiscal years are structured, and which time dimensions are available for use in metrics and formulas. Use `tool:calendar_get` to read the current calendar configuration and `tool:calendar_create` to set up a new one.

### Calendar Types

Pigment supports two calendar types:

Gregorian Calendar:

- Standard calendar type used by most applications
- Based on Gregorian calendar system with configurable fiscal year settings
- Standard month-based periods (January through December)
- Configurable fiscal year starting month
- Supports all time dimensions: Day, Week, Month, Quarter, Half, Year
- Most common choice for financial planning and reporting

Weekly Calendar:

- Calendar type organized around weeks rather than months
- Week-based periods
- Configurable first day of week (Sunday, Monday, etc.)
- Supports Week and Day time dimensions
- Less common, used for specific operational planning

When to use:

- Gregorian: Standard financial planning, month/quarter/year reporting, most business scenarios
- Weekly: Operations planning requiring week-level granularity, retail/operations with weekly cycles

### Fiscal Year Configuration

For Gregorian calendars, you can configure when the fiscal year starts. This is critical for financial planning applications.

Common Fiscal Year Starts:

- January (Calendar Year): Fiscal year aligns with calendar year
- April: Common in many countries (e.g., UK, Japan)
- July: Common in some industries
- October: US Federal fiscal year

Impact:

- Affects how `TIMEDIM(..., 'Year')` returns fiscal year items
- Affects `YEARTODATE` calculations (resets at fiscal year start)
- Affects quarter boundaries (Q1 starts at fiscal year start month)

Example (Fiscal year starting in April):

- FY 2026 = April 2025 to March 2026
- Q1 FY 2026 = April, May, June 2025
- Q2 FY 2026 = July, August, September 2025

Setting Fiscal Year Start:
Configure the fiscal year starting month when creating or editing the calendar. Use `tool:calendar_create` to set this when creating a new calendar.

Best Practice: Set the fiscal year start early in application setup. Changing it later can affect existing formulas and data.

### Calendar Date Ranges

Every calendar has a start date and end date that define the range of periods available.

Start Date:

- Earliest period available in the calendar
- Typically set to cover historical data needs
- Common: 2-3 years before current year

End Date:

- Latest period available in the calendar
- Typically set to cover planning horizon
- Common: 3-5 years after current year

Example:

- Start Date: January 1, 2020
- End Date: December 31, 2027
- Covers: 8 years of periods

Extending Calendars:
You can extend a calendar's date range without affecting existing data.

When to extend:

- Planning horizon needs to go further into the future
- Historical analysis requires earlier periods
- Application scope expands

How to extend:

- Use `tool:calendar_expand` to update Start Date or End Date
- Existing data remains unchanged

Important: Extending forward is safe. Extending backward may create new periods, but existing data is preserved. You cannot shorten the calendar date range (remove periods) if data exists in those periods.

### Distinguishing Actuals from Plan periods

To distinguish historical Actuals from future Plan periods in a planning model, use the Version Dimension Switchover pattern documented in [`../planning-cycles-pigment-applications/SKILL.md`](../planning-cycles-pigment-applications/SKILL.md) (skill: `planning-cycles-pigment-applications`). The pattern uses a Switchover Month (or Year) Property on the Version Dimension plus the IsVersion / IsActual / IsPlan Boolean Metrics to layer Actuals and plan data per Version. Calendars do not handle this; do not use Calendar tools for versioning.

### Time Dimensions Selection

When setting up a calendar, you select which time dimensions to include:

Standard Time Dimensions:

- Year: Annual periods
- Half: Semi-annual periods (H1, H2)
- Quarter: Quarterly periods (Q1, Q2, Q3, Q4)
- Month: Monthly periods (required for Gregorian calendars)
- Week: Weekly periods (optional)
- Day: Daily periods (optional)

Best Practice: Include only the time dimensions you need. More dimensions mean more complexity and potential performance impact. Use `tool:calendar_add_time_dimension` to add a dimension and `tool:calendar_remove_time_dimension` to remove one.

Extra Time Dimensions:

In addition to standard time dimensions, calendars can include extra time dimensions:

- DayOfWeek: Monday, Tuesday, etc.
- MonthOfYear: January, February, etc. (regardless of fiscal year)
- QuarterOfYear: Q1, Q2, Q3, Q4 (regardless of fiscal year)
- WeekOfYear: Week 1-52/53
- HalfOfYear: H1, H2 (regardless of fiscal year)

Use Cases:

- Seasonal analysis (MonthOfYear for seasonality)
- Day-of-week patterns (DayOfWeek for operations)
- Week-based reporting (WeekOfYear)

### Calendar Setup Best Practices

1. Set Fiscal Year Early:
Configure the fiscal year starting month during initial application setup. Changing it later can require formula updates.

2. Plan Date Range Carefully:
Set start and end dates to cover historical data needs and planning horizon with buffer for future extensions. Common Pattern: 3 years historical + 5 years forward = 8-year range.

3. Include Only Needed Dimensions:
Select only the time dimensions required for your use case:

- Financial planning: Year, Quarter, Month (most common)
- Operations planning: May need Week or Day
- Strategic planning: Year, Half, Quarter

4. Reuse Calendar Dimensions:
Always use the built-in calendar dimensions provided by your application's calendar. Do not create custom time dimensions. Calendar dimensions are optimized and consistent across the application.

5. Actuals vs Plan separation:
To distinguish historical Actuals from Plan periods, use the Version Dimension Switchover pattern (see `skill:planning-cycles-pigment-applications`). Do not rely on the calendar's Actual vs Forecast toggle for this purpose.

6. Document Calendar Settings:
Document your calendar configuration: Fiscal year start month, date range, selected time dimensions, Actual vs Forecast settings.

### Common Setup Patterns

Standard Financial Planning:

- Type: Gregorian
- Fiscal Year: January (calendar year) or April/July/October
- Dimensions: Year, Quarter, Month
- Date Range: 3 years historical + 5 years forward

Operations Planning:

- Type: Gregorian or Weekly
- Dimensions: Month, Week (or Week, Day for weekly)
- Date Range: 1 year historical + 2 years forward
- Extra Dimensions: DayOfWeek (if needed)

Strategic Planning:

- Type: Gregorian
- Dimensions: Year, Half, Quarter
- Date Range: 5 years historical + 10 years forward

---

## Part 2: Time Dimensions and Hierarchy

### Overview

Time dimensions are the building blocks of temporal analysis in Pigment. They represent different levels of time granularity (Year, Quarter, Month, Week, Day) and are organized in a hierarchical structure.

### Time Dimension Hierarchy

Time dimensions form a hierarchical structure where each level contains the levels below it:

```
Year
  --- Half (optional)
      --- Quarter
          --- Month
              --- Week (optional, may overlap months)
                  --- Day
```

Hierarchy Levels:

Year:

- Top level of the hierarchy
- Contains all periods in a fiscal or calendar year
- Used for annual reporting and strategic planning

Half:

- Semi-annual periods (H1, H2)
- Contains Quarters
- Used for mid-year reporting

Quarter:

- Quarterly periods (Q1, Q2, Q3, Q4)
- Contains Months
- Most common for financial reporting

Month:

- Monthly periods (January, February, etc.)
- Contains Weeks (in Gregorian calendars)
- Standard granularity for most planning

Week:

- Weekly periods
- Contains Days
- Used for operations planning

Day:

- Daily periods
- Lowest level of granularity
- Used for detailed operational analysis

### Parent-Child Relationships

Each time dimension has a parent-child relationship:

- Parent: Contains the child dimension (e.g., Year contains Quarters)
- Child: Belongs to the parent dimension (e.g., Quarter belongs to a Year)

Example:

- Q1 2026 is a child of Year 2026
- Q1 2026 contains Months: Jan 2026, Feb 2026, Mar 2026
- Jan 2026 contains Weeks (if Week dimension is enabled)

### Standard Time Dimensions

Year Dimension:

- Purpose: Annual periods for strategic planning and annual reporting
- Top level of hierarchy
- Defined by fiscal year start (if fiscal year differs from calendar year)
- Contains Half, Quarter, Month, Week, Day dimensions
- Example Items: FY 2026, Calendar Year 2026
- Use Cases: Annual budgets/forecasts, year-over-year comparisons, strategic planning

Half Dimension:

- Purpose: Semi-annual periods for mid-year reporting
- Contains two halves per year (H1, H2)
- Optional dimension (not required)
- Example Items: H1 FY 2026, H2 FY 2026
- Use Cases: Mid-year reviews, semi-annual reporting, strategic planning

Quarter Dimension:

- Purpose: Quarterly periods for financial reporting and planning
- Contains four quarters per year (Q1, Q2, Q3, Q4)
- Most common time dimension for financial planning
- Example Items: Q1 FY 2026, Q2 FY 2026
- Use Cases: Quarterly financial reporting, quarterly planning cycles, QoQ analysis

Month Dimension:

- Purpose: Monthly periods for detailed planning and reporting
- Contains 12 months per year
- Required dimension for Gregorian calendars
- Example Items: Jan 2026, Feb 2026, Mar 2026
- Use Cases: Monthly planning/budgeting, monthly reporting, month-over-month analysis

Week Dimension:

- Purpose: Weekly periods for operations planning
- Contains approximately 52-53 weeks per year
- Optional dimension
- More common in operations planning than financial planning
- Example Items: Week 1 2026, Week 2 2026
- Use Cases: Operations planning, retail planning, weekly capacity planning

Day Dimension:

- Purpose: Daily periods for detailed operational analysis
- Contains 365-366 days per year
- Lowest level of granularity, optional dimension
- Example Items: 2026-01-01, 2026-01-02
- Use Cases: Daily operations tracking, detailed transaction analysis, day-level reporting

### Extra Time Dimensions

Extra time dimensions provide additional ways to analyze time patterns without being part of the main hierarchy.

DayOfWeek:

- Not hierarchical, repeats across all weeks
- Items: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Use Cases: Identifying weekday vs weekend patterns, operations planning, retail analysis

MonthOfYear:

- Not hierarchical, repeats across all years
- Items: January, February, March, etc.
- Use Cases: Seasonal pattern analysis, month-over-month comparisons across years

QuarterOfYear:

- Not hierarchical, repeats across all years
- Items: Q1, Q2, Q3, Q4
- Use Cases: Quarterly pattern analysis, quarter-over-quarter comparisons across years

WeekOfYear:

- Not hierarchical, repeats across all years
- Items: Week 1, Week 2, ..., Week 52, Week 53
- Use Cases: Week-based pattern analysis, week-over-week comparisons across years, operations planning

HalfOfYear:

- Not hierarchical, repeats across all years
- Items: H1, H2
- Use Cases: Semi-annual pattern analysis, half-over-half comparisons across years

### Time Dimension Relationships

Hierarchical Relationships:
Year -> Half -> Quarter -> Month -> Week -> Day

Example:
Year 2026 contains:

- H1 2026 and H2 2026
- Q1 2026, Q2 2026, Q3 2026, Q4 2026
- Jan 2026, Feb 2026, ..., Dec 2026
- Week 1 2026, Week 2 2026, ..., Week 52 2026
- 2026-01-01, 2026-01-02, ..., 2026-12-31

Aggregation Relationships:

- Aggregating up: Summing child periods into parent periods
  - Example: Summing months to get quarterly totals
  - Example: Summing quarters to get annual totals

- Aggregating down: Allocating parent periods to child periods
  - Example: Distributing annual budget across months
  - Example: Allocating quarterly targets to monthly targets

Dimension Alignment:

When using time dimensions in metrics:

- Granularity: Choose the most granular time dimension needed
- Aggregation: Use aggregation functions to roll up to higher levels
- Allocation: Use allocation functions to distribute to lower levels

Example: Metric with `Month` dimension can be aggregated to `Quarter` or `Year`. Metric with `Quarter` dimension can be allocated to `Month`.

### Using Time Dimensions in Metrics

Choosing Time Granularity:

Select the most granular time dimension needed for your use case:

- Strategic Planning: Year or Quarter
- Financial Planning: Month or Quarter
- Operations Planning: Week or Day

Best Practice: Start with the granularity you need. You can always aggregate up, but you cannot create detail that doesn't exist.

Time Dimension in Metric Structure:

Time dimensions are used like any other dimension in metric structures:

Example Structures:

- `Product x Month` - Monthly product sales
- `Product x Quarter` - Quarterly product sales
- `Product x Year` - Annual product sales
- `Product x Month x Region` - Monthly product sales by region

Aggregation Across Time:

Use aggregation functions to roll up time periods:

- SUM: Sum values across time periods
- AVERAGE: Average values across time periods
- MAX/MIN: Find maximum/minimum across time periods

Example: Sum monthly sales to get quarterly totals, average monthly values to get quarterly averages.

### Best Practices

1. Use Calendar Dimensions:
Always use the built-in calendar dimensions from your application's calendar. Do not create custom time dimensions. Calendar dimensions are optimized, consistent, and work seamlessly with time functions.

2. Choose Appropriate Granularity:
Select the most granular time dimension needed. Too granular creates unnecessary complexity and performance impact. Too coarse means missing detail needed for analysis.

3. Understand Hierarchy:
Understand how time dimensions relate hierarchically to support aggregation, allocation, time functions, and dimensional alignment.

4. Consider Extra Dimensions:
Use extra time dimensions (DayOfWeek, MonthOfYear) for pattern analysis: Seasonal patterns, day-of-week patterns, week-based patterns.

5. Document Time Structure:
Document which time dimensions are used in your application to help team members understand the time structure and support formula writing.

### Troubleshooting

Calendar Not Available:

- Check Application Settings -> Calendar
- Ensure calendar is configured
- Verify time dimensions are selected

Fiscal Year Not Working as Expected:

- Verify fiscal year starting month is set correctly
- Check that formulas use calendar dimensions (not custom dimensions)
- Ensure TIMEDIM uses the correct time dimension

Date Range Too Short:

- Extend calendar date range in Settings -> Calendar
- Update Start Date or End Date as needed
- Existing data is preserved when extending

---

## See Also

- [modeling_fundamentals.md](./modeling_fundamentals.md) - Core modeling concepts
- [modeling_principles.md](./modeling_principles.md) - Best practices and standards
- [functions_time_and_date.md](../writing-pigment-formulas/functions_time_and_date.md) - Time-based functions
- [functions_lookup.md](../writing-pigment-formulas/functions_lookup.md) - TIMEDIM function
