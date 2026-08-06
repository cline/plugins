# Pigment Application Cleaning -- Agent Rules and Workflows

Purpose: Define a strict, deletion-focused approach to cleaning a Pigment application for execution by an agent. Cleaning = deletion only; "unused" is determined from Pigment system truth (settings, dependency graphs, usage analytics), not human judgment. Formula refactoring, optimization, renaming, and folder organization are out of scope for this cleaning phase.

---

## Core Principles

- Cleaning = Deletion. Only actions that remove objects from the application belong to the core cleaning phase. Renaming, folders, naming alignment are optional hygiene (Phase 2), not covered here.
- System truth over human opinion. "Unused" is determined exclusively from Pigment settings, dependency graphs, and usage analytics. No interviews, no inferred intent.
- No formula changes. Formulas are optimization; explicitly excluded from cleaning.

---

## Cleaning Phases (Scope of This Doc)

| Phase       | Scope                               | Mandatory               |
| ----------- | ----------------------------------- | ----------------------- |
| Phase 1 | Deletion of unused objects          | Yes -- this document    |
| Phase 2 | Renaming, folders, naming alignment | Optional (not cleaning) |

This document covers Phase 1 only.

---

## Canonical Deletion Order

Cleaning proceeds in two axes, in this sequence:

1. DEAD boards first -- classify and delete usage-based DEAD boards (see Board Cleaning below).
2. Recompute structural usage -- board deletions may unlock structural objects that are now unused.
3. Structural objects in order: Dimensions, Metrics, Tables (Transaction Lists), Properties. For each type: identify unused, hide, observe, delete.
4. Recompute and iterate -- deletion of one layer may unlock deletion in the next. Repeat until no new candidates appear.

Changing this order increases the risk of false positives (deleting an object whose consumer has not yet been removed).

---

## Phase 1 -- Board Cleaning (Usage-Based, First)

Boards are evaluated by usage analytics only, not by structural references. Board cleaning runs first because boards are frequently the primary trigger that enables deeper structural cleaning.

### Source of Truth for Boards

- `last_viewed_at`
- `view_count` (rolling window)
- `unique_viewers`
- Viewer role (admin vs business user)

A board viewed only by admins is not considered used for cleaning.

### Board Classification

| Category   | Criteria                                                           |
| ---------- | ------------------------------------------------------------------ |
| ACTIVE | Viewed by >= 1 business user in the time window                    |
| STALE  | Viewed only by admins/builders in the time window (not auto-deleted, but a strong signal for future cleanup) |
| DEAD   | `view_count = 0` OR `unique_non_admin_viewers = 0` in the time window |

Seasonality or annual-only usage must be explicitly whitelisted (clarify with solution architect).

### Board Deletion Workflow (DEAD only)

1. Auto-tag `TO_BE_DELETED`
2. Notify owner (if any)
3. Contestation window (duration agreed with solution architect)
4. Delete

STALE boards are not automatically deleted. They are flagged for review and often allow downstream structural cleaning once confirmed removable.

---

## Phase 1 -- Structural Cleaning (Settings-Based)

### Source of Truth

For all structural objects use Pigment Settings only:

- Dependency graphs
- Explicit references
- UI exposure metadata

No interviews, no inferred intent.

### Object Processing Order (Mandatory)

1. Dimensions
2. Metrics
3. Tables (Tables / Transaction Lists)
4. Properties (list fields)

---

## Definition of "Unused" (Machine-Readable)

### Dimensions

A dimension is unused only if all are true:

- Not referenced by any table
- Not referenced by any metric
- Not referenced by any property
- Not used in any board or page (axis, filter, segmentation)

| Usage count | Action                 |
| ----------- | ---------------------- |
| 0           | Candidate for deletion |
| > 0         | Do not touch           |

There is no "rarely used" concept.

---

### Metrics

A metric is unused if:

- Not referenced by any other metric
- Not displayed in any board or page
- Not used in any configured export

Note: Being inside a table is not considered usage for this definition.

| Downstream references | UI exposure | Action                 |
| --------------------- | ----------- | ---------------------- |
| 0                     | 0           | Candidate for deletion |
| >= 1                  | any         | Keep                   |

No merging, renaming, or formula edits in this phase.

---

### Tables (Transaction Lists / Tables)

A table is unused if:

- No downstream consumers (metrics, boards, other tables)
- No active input updates (for input tables)
- No connected exports or integrations

Special case: Tables used only as historical or staging layers are candidates only if no boards consume them.

---

### Properties (List Fields)

A property is unused if:

- Not referenced in any formula
- Not used as filter or display field
- Not visible in the UI

Optional strong signal: never populated with data.

Process: Hide -> Observe -> Delete. No type changes, no renaming in this phase.

---

## Deletion Workflow (All Structural Objects)

1. Identify unused object via settings (dependency + exposure).
2. Disable / hide object.
3. Observation period (e.g. minimum one business cycle; duration agreed with solution architect, e.g. 30 / 60 / 90 days).
4. Ask the user for explicit confirmation before final deletion after observation.
5. Log deletion event (who / what / when / why).

Silence during the observation window is a cleanup signal, not approval to delete. For contested or seasonal use, clarify with solution architect: observation window, whitelisting of seasonal/annual boards, minimum deletion batch size per run. Before irreversible deletion, get explicit user confirmation.

---

## Agent Execution Logic (Conceptual)

When executing a cleaning task:

1. Start with boards -- classify all boards (ACTIVE / STALE / DEAD) using usage analytics.
2. Delete DEAD boards -- follow board deletion workflow.
3. Recompute structural usage -- after board deletion, re-evaluate all structural objects.
4. Process structural objects in order -- Dimensions, Metrics, Tables, Properties.
5. For each object type -- identify unused, hide, observe, delete.
6. Log all actions -- maintain an audit trail.
7. Iterate -- deletion of one layer may unlock deletion in the next.

---

## See Also

- [performance_auditing_application.md](./performance_auditing_application.md) - Full app audit (surfaces candidates; this doc defines deletion workflow)
- [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md) - Folder structure, MP06 hygiene
- [modeling_naming_conventions.md](../modeling-pigment-applications/modeling_naming_conventions.md) - Naming conventions (including Applications ZZ\_)
