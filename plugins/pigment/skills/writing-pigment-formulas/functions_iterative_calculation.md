# Iterative Calculation (PREVIOUS & PREVIOUSOF)

Full technical reference for Pigment's iterative calculation functions: when to use them, syntax, configuration, performance, and debugging.

Terminology: In this document, "Metric" refers to a Pigment metric (Block content), and "Block" refers to a Pigment Block.

Deprecation: `PREVIOUSBASE()` is deprecated; use `PREVIOUSOF()` instead.

See also:
- [Performance - Iterative Calculations](../optimizing-pigment-performance/performance_iterative_calculations.md) - Optimization strategies, subsetting, FILLFORWARD vs PREVIOUS
- [Time and Date Functions](./functions_time_and_date.md) - SELECT vs PREVIOUS/PREVIOUSOF, FILLFORWARD, CUMULATE

---

## 1. What Pigment Considers Circular Dependencies

Pigment checks for circular dependencies each time a formula is created or edited. If a metric directly or indirectly references itself, Pigment raises a circular dependency error to prevent infinite loops.

Example of a circular dependency within a single Block:

```pigment
// BAD: Circular: Metric A references itself via SELECT
Metric A = Metric A[SELECT: Month - 1] + 1
```

This attempts to increase Metric A month-on-month but errors because Metric A cannot reference itself via SELECT in the formula.

Modeling rules:

- Only use PREVIOUS or PREVIOUSOF when there is a true circular dependency at the metric level (not cell level).
- Pigment does not handle cell-level circulars the way Excel can (no Excel-style iterative cell loops).

---

## 2. Two Iterative Tools: PREVIOUS vs PREVIOUSOF

| Scope | Use | When |
|-------|-----|------|
| Single Block | `PREVIOUS()` | Metrics containing circular-referencing formulas exist within one Block. |
| Multiple Blocks | `PREVIOUSOF()` | Metrics containing circular-referencing formulas exist in different Blocks. |

Rule of thumb:

- To loop something in a metric itself -> use `PREVIOUS()`.
- To build a loop across multiple metrics -> use `PREVIOUSOF()` (requires an iterative calculation configuration first).

---

## 3. PREVIOUS() - Iterative Calculations Within a Single Block

Definition: PREVIOUS returns the value of the previous cell of the current Metric in the iteration Dimension.

Critical syntax rule: PREVIOUS takes the iterating dimension, not the metric.

- Correct: `PREVIOUS(Month)`
- Incorrect: `PREVIOUS(Metric)`

### Syntax

`PREVIOUS(Iteration Dimension [, Offset])`

Offsets:

- `PREVIOUS(Month)` returns one item prior by default.
- `PREVIOUS(Month, 2)` returns two items prior.
- The offset parameter defaults to 1 but can be any positive integer.
- Offset can also be provided by a Metric of type Integer defined on the same Dimensions as the Metric.
- A negative offset value is automatically ignored.

Engine behavior: Because a cell depends on the previous cell's final value, the engine computes the whole formula (including syntax before and after PREVIOUS) before moving to the next cell. Post-processing such as filtering or certain operations should happen in another metric that references the iterative metric.

### Common PREVIOUS() Examples

A) Simple increment: `PREVIOUS(Month) + 1`  
(Teaching example; often more performant with CUMULATE.)

B) Dynamic offset: `PREVIOUS(Month, 2) + 1`  
Offset must be a positive constant integer or an Integer metric on same dimensions.

C) Cash flow balance:

```pigment
Cash = PREVIOUS(Month) + Income - Expense
```

D) Inventory - resolving circularity:

- `Beginning Inventory = End Inventory[SELECT: Month - 1]` -> creates circular dependency when End Inventory uses Beginning Inventory.
- `End Inventory = PREVIOUS(Month) + Incoming Re-order - Outgoing Sales` -> resolves recursion within the same metric.

---

## 4. PREVIOUS() Special Case - Filtering / IFBLANK Interaction

Some operations are not compatible with PREVIOUS (full list on the PREVIOUS function page). Others are compatible but can have important implications.

Pitfall: A modeler uses IFBLANK to fill patchy data from a source metric, using `PREVIOUS(Week)` to fill blank cells with the prior item. They then append a boolean filter (e.g. `['Filter boolean']`) in the same formula to keep values only where the boolean is TRUE.

Outcome: Pigment returns blanks everywhere, including where the boolean is TRUE.

Why: For earlier items where the boolean is FALSE, the engine emits blanks. When the boolean becomes TRUE, IFBLANK sees blank input and evaluates the `PREVIOUS(...)` branch. PREVIOUS points to a prior cell that is blank (because earlier cells were blank), so BLANK is returned and propagated.

Fix: Put the PREVIOUS-containing expression in a separate metric first (e.g. "sales data metric"). Then apply the boolean filter in a second metric that references the first: `(SalesDataMetric['Filter boolean'])`.

---

## 5. Performance Tips for PREVIOUS()

Caution: Always try to avoid iterative calculations; only use them when there is no other option. They impact performance because Pigment must compute each metric x the length of the iterating dimension.

Tips:

1. Keep sub-expressions light and preserve sparsity
   - Densifying sub-expressions increase computation (e.g. `ISBLANK(Metric_1)` replaces blanks with TRUE).
   - Prefer `IFDEFINED(Metric_1, Metric_1, PREVIOUS(Month))` instead of `IF(ISBLANK(Metric_1), PREVIOUS(Month), ...)`.

2. Reduce the number of times you use PREVIOUS in a formula
   - Group expressions and isolate PREVIOUS.
   - More performant: `PREVIOUS(Month) * (A + B)`
   - Less performant: `PREVIOUS(Month) * A + PREVIOUS(Month) * B`
   - In nested IF patterns, bring PREVIOUS up higher (evaluate earlier, not deeply nested).

3. Minimize number of iterations
   - More items in the iterating dimension increases execution time.
   - Iterating dimension has a maximum of 10,000 items when using PREVIOUS.
   - Use List Subsets to reduce the iterating dimension (e.g. Calendar subset for 2025-2026).
   - Even if values are blank, dimension length still matters; choose the iterating dimension as short as possible.

For more optimization strategies (subsetting, FILLFORWARD, CUMULATE), see [Performance - Iterative Calculations](../optimizing-pigment-performance/performance_iterative_calculations.md).

---

## 6. PREVIOUSOF() - Iterative Calculations Across Multiple Blocks

Definition: A multi-block iterative calculation configuration consists of:

- an iteration Dimension
- a list of allowed Metrics

When the configuration is created, the allowed metrics can reference each other only within PREVIOUSOF().

PREVIOUSOF returns the referenced metric value shifted by one period along the iteration dimension. It is equivalent to `Metric[SELECT: IterationDimension - 1]` but does not trigger the circular reference error.

Implementation rule: Before using PREVIOUSOF(), you must set up a calculation cycle (iterative calculation configuration) and select all metrics that are part of the cycle.

Programmatic workflow for PREVIOUSOF:

1. Call `tool:list_cycles` to check if a cycle already exists for the target metrics.
2. If no cycle exists, identify all metrics in the dependency chain and the iteration dimension.
3. Create any metrics that do not exist yet (they must exist before being added to the cycle).
4. Call `tool:create_cycle` with a descriptive name, the iteration dimension ID, and all metric IDs.
5. Only after the cycle is created, write PREVIOUSOF formulas on the participating metrics.
6. If you need to add or remove metrics from an existing cycle, use `tool:update_cycle`.

Allowed metrics:

- The allowed metrics list must contain all metrics that are part of the dependency cycle.
- Omit unnecessary metrics from the list for performance.

Using PREVIOUSOF like PREVIOUS: `PREVIOUSOF('Ending Inventory')` inside the Ending Inventory metric can behave like PREVIOUS within that metric.

### Limitations

- Maximum number of allowed metrics: 10 (KB). Some sources mention 20; verify the current product limit in your environment.
- All metrics in the configuration must include the iteration dimension in their structures.
- PREVIOUSOF is not allowed if the iteration dimension has more than 10,000 items (computation error).
- Cycle topology: You cannot combine two cycles into one or link them together.

---

## 7. How to Create an Iterative Calculation Configuration

### Programmatic (via tools)

1. Ensure all participating metrics exist (create them first if needed).
2. Identify the iteration dimension UUID (typically a time dimension like Month).
3. Call `tool:create_cycle` with `cycleName`, `iterativeDimensionId`, and `metricIds` (all metrics in the chain).
4. Write PREVIOUSOF formulas on the participating metrics.

### Manual (via UI)

1. Go to Application Settings.
2. Click Calculations.
3. Click Add an iterative calculation.
4. Fill in: Cycle Name, Iteration Dimension, and Metrics that can reference each other.
5. Save.
6. Use PREVIOUSOF formulas in the participating metrics.

Example configuration (Inventory):

- Cycle Name: `Inventory calculation`
- Iteration Dimension: `Month`
- Allowed Metrics: Beginning Inventory, Incoming Re-order, End Inventory (and any other metrics in the cycle)

---

## 8. Typical Use Case for PREVIOUSOF - Balance / Inventory Roll-forward

Standard pattern:

- Opening Balance = `PREVIOUSOF(Ending Balance)`
- Movements (can be multiple lines)
- Ending Balance = Opening + Movements

Inventory example:

```pigment
// Beginning Inventory
PREVIOUSOF('Ending Inventory')

// End Inventory
'Beginning Inventory' + 'Incoming Re-order' - 'Outgoing Sales'
```

Incoming Re-order iterative example:

```pigment
Incoming Re-order = 200[ADD: Month] - PREVIOUSOF('Incoming Re-order')
```

---

## 9. Workaround - Avoid PREVIOUSOF by Rewriting Opening Balance

In some scenarios you can avoid PREVIOUSOF and improve performance by rewriting the model to use PREVIOUS and offsets:

```pigment
Opening Balance = Opening first month + PREVIOUS(Month) + Movements[SELECT: Month - 1]
Movements
Ending Balance = Opening + Movements
```

This is often more performant than using PREVIOUSOF.

---

## 10. Reduction Heuristic - When a PREVIOUSOF Cycle Can Collapse into PREVIOUS

Method:

1. Write the dependency chain explicitly.  
   Example: Opening(n) = Ending(n-1), Ending(n) = Opening(n) + Movements(n).
2. Substitute the forward definition of Ending(n-1):  
   Ending(n-1) = Opening(n-1) + Movements(n-1).
3. If substitution leaves only one recursive metric, implement with PREVIOUS instead of PREVIOUSOF.

When NOT possible: Multiple metrics independently depend on previous values; multiple backward edges remain.

Example non-reducible structure:

- Metric1: `InputMetric + PREVIOUSOF(Metric3)`
- Metric2: `10 + PREVIOUSOF(Metric1)`
- Metric3: `Metric1 + Metric2`

---

## 11. How PREVIOUSOF Cycles Compute

When a configuration is created, Pigment identifies cyclical dependencies and calculates the whole cycle iteratively.

For each item of the iterating dimension:

- Formulas of each metric in the cycle are executed sequentially (with some parallelization under the hood).
- Calculation order depends on dependencies between formulas.

Temporary dataset behavior: Compute all metrics for the first item (e.g. Jan) and store a temporary dataset. Compute the next item (Feb), referring back to the stored dataset for Jan as needed. Store Jan+Feb dataset, compute Mar, and so on.

---

## 12. Optimization for PREVIOUSOF Configurations

- Eliminate unused metrics: Metrics in the configuration are calculated differently; omit unnecessary metrics from the allowed list. An Active icon can indicate whether blocks generate a cycle; if inactive, the configuration can be removed.
- Profiling: Use Profiling to see total cycle time and time per metric. Optimizing each metric can reduce overall time (depending on number of metrics and iteration items).
- Performance insights: Use Performance insights to view the impact of iterative calculation on performance.

See [Performance - Iterative Calculations](../optimizing-pigment-performance/performance_iterative_calculations.md) for more.

---

## 13. Debugging Formula Errors in Iterative Configurations

When using an iterative calculation configuration, Pigment builds a base formula subject to similar limitations as PREVIOUS. It is possible to write three individually valid formulas that combine into an invalid base formula.

Example:

- End Inventory = Beginning inventory + Incoming re-order
- Beginning Inventory = PREVIOUSOF(Ending Inventory)
- Incoming Re-order = Beginning inventory[REMOVE: Month]

Error: *A dimension modifier using the iterating dimension Month can't be applied to a metric in the iterative calculation.*

Modifier rules:

- Modifiers (BY, SELECT, REMOVE, FILTER) are supported as long as they do not reference the iterating dimension.
- All window functions (CUMULATE, MOVINGAVERAGE, MOVINGSUM) are supported within metrics used in an iterative calculation.

---

## 14. Compatibility Matrix

PREVIOUS():

- Supported: Arithmetic; IF/IFDEFINED; many modifiers and operations not involving the iterating dimension; offsets (including dynamic integer metric offsets).
- Not allowed / constrained: Iterating dimension > 10,000 items; certain operations listed on the PREVIOUS function page; problematic patterns where post-processing is embedded in the PREVIOUS expression (see section 4).

PREVIOUSOF():

- Supported: Arithmetic; IF/IFDEFINED; window functions; modifiers not involving the iterating dimension.
- Not allowed / constrained: Iterating dimension > 10,000 items; modifiers involving the iterating dimension; more than the allowed metric limit in the configuration; linking or combining configurations.

---

## 15. Practical Decision Framework

- Loop in a single metric -> use `PREVIOUS()`.
- Loop across multiple metrics -> use `PREVIOUSOF()` and create an iterative calculation configuration first using `tool:create_cycle`.
- Use PREVIOUS/PREVIOUSOF only for true metric-level circular dependencies; Pigment does not support cell-level circulars.
- Prefer non-iterative logic when possible (performance); use CUMULATE, offset-based patterns, or the Opening Balance rewrite (section 9) where applicable.
- Choose the iterating dimension as short as possible; consider subsets if you only need a portion.

---

## Appendix A - Verbatim Notes

- "Forget about previousbase, its old and should not be used, previousof is the newest version."
- "If you want to loop something in a metric itself, you use previous()."
- "If you want to build a loop inside multiple metrics, you use previousof()."
- "Before you can use previousof(), you have to set-up a calculation cycle first, and select all metrics of the cycle."
- "You can't combine 2 cycles into 1 or link each other."
- "You always choose an iterating dimension... that dimension is as short as possible... Consider using subsets."
- "You only use previous or previousof if there is a true circular (on metric level, not cell level)... Pigment doesn't handle cell level circulars (like excel)."
- "Always try to avoid it though... It can impact performance because Pigment needs to compute each metric * the length of the iterating dimension."
- "Your cycle of metrics can't be bigger than 20 metrics, take that into account." (Verify current platform limit; KB states 10.)
- "Typical use case: Opening Balance = Previousof(ending balance); Movements; Ending Balance = Opening + Movements."
- "More performant alternative: Opening Balance = Opening first month + previous(month) + movements [select: month-1] ... This will probably be more performant as we're not using previousof."
