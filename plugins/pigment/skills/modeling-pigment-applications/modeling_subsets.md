# List Subsets

Guide for using List Subsets only when they create clear modeling value, and avoiding pitfalls-especially irreversible data loss, hidden complexity, and unnecessary operational overhead.

## When to Read This

- User asks to create or use a subset (sublist), or to "limit a list" / "use only some items" in structures
- Designing cohort models, intercompany matrices, or "same dimension twice" (e.g. Time + Cohort month)
- Considering subsets for performance (iterative calculations) or for dropdown UX
- User mentions security/filtering goals that might be confused with subsets

Tool note: Subset creation is available via agent tools; update filter and delete are not yet exposed. This document prepares the skill for full tool coverage and guides design regardless of how the subset is created (UI or future tools).

---

## Purpose

Help modelers (and the agent) use List Subsets only when they create clear modeling value, while avoiding common pitfalls-especially irreversible data loss, hidden complexity, and unnecessary operational overhead.

---

## Core mental model

How the agent must think about subsets:

- A Subset is effectively a separate Dimension in structures and formulas.
    - Metrics dimensioned by the subset and metrics dimensioned by the parent are different shapes.
    - You cannot freely substitute one for the other without explicit mapping.
- A Subset:
    - Inherits items/properties/order/sharing behavior from its Parent list.
    - Does NOT automatically "map back" to the parent dimension in calculations.
- Data loss behavior:
    - If an item is deselected from a subset, Pigment permanently deletes associated datapoints in metrics that use that subset as a dimension.
    - This deletion:
        - Affects only subset-dimensioned metrics (not metrics on the parent list).
        - Typically applies across all scenarios where the subset-dimensioned metric stores data.
        - Is not reversed if the item is later re-added to the subset; deleted cells do not come back.
- Therefore: Subsets are a power tool, not a default pattern.
    - Use them when they deliver clear modeling or performance benefits, with a plan to manage the risks.

---

## Agent Decision Checklist (before proposing a Subset)

Before recommending a subset, the agent must go through this checklist:

1. Is the user's goal actually security or filtering?
    - If the goal is:
        - "who can see/edit what?" -> use Access Rights / Permissions, not subsets.
        - "only show active items / specific subset in a view" -> use filters or Boolean/list properties.
    - -> In these cases, do NOT propose subsets.
2. Is the user's goal just "a smaller list to input data on"?
    - If yes, and:
        - there will be manual inputs, and
        - membership is likely to change, and
        - there is no strong iterative/performance need,
    - -> Prefer a separate regular list.
3. Is there an iterative / recursive / cycle-heavy calculation where only some members matter?
    - If yes (e.g. `PREVIOUS`, `PREVIOUSOF`, complex iterative steps), and a subset significantly reduces members:
    - -> Subsets can be considered, with explicit mapping back to parent where needed.
4. Is the same logical dimension needed twice in one metric (mirror dimension)?
    - E.g. Months as both Time and Cohort, or Company in rows and columns.
    - -> Subset can be a good fit (see "Strongly recommend" cases).
5. Will any metrics on the subset contain manual inputs, and can the client manage safe-update workflows?
    - If manual inputs on subset + changing membership + weak governance:
    - -> Either use Pattern A (STORE/CALC) or avoid subsets and propose a separate list.

Only if at least one valid use case (below) is clearly met and the risks are manageable should the agent recommend subsets.

---

## Decision policy: When to recommend Subsets

### GOOD: Strongly recommend (high-value, low-regret)

1. Mirror dimensions (same logical list used twice in a structure)

Typical examples:

- Cohort modeling: Months as "Time" + Months as "Cohort month".
- Intercompany elimination / consolidation: Company in rows + Company in columns.
- Other "matrix" / relationship models (e.g. Origin vs Destination).

Why subsets are appropriate:

- Keep a single "source of truth" list while enabling the same logical dimension twice.
- Avoids maintaining two independent lists that must be kept in sync.
- Still requires awareness that the "second copy" is a separate dimension shape.

2. Restricted dropdown lists for UX/control (when the gap is huge)
- Example: selecting a Supplier from a curated subset instead of thousands of suppliers.

Agent guidance:

- Use the Subset as the selection UI dimension only.
- Store resulting data on the Parent dimension, using mapping (see Pattern B).
- This preserves UX while keeping most data attached to the more stable parent list.

---

### GOOD: Recommend with caveats (only if it materially improves performance)

1. Performance optimization for iterative/recursive calculations

Especially for:

- Time-based iterations: `PREVIOUS()`, `PREVIOUSOF()`.
- Recursive or cycle-heavy patterns where computation cost approx #cycles x #members.
- Cases where many members are structurally present but logically unused for the iterative logic.

Agent guidance:

- Subsets do not reduce storage size for metrics on the parent list.
- They reduce compute only where the subset itself is used as a dimension.
- Use a subset to:
    - Restrict the number of members along which the iterative calc is performed.
    - Then remap results downstream to the parent dimension (Pattern C) if needed.

Only propose this if:

- The parent list is large *and*
- There's a clearly identified recursive/iterative metric where limiting members yields meaningful performance gain.

---

## Decision policy: When NOT to recommend Subsets

### WARNING: Usually avoid (prefer filtering, properties, or another list)

1. "Focused analysis subsets" (Ex: active entities only, Subset of countries only, etc.)

If the goal is just to analyze a smaller portion of a dimension or to simplify reporting:

- Prefer:
    - View filters (on Time, Status, Region, etc.).
    - Boolean/list properties + filters.
    - Security filters if access restriction is needed.

Reason:

- The data loss and governance overhead of subsets are rarely worth it for pure analysis.
- Filters are reversible and safer.

2. Time subsets (e.g. only forecast months, only open periods)
- Tempting use case: subset of Time for "open" or "forecasted" periods.
- However:
    - Same data-loss behavior applies to any metrics on the Time subset.
    - Filtering or helper metrics (e.g. "Is Forecast Month") are often safer.

Agent rule:

- For Time, default to filters or helper metrics, and use subsets only in specific performance/mirror-dimension scenarios with explicit acknowledgement of risk.

---

### GOOD: Prefer creating another regular list when...

Use a regular list instead of a subset when:

- You need a stable "modeling list" where items should not disappear regularly.
- Membership logic is expected to change often (new criteria, business rules, etc.).
- You plan to store manual inputs at that level and cannot accept deletion risk.
- The "subset" would effectively become a quasi-dimension with its own lifecycle.

Agent heuristic:

If all of the following are true:

- Users will input data on the target structure, and
- Membership will be edited / changed over time, and
- There is no strong iterative or mirror-dimension need,

-> Recommend a new regular list, not a subset.

---

## Hard warnings the agent must always surface

When the user is planning to create or heavily use a subset, the agent must highlight these risks explicitly.

###  Warning 1 - Data loss is real, cross-scenario, and not auto-reversible

- When an item is deselected from a Subset, Pigment permanently deletes associated datapoints in metrics that use that Subset as a dimension.
- This deletion:
    - Typically affects all scenarios of those subset-dimensioned metrics.
    - Is not reversed if the item is later re-selected in the subset.
- This is especially dangerous when:
    - Subset membership is formula-driven.
    - Users are entering manual inputs in subset-dimensioned metrics.

Agent must:

- Warn clearly that this behavior is structural and irreversible (without backup).
- Suggest a mitigation such as Pattern A (STORE/CALC) or storing on the parent list instead.

---

###  Warning 2 - Subset and parent are different dimensions (remap explicitly)

- Parent list and subset are distinct dimensions in structures and formulas. A metric dimensioned by the subset is not interchangeable with one on the parent until you remap dimensions.
- For the common case - same list, natural 1:1 between subset item and parent item - use the native modifiers (no aggregator):
    - TOPARENTLIST - expression on the subset -> same values on the parent (parent items not in the subset are blank).
    - TOSUBSET - expression on the parent -> same values on the subset (parent rows outside the subset are dropped).
- When you need a custom mapping, several subsets feeding one block, or the compiler rejects the subset modifiers for your structure, use explicit mapping properties and `[BY: ...]` (see Patterns B and C below).
- The agent must not assume a subset-dimension metric can be used where a parent-dimension metric is expected without `TOPARENTLIST`, `TOSUBSET`, or an equivalent `BY` mapping.

---

###  Warning 3 - Operational overhead and governance

Safe subset usage often requires:

- Storage / helper metrics (e.g. STORE/CALC pattern).
- Manual or scheduled imports / actions.
- Board workflows (buttons, clear documentation).
- Owners who understand what happens when membership changes.

Agent guidance:

- Avoid proposing subsets if the client clearly lacks the appetite or governance to maintain:
    - storage mechanics,
    - periodic syncs,
    - and clear change-control around membership.

---

## Safe implementation patterns

### Pattern A - Safe "formula-driven subset" without losing manual inputs

Use when:

- Subset membership logic may change over time, and
- There are (or will be) manual inputs in metrics dimensioned by the subset, and
- You need to avoid wiping historical inputs when membership changes.

Goal: Decouple "membership logic" from the actual "subset membership storage" so:

- Additions can be automated,
- Removals are deliberate and controlled.

Steps (on the Parent list)

1. Create two metrics on the Parent list:
    - `CALC_Subset` (Boolean, formula) - determines if item *should* be in subset now.
    - `STORE_Subset` (Boolean, manual/storage) - the metric actually linked to subset membership.
2. In `CALC_Subset`, implement logic and exclude stored members:
    - Example structure:

        ```
        IF(
          'Parent'.'Some Property' = ...,
          TRUE,
          FALSE
        )
        [EXCLUDE: 'STORE_Subset']
        ```

    - Purpose:
        - `CALC_Subset` flags new candidates based on logic.
        - Existing stored members are preserved and not overwritten.
3. Create a Metric-to-Metric import:
    - Source: `CALC_Subset`
    - Target: `STORE_Subset`
    - Critical: "Clear values before import" = OFF
    - Expose this as:
        - A button on a board, and/or
        - A scheduled action.
4. Link the Subset membership to `STORE_Subset`:
    - The subset uses `STORE_Subset` as its condition (e.g. formula referencing that metric).

Behavior

- New members:
    - When logic says TRUE and `STORE_Subset` was FALSE, import sets them to TRUE -> added to subset.
- Existing members:
    - Stay in the subset unless explicitly turned off in `STORE_Subset`.
- Removals:
    - Are deliberate actions (manual untick or specific process) with visible consequences.

When this pattern is not needed

- If all metrics using the subset are fully formula-driven (no manual inputs and acceptable to recompute from scratch), you can:
    - Drive membership directly from a formula metric, and
    - Accept that membership changes may wipe data (which will be recomputed).

---

### Pattern B - Restricted dropdown UX while storing on the parent dimension

Use when:

- You want a curated subset for user selections, but
- You want to store and maintain data on the parent dimension, not on the subset.

Approach

- Use subset as the selection dimension (e.g. dropdown in a table or form).
- Use a mapping to re-align chosen subset item back to the parent dimension where the data is stored.

Implementation (high-level)

1. Have a Parent list (e.g. `Supplier`) and a Subset (e.g. `Supplier_Subset`).

2. When a user picks a value using the subset (e.g. `Selected Supplier (Subset)` metric dimensioned by `Supplier_Subset`), realign it back to the parent using the native remap TOPARENTLIST modifier:

        ```
        'Selected Supplier on Parent' =
          'Selected Supplier (Subset)'[TOPARENTLIST: 'Supplier_Subset']
        ```

        See [TOPARENTLIST and TOSUBSET](../writing-pigment-formulas/formula_modifiers.md#toparentlist-and-tosubset-list-subsets). 

Why this is safer

- The UX benefit comes from the curated subset dropdown.
- Most persistent data lives on the parent list, which:
    - Is less likely to have items removed,
    - Avoids heavy dependence on subset membership for stored values.

---

### Pattern C - Remap subset items back to parent list (general recipe)

Use when:

- You compute something at subset level but need it at parent level, or
- You combine several subsets into a parent-level report.

Steps

1. Use TOPARENTLIST when a single metric on the subset must appear on the parent with natural 1:1 item identity:

    ```
    'Metric on Parent' =
      'Metric on Subset'[TOPARENTLIST: 'Subset']
    ```

    See [TOPARENTLIST and TOSUBSET](../writing-pigment-formulas/formula_modifiers.md#toparentlist-and-tosubset-list-subsets).
   
2. If different subsets map into the same parent, centralize mappings and avoid duplicating this structure in many places.

Agent guidance

- Prefer TOPARENTLIST / TOSUBSET for straight subset <-> parent remaps when the compiler allows them (see [formula_modifiers.md](../writing-pigment-formulas/formula_modifiers.md#toparentlist-and-tosubset-list-subsets)).
- For custom or multi-subset shapes, aim for reusable mapping metrics/properties rather than many one-off mapping formulas, and use `[BY: ...]` consistently.

---

## Summary for the agent

- Treat every subset as its own dimension shape with:
    - Separate data storage,
    - Non-reversible deletion behavior on membership changes,
    - No implicit interchange with the parent dimension - use TOPARENTLIST, TOSUBSET, or mapping + BY when you need both shapes in formulas.
- Default patterns:
    - For security or filtering -> use security/filters, not subsets.
    - For small input lists with changing membership -> prefer a regular list.
    - For mirror dimensions or targeted iterative performance -> subsets are often appropriate; remap subset <-> parent with TOPARENTLIST / TOSUBSET or explicit BY mapping as needed.
    - For dropdown UX -> use subsets only as the selection dimension, store data on the parent.
- When proposing subsets, always:
    - Surface the data loss warning,
    - Explain the need for an explicit dimensional remap (TOPARENTLIST / TOSUBSET or mapping + BY),
    - And, if manual inputs are involved, recommend Pattern A or an alternative design.
