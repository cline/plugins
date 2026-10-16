# Calendar Performance Considerations

## Introduction

Time-based calculations can significantly impact performance, especially over long horizons with fine granularity. This guide covers performance patterns for time-dimensioned calculations.

## Time Horizon Impact

### Granularity Tradeoffs

- Monthly: 12-60 periods (fast)
- Weekly: 52-260 periods (moderate)
- Daily: 365-1,825 periods (slow)

### Subsetting Time Dimensions

Limit iterative calculations to relevant periods:

- Current fiscal year only
- Rolling 90 days
- Last 12 months

## Iterative Calculations Over Long Horizons

### Problem

PREVIOUS, PREVIOUSOF, and CUMULATE over many periods:

- 5 years daily = 1,825 sequential calculations
- Performance degrades significantly

### Solutions

1. Subset to recent periods
2. Use monthly instead of daily
3. Pre-compute starting points
4. Use FILLFORWARD when possible

## Daily vs Monthly Granularity

Consider if daily granularity is truly needed:

- Planning: Usually monthly sufficient
- Actuals: May need daily
- Forecasting: Weekly or monthly often adequate

## See Also

- [performance_iterative_calculations.md](./performance_iterative_calculations.md) - Iterative calculation optimization
- [modeling_time_and_calendars.md](../modeling-pigment-applications/modeling_time_and_calendars.md) - Calendar configuration and time dimension structure
