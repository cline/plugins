# Performance Profiling (Modeler Agent)

Measure compute performance with profiling tools, parse their output, and report findings to the user. For scope mechanics and formula fixes, see [./performance_scoping_patterns.md](./performance_scoping_patterns.md). For the full performance loop, see [./performance_troubleshooting_workflow.md](./performance_troubleshooting_workflow.md).

## Prerequisites

| Tool | Use when |
|---|---|
| `tool:get_top_blocks_by_performance` | Hotspot block unknown; rank blocks app-wide over a time window |
| `tool:performance_profile_change` | Slow action reproduced; you have `change_id` from audit trail |

## Workflow

1. Triage (optional). `tool:get_top_blocks_by_performance` with `scenario_id`, `range_start`, `range_end`, `top_n`, and `criteria`: `ExecutionTimeSumMs` (total cost), `ExecutionTimeAvgMs` (typical cost), `ExecutionCount` (churn), `CombinedCardinality` (data volume, no execution history needed).
2. Reproduce the slow input or formula change.
3. Profile. `tool:performance_profile_change` with `change_id` (UUID).
4. Analyze using sections below; map `Blocks:` to formulas.
5. Fix one change at a time. New `change_id` -> re-profile -> compare `Duration` and scope.

Board-render fork: Low total execution time but slow board load -> `skill:designing-pigment-boards`, not formula work.

---

## Top blocks output

```
Top N blocks ranked by performance:
- {block_id} ({block_type}) - cardinality={n}, executions={count}, avg_ms={avg}, sum_ms={sum}
```

Missing `job_profile` -> widen the time window or switch `criteria`. Then profile a change on the suspect block.

---

## Change profile output

```
Change profiled successfully. N execution(s) found.

Executions:
1. {job_type}
   - Id: {uuid}
   - Blocks: Metric(`uuid`), ...
   - Dimensions: uuid1, uuid2, ...
   - Ready at: Xms, Executed at: Yms, Duration: Zms
   - Effective scope: {text}
   - Output scope: {text}
   - Depends on: uuid, ...   <- optional
```

| Field | Meaning | Tell the user |
|---|---|---|
| Ready at | Wait for dependencies | Ready at |
| Executed at | Ready + queue contention | Executed at |
| Duration | Compute time | Duration |
| Effective scope | Scope used | Effective scope |
| Output scope | Scope passed downstream | Output scope |
| Depends on | Upstream execution IDs | Dependencies |

Block labels: `Metric(...)`, `List(...)`, `Table(...)`, `Cycle(...)`, `Block(app:...)`.

Scope text:

| Text | Meaning |
|---|---|
| `no change` | No cells written |
| `no scope, full computation` | Full recompute (X = 0) |
| `dim:uuid (N modalities), ...` | Scoped to N modalities per dimension |

### X/Y notation

- Y = count on `Dimensions:` line
- X = count of `dim:` entries in `Effective scope:`
- Target X = Y on hot paths

| Effective | Output | Interpretation |
|---|---|---|
| `dim:...` | Same | Scope preserved |
| `dim:...` | More dims | Scope introduced downstream |
| any | `no change` | Ran, no output (still check Duration) |
| `no scope, full computation` | - | Scope-loss origin candidate |

First `no scope, full computation` -> inspect that block's formula (`REMOVE`, `CUMULATE`, `PREVIOUS`, `RANK`).

### Time and dependencies

- Sort by Duration; flag > 1000 ms or dominant wall-time share.
- Contention = Executed at - Ready at (large vs Duration -> workload/queueing, not formula).
- Wall time approx max(Executed at + Duration) across executions.
- Match `Depends on` UUIDs to upstream `Id:` lines; ancestors appear earlier in the list.

### Patterns

| Pattern | Signature | Action |
|---|---|---|
| Cascading scope loss | Scoped runs, then first `no scope, full computation`, rest full/no change | Defer `REMOVE`/aggregations; see scoping patterns doc |
| No change, high Duration | `Output scope: no change` and Duration > 500 ms | Add earlier `FILTER`/`EXCLUDE` |
| High contention | Executed at >> Ready at on many rows | Broad scope or too many parallel branches |

---

## Report to the user

Include: execution count, approximate wall time, permission filter note, chain with natural block names, X/Y per step, slowest step, scope-loss origin, one recommendation.

Vocabulary: Say ready at, executed at, duration, scope, dependency. Do not say execution_id, time_schedule_ms, effective_scope, clauses.

---

## See Also

- [./performance_scoping_patterns.md](./performance_scoping_patterns.md)
- [./performance_formula_optimization.md](./performance_formula_optimization.md)
- [./performance_troubleshooting_workflow.md](./performance_troubleshooting_workflow.md)
