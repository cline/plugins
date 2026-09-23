# Performance Access Rights

How access rights affect computation performance and the `ISDEFINED(User)` wrapper pattern. For AR metric construction, rule design, and governance patterns, see `skill:securing-pigment-applications`.

---

## How AR Affects Performance

Basic flow: User requests data, system retrieves metric data, applies AR rules (most costly step), filters cells, returns visible data.

High impact scenarios:

- Many metrics with AR, each requiring AR evaluation
- Complex multi-dimensional AR rules
- Large user base (AR computed for many users)
- Dimension-heavy AR on high-cardinality dimensions

Low impact scenarios: few metrics with AR, simple user-only rules, small user base, static AR.

---

## The ISDEFINED(User) Pattern

### The Problem

Without `ISDEFINED(User)`, AR is computed for all users in the workspace, including users without application access.

```pigment
// Anti-pattern: computes AR for all workspace users
'Revenue with AR' = 'Revenue'[AR: 'Revenue AR Rules']
```

If the workspace has 500 users but only 50 have app access, 90% of computation is wasted.

### The Solution

```pigment
'Revenue with AR' =
  IFDEFINED(User,
    'Revenue'[AR: 'Revenue AR Rules']
  )
```

`IFDEFINED(User, ...)` checks if the current user has application access. AR computation only runs for relevant users.

Always use this pattern when a metric has AR applied and the application has a subset of total workspace users.

---

## AR Optimization Patterns

### Scope Before AR

Filter and aggregate before applying AR to reduce the dataset size for AR computation:

```pigment
// Anti-pattern: AR on all data, then filter
'Result' = 'Revenue'[AR: 'AR Rules'][FILTER: 'Product'.'Active' = TRUE]

// Optimized: filter first, then AR
'Result' = 'Revenue'[FILTER: 'Product'.'Active' = TRUE][AR: 'AR Rules']
```

### Apply AR Once

Do not apply AR at every step of the computation chain. Apply it once at the end:

```pigment
// Anti-pattern: AR at every step
'Step 1' = 'A'[AR: 'Rules']
'Step 2' = 'Step 1' + 'B'[AR: 'Rules']

// Optimized: AR once at end
'Step 1' = 'A'
'Step 2' = 'Step 1' + 'B'
'Final' = 'Step 2'[AR: 'Rules']
```

### Apply AR Consistently (Not Selectively)

Applying AR selectively to "save performance" does not significantly improve performance. The expensive operation is the AR join, which happens regardless of how many metrics have AR. Applying AR to all metrics on a dimension enables row-level filtering, which is faster than cell-level filtering.

### Aggregate Before AR

```pigment
// Anti-pattern: AR at transaction level, then aggregate
'Customer Total' = 'Transaction Amount'[AR: 'Transaction AR'][BY: 'Transaction'.'Customer']

// Optimized: aggregate first, then AR (if AR rules are at Customer level)
'Customer Total' = 'Transaction Amount'[BY: 'Transaction'.'Customer'][AR: 'Customer AR']
```

---

## AR and Consolidation

Access rights are applied after consolidation, not before. Consolidation performance is not affected by AR.

---

## Best Practices Summary

1. Always wrap AR in `IFDEFINED(User, ...)` to skip computation for users without app access.
2. Apply AR consistently across all metrics on a dimension (enables row-level filtering).
3. Apply AR once at the end of the computation chain, not at every step.
4. Scope before AR -- filter and aggregate before applying AR.
5. Keep AR rules simple -- prefer user-only rules when possible. For AR rule design, see `skill:securing-pigment-applications`.

---

## See Also

- [Performance Formula Optimization](./performance_formula_optimization.md) - General formula optimization including AR
- [Performance Sparsity Deep Dive](./performance_sparsity_deep_dive.md) - ISDEFINED patterns
- `skill:securing-pigment-applications` - AR rule design, governance, and construction patterns
