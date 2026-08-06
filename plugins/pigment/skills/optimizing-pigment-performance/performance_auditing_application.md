# Audit a Pigment App (Modeling, UX & Governance)

Purpose: Run a structured audit of a Pigment app to find issues in modeling, formulas, metric hygiene, folder structure, boards, governance, and cleanup-and to propose actionable improvements with severity. Use other skills for deep-dive checks (formulas, performance, boards); this doc defines scope, heuristics, output format, and delegation.

Scope: Models, metrics, folders, boards, governance artifacts. Optimize for future maintainers: explicit structure, treat hardcodes/temporary metrics/oversized boards as technical debt. Assume the app will scale in users, time horizon, and scenario complexity.

---

## 1. Output Expected from the Audit

Produce:

1. Structured audit report grouped by: Modeling | Performance | UX | Governance | Cleanup
2. Actionable recommendations per issue: what to change, why it matters, how to fix it
3. Severity - use HIGH / MEDIUM / LOW as defined in [SKILL.md](./SKILL.md#severity-canonical)
4. Delegated skill references when a finding comes from or should be deepened in another skill (e.g. Formula Optimization / Performance skill, Board design skill, Application Cleaning skill for deletion workflow)

---

## 2. Modeling & Formula Audit

### 2.1 Formula Quality & Anti-Patterns

Use: `skill:writing-pigment-formulas` and `skill:optimizing-pigment-performance` for detailed formula and performance checks.

Identify:

- Repeated logic that should be centralized (helper metrics, "compute once, reference many")
- Overly complex formulas (deep nesting, long IF chains)
- Metrics doing multiple jobs (split into focused metrics)
- Excessive use of volatile or heavy functions (e.g. PREVIOUS, dynamic scenario logic) where simpler patterns exist

Flag:

- Poor formula layout (hard to read, no structure, no comments)
- Missing logical decomposition into helper metrics

Recommend: Centralize repeated logic; introduce helper/shared metrics; improve readability and structure. Reference formula workflow and performance patterns when proposing changes.

### 2.2 Hardcoding & Time & Date Risks

Use: [`../modeling-pigment-applications/modeling_principles.md`](../modeling-pigment-applications/modeling_principles.md) (sections 4 and 9 for deployment-safe formulas and Test & Deploy when used); [`../modeling-pigment-applications/modeling_time_and_calendars.md`](../modeling-pigment-applications/modeling_time_and_calendars.md) and `skill:writing-pigment-formulas` for time/date functions.

Detect:

- Hardcoded numbers, dates, scenario names, version names in formulas
- Inline time logic instead of Time & Date functions (e.g. fixed dates instead of STARTOFMONTH, TIMEDIM)
- Business rules embedded directly in formulas instead of assumptions or parameters

Recommend: Use assumption metrics, parameters, or centralized time/date logic; avoid literals that differ across environments or break when data changes.

---

## 3. Metric Hygiene & Cleanup

For strict deletion workflow and machine-readable definition of "unused", use [performance_cleaning_application.md](./performance_cleaning_application.md). The audit surfaces candidates and recommendations; the application cleaning doc defines order of deletion, observation period, and board usage rules.

### 3.1 Unused Metrics (Audit View)

Identify metrics that:

- Are not referenced anywhere (no other metric, table, or board references them) - aligns with application cleaning's "unused" for metrics when downstream + UI exposure = 0
- Look like legacy remnants of past refactors

Recommend: Flag as deletion candidates. For actual deletion, follow [performance_cleaning_application.md](./performance_cleaning_application.md): DEAD boards first, then structural objects (dimensions -> metrics -> tables -> properties) with recompute between passes. Validate with user before deletion when uncertain.

### 3.2 Temporary / Copy Metrics

Search for metrics:

- Names starting with ZZ, TMP, COPY
- Names containing: remove, TBD, test

Assess: Still needed or should be deleted/renamed? Flag as technical debt if left in place without a clear purpose. Deletion, when decided, follows the application cleaning workflow (no renaming in Phase 1 cleaning).

### 3.3 Shared Metrics Validation

Check shared metrics:

- Are they actually reused by other applications or blocks?
- Or shared "just in case" with no consumers?

Recommend: Un-share unused shared metrics; consolidate duplicates where appropriate. See Library folder usage in [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md).

---

## 4. Folder & Structural Audit

### 4.1 Metric Folder Structure

Use: [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md) (OX folders, themed folders).

Identify:

- Overloaded folders (too many blocks, mixed purposes)
- Inconsistent layering (e.g. inputs mixed with outputs, core calcs mixed with technical helpers)

Enforce logical layers:

- Inputs
- Assumptions
- Core calculations
- Outputs
- Technical / Helper (and consider hiding non-business blocks from end users)

Note: Folder organization is Phase 2 / optional in [performance_cleaning_application.md](./performance_cleaning_application.md); audit can recommend it as hygiene, but it is not part of deletion-only cleaning.

### 4.2 "No Folder" Cleanup

Prevention: When creating blocks, always assign a folder. Never create in "No Folder". See [Working with Folders](../modeling-pigment-applications/modeling_working_with_folders.md) - Placing new blocks.

Identify: Blocks (metrics, lists) not assigned to any folder.

Action: Classify and either move to the appropriate folder or flag for deletion/archival. Deletion, when applied, follows the application cleaning doc (order, observation).

---

## 5. Board & UX Audit

Use: `skill:designing-pigment-boards` for layout, naming, and patterns.

### 5.1 Board Folder Structure

Check: Logical grouping of boards by business purpose (e.g. Input / Review / Analysis / Admin). Flag flat or deeply nested structures that hurt findability.

Recommend: Clear separation by purpose; consistent naming (e.g. prefixes like IN-, REV-, ADM- if adopted). See [modeling_naming_conventions.md](../modeling-pigment-applications/modeling_naming_conventions.md).

### 5.2 Board Naming Conventions

Identify: Ambiguous or inconsistent board names.

Recommend: Business-oriented naming; align with [modeling_naming_conventions.md](../modeling-pigment-applications/modeling_naming_conventions.md) and board skills.

### 5.3 Board Size & Performance

Flag boards with: More than ~20 widgets (heuristic; actual threshold depends on widget complexity, data volume, and view types).

Risks: Slower load times, harder maintenance, poor UX.

Recommend: Split into focused boards; use navigation boards where appropriate.

### 5.4 Unused Boards (Audit vs Cleaning)

Audit: Flag boards that appear unused (e.g. no recent use, or only admin viewers). For deletion and classification (ACTIVE / STALE / DEAD), use [performance_cleaning_application.md](./performance_cleaning_application.md): definition is usage-based (view_count, unique_non_admin_viewers, time window); DEAD boards follow tag -> notify -> contestation -> delete. Audit does not replace the application cleaning workflow.

---

## 6. Governance & Access Rights

Use: `skill:securing-pigment-applications` and [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md) (MS12, MP10, security).

Identify:

- Helper or technical metrics visible to business users (should be hidden or access-restricted)
- Missing access restrictions on sensitive metrics or lists

Recommend: Role-based access cleanup; hide or restrict non-business metrics; ensure AR rules are applied where data is sensitive (no "security by Board only").

---

## 7. App Cleanup & Maintenance (Validate with User)

For strict deletion workflow and definitions, see [performance_cleaning_application.md](./performance_cleaning_application.md). Below is the audit-oriented view.

### 7.1 Restored Blocks

Pigment's Restore block feature restores previously deleted blocks by creating a copy in a system-created folder (typically named "Restored blocks" or similar). This folder can accumulate blocks over time and is easy to overlook.

Identify: The system folder containing restored blocks, and the blocks inside it.

Action: Propose cleaning this folder if the user confirms they no longer need the restored blocks: either move blocks that are still needed to an appropriate folder (see [Working with Folders](../modeling-pigment-applications/modeling_working_with_folders.md) - Placing new blocks), or delete unused ones. Validate with the user before removing any restored blocks. If deletion is confirmed, align with the application cleaning doc (order, observation, logging).

### 7.2 Snapshot Cleanup

Identify: Old or unused snapshots.

Explain: Impact on space and performance (see MP06 in [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md)).

Action: Validate with the user before deletion. Snapshot cleanup is not part of the structural/board cleaning order in the application cleaning doc but is part of general hygiene.

---

## 8. Expert Audit Heuristics

- Optimize for future maintainers: Prefer explicit structure over convenience.
- Technical debt: Treat hardcodes, temporary metrics (ZZ/TMP/COPY/test/TBD), and oversized boards as debt; call them out and prioritize by severity.
- Scale assumption: Assume the app will grow in users, time horizon, and scenario complexity; flag design choices that will not scale.
- Delegation: When a finding is about formula quality or performance, point to the relevant skill. When it is about deletion of unused objects, point to [performance_cleaning_application.md](./performance_cleaning_application.md) for workflow and definitions.

---

## 9. Severity Classification

Canonical severity definitions are in [SKILL.md](./SKILL.md#severity-canonical). Use HIGH / MEDIUM / LOW as defined there.

---

## 10. Delegated Skill References

When findings come from or require deeper use of another skill, state it explicitly in the report:

- Formula quality / optimization: `skill:writing-pigment-formulas`, `skill:optimizing-pigment-performance` (including [performance_troubleshooting_workflow.md](./performance_troubleshooting_workflow.md))
- Time & dates / T&D risks: [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md) (sections 4 & 9 for T&D), [modeling_time_and_calendars.md](../modeling-pigment-applications/modeling_time_and_calendars.md), `skill:writing-pigment-formulas` (time/date functions)
- Folder structure / governance: [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md). Naming: [modeling_naming_conventions.md](../modeling-pigment-applications/modeling_naming_conventions.md)
- Boards / UX: `skill:designing-pigment-boards` (or advanced boards skill)
- Access rights: `skill:securing-pigment-applications` ([securing_access_rights.md](../securing-pigment-applications/securing_access_rights.md))
- Application cleaning (deletion workflow): [performance_cleaning_application.md](./performance_cleaning_application.md) - for definition of "unused", order of deletion, observation period, board usage-based cleaning

---

## See Also

- [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md) - Folder structure, MP06 hygiene
- [modeling_naming_conventions.md](../modeling-pigment-applications/modeling_naming_conventions.md) - Naming conventions (including Applications ZZ\_)
- [performance_cleaning_application.md](./performance_cleaning_application.md) - Deletion-only application cleaning, unused definitions, mandatory order, boards by usage
- [performance_troubleshooting_workflow.md](./performance_troubleshooting_workflow.md) - Performance audit methodology
- `skill:writing-pigment-formulas` - Formula workflow and quality
- `skill:designing-pigment-boards` - Board structure and naming
