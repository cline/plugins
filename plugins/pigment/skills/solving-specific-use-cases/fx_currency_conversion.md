Use this document when designing or integrating FX currency conversion in Pigment: Hub app pattern, FX_01/FX_02/Push_DH_FX_* layers, AVG vs END rate types, reporting currency, entity mapping, and optional triangulation.

# Pigment FX: Currency Conversion Design & Usage Guide

## Overview

FX conversion in Pigment is built as a centralized, Version-aware engine living in a dedicated Hub app. All financial metrics (P&L, Balance Sheet, etc.) consume a single canonical FX rate metric - they never implement their own FX logic.

The engine is responsible for:
- Storing FX rates by currency, rate type, version, and month.
- Filling forward missing rates where source data is incomplete.
- Mapping each entity to its local and reporting currencies.
- Handling triangulation for multi-leg conversions.
- Outputting one consolidated FX rate metric used by all downstream metrics.

---

## 1. FX Dimensions

### Currency
The universe of currencies in the model. Examples: `USD`, `EUR`, `GBP`, `CNY`, `JPY`, `BRL`. Single property: `Name` (Text, display).

### FX Rate Types
Distinguishes the context in which a rate is used - same Currency x Month can carry multiple rates. The two standard types are:

- AVG (Average rate) - used for P&L conversion. Reflects the average exchange rate over the month, appropriate for income statement items that accrue continuously.
- END (End / closing rate) - used for Balance Sheet conversion. Reflects the rate at the last day of the month, appropriate for balance sheet items that are point-in-time.

Additional rate types (e.g. "Budget FX", "Spot") can be added but are the exception, not the default.

### Reporting Currency
The target currencies for reporting output. The standard setup is:

- Local - the functional currency of the entity itself (see note below).
- Group - the consolidation currency of the organization (e.g. USD or EUR).

Additional reporting currencies (e.g. regional currencies) can be added, but this should be a deliberate choice, not a default.

> Local currency vs. transactional currency: "Local" in this context means the functional currency of the entity - the primary currency in which it operates. It does not mean the transactional currency of individual line items (which may differ). Transactional currency handling is a more advanced pattern and not the default setup.

---

## 2. Metric Architecture

The FX engine is built in layers, each with a single responsibility. The final output metric is the only one that P&L, Balance Sheet, and other financial metrics should ever reference.

```
FX_01  Raw FX rates input (by Version)
  down
FX_02  Fill-forward / cleaning (by Version, only if source data has gaps)
  down
Push_DH_FX_Entity Currencies  - entity -> currency mapping
  down
Push_DH_FX_FX Rates  <- only this is referenced by P&L, BS, etc.
```

> Triangulation (an optional intermediate step) is only needed if your rate source doesn't cover all required currency pairs directly - e.g. you have CNY -> USD and USD -> EUR but no CNY -> EUR rate. In that case, add a triangulation metric between entity mapping and the final output to build multi-leg rates per entity. Most models don't need this.

---

## 3. Layer-by-Layer Breakdown

### FX_01_Input_FX Rates
Dimensions: `Currency x FX Rate Types x Version x Month`

The raw input store for FX rates. Version is required here - rates are entered per Version from the start, so Budget, Reforecast Q1, Reforecast Q2, etc. each carry their own rate series. There is no shared "unversioned" input that gets split later.

When creating a new Version, use the Clone feature (per application) to copy rates from an existing Version as a starting point, then adjust as needed. See the Versions skill for cloning guidance.

### FX_02_FX Rates_Spread *(only if needed)*
Dimensions: `Currency x FX Rate Types x Version x Month`

If the source data feeding FX_01 is complete for every month, this layer is not needed. If there are gaps - e.g. a rate is only provided quarterly, or a new currency starts mid-year - this metric fills those gaps forward so every Currency x Rate Type x Version has a continuous monthly time series.

Still dimensioned by Version: each Version's series is cleaned independently.

### Push_DH_FX_Entity Currencies
Dimensions: `Entity x Reporting Currency` -> value is a `Currency` dimension member

Structural mapping: for a given Entity and Reporting Currency, stores which currency to use as the source. For example, a French entity reporting to Group would map to EUR as its local currency. No Version dimension - this is static entity configuration that applies across all Versions.

### Push_DH_FX_FX Rates <- *only this leaves the Hub app*
Dimensions: `FX Rate Types x Version x Entity x Month x Reporting Currency`

The canonical output of the Hub app. Combines the entity-currency mapping with the Version-aware rate series to return a single conversion rate: "to convert this entity's local currency to the selected Reporting Currency, for this Version and Month, using this Rate Type."

Because this metric is dimensioned by Version, any downstream metric referencing it automatically uses the correct rates for its Version. Switch Version on a board -> all converted values are consistent.

---

## 4. How Financial Metrics Use FX

The pattern is simple:

```
Converted Amount = Local Amount x Push_DH_FX_FX Rates
```

The FX rate metric carries Version, Entity, Month, Rate Type, and Reporting Currency - so when a P&L metric is dimensioned by those same axes, Pigment resolves the correct rate automatically. No FX logic lives in the P&L or BS metrics themselves.

Use AVG rate for P&L items. Use END rate for Balance Sheet items. If a model needs both (e.g. a full financial consolidation), the Rate Type dimension on the FX metric handles this without needing separate FX metrics per statement.

---

## 5. Best Practices

### Centralize in a Hub app
All FX logic - dimensions, input metrics, cleaning, mapping, triangulation, output - lives in one dedicated Hub app. No other app contains FX calculations. This makes FX auditable, maintainable, and consistent across the model.

### Rates are input by Version, cloned between Versions
There is no single shared rate series that gets "applied" to Versions later. Each Version owns its rates from FX_01 onward. When a new Version is created, clone the relevant application's data from an existing Version and adjust. This keeps each Version's FX environment independent and explicit.

### Only reference the final output metric
`Push_DH_FX_FX Rates` is the only FX metric that should be referenced outside the Hub app. Referencing `FX_01` or `FX_02` from a P&L metric bypasses entity mapping and will produce incorrect results.

### AVG for flow items, END for stock items
This is a standard accounting convention. P&L items (revenues, costs) flow over the month -> use AVG. Balance sheet items are a point-in-time balance -> use END. Establish this convention at model setup and enforce it consistently.
