# Formula Conditionals Style

When to use this doc: Conditional logic with IF/SWITCH or modifiers (FILTER, EXCLUDE), or highly complex formulas that require performance optimization.

Goal: Readable Pigment-native formulas. Use IF to scope early; IFBLANK for overrides/precedence; `[FILTER: ...]` to subset an existing metric when that reads most naturally. Avoid ISBLANK/ISNOTBLANK and unnecessary densification.

Related: Syntax and function reference -> [functions_logical.md](./functions_logical.md), [formula_modifiers.md](./formula_modifiers.md). Performance (scoping, densification) -> [formula_performance_patterns.md](./formula_performance_patterns.md).

---

## Quick Reference: When to Use What

Note: IFBLANK is the right tool for sparsity-driven branching (presence checks, override hierarchies). For value-based branching where both branches return non-blank values, IF and SWITCH are equally idiomatic and often more readable.

| Situation | Prefer | Avoid |
| --------- | ------ | ----- |
| Choose between two scalar values based on a comparison or classification (value-based branching) | `IF(condition, A, B)` or `SWITCH(...)` | Wrapping in IFBLANK when both values are always defined |
| "First non-blank wins" (override hierarchy) | `IFBLANK(Expr1, IFBLANK(Expr2, ...))` | Nested `IF(cond1, Expr1, IF(cond2, Expr2, ...))` |
| Override when present, else base | `IFBLANK('Override', 'Base')` | `IF(ISBLANK('Override'), 'Base', 'Override')` |
| Branch on "is this input defined?" | `IFDEFINED('Input', 'Input', 'Fallback')` or `IFBLANK(ISDEFINED('Input'), 'Fallback'[EXCLUDE: ...])` (advanced) | Nested IF with AND/OR on flags |
| Subset an existing metric by row | `'Metric'[FILTER: ...]` or `[EXCLUDE: ...]` | Repeating the metric in both IF branches |
| Exclude a flagged subset | `'Metric'[EXCLUDE: 'Entity'.'Is_Archived']` | `'Metric'[FILTER: NOT 'Entity'.'Is_Archived']` |
| Sparse boolean "tag where condition holds" | `IF(condition, TRUE)` or `IF(condition, TRUE, BLANK)` | `condition` alone (densifies to TRUE/FALSE) |
| Both IF branches share same expression (e.g. same metric + modifiers) | Factor out: `Expr * IF(cond, a, b)` or `Expr + IF(cond, x, y)` | Repeating `Expr` in both branches |
| Multiple branches repeat same FILTER/EXCLUDE conditions (3+ similar blocks) | Nested IF that factors common expression; vary only the differing part (see section 2.5) | IFBLANK with repeated FILTER/EXCLUDE on each branch (can degrade performance) |

---

## 1. IFBLANK for presence-driven branching

IFBLANK is for presence-driven branching:

- Precedence / case chains ("first non-blank wins")
- Override vs default logic

For value-based branching (comparison-driven classification, threshold assignment), prefer IF or SWITCH - they are the natural tool when both branches always produce a value.

### 1.1 Precedence chains ("first non-blank wins")

Goal: Choose the first expression that returns a value; if blank, try the next.

Canonical pattern:

```pigment
// First non-blank among Expr1, Expr2, Expr3, Expr4
IFBLANK(
  Expr1,
  IFBLANK(
    Expr2,
    IFBLANK(
      Expr3,
      Expr4
    )
  )
)
```

- If Expr1 has a value -> use it; else Expr2; else Expr3; else Expr4.
- Use for: override hierarchy, multi-source chaining (e.g. plan -> actual -> baseline -> constant).
- If any expression is complex, move it into a helper metric and reference it in the chain.

### 1.2 Override vs base (no explicit ISDEFINED)

Goal: Use an override when present; otherwise use a base value.

Canonical pattern:

```pigment
IFBLANK('Override_Metric', 'Base_Metric')
```

Avoid:

```pigment
IF(ISBLANK('Override_Metric'), 'Base_Metric', 'Override_Metric')
```

### 1.3 Sparsity-driven branching on definedness

Goal: When the driver for branching is "does this input exist?", not its value.

Default pattern (when you need "use override if present, else fallback"):

```pigment
IFDEFINED('Input', 'Input', 'Fallback')
```

Or equivalently:

```pigment
IFBLANK('Input', 'Fallback')
```

Advanced pattern (when you need a TRUE-or-BLANK signal as the branch trigger, e.g. to scope the fallback with EXCLUDE):

```pigment
IFBLANK(
  ISDEFINED('Context_Specific_Input'),
  'Fallback_Expression'[EXCLUDE: 'Entity'.'Excluded_Flag'] < 'Context'.'Cutoff'
)
```

- First argument: test signal (TRUE where context input exists, BLANK where it doesn't).
- Second argument: fallback expression when there is no context-specific input.
- Use EXCLUDE (or FILTER) to scope the fallback by row, not AND/OR inside the expression.

Use the advanced form only when you need EXCLUDE/FILTER scoping on the fallback branch. For most override-vs-fallback formulas, `IFBLANK('Override', 'Fallback')` or `IFDEFINED('Input', 'Input', 'Fallback')` are clearer.

### 1.4 When to refactor a nested IF chain into IFBLANK

Nested IF is the natural form for:

- Value-based threshold classification (e.g. risk tiers, margin buckets, score bands)
- Exact-match multi-way branching (prefer SWITCH for this)
- Cases where both branches always produce a defined value

Refactor to IFBLANK when the branching driver is data presence (one or more branches may be BLANK).

Less idiomatic for presence-driven logic:

```pigment
IF(cond1, Expr1, IF(cond2, Expr2, IF(cond3, Expr3, Expr4)))
```

Prefer one of (when presence is the driver):

- Precedence chain: `IFBLANK(Expr1, IFBLANK(Expr2, IFBLANK(Expr3, Expr4)))` (when "first defined wins").
- Override vs base: `IFBLANK('Override', 'Base')`.
- Signal-based: `IFBLANK(ISDEFINED('Input'), 'Fallback'[EXCLUDE: ...])` (advanced).

For 3+ branches with the same FILTER/EXCLUDE stack repeating, see section 2.5 - nested IF with factored conditions is often faster.

---

## 2. FILTER and EXCLUDE: When and How

FILTER and EXCLUDE control which dimensional combinations exist in an expression. Use them when the question is "which rows/coordinates should this apply to?", not "which of two scalar expressions do I pick?".

### 2.1 Use separate FILTERs (and EXCLUDEs)

Canonical:

```pigment
'Metric'
[FILTER: 'Entity'.'Status' = "Active"]
[FILTER: 'Entity'.'Region' = "EMEA"]
```

Less preferred (one big AND):

```pigment
'Metric'[FILTER: 'Entity'.'Status' = "Active" AND 'Entity'.'Region' = "EMEA"]
```

Separate modifiers are easier to read, debug, and mix with EXCLUDE.

### 2.2 Filter by expression value: use CURRENTVALUE

Canonical:

```pigment
'Revenue'[FILTER: CURRENTVALUE > 0]
'Margin %'[FILTER: CURRENTVALUE >= 0.20][FILTER: 'Entity'.'Status' = "Live"]
```

This avoids repeating the expression and keeps value rules and property rules separate.

### 2.3 Exclude a flagged subset: use EXCLUDE, not FILTER NOT

Canonical:

```pigment
'Metric'[EXCLUDE: 'Entity'.'Is_Discontinued']
'Metric'[EXCLUDE: 'Entity'.'Is_Archived'][EXCLUDE: 'Entity'.'Is_Test_Data']
```

Avoid:

```pigment
'Metric'[FILTER: NOT 'Entity'.'Is_Archived']
```

EXCLUDE keeps semantics positive ("drop these rows") and preserves sparsity; NOT over a boolean that can be BLANK densifies. See section 3.

### 2.4 Factorize common subexpressions in IF branches

When both branches of an IF use the same expression (e.g. the same metric with the same FILTER/EXCLUDE), prefer factoring it out so the IF only chooses the differing part (multiplier, constant, etc.). This keeps expressions small and composable (DRY).

Less idiomatic (repeated EXCLUDE and base expression in both branches):

```pigment
IF(
  IsForecast
    AND ( ... segment test ... ),
  'Revenue'[EXCLUDE: Customers.'Exclude from ARR Report'],
  'Revenue'[EXCLUDE: Customers.'Exclude from ARR Report']
)
```

More idiomatic (one EXCLUDE, IF only on the multiplier):

```pigment
'Revenue'[EXCLUDE: Customers.'Exclude from ARR Report']
* IF(
    IsForecast
      AND ( ... segment test ... ),
    1.10,
    1
  )
```

Apply the same idea when the only difference between branches is an additive constant, a divisor, or another scalar: factor the common expression once and use IF for the varying part.

### 2.5 When nested IF is acceptable (repeated FILTER/EXCLUDE)

When multiple branches (e.g. 3+) use the same FILTER/EXCLUDE conditions with only a varying expression or multiplier, the IFBLANK/FILTER pattern can degrade performance. Each branch evaluates its own scoped expression; repeated modifiers across many branches add overhead.

Prefer a nested IF that factors out the common logic and uses IF only for the varying part:

```pigment
// Multiple branches with same conditions
// Prefer: factor common conditions, vary only the differing expression
IF(
  'Headcount ID'.Approved? AND (
    'WFP_Elect to Backfill?' = FALSE
    OR ISBLANK('WFP_Elect to Backfill?')
    OR ('WFP_Elect to Backfill?' AND Month < TIMEDIM('WFP_Backfill Date', Month))
  ),
  'WFP_Salary'
  * IF(Month >= 'WFP_Merit Effective', 1, 1 - 'Global Merit Adjustment'[BY: 'Headcount ID'.Geo])
  * 1/12 * 'FTE in Dept Calc',
  BLANK
)
```

Guidance: When the same `[FILTER: X][FILTER: Y][EXCLUDE: Z]` would repeat on 3+ IFBLANK branches, consider a nested IF that factors the common conditions instead. Benchmarks have shown nested IF can be meaningfully faster in such cases; verify on your workload before committing to either form.

Rule of thumb: If you would write the same `[FILTER: X][FILTER: Y][EXCLUDE: Z]` on 3+ branches, consider a nested IF that factors the common conditions instead.

---

## 3. Logical Operators and 3-State Booleans

### 3.1 Pigment booleans are 3-state

- TRUE -> dense
- FALSE -> dense
- BLANK -> sparse (no value at that coordinate)

Prefer patterns that preserve BLANK as a distinct state (IFBLANK, ISDEFINED, FILTER, EXCLUDE). Avoid turning BLANK into TRUE or FALSE unless necessary.

### 3.2 Avoid NOT in favor of EXCLUDE / positive conditions

NOT flips TRUE<->FALSE. For BLANK, NOT has no meaningful opposite; applying NOT to a boolean that can be BLANK densifies (BLANKs become TRUE or FALSE). Prefer EXCLUDE or a positive condition.

Rule: Do not write `[FILTER: NOT 'Flag']` or `[FILTER: NOT 'Entity'.'Is_Archived']`. Use:

```pigment
[EXCLUDE: 'Flag']
[EXCLUDE: 'Entity'.'Is_Archived']
```

Same for IF: avoid `IF(NOT 'Entity'.'Flag', 'Metric', BLANK)`. Use `'Metric'[EXCLUDE: 'Entity'.'Flag']`.

Exception: When the boolean is known to be TRUE/FALSE (no BLANK values, e.g. imported from an ERP system or explicitly set for every item), `FILTER: NOT 'Flag'` is acceptable and may be more readable. EXCLUDE is the safer default when the boolean's BLANK behavior is uncertain or when sparsity matters.

### 3.3 Sparse boolean masks: IF(condition, TRUE, BLANK)

A bare comparison like `'Metric' = 'Other'` yields a dense boolean (TRUE/FALSE everywhere). To keep a sparse boolean (TRUE only where the condition holds, BLANK elsewhere):

Canonical:

```pigment
IF('Metric' = 'Something Else', TRUE)
// or explicitly
IF('Metric' = 'Something Else', TRUE, BLANK)
```

Use this when you need a sparse "tag" of cells that meet a condition, without densifying the rest to FALSE.
