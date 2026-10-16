# Forecasting Functions

Statistical forecasting and time series analysis functions.

Covers: Exponential Smoothing (ETS, Simple, Double), Linear Forecasting, Seasonal Regression, Normal Distribution

---

## Quick Reference

| Function                                    | Method                       | Best For                 |
| ------------------------------------------- | ---------------------------- | ------------------------ |
| FORECAST_ETS                            | Triple exponential smoothing | Trend + Seasonality      |
| SIMPLE_EXPONENTIAL_SMOOTHING            | Single smoothing             | No trend, no seasonality |
| DOUBLE_EXPONENTIAL_SMOOTHING            | Double smoothing             | Trend, no seasonality    |
| FORECAST_LINEAR                         | Linear regression            | Simple linear trend      |
| SEASONAL_LINEAR_REGRESSION              | Seasonal regression          | Seasonality with trend   |
| STANDARD_NORMAL_DISTRIBUTION            | Z-score probability          | Statistical analysis     |
| STANDARD_NORMAL_DISTRIBUTION_CUMULATIVE | Cumulative probability       | Confidence intervals     |

---

## Exponential Smoothing Functions

### FORECAST_ETS

Triple exponential smoothing (Holt-Winters). Handles trend and seasonality.

Syntax: `FORECAST_ETS(Input Block, Seasonality_length [, Ranking Dimension] [, Alpha] [, Beta] [, Gamma])`

Parameters:

- Input Block: Metric containing historical values (Number or Integer type)
- Seasonality_length: Integer. Length of the seasonal cycle (e.g., 12 for monthly data with yearly seasonality)
- Ranking Dimension (optional): Time dimension (e.g., Month). Optional if using native calendar dimension; required otherwise or if multiple time dimensions exist
- Alpha (optional): Level smoothing factor (0-1). Default: 0.25
- Beta (optional): Trend smoothing factor (0-1). Default: 0.1
- Gamma (optional): Seasonal smoothing factor (0-1). Default: 0.25

Examples:

```pigment
// Monthly forecast with yearly seasonality
FORECAST_ETS('Sales', 12, 'Month')

// Quarterly forecast with yearly seasonality, custom smoothing
FORECAST_ETS('Revenue', 4, 'Quarter', 0.3, 0.1, 0.1)
```

When to Use: Data has both trend and seasonality.

---

### SIMPLE_EXPONENTIAL_SMOOTHING

Single exponential smoothing. No trend, no seasonality.

Syntax: `SIMPLE_EXPONENTIAL_SMOOTHING(Input Block [, Ranking Dimension [, Alpha]])`

Parameters:

- Input Block: Metric containing historical values
- Ranking Dimension (optional): Time dimension (e.g., Month). Optional if using native calendar dimension; required otherwise or if multiple time dimensions exist
- Alpha (optional): Smoothing factor (0-1). Default: 0.5

Examples:

```pigment
// Smooth monthly data with default alpha
SIMPLE_EXPONENTIAL_SMOOTHING('Price', 'Month')

// Smooth daily data with custom alpha
SIMPLE_EXPONENTIAL_SMOOTHING('Sensor Reading', 'Day', 0.2)
```

When to Use: Data is stable with no clear trend or seasonality.

---

### DOUBLE_EXPONENTIAL_SMOOTHING

Double exponential smoothing (Holt's method). Handles trend, no seasonality.

Syntax: `DOUBLE_EXPONENTIAL_SMOOTHING(Input Block [, Ranking Dimension [, Alpha, Beta]])`

Parameters:

- Input Block: Metric containing historical values
- Ranking Dimension (optional): Time dimension (e.g., Month). Optional if using native calendar dimension; required otherwise or if multiple time dimensions exist
- Alpha (optional): Level smoothing factor (0-1). Default: 0.25
- Beta (optional): Trend smoothing factor (0-1). Default: 0.1

Examples:

```pigment
// Forecast with linear trend, default smoothing
DOUBLE_EXPONENTIAL_SMOOTHING('Monthly Growth', 'Month')

// Smoothed trend forecast with custom parameters
DOUBLE_EXPONENTIAL_SMOOTHING('User Count', 'Week', 0.3, 0.15)
```

When to Use: Data has a trend but no seasonality.

---

## Linear Forecasting Functions

### FORECAST_LINEAR

Simple linear regression forecast.

Syntax: `FORECAST_LINEAR(Source Metric [, Ranking Dimension] [, Alternate Metric])`

Parameters:

- Source Metric: Metric containing historical values
- Ranking Dimension (optional): Time dimension (e.g., Month). Optional if using native calendar dimension; required otherwise or if multiple time dimensions exist
- Alternate Metric (optional): Use another metric as the independent variable

Examples:

```pigment
// Simple linear trend by month
FORECAST_LINEAR('Monthly Revenue', 'Month')

// Linear regression using another metric as X
FORECAST_LINEAR('Cost of Sales', 'Month', 'Sales per Month')
```

When to Use: Simple linear trend, no seasonality.

---

### SEASONAL_LINEAR_REGRESSION

Linear regression with seasonal adjustment.

Syntax: `SEASONAL_LINEAR_REGRESSION(Input Block, Seasonality_length [, Ranking Dimension])`

Parameters:

- Input Block: Metric containing historical values
- Seasonality_length: Integer. Length of the seasonal cycle (e.g., 12 for monthly data with yearly seasonality)
- Ranking Dimension (optional): Time dimension (e.g., Month). Optional if using native calendar dimension; required otherwise or if multiple time dimensions exist

Examples:

```pigment
// Monthly with yearly seasonality
SEASONAL_LINEAR_REGRESSION('Sales', 12, 'Month')

// Quarterly with yearly seasonality
SEASONAL_LINEAR_REGRESSION('Revenue', 4, 'Quarter')
```

When to Use: Linear trend with clear seasonal pattern.

---

## Statistical Functions

### STANDARD_NORMAL_DISTRIBUTION

Probability density function (PDF) of standard normal distribution.

Syntax: `STANDARD_NORMAL_DISTRIBUTION(Z)`

Example:

```pigment
STANDARD_NORMAL_DISTRIBUTION(0)      // 0.3989 (peak at z=0)
STANDARD_NORMAL_DISTRIBUTION(1.96)   // ~0.058
```

---

### STANDARD_NORMAL_DISTRIBUTION_CUMULATIVE

Cumulative distribution function (CDF) of standard normal distribution.

Syntax: `STANDARD_NORMAL_DISTRIBUTION_CUMULATIVE(Z)`

Example:

```pigment
STANDARD_NORMAL_DISTRIBUTION_CUMULATIVE(0)      // 0.5 (50th percentile)
STANDARD_NORMAL_DISTRIBUTION_CUMULATIVE(1.96)   // 0.975 (97.5th percentile)
```

---

## Choosing the Right Method

| Data Characteristics             | Recommended Method                              |
| -------------------------------- | ----------------------------------------------- |
| Stable, no trend, no seasonality | SIMPLE_EXPONENTIAL_SMOOTHING                    |
| Trend, no seasonality            | DOUBLE_EXPONENTIAL_SMOOTHING or FORECAST_LINEAR |
| Seasonality, no trend            | SEASONAL_LINEAR_REGRESSION                      |
| Trend + Seasonality              | FORECAST_ETS                                    |
| Simple linear trend              | FORECAST_LINEAR                                 |

---

## Parameter Tuning Guide

- Alpha (Level Smoothing): 0.1-0.2 = heavy smoothing; 0.2-0.3 = moderate (most common); 0.4-0.5 = light smoothing, more responsive
- Beta (Trend Smoothing): 0.1 = smooth trend (most common); 0.2 = more responsive; 0.3+ = very responsive (rare)
- Gamma (Seasonal Smoothing): 0.1 = stable seasonality (most common); 0.2 = moderate; 0.3+ = changing seasonality

---

## Critical Rules

- More historical data = better forecast (minimum 2 seasonal cycles for ETS)
- Seasonality periods must match data (e.g., 12 for monthly/yearly, 4 for quarterly/yearly)
- Alpha/Beta/Gamma in range [0,1]
- Test different parameters (validate forecast accuracy with holdout data)
- ETS is most sophisticated (use for production forecasting)
- Linear methods are fast (good for simple trends)
