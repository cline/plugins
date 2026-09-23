# Lookup Functions

Dimensional transformation functions for lookups, matching, and time shift.

Covers: ITEM, MATCH, SHIFT, TIMEDIM

---

## Quick Reference

| Function    | Purpose                              | Syntax Example                                    |
| ----------- | ------------------------------------ | ------------------------------------------------- |
| ITEM    | Lookup by unique property            | `ITEM("ben@corp.com", 'Employees'.'Email')`       |
| MATCH   | Lookup by any property (first match) | `MATCH('Order'.'ProductCode', 'Products'.'Code')` |
| SHIFT   | Offset dimension items               | `SHIFT('Sales', 1)`                               |
| TIMEDIM | Convert date to calendar element     | `TIMEDIM('Transactions'.'Date', Month)`           |

---

## ITEM

Looks up an item in a dimension list based on a unique property. Returns BLANK if no match is found.

Syntax: `ITEM(ValueToFind, Dimension.'UniqueProperty')`

Examples:

```pigment
ITEM("ben@corp.com", 'Employees'.'Email') // Returns the corresponding employee
ITEM('Transaction'.'ProductCode', 'Products'.'Code') // Lookup by product code
```

---

## MATCH

Looks up an item in a dimension list based on any property (unique or not). Returns the first match or BLANK.

Syntax: `MATCH(ValueToMatch, Expression)`

Example:

```pigment
MATCH('Order'.'ProductName', 'Products'.'Name') // First matching product
```

---

## SHIFT

Offsets dimension items by a number of positions. Returns a dimension item, not a value. Used for dimension-typed blocks.

Syntax: `SHIFT(Block, Offset)`

Example:

```pigment
// Shift a dimension-typed block (returns dimension item)
SHIFT('Employee'.'Start Month', 1)
```

---

## TIMEDIM

Converts a date into an element of a calendar dimension (Year, Month, Week, etc.).

Syntax: `TIMEDIM(Date, TimeDimension)`

Time Dimensions: Year, Half, Quarter, Month, Week, Day

Examples:

```pigment
TIMEDIM('Transactions'.'Date', Month)                           // Convert to month
TIMEDIM('Employee'.'Start Date', Quarter)                       // Convert to quarter
TIMEDIM(DATE(2024,6,15), Year)                                  // Convert date to year
TIMEDIM('Orders'.'OrderDate', Week)                             // Convert to week
```

Key Points:

- Essential for aggregating transaction data to time periods
- Respects fiscal year settings in calendar configuration
- Use with BY modifier to aggregate transaction lists
- See [formula_modifiers.md](./formula_modifiers.md) for transaction aggregation patterns

---

## Critical Rules

- ITEM works only with unique properties (faster)
- MATCH works with any property (returns first match)
- TIMEDIM respects fiscal year settings - Not calendar year
- TIMEDIM essential for transaction aggregation - Use with BY modifier
- Actual/Forecast properties - Configure in calendar, use in formulas
- Time hierarchy is automatic - Month aggregates to Quarter, Year
- Multiple calendars need specification - Specify which calendar in TIMEDIM
- SHIFT facilitates temporal offsets with dimension positions
- Aggregate transactions early - Use TIMEDIM + BY for performance

---

## See Also

- [formula_modifiers.md](./formula_modifiers.md) - TIMEDIM usage examples with BY modifier
- [functions_iterative_calculation.md](./functions_iterative_calculation.md) - PREVIOUS, PREVIOUSOF for iterative/sequential calculations
- [functions_numeric.md](./functions_numeric.md) - CUMULATE, MOVINGSUM for time series
