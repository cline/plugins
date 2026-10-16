# Logical Functions

Boolean operations, conditional logic, and sparsity-aware functions.

Covers: Boolean Logic (AND, OR, NOT), Conditional Functions (IF, SWITCH), Blank Handling (ISBLANK, IFDEFINED, IFBLANK), Collection Functions (ANYOF, ALLOF, IN)

---

## Quick Reference

| Function       | Purpose                     | Syntax Example                                        |
| -------------- | --------------------------- | ----------------------------------------------------- |
| IF         | Conditional logic           | `IF(Condition, ValueIfTrue, ValueIfFalse)`            |
| SWITCH     | Multiple conditions         | `SWITCH(Expression, Case1, Result1, ..., Default)`    |
| AND        | All conditions true         | `AND(Cond1, Cond2, ...)`                              |
| OR         | Any condition true          | `OR(Cond1, Cond2, ...)`                               |
| NOT        | Negate condition            | `NOT(Condition)`                                      |
| IFDEFINED  | Check if defined (sparse) OK | `IFDEFINED(Block, ValueIfDefined, ValueIfNotDefined)` |
| IFBLANK    | Default if blank            | `IFBLANK(Block, DefaultValue)`                        |
| ISBLANK    | Check if blank (densifies!) | `ISBLANK(Block)`                                      |
| ISNOTBLANK | Check if not blank          | `ISNOTBLANK(Block)`                                   |
| ISDEFINED  | Check if defined (sparse) OK | `ISDEFINED(Value)`                                    |
| ANYOF      | Any value is TRUE           | `ANYOF(BooleanBlock)`                                 |
| ALLOF      | All values are TRUE         | `ALLOF(BooleanBlock)`                                 |
| IN         | Value in set (infix)        | `Block IN (Item1, Item2, ...)`                        |
| TRUE       | Boolean true                | `TRUE`                                                |
| FALSE      | Boolean false               | `FALSE`                                               |

---

## Conditional Functions

### IF

Execute conditional logic.

Syntax: `IF(Condition, ValueIfTrue, ValueIfFalse)`

Examples:

```pigment
// Basic IF
IF('Revenue' > 1000000, "High", "Low")

// Nested IF
IF('Score' >= 90, "A", IF('Score' >= 80, "B", "C"))

// IF with calculations
IF('Actual' > 'Budget', 'Actual' - 'Budget', BLANK)

// IF with blank handling
IF(IFDEFINED('Price'), 'Price' * 'Quantity', BLANK)
```

Key Points:

- Both ValueIfTrue and ValueIfFalse are always evaluated
- Result dimensions = union of ALL branches and conditions - If condition uses dimensions, result gains them
- For sparsity preservation, use IFDEFINED instead of IF(ISBLANK())
- Do not densify with 0 when not absolutely needed
- Condition must be Boolean expression

Dimension Conditions:

```pigment
// Condition with dimension member - use VAR_ input metric of type Dimension
IF(Country = VAR_Selected_Country, 'Local Rate', 'Default Rate')
IF(Month = VAR_Reference_Month, 'Budget', 'Forecast')

// Condition with metric value
IF('Revenue' > 1000000, "High", "Low")
```

---

### SWITCH

Multi-way conditional (replaces nested IFs).

Syntax: `SWITCH(Expression, Case1, Result1, Case2, Result2, ..., DefaultResult)`

Examples:

```pigment
// Category classification
SWITCH('Score',
  90, "A",
  80, "B",
  70, "C",
  "F"
)

// Text matching
SWITCH('Status',
  "Active", 1,
  "Inactive", 0,
  "Pending", 0.5,
  0
)

// Dimension-based logic
SWITCH('Product'.'Category',
  "Electronics", 'Price' * 1.2,
  "Clothing", 'Price' * 1.1,
  'Price'
)
```

Key Points:

- Cleaner than nested IF statements
- Evaluates all cases (not short-circuit)
- Last argument is default if no match
- More readable for multi-way logic

---

## Boolean Logic

Note: AND and OR follow the same dimension alignment rules as other combining operations. Both operands should have the same dimensions. See [Dimension Flow Rules](./formula_modifiers.md#dimension-flow-rules).

### AND

All conditions must be true.

Syntax: `AND(Condition1, Condition2, ...)`

Examples:

```pigment
AND('Revenue' > 1000, 'Profit' > 0)                              // Both must be true
AND('Employee'.'IsActive', 'Employee'.'Department' = "Sales")   // Active AND Sales
AND('Score' >= 70, 'Attendance' >= 0.8, 'Projects' >= 3)       // All three true
```

---

### OR

Any condition must be true.

Syntax: `OR(Condition1, Condition2, ...)`

Examples:

```pigment
OR('Revenue' > 1000000, 'Customers' > 100)                       // Either true
OR('Status' = "Active", 'Status' = "Pending")                   // Active OR Pending
OR('Score' >= 90, 'Bonus Points' >= 100)                        // Either qualifies
```

---

### NOT

Negate a boolean expression.

Syntax: `NOT(Condition)`

Examples:

```pigment
NOT('Employee'.'IsActive')                                       // Not active
NOT('Product'.'IsDiscontinued')                                 // Not discontinued
NOT(ISBLANK('Price'))                                           // Not blank (use ISNOTBLANK instead)
```

---

## Blank Handling (Critical for Sparsity)

Choosing the right function impacts model performance, sparsity, and database computation.

### Quick Recommendations

| Instead of                            | Use             | Why                                       |
| ------------------------------------- | --------------- | ----------------------------------------- |
| `ISBLANK(A)`                          | `ISDEFINED(A)`  | Avoids densifying metrics                 |
| `IF(ISBLANK(A), B, A)`                | `IFBLANK(A, B)` | Cleaner formula, simpler computation      |
| `IFDEFINED(A, A, B)` when B is sparse | `IFBLANK(A, B)` | Preserves sparsity, optimizes computation |

Note: `IFDEFINED(A, X, Y)` and `IF(ISDEFINED(A), X, Y)` behave identically - use whichever is clearer.

ISBLANK and ISNOTBLANK are densifying: they return TRUE or FALSE for every cell and are almost never the right primitive for sparsity maintenance. Prefer ISDEFINED, IFDEFINED, IFBLANK, or EXCLUDE. If in doubt, do not use ISBLANK/ISNOTBLANK; use ISDEFINED, IFDEFINED, IFBLANK, or EXCLUDE instead.

### Function Comparison

| Function                 | Returns                             | Densifies?             |
| ------------------------ | ----------------------------------- | ---------------------- |
| ISBLANK / ISNOTBLANK | TRUE/FALSE for ALL cells            | Yes - always       |
| ISDEFINED            | TRUE where defined, BLANK elsewhere | No                 |
| IFBLANK(A, B)        | A if defined, B otherwise           | Only if B is dense |
| IFDEFINED(A, X, Y)   | X if A defined, Y otherwise         | Only if Y is dense |

```pigment
// BAD: Avoid - densifies
IF(ISBLANK('Revenue'), 0, 'Revenue')
ISBLANK('Price')

// GOOD: Prefer - preserves sparsity
IFBLANK('Revenue', 0)
ISDEFINED('Price')
```

---

### Understanding BLANK vs FALSE

BLANK and "not defined" mean that no value exists.

| Term        | Meaning          | Stored as a value |
| ----------- | ---------------- | ----------------- |
| BLANK       | No value         | No            |
| not defined | No value         | No            |
| FALSE       | Explicit boolean | Yes           |
| TRUE        | Explicit boolean | Yes           |

Key insight: `BLANK != FALSE`. Using FALSE where you mean "no value" causes densification.

### How Blanks Behave with Operators

Pigment's sparse engine treats blanks differently depending on the operator and dimension alignment.

Operator Groups:

| Operator Group     | Operators       | Blank Behavior                                      |
| ------------------ | --------------- | --------------------------------------------------- |
| Additive       | `+`, `-`, `OR`  | `blank + value = value` (blank treated as identity) |
| Multiplicative | `*`, `/`, `AND` | `blank x value = blank` (blank propagates)          |

Dimension Alignment Effects:

| Scenario                 | Additive (`+`, `-`, `OR`)              | Multiplicative (`*`, `/`, `AND`)   |
| ------------------------ | -------------------------------------- | ---------------------------------- |
| Same dimensions      | blank + value = value                  | blank x value = blank              |
| One common dimension | Blanks in higher-dim metric stay blank | Blanks in either metric stay blank |
| No common dimensions | Blanks in either metric stay blank     | Blanks in either metric stay blank |
| Metric + constant    | Blanks stay blank                      | Blanks stay blank                  |

Examples:

```pigment
// Same dimensions (Product x Month)
'Revenue' + 'Adjustment'
// If Revenue is blank but Adjustment has value -> result = Adjustment value
// If Revenue has value but Adjustment is blank -> result = Revenue value

'Revenue' * 'Rate'
// If Revenue is blank -> result = blank (regardless of Rate)
// If Rate is blank -> result = blank (regardless of Revenue)

// Metric + constant
'Revenue' + 100    // Blank Revenue cells stay blank (not 100)
'Revenue' * 1.1    // Blank Revenue cells stay blank (not 0)
```

Key Implications:

1. Addition doesn't fill blanks with constants - `'Revenue' + 100` keeps blank cells blank
2. Multiplication propagates blanks - Any blank input produces blank output
3. Division by blank returns blank - No need to check for blank denominators
4. Dimension mismatch preserves blanks - When dimensions differ, blanks are not broadcast

When You Need to Fill Blanks:

Use `IFBLANK` explicitly when you want blanks replaced:

```pigment
// Fill blanks with 0 for addition
IFBLANK('Revenue', 0) + 'Adjustment'

// Fill blanks with 1 for multiplication
'Revenue' * IFBLANK('Rate', 1)
```

---

### WARNING: ISBLANK - Use Sparingly

Check if value is blank. Warning: Densifies metrics!

Syntax: `ISBLANK(Block)`

Returns:

- TRUE if blank (explicit boolean - stored)
- FALSE if defined (explicit boolean - stored)

Examples:

```pigment
ISBLANK('Price')                                                // TRUE if blank, FALSE if defined
IF(ISBLANK('Revenue'), 0, 'Revenue')                           // BAD: DENSIFIES! Use IFBLANK
```

Why it densifies: ISBLANK returns explicit TRUE/FALSE values for ALL cells. Both TRUE and FALSE are stored, so every cell now has a value.

Critical Warning:

- ISBLANK densifies - Returns TRUE/FALSE for all dimension combinations
- Massive performance impact for sparse metrics
- Use ISDEFINED instead in 99% of cases (returns TRUE or BLANK, not TRUE or FALSE)

Default: Avoid ISBLANK - Use ISDEFINED Instead

- When sparsity is unknown or uncertain -> always use ISDEFINED
- ISDEFINED is the safe choice: returns TRUE where defined, BLANK elsewhere (never densifies)
- ISBLANK writes TRUE or FALSE in every cell, making the metric 100% dense
- Rule of thumb: If you're unsure whether a metric is sparse or dense, assume it's sparse and use ISDEFINED

Allow list - when ISBLANK/ISNOTBLANK are acceptable (very limited valid use in Pigment):

- The input is already dense (e.g. small, non-sparse metric).
- You explicitly need a full TRUE/FALSE for every cell (e.g. exporting or reporting where every cell must be TRUE or FALSE).
- Very small dimension space where densification cost is negligible.

Anti-patterns (avoid):

- Guarding a metric before using it in BY - If a dimension-typed metric is in BY, its sparsity is respected automatically; do not wrap in `IF(ISBLANK(metric), BLANK, ...)`. Use the BY expression alone.
- Using IF(ISBLANK(A), BLANK, expr) for sparsity - Use IFDEFINED or BY-driven sparsity instead.
- Using ISNOTBLANK for "exists" checks - Use ISDEFINED (returns TRUE/BLANK, not TRUE/FALSE).
- Using ISBLANK/ISNOTBLANK for date-range presence - Use PRORATA + ISDEFINED/IFDEFINED (see [functions_time_and_date.md](./functions_time_and_date.md)).

Alternative: Use EXCLUDE Instead of ISBLANK

When you need "A is true and B is blank", use the EXCLUDE modifier instead of combining AND with ISBLANK. EXCLUDE restricts the formula's scope to cells where the excluded metric is blank, avoiding densification entirely.

```pigment
// BAD: Densifies: ISBLANK evaluates every cell of B
IF(A AND ISBLANK(B), TRUE)

// GOOD: Sparse: EXCLUDE restricts scope to where B is blank
IF(A [EXCLUDE: B], TRUE)
```

Why EXCLUDE is better:

- ISBLANK(B) produces TRUE/FALSE for every cell of B, densifying the result
- `[EXCLUDE: B]` tells the engine to skip cells where B is defined - no extra boolean metric is created
- The formula only runs where B is blank, so computation is smaller and output stays sparse

---

### ISNOTBLANK

Check if value is not blank. Same densification warning as ISBLANK.

Syntax: `ISNOTBLANK(Block)`

Returns:

- TRUE if defined (explicit boolean - stored)
- FALSE if blank (explicit boolean - stored)

Examples:

```pigment
ISNOTBLANK('Price')                                             // TRUE if defined, FALSE if blank
```

Warning: Densifies like ISBLANK - returns TRUE/FALSE for ALL cells. Use `ISDEFINED` instead (returns TRUE/BLANK).

---

### OK ISDEFINED - Sparse Check

Check if value is defined without densifying. Returns TRUE or BLANK (not FALSE).

Syntax: `ISDEFINED(Value)`

Examples:

```pigment
ISDEFINED(1)                                                    // TRUE (1 is defined)
ISDEFINED(BLANK)                                                // BLANK (not FALSE!)
ISDEFINED('Price')                                              // TRUE where Price has value, BLANK elsewhere
```

Key Advantage over ISNOTBLANK:

- ISDEFINED returns TRUE or BLANK -> sparse result, unpopulated cells not written
- ISNOTBLANK returns TRUE or FALSE -> 100% dense, every cell populated

When to Use:

- Checking if a value exists without densifying
- Building boolean conditions that preserve sparsity
- Performance-critical formulas on large dimension combinations

Note: For conditional logic with fallback values, use IFDEFINED instead.

Why isNotDefined doesn't exist: It would create ambiguous cases mixing FALSE and BLANK. If you need this behavior, use `IFDEFINED(X, BLANK, TRUE)`.

---

### OK IFDEFINED - Preferred for Sparsity

Check if value is defined without densifying.

Syntax: `IFDEFINED(Block, ValueIfDefined, ValueIfNotDefined)`

Returns:

- ValueIfDefined where Block has a value
- ValueIfNotDefined where Block is blank (defaults to BLANK if omitted)

Contrast with ISBLANK:

- `ISBLANK('X')` -> Returns TRUE/FALSE for ALL cells (dense)
- `ISDEFINED('X')` -> Returns TRUE where defined, BLANK (not FALSE) elsewhere (sparse)

Examples:

```pigment
// OK Preserves sparsity - returns BLANK for undefined cells
IFDEFINED('Price', 'Price' * 'Quantity', BLANK)

// OK Default if not defined
IFDEFINED('Exchange Rate', 'Amount' * 'Exchange Rate', 'Amount')

// OK Conditional calculation
IFDEFINED('Discount', 'Price' * (1 - 'Discount'), 'Price')

// OK Access rights pattern
IFDEFINED(User, 'Confidential Data', BLANK)
```

Key Points:

- Preserves sparsity - Returns BLANK (not FALSE) for undefined cells
- Always prefer IFDEFINED over IF(ISBLANK())
- Essential for performance with sparse metrics
- Common pattern for access rights: `IFDEFINED(User, Data, BLANK)`

---

### IFBLANK

Provide default value if blank. Does NOT densify (unless DefaultValue is dense).

Syntax: `IFBLANK(Block, DefaultValue)`

Behavior: Returns Block if defined, otherwise DefaultValue.

Examples:

```pigment
IFBLANK('Price', 0)                                             // 0 if blank
IFBLANK('Discount', 0.1)                                        // Default 10% discount
IFBLANK('Exchange Rate', 1)                                     // Default rate of 1
```

Key Points:

- Cleaner than `IF(ISBLANK(Block), Default, Block)` and more efficient
- Prefer IFBLANK over IFDEFINED when you just want `A or default B`

Dimension Check (required before using IFBLANK):

Use the [Dimension Flow Rules](./formula_modifiers.md#dimension-flow-rules) to trace dimensions through your formula, then compare:

1. Same dimensions -> IFBLANK is safe (preserves sparsity, output = union of defined cells)
2. First argument has more dimensions than second -> Avoid IFBLANK (causes densification)

When to Use IFBLANK:

- When both arguments have the same dimensions (verify from metric definitions)
- When dimensions match, IFBLANK preserves reasonable sparsity

When to Avoid IFBLANK:

- When the first argument has higher dimensionality than the second
- When dimension alignment is unclear -> use IFDEFINED with explicit BLANK fallback instead: `IFDEFINED(A, A, BLANK)`

Why Dimension Mismatch Causes Densification:

When IFBLANK(A, B) has A with more dimensions than B, Pigment broadcasts B across all of A's dimension combinations, filling every blank cell in A's scope with B's value.

References: See IFBLANK Use Cases, MS01 (Sparse Engine documentation).

---

## Collection Functions

### ANYOF

Check if any value in a Boolean block is TRUE.

Syntax: `ANYOF(BooleanBlock)`

Examples:

```pigment
// Any product in target category - prefer boolean property on Product
ANYOF('Product'.'Include Category')

// Any employee in Sales department
ANYOF('Employee'.'Department' = "Sales")

// Any country with revenue > 1M
ANYOF('Revenue' > 1000000)
```

Returns: Boolean (TRUE if any item matches)

---

### ALLOF

Returns TRUE if the input boolean block contains only TRUE values.

Syntax: `ALLOF(BooleanBlock)`

Example:

```pigment
// All products are active
ALLOF('IsActiveProduct')
```

Returns: Boolean (TRUE if all items match)

---

### IN

Check if items in a List/Block belong to a given set, or fall within a numeric/date range. IN is an infix operator, not a function call.

Syntax (specific items): `Block IN (Item1, Item2, ..., ItemN)`

Syntax (range, inclusive bounds): `Block IN (lower : upper)`

Examples:

```pigment
// Specific members - prefer boolean property or mapping metric (MP02)
Country IN (VAR_Primary_Country, VAR_Secondary_Country)

// Negation over a subset property
NOT Month IN (VAR_Excluded_Month_1, VAR_Excluded_Month_2, VAR_Excluded_Month_3)

// Range over a Year property
'Switchover Date'[ADD: Year] IN (Year.'Start Date' : Year.'End Date')
```

Returns: Boolean (TRUE if Block matches any item / falls in the range).

Key Point: Cleaner than multiple OR conditions. MP02: Do not list `Dimension."Item"` literals - use `VAR_` metrics or boolean properties (see examples above).

---

## Critical Sparsity Rules

### BAD: Never Use These Patterns (Densify)

```pigment
IF(ISBLANK('Price'), 0, 'Price')                                // BAD: Densifies
IF(ISNOTBLANK('Revenue'), 'Revenue', 0)                        // BAD: Densifies
NOT(ISBLANK('Price'))                                           // BAD: Densifies
IF(condition, TRUE, FALSE)                                       // BAD: FALSE is stored - use BLANK instead
```

### OK Always Use These Patterns (Sparse)

```pigment
IFDEFINED('Price', 'Price', 0)                                  // OK Sparse
IFBLANK('Price', 0)                                             // OK Better
IFDEFINED('Revenue', 'Revenue', 0)                             // OK Sparse
IF(condition, TRUE, BLANK)                                       // OK BLANK instead of FALSE for boolean flags
IF(condition, TRUE)                                              // OK Omitting else defaults to BLANK
ISDEFINED('Revenue')                                             // OK Returns TRUE/BLANK, not TRUE/FALSE
IF(A [EXCLUDE: B], TRUE)                                         // OK "A and B blank" without densifying B
```

### Performance Pattern: Early Scoping

```pigment
// BAD: Slow: Calculates everywhere then filters
IF('Revenue' > 1000, 'Revenue', BLANK)

// OK Fast: Filters early with IFDEFINED
IFDEFINED('Revenue', IF('Revenue' > 1000, 'Revenue', BLANK), BLANK)
```

### Access Rights Pattern

```pigment
// Always wrap sensitive data with IFDEFINED(User)
IFDEFINED(User, 'Confidential Salary', BLANK)
```

---

## Common Patterns

### Pattern 1: Division (No Check Needed)

Pigment handles division by zero natively - it returns BLANK automatically. No need to check!

```pigment
// GOOD: CORRECT: Just divide - Pigment returns BLANK if denominator is 0 or BLANK
'Numerator' / 'Denominator'

// BAD: WRONG: Unnecessary check - Pigment already handles this
IF('Denominator' = 0, BLANK, 'Numerator' / 'Denominator')

// BAD: WRONG: Also unnecessary
IF('Denominator' <> 0, 'Numerator' / 'Denominator', BLANK)
```

Key Point: Division by zero or BLANK automatically returns BLANK in Pigment. Don't wrap division in IF checks for zero - it's redundant and adds computation.

### Pattern 2: Threshold Classification

```pigment
IF('Revenue' > 1000000, "Large", IF('Revenue' > 100000, "Medium", "Small"))
```

### Pattern 3: Default Values

```pigment
IFDEFINED('ActualData', 'ActualData', 'ForecastData')
```

### Pattern 4: Variance with Conditional Formatting

```pigment
IF('ActualData' > 'BudgetData', 'ActualData' - 'BudgetData', BLANK)
```

### Pattern 5: Multi-Condition Filter

```pigment
IF(AND('Revenue' > 1000, 'Profit' > 0, 'Growth' > 0.1), "Quality", "Review")
```

---

## Critical Rules

- BLANK = undefined = not defined - All mean "no value", not stored
- FALSE != BLANK - FALSE is an explicit boolean value that IS stored
- IFDEFINED > IFBLANK > IF(ISBLANK()) - Always prefer IFDEFINED for sparsity
- ISBLANK/ISNOTBLANK densify - They return TRUE/FALSE (both stored) for ALL cells
- ISDEFINED preserves sparsity - Returns TRUE where defined, BLANK (not FALSE) elsewhere
- Use BLANK instead of FALSE - For sparse boolean flags, return TRUE or BLANK, not TRUE or FALSE
- ISDEFINED > ISNOTBLANK - ISDEFINED returns BLANK (sparse), ISNOTBLANK returns FALSE (dense)
- ISBLANK densifies - Avoid unless absolutely necessary
- IF evaluates both branches - Not short-circuit
- SWITCH is cleaner than nested IF - Use for multi-way logic
- IFDEFINED(User) for access rights - Essential security pattern
- Early scoping - Filter before expensive calculations
- AND/OR evaluate all arguments - Not short-circuit
- For "A and B blank", prefer `IF(A [EXCLUDE: B], TRUE)` over `IF(A AND ISBLANK(B), TRUE)` - EXCLUDE avoids densifying B

---

## See Also

- [formula_performance_patterns.md](./formula_performance_patterns.md) - Sparsity optimization patterns
