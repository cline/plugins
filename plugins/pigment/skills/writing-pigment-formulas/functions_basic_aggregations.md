# Basic Aggregation Functions

Functions that aggregate dimension items into single values (no dimensions in result).

Covers: AVGOF, COUNTALLOF, COUNTBLANKOF, COUNTUNIQUEOF, SUMOF, MINOF, MAXOF, COUNTOF

---

## Quick Reference

| Function          | Purpose                       | Syntax Example              |
| ----------------- | ----------------------------- | --------------------------- |
| SUMOF         | Sum of all values             | `SUMOF('Sales')`            |
| AVGOF         | Average of all values         | `AVGOF('Revenue')`          |
| MINOF         | Minimum value                 | `MINOF('Price')`            |
| MAXOF         | Maximum value                 | `MAXOF('Price')`            |
| COUNTOF       | Count non-blank items         | `COUNTOF('Revenue')`        |
| COUNTALLOF    | Count all items (incl. blank) | `COUNTALLOF('Revenue')`     |
| COUNTBLANKOF  | Count blank items             | `COUNTBLANKOF('Revenue')`   |
| COUNTUNIQUEOF | Count unique values           | `COUNTUNIQUEOF('Customer')` |

---

## When to Use OF Functions vs Modifiers

xxxOF Functions (this file):

- Aggregate ALL dimensions to single value
- Return a scalar (no dimensions)
- Use when you need a single total
- Example: `SUMOF('Revenue')` -> one total across all dimensions

Modifiers ([formula_modifiers.md](./formula_modifiers.md)):

- Aggregate specific dimensions
- Keep other dimensions in result
- Use for dimensional aggregation
- Example: `'Revenue'[REMOVE: Product]` -> totals by other dimensions

Rule of Thumb: Prefer modifiers for dimensional control. Use OF functions only when you need a single aggregate value.

---

## SUMOF

Returns the sum of all values in a Block.

Syntax: `SUMOF(Block)`

Examples:

```pigment
SUMOF('Revenue')                // Total revenue
SUMOF('Quantity')               // Total quantity
```

---

## AVGOF

Returns the average of all non-blank values in a Block.

Syntax: `AVGOF(Block)`

Examples:

```pigment
AVGOF('Revenue')                // Average of all revenue values
AVGOF(Employee.ID)              // Average of all Employee IDs
```

---

## MINOF

Returns the minimum value in a Block.

Syntax: `MINOF(Block)`

Examples:

```pigment
MINOF('Price')                  // Lowest price
MINOF('Start Date')             // Earliest start date
```

---

## MAXOF

Returns the maximum value in a Block.

Syntax: `MAXOF(Block)`

Examples:

```pigment
MAXOF('Price')                  // Highest price
MAXOF('Salary')                 // Highest salary
```

---

## COUNTOF

Counts the number of non-blank values in a Block.

Syntax: `COUNTOF(Block)`

Examples:

```pigment
COUNTOF('Revenue')              // Number of products with revenue
COUNTOF('Sales')                // Number of customers with sales
```

---

## COUNTALLOF

Counts all items in a Block, including blanks.

Syntax: `COUNTALLOF(Block)`

Examples:

```pigment
COUNTALLOF('Revenue')           // Total number of products (even if no revenue)
COUNTALLOF('Price')             // Total number of SKUs
```

---

## COUNTBLANKOF

Counts the number of blank values in a Block.

Syntax: `COUNTBLANKOF(Block)`

Examples:

```pigment
COUNTBLANKOF('Price')           // Number of products missing prices
COUNTBLANKOF('Manager')         // Number of employees without managers
```

---

## COUNTUNIQUEOF

Counts the number of unique non-blank values in a Block.

Syntax: `COUNTUNIQUEOF(Block)`

Examples:

```pigment
COUNTUNIQUEOF('Customer')                   // Unique customers
COUNTUNIQUEOF('Product'.'Category')         // Unique categories
COUNTUNIQUEOF('Employee'.'Department')      // Unique departments
```

---

## Common Patterns

### Pattern 1: Average Salary by Department

```pigment
'Salary'[BY AVG: Employee.Department]
```

### Pattern 2: Count of Active Customers

```pigment
COUNTOF('Revenue'[SELECT: 'Customer'.'IsActive'])
```

### Pattern 3: Max Sale by Region

```pigment
'Transaction'.'Amount'[REMOVE MAX: Transaction][BY: 'Region']
```

### Pattern 4: Missing Data Check

```pigment
COUNTBLANKOF('Price') / COUNTALLOF('Price')
```

### Pattern 5: Unique Customer Count by Month

```pigment
'Order'.'Customer'[REMOVE COUNTUNIQUE: 'Order'][BY: 'Month']
```

## When to Use Functions vs Modifiers

| Scenario                   | Use         | Example                                 |
| -------------------------- | ----------- | --------------------------------------- |
| Aggregate all items        | OF Function | `SUMOF('Revenue')`                      |
| Aggregate by dimension     | Modifier    | `'Revenue'[REMOVE: Product]`            |
| Non-SUM aggregation by dim | Modifier    | `'Price'[REMOVE AVG: Product]`          |
| Min/Max by dimension       | Modifier    | `'Price'[REMOVE MIN: Product]`          |
| Unique count by dimension  | Modifier    | `'Customer'[REMOVE COUNTUNIQUE: Order]` |

---

## Critical Rules

- OF functions return single value - No dimensions in result
- Prefer modifiers for dimensional aggregation - Better performance and clarity
- Functions ignore blank values - Except COUNTALLOF and COUNTBLANKOF
- COUNTALLOF counts all items - Even blanks
- COUNTUNIQUEOF on expressions - Can count unique property values

---

## See Also

- [formula_modifiers.md](./formula_modifiers.md) - BY, REMOVE, KEEP, SELECT for dimensional aggregation
