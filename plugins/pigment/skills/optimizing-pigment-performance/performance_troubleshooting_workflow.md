# Performance Troubleshooting Workflow (Modeler Agent)

Agent workflow for compute performance issues. Requires Performance Insights profiling tools unless noted. Work Steps 1-6 in order; after Step 5, loop to Step 1 with new measurements if needed.

---

## Step 1: Establish baseline

1. Clarify the symptom - slow input, timeout, slow board load, or intermittent slowness; which app, scenario, block, or board.
2. Triage blocks (if hotspot unknown). `tool:get_top_blocks_by_performance` over a recent window (see [./performance_profiling.md](./performance_profiling.md)).
3. Reproduce - repeat the slow action; capture `change_id` from audit trail when possible.
4. Profile compute. `tool:performance_profile_change` with `change_id`; parse per [./performance_profiling.md](./performance_profiling.md).
5. Fork: board-render vs compute - low total execution `Duration` but slow board -> rendering (`skill:designing-pigment-boards`). High `Duration` or `no scope, full computation` -> formula/scope work below.

Record: wall time estimate, execution count, slowest executions, X/Y at scope-loss origin, block IDs.

---

## Step 2: Identify bottlenecks

1. Sort executions by `Duration`; flag > 1000 ms (or dominant share of wall time).
2. Trace scope: first `no scope, full computation`; unnecessary scope loss?
3. Map `Blocks:` lines to metrics; read formulas (`tool:search`, formula tools).
4. Check dimensionality and sparsity on suspect blocks.

Common patterns: early `REMOVE`, `ISBLANK`/`ISNOTBLANK`, long iterative horizons, AR without `IFDEFINED(User)`, high `CombinedCardinality`.

---

## Step 3: Analyze root causes

| Area | Key questions |
|---|---|
| Scope | Where is scope first lost? Necessary? Defer scope-losing ops? |
| Sparsity | `ISBLANK`/`ISNOTBLANK`? Use `ISDEFINED` / `IFDEFINED` / `EXCLUDE`? |
| Formula shape | Filter early? `REMOVE` deferred? `BY` vs `ADD`? |
| Dimensionality | Too many or high-cardinality dimensions? |
| Iterative | `PREVIOUS`/`CUMULATE` horizon too long? Subset time? |
| Access rights | `IFDEFINED(User)` on AR metrics? AR repeated in chain? |

---

## Step 4: Prioritize and implement

| Priority | Examples |
|---|---|
| First | `IFDEFINED(User)`, `ISDEFINED` over `ISBLANK`, early `FILTER`, remove unnecessary `REMOVE` |
| Second | Defer aggregations, subset time, simplify AR |
| Third | Redesign dimensions, split metrics, refactor chains |

One change at a time. After each change, new `change_id` -> `tool:performance_profile_change` -> compare to baseline.

---

## Step 5: Verify

1. Re-profile the same user action (new `change_id`).
2. Confirm results unchanged (spot-check affected metrics).
3. Check no new slow executions appeared elsewhere.

---

## Step 6: Document

Summarize for the user: symptom, bottleneck execution(s), root cause, change made, before/after durations and scope. Use product language, not raw API field names (see analysis doc vocabulary rules).

---

## Common scenarios

| Symptom | Agent actions |
|---|---|
| Slow board load | Profile a typical board interaction; if compute is fast, route to board design skill |
| Slow after input | `performance_profile_change`; scope-loss + formula patterns |
| Timeout | Check iterative metrics, cardinality (`get_top_blocks_by_performance`), full recompute chains |
| Intermittent | AR by user, scenario count, data-dependent sparsity |

---

## See Also

- [./performance_profiling.md](./performance_profiling.md) - profiling tools and output parsing
- [./performance_scoping_patterns.md](./performance_scoping_patterns.md) - scope fixes
- [./performance_formula_optimization.md](./performance_formula_optimization.md) - formula patterns
- [./performance_sparsity_deep_dive.md](./performance_sparsity_deep_dive.md) - sparsity
