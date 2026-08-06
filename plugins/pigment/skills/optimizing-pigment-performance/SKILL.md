---
name: optimizing-pigment-performance
description: Always use this skill when troubleshooting slow calculations or timeouts, analyzing profiler output to identify bottlenecks, understanding scope propagation, managing sparsity, optimizing formula performance, improving iterative calculations, optimizing access rights performance, conducting systematic performance audits, auditing a Pigment application (modeling, formula hygiene, folders, boards, governance), cleaning unused dimensions, metrics, tables, properties, or boards, identifying dead or stale boards, or removing unused metrics. Modeler-agent skill for Performance Insights tools (performance_profile_change, get_top_blocks_by_performance), then classify and fix. Provides the optimization loop, audit vs cleaning modes, and routing to deep dives. Always profile before formula changes; never optimize from assumptions.
metadata:
  skill_path: /optimizing-pigment-performance/SKILL.md
  base_directory: /optimizing-pigment-performance
  includes:
    - "*.md"
---

# Optimizing Pigment Performance

Profiler-driven performance optimization, sparsity-aware patterns, and application audit/cleaning for the modeler agent. Read this overview first, then the matching deep dive.

## When to Use This Skill

- Slow calculations, timeouts, or profiler analysis
- Scope loss, densification, iterative horizons, AR overhead, calendar iteration
- Systematic performance audit on an application
- App audit (modeling, formulas, folders, boards, governance) with severity-tagged findings
- Cleaning unused dimensions, metrics, tables, properties, or boards (deletion only)
- Identifying dead or stale boards, removing unused metrics
- Board loads slowly but profiler shows fast metric compute (rendering vs compute)
- Planning cycle grew many scenarios/versions and inputs feel much slower

---

## Performance Mental Model

Every optimization follows the same loop. Skipping the profile step is the most common failure mode.

1. Profile (mandatory). Call `tool:get_top_blocks_by_performance` and/or `tool:performance_profile_change` (see below). No optimization without tool output.
2. Classify the bottleneck. Scope loss, sparsity densification, iterative horizon, AR overhead, calendar iteration, formula shape, or board-render overhead (widget count, heavy views).
3. Apply the right pattern. Scope-first, `BY` over `ADD`, `ISDEFINED` over `ISBLANK`, etc.
4. Re-profile, compare, document the gain.

### Core Principles

1. Scope first. Start formulas with scoping clauses (`FILTER`, `EXCLUDE`, `IFDEFINED`).
2. Preserve sparsity. Use `ISDEFINED` instead of `ISBLANK`. Use `BLANK` instead of `0` or `FALSE`.
3. Filter early, defer aggregations. Apply `FILTER`/`EXCLUDE` before computation; push `REMOVE` to the end of the chain.
4. Profile systematically. Measure before and after every change.
5. Understand scope propagation. Know when scope is lost (`REMOVE`, `CUMULATE`, AR).

### Performance profiling tools (modeler agent)

Requires Performance Insights (`use_performance_tools`). Profiling tools and output parsing: [./performance_profiling.md](./performance_profiling.md).

| Tool | When to use | Input highlights |
|---|---|---|
| `tool:performance_profile_change` | A specific slow user action is known; you have (or can get) its `change_id` from audit trail | `change_id` (UUID). Returns execution chain with duration, scope, dependencies. |
| `tool:get_top_blocks_by_performance` | Exploratory app-wide triage: which blocks cost the most over a period | `scenario_id`, `criteria` (`ExecutionCount`, `ExecutionTimeAvgMs`, `ExecutionTimeSumMs`, `CombinedCardinality`), `range_start`, `range_end`, `top_n`. Returns ranked blocks with cardinality and job stats. |

Workflow: Start with `get_top_blocks_by_performance` when the hotspot block is unknown. Use `performance_profile_change` after reproducing a slow change to analyze scope propagation and the execution chain for that change.

---

## Audit vs Cleaning (Application Hygiene)

Two modes; never mix in the same pass.

| Mode | Purpose | Output | Never |
|---|---|---|---|
| Audit | Diagnostic, non-destructive | Findings with HIGH / MEDIUM / LOW + proposed fixes | Deletes, renames, refactors |
| Cleaning | Deletion only | Removes unused objects in strict order | Formula edits, renames, folder moves |

### Severity (canonical)

| Severity | Meaning |
|---|---|
| HIGH | Breaks critical rules, blocks T&D, or data-loss risk |
| MEDIUM | Performance, maintainability, or governance harm |
| LOW | Cosmetic or minor hygiene |

### Deletion Order (canonical)

Cleaning uses two independent axes executed in this order:

1. DEAD boards first. Classify boards (ACTIVE / STALE / DEAD) from usage analytics. Delete DEAD boards (tag, notify, contestation window, delete). STALE boards are not deleted automatically but signal future cleanup.
2. Recompute structural usage after board deletion.
3. Structural objects in order: Dimensions, Metrics, Tables, Properties. Hide, observe, delete. Recompute usage after each pass; iterate until no new candidates.

System truth (settings, dependency graph, usage analytics) defines "unused", not agent judgment. Always validate deletions with the user before irreversible removal.

### Scenario Cardinality

Version and scenario proliferation multiplies work per input (roughly linear in active scenario count, often felt as much worse when scope and AR compound). When an application grows from 3 to 12 scenarios, expect at least ~4x more computation and plan for higher perceived slowdown. Audit scenario cardinality as a structural performance factor; recommend subsetting inactive scenarios or archiving historical versions. See also `skill:modeling-pigment-applications` for version/scenario architecture.

| Need | Doc |
|---|---|
| Full app audit (modeling, UX, governance, cleanup candidates) | [./performance_auditing_application.md](./performance_auditing_application.md) |
| Deletion workflow, unused definitions, board usage rules | [./performance_cleaning_application.md](./performance_cleaning_application.md) |

---

## Bottleneck Routing

| Signal | Read |
|---|---|
| Profiling (tools, parse output, report) | [./performance_profiling.md](./performance_profiling.md) |
| Rank app hotspots over a time window | `tool:get_top_blocks_by_performance` (see tools table above) |
| Scope loss after `REMOVE`, `CUMULATE`, AR | [./performance_scoping_patterns.md](./performance_scoping_patterns.md) |
| Unexpected metric size, `ISBLANK` / `ISNOTBLANK` | [./performance_sparsity_deep_dive.md](./performance_sparsity_deep_dive.md) |
| Formula shape (`IF` vs `FILTER`, `BY` vs `ADD`) | [./performance_formula_optimization.md](./performance_formula_optimization.md) |
| `PREVIOUS`, `PREVIOUSOF`, `CUMULATE` horizons, calendar iteration | [./performance_iterative_calculations.md](./performance_iterative_calculations.md) |
| AR-heavy formulas, `ISDEFINED(User)` wrapper | [./performance_access_rights.md](./performance_access_rights.md) |
| Board slow to load, profiler shows fast compute | [./performance_troubleshooting_workflow.md](./performance_troubleshooting_workflow.md) (board-render fork); `skill:designing-pigment-boards` |
| Many scenarios/versions, inputs much slower | [./performance_scoping_patterns.md](./performance_scoping_patterns.md) (scenario cardinality); `skill:modeling-pigment-applications` |
| Where to start a systematic audit | [./performance_troubleshooting_workflow.md](./performance_troubleshooting_workflow.md) |

---

## Quick Reference: Common Anti-Patterns

For detailed patterns with examples, see [./performance_formula_optimization.md](./performance_formula_optimization.md) and [./performance_sparsity_deep_dive.md](./performance_sparsity_deep_dive.md).

| Anti-Pattern | Fix |
|---|---|
| `ISBLANK` / `ISNOTBLANK` for sparsity gates | `ISDEFINED` / `IFDEFINED` / `IFBLANK` / `EXCLUDE`, or `BY` on dimension-typed metric |
| No scoping at formula start | Add `FILTER` or `EXCLUDE` first |
| Early `REMOVE` in chain | Defer `REMOVE` to end; use `BY` with mappings |
| Long dense horizons in `PREVIOUS` | Subset time dimension |
| AR formula without `ISDEFINED(User)` guard | Wrap in `IFDEFINED(User, ...)` |
| Fast profiler, slow board load | Check widget count, view filters, displayed volume; see troubleshooting workflow |
| Many active scenarios/versions | Subset inactive scenarios; archive historical versions |

---

## Cross-References

- modeling-pigment-applications: dimensional design, principles, folders, version/scenario architecture
- writing-pigment-formulas: syntax, modifiers, functions
- securing-pigment-applications: AR patterns and AR metric construction
- designing-pigment-boards: board design (audit section)

---

## Critical Rules

- Always profile with performance tools first before formula changes (or ask user for `change_id` if tools disabled).
- Audit is diagnostic; cleaning is deletion only.
- DEAD boards first, then structural objects in order (Dimensions, Metrics, Tables, Properties). Recompute usage between passes.
- Validate cleanup with the user before irreversible deletions.
- ISDEFINED over ISBLANK; scope early; document profiler findings.
