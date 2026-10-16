# Formula Performance Patterns

Apply this checklist proportionally to formula complexity. Simple arithmetic between existing same-dimensioned metrics (e.g. `'A' + 'B'`, `'A' * 'B'`, `'A' / 'B'`) needs no performance wrapping - deliver as-is. Review these patterns for formulas that involve conditionals, dimensional changes, date-range logic, or that target large/sparse metrics.

This checklist ensures formulas are performant. For detailed explanations, see the `skill:optimizing-pigment-performance`.

---

## Performance Checklist

Before delivering a formula, verify the applicable items:

Always check (universal):

- [ ] Identifiers are correctly quoted (single quotes for names, double quotes for items)
- [ ] Dimensions are aligned - no unintended ADD or dimension mismatch
- [ ] Scoping clauses appear FIRST (FILTER, EXCLUDE, IFDEFINED)
- [ ] Aggregations appear AFTER calculations

Check when conditionals are present:

- [ ] Avoid ISBLANK on large sparse metrics - use IFDEFINED or ISDEFINED
- [ ] Use IFBLANK for defaults, not IF(ISBLANK(...))
- [ ] Conditional creation: use IF (not ADD + FILTER); subsetting a computed expression: use FILTER: CurrentValue (not IF(expr, expr, BLANK))

Check when date ranges are defined by Start/End:

- [ ] Avoid multi-conditional IFs (`Date >= Start AND Date < End`) when PRORATA semantics apply
- [ ] Prefer `PRORATA()` for "active within a date range" and derive booleans/numeric flags from `PRORATA()` (use ISDEFINED/IFDEFINED, not ISBLANK/ISNOTBLANK)

Check when prior period lookups are needed:

- [ ] Using SELECT for prior period lookups, NOT PREVIOUS

Check when dimensional changes or mappings are involved:

- [ ] Using BY instead of ADD where mapping exists
- [ ] Do not use ISBLANK/ISNOTBLANK to guard BY when a dimension-typed metric is in BY; BY respects that metric's sparsity (see [formula_modifiers.md](./formula_modifiers.md))

Check when the metric is large/sparse or involves access rights:

- [ ] Use BLANK instead of 0 or FALSE for empty values (see Pattern 9 exception for meaningful zeros)
- [ ] Access rights wrapped in IFDEFINED(User, ...)

---

## Core Principles

1. Scope First: Start formulas with scoping clauses
2. Preserve Sparsity: Use ISDEFINED, not ISBLANK
3. Reduce Early: Aggregate/filter before complex calculations
4. Understand Execution Order: Structure for minimal computation

---

## Understanding Sparsity and Densification

### Key Terminology

BLANK, undefined, and "not defined" are ALL THE SAME THING - they mean no value exists in a cell.

| Term        | Meaning                | Stored in Database? |
| ----------- | ---------------------- | ------------------- |
| BLANK       | No value exists        | No (sparse)     |
| undefined   | No value exists        | No (sparse)     |
| not defined | No value exists        | No (sparse)     |
| FALSE       | Explicit boolean value | Yes (dense)     |
| TRUE        | Explicit boolean value | Yes (dense)     |
| 0           | Explicit numeric value | Yes (dense)     |

### What is Densification?

Densification occurs when cells that should have no value (BLANK/undefined) are given explicit values (TRUE, FALSE, 0, etc.). This forces Pigment to store and compute ALL cells instead of just the ones with actual data.

Example: A metric with 1,000 products x 12 months = 12,000 possible cells. If only 500 have actual values:

- Sparse: 500 cells stored (4% of space) - empty cells remain undefined
- Dense: 12,000 cells stored (100% of space, 24x larger) - if we store 0 for empty cells, all 12,000 must be stored

### Why ISBLANK Densifies

`ISBLANK` returns explicit boolean values for ALL cells:

- Where value exists: returns FALSE (stored)
- Where value is blank: returns TRUE (stored)

Both TRUE and FALSE are stored -> all cells now have values -> dense.

### Why ISDEFINED Preserves Sparsity

`ISDEFINED` returns:

- Where value exists: returns TRUE (stored)
- Where value is blank: returns BLANK (not stored)

Only TRUE values are stored -> blank cells remain blank -> sparse.

---

## Performance Patterns

### Pattern 1: Early Scoping

Why: Scoping at the end forces Pigment to compute ALL data first, then filter. Scoping at the start limits computation to only relevant data.

Anti-pattern (computes everything, then filters):

```pigment
('Revenue' * 'Growth' + 'Costs')[FILTER: 'Product'.'Active' = TRUE]
```

Optimized (filters first, computes only active products):

```pigment
'Revenue'[FILTER: 'Product'.'Active' = TRUE] * 'Growth' + 'Costs'
```

---

### Pattern 2: Sparsity Preservation with IFDEFINED

Why: ISBLANK returns explicit boolean values (TRUE/FALSE) for ALL cells, causing densification. IFDEFINED returns BLANK for undefined cells, preserving sparsity.

Less idiomatic on large sparse metrics (densifies - ISBLANK returns TRUE for blank cells, FALSE for defined cells):

```pigment
IF(ISBLANK('Revenue'), 0, 'Revenue' * 1.1)
```

What happens: Every cell gets a value (TRUE, FALSE, 0, or calculated result) -> dense.

Optimized (preserves sparsity - returns BLANK for undefined cells):

```pigment
IFDEFINED('Revenue', 'Revenue' * 1.1)
```

What happens: Only cells where Revenue is defined get calculated; others remain BLANK -> sparse.

Context guard: On small already-dense metrics or where explicit TRUE/FALSE output is required (e.g. data-completeness exports), `IF(ISBLANK(...))` is acceptable; see [functions_logical.md](./functions_logical.md) allow-list.

---

### Pattern 3: Use IFBLANK for Default Values

Why: IFBLANK is simpler, clearer, and optimized for the common pattern of providing a default when a value is blank.

Less idiomatic (verbose and densifies on large sparse metrics):

```pigment
IF(ISBLANK('Revenue'), 'Default Revenue', 'Revenue')
```

Optimized (cleaner and faster):

```pigment
IFBLANK('Revenue', 'Default Revenue')
```

Context guard: On small already-dense metrics, `IF(ISBLANK(...))` is functionally equivalent and acceptable if readability is the priority; see [functions_logical.md](./functions_logical.md) allow-list.

---

### Pattern 4: IF vs FILTER - Two Distinct Cases

The rule "use IF, not ADD + FILTER" applies only to conditional creation. When subsetting an expression you are already computing, prefer FILTER: CurrentValue over IF. Do not interpret "use IF" as "IF is always better than FILTER."

#### Case A: Conditional creation (no existing expression / using ADD)

Why: ADD creates all possible cells then filters (dense). IF creates only cells where the condition is true (sparse).

Anti-pattern (dense - creates all Month cells, then filters):

```pigment
10[ADD: Month][FILTER: Month > VAR_Reference_Month]
```

Optimized (sparse - only creates cells where condition is true):

```pigment
// VAR_Reference_Month: input metric, type Dimension
IF(Month > VAR_Reference_Month, 10)
```

#### Case B: Subsetting an expression you're already computing (no ADD)

Why: When IF repeats the same expensive expression in the condition and result, it will be evaluated twice. [FILTER: CurrentValue] computes it only once, then filters on the result - usually faster and clearer for large or complex calculations.

For simple metric references or arithmetic on small spaces, IF is equally performant and often more readable.

Less idiomatic on large spaces with expensive expressions (repeats expression):

```pigment
IF(
  MONTHDIF(Month.'Start Date', Employee.'Hire Date'[ADD: Month]) >= 0,
  MONTHDIF(Month.'Start Date', Employee.'Hire Date'[ADD: Month]) + 1,
  BLANK
)
```

Optimized (single evaluation, filter on result):

```pigment
(
  MONTHDIF(Month.'Start Date', Employee.'Hire Date'[ADD: Month]) + 1
)[FILTER: CurrentValue > 0]
```

When to use each:

- IF: Conditional creation - adding values to new cells (no ADD in the alternative). Prefer IF over `value[ADD: Dim][FILTER: condition]`. Also acceptable for simple expressions on small spaces where readability matters.
- FILTER: CurrentValue: Subsetting a computed expression - you have one expression and want to keep only cells where its value meets a condition. Prefer `(Expression)[FILTER: CurrentValue > threshold]` over `IF(Expression > threshold, Expression, BLANK)`, especially when Expression is non-trivial and the metric space is large.

---

### Pattern 5: Defer Aggregations

Why: Aggregating early reduces data then multiplies, which can lose precision or produce wrong results. Aggregating late ensures calculations happen at full granularity.

Anti-pattern (aggregates first, then multiplies - wrong if Growth varies by Product):

```pigment
'Revenue'[REMOVE: Product] * 'Growth'
```

Optimized (calculates at Product level, then aggregates):

```pigment
('Revenue' * 'Growth')[REMOVE: Product]
```

---

### Pattern 6: Prefer BY over ADD

Why: BY uses a mapping and is sparse (only computes for existing data). ADD creates all possible combinations and is dense. Always prefer BY when a mapping property exists.

Anti-pattern (dense allocation to all combinations then filter, instead of targeted allocation):

```pigment
'MyMetric'[ADD: Version][FILTER: Version = MyVersion]
```

Optimized (sparse allocation via mapping):

```pigment
'MyMetric'[BY: MyVersion]
```

Note: BY requires a mapping property or a dimension formatted metric. If no mapping exists and you must use ADD, consider if the formula design can be changed.

---

### Pattern 7: SELECT for Prior Period Lookups (NOT PREVIOUS)

Why: SELECT is parallel (fast). PREVIOUS/PREVIOUSOF are sequential iterative functions (slow). Use SELECT for all simple lookups.

Anti-pattern (slow - iterative computation):

```pigment
'Last Month' = PREVIOUS(Month)
'MoM Change' = 'Revenue' - PREVIOUSOF('Revenue')
```

Optimized (fast - parallel computation):

```pigment
'Last Month' = 'Revenue'[SELECT: Month-1]
'MoM Change' = 'Revenue' - 'Revenue'[SELECT: Month-1]
```

When PREVIOUS/PREVIOUSOF is OK: Only when current period's calculated result depends on prior period's calculated result (e.g., running balances: `PREVIOUSOF('Balance') + 'Inflow' - 'Outflow'`). See [functions_iterative_calculation.md](./functions_iterative_calculation.md) for full guidance.

---

### Pattern 8: Access Rights with IFDEFINED(User)

Why: Without IFDEFINED(User), access rights are computed for ALL users in the system. Wrapping in IFDEFINED(User) ensures computation only happens for the current user.

Anti-pattern (computes for all users):

```pigment
'Revenue'[AR: 'Rules']
```

Optimized (computes only for current user):

```pigment
IFDEFINED(User, 'Revenue'[AR: 'Rules'])
```

---

### Pattern 9: Use BLANK Instead of 0 (When Zero Has No Meaning)

Why: Using 0 creates dense data with explicit zeros stored. BLANK preserves sparsity - empty cells take no storage or computation.

Less idiomatic on large sparse metrics (creates explicit zeros - dense):

```pigment
IF(condition, value, 0)
```

Optimized (preserves sparsity):

```pigment
IF(condition, value, BLANK)
```

Or simply omit the else clause (defaults to BLANK):

```pigment
IF(condition, value)
```

Exception - when 0 is a meaningful business value:

Use 0 (not BLANK) when zero is a meaningful result that the user expects to see, or when 0 participates in downstream multiplication / summation where the additive identity matters. Examples:

- Zero variance (budget equals actual)
- Zero balance (account fully settled)
- Zero growth rate (flat period)
- A line item is inactive but the total row must show 0, not BLANK

```pigment
// Budget vs actual variance: show 0 when they match, not BLANK
IF('Actual' > 'Budget', 'Actual' - 'Budget', 0)
```

Rule of thumb: BLANK means "not applicable / no data at this coordinate." Zero means "the value is zero." Choose based on semantic intent.

---

### Pattern 10: Use BLANK Instead of FALSE for Boolean Flags

Why: FALSE is an explicit boolean value that gets stored. BLANK means "not defined" and is not stored. For sparse boolean metrics, use BLANK where the condition is not met.

Anti-pattern (stores FALSE for every non-matching cell - dense):

```pigment
// Creates TRUE/FALSE for ALL cells
ISNOTBLANK('Revenue')

// Or explicitly returning FALSE
IF('Revenue' > 1000, TRUE, FALSE)
```

Optimized (only stores TRUE where condition is met - sparse):

```pigment
// Returns TRUE where defined, BLANK (not FALSE) elsewhere
ISDEFINED('Revenue')

// Or returning BLANK instead of FALSE
IF('Revenue' > 1000, TRUE, BLANK)
// Or simply:
IF('Revenue' > 1000, TRUE)
```

Key insight: `BLANK != FALSE`. BLANK means "no value" (not stored). FALSE means "explicit boolean false" (stored). Use BLANK for sparsity.

---

### Pattern 11: Date Range Presence (Prefer PRORATA over multi-conditional IF)

Why: Single source of truth for date-range presence, less verbose, correct boundaries (Start included, End+1 for inclusive), sparsity preserved when deriving via ISDEFINED/IFDEFINED.

Less idiomatic on Day-level dimensions or when boundary handling and reuse matter (multi-conditional IF for presence - verbose, error-prone at boundaries):

```pigment
IF(
  Day >= 'Start Date'
  AND Day <= 'End Date',
  1,
  BLANK
)
```

Optimized (encode once with PRORATA, derive flags with ISDEFINED/IFDEFINED):

```pigment
// Numeric presence on Day (1 on active days, BLANK outside range)
PRORATA(Day, 'Start Date', 'End Date' + 1)

// Numeric presence on Month (proportional factor per month)
PRORATA(Month, 'Start Date', 'End Date' + 1)

// Boolean presence: TRUE when active, BLANK otherwise
ISDEFINED(PRORATA(Day, 'Start Date', 'End Date' + 1))

// Numeric 1/BLANK flag
IFDEFINED(PRORATA(Day, 'Start Date', 'End Date' + 1), 1)
```

Do not use ISBLANK/ISNOTBLANK for this pattern - they densify. Use ISDEFINED or IFDEFINED on the PRORATA result.

When simple IF is acceptable: On small planning horizons with Month-level presence flags or for one-off single-date cutover comparisons, `IF(Month >= 'Start Month' AND Month <= 'End Month', TRUE)` is acceptable and clearer. Prefer PRORATA when proration semantics, boundary correctness, or cross-metric reuse matter.

---

## Quick Decision Guide

Note: These defaults assume large/sparse metric spaces. On small dense spaces, several of the "avoid" options are acceptable - see the per-pattern context guards above.

| Situation                        | Use                            | Avoid                                     |
| -------------------------------- | ------------------------------ | ----------------------------------------- |
| Prior period lookup              | `[SELECT: Month-1]`            | PREVIOUS, PREVIOUSOF                      |
| Check if value exists            | ISDEFINED (returns TRUE/BLANK) | ISBLANK (returns TRUE/FALSE - densifies!) |
| Conditional with existence check | IFDEFINED                      | IF(ISBLANK())                             |
| Provide default for blank        | IFBLANK                        | IF(ISBLANK(), default, value)             |
| Add values conditionally         | IF                             | ADD + FILTER                              |
| Subset computed expression by value | `(Expression)[FILTER: CurrentValue > threshold]` | IF(Expression > threshold, Expression, BLANK) |
| Empty/no value                   | BLANK or omit                  | 0 (unless 0 is a meaningful business value)  |
| Boolean flag (sparse)            | TRUE or BLANK                  | TRUE or FALSE (FALSE densifies!)          |
| Replicate value to dimension     | BY CONSTANT (with mapping)     | ADD CONSTANT                              |
| Aggregate via mapping            | BY                             | ADD                                       |
| Remove dimensions                | REMOVE                         | BY on existing dimension (does nothing)   |
| List with multiple dimensions    | `[BY: dim1, dim2]`             | `[BY: dim1][BY: dim2]` (loses properties) |
| Filter and remove dimension      | SELECT                         | FILTER (when you want to aggregate)       |
| Filter and keep dimension        | FILTER                         | SELECT (keeps dimension)                  |
| Division                         | Just divide                    | IF(x<>0, a/b) - Pigment handles natively  |
| Aggregate via mapping            | BY                             | ADD                                       |
| Filter existing data             | FILTER                         | IF when subsetting same expression       |
| Access rights                    | IFDEFINED(User, [AR])          | [AR] alone                                |
| Presence in date range           | PRORATA + ISDEFINED/IFDEFINED  | Multi-conditional IF, ISBLANK/ISNOTBLANK  |

Remember: BLANK = undefined = not defined (all mean "no value", not stored). FALSE != BLANK (FALSE is an explicit value that IS stored).

---

## See Also

- [Performance Formula Optimization](../optimizing-pigment-performance/performance_formula_optimization.md)
- [Performance Sparsity Deep Dive](../optimizing-pigment-performance/performance_sparsity_deep_dive.md)
- [Performance Scoping Patterns](../optimizing-pigment-performance/performance_scoping_patterns.md)
