# Pigment Formula Writing Workflow

Purpose: Translate business requirements into correct, performant Pigment formulas efficiently.

---

## Workflow Overview

```
Step 1: Understand Context -> Step 2: Search Documentation -> Step 3: Design Approach -> Step 4: [OPTIONAL] Define Tests -> Step 5: Build -> Step 6: Optimize -> Step 7: Validate -> Step 8: Deliver
```

_Feedback loops: Step 3->Step 1, Step 5->Step 3, Step 6->Step 5, Step 7->appropriate step_

---

## Step 1: Understand Context

Gather Information:

- Clarify business calculation in plain language
- Identify existing blocks (Metrics, Dimensions, Lists, properties)
- Application workspace (not documentation): use `tool:search` to find relevant blocks, confirm exact friendly names, and spot close duplicates (e.g. lists whose names differ by a prefix). Use `kind` / `regexp` on search when you need a precise name match. This step is separate from Step 2, which searches markdown skills only.
- Understand source and target metric: name, dimensions, type (Number/Date/Text/Dimension/Boolean). Note: Formula result must match target type - see type conversion functions if needed
- Check for obvious circular reference risks

Success means:

- Formula produces correct results
- Dimensional alignment is correct
- No syntax errors

If unclear -> Ask user for clarification

---

## Step 2: Search Documentation

Search Strategy:

- Query: `"how to [specific calculation from Step 1]"`
- Search key concepts from requirements
- Review ALL returned documentation chunks
- Read discovered files completely
- Note performance patterns mentioned
- If the request involves a specific dimension member (e.g. a month, version, country): read [modeling_principles section 4](../modeling-pigment-applications/modeling_principles.md) (MP02) and [formula_modifiers.md](./formula_modifiers.md) (FILTER, SELECT, BY CONSTANT).

Why search matters: Discovers functions you don't know exist and verifies proper parameter usage.

---

## Step 3: Design Approach

Quick Design:

- Identify operations needed (aggregate, allocate, filter, transform)
- Determine sequence of operations
- Consider sparsity preservation (use BLANK, IFDEFINED, early filtering)

For complex formulas only:

- Consider alternative approaches if first seems problematic
- Choose approach based on simplicity and efficiency

If no clear approach -> Loop back to Step 1 (refine requirements)

---

## Step 4: Define Test Strategy [OPTIONAL]

Only for complex or critical formulas - Skip for simple calculations

Quick Test Definition:

- Identify 1-2 simple test cases to verify logic
- Note expected output mentally or in comments

For critical formulas:

- Define simple case, typical case, edge case
- Document expected outputs

---

## Step 5: Build Formula

Build Efficiently:

- Start with core calculation (no modifiers)
- Add dimensional transformations (BY, ADD, REMOVE, SELECT, FILTER, KEEP)
- Verify syntax and dimensional alignment
- No excessive nesting - if you're nesting > 3 levels, review and simplify if truly needed
- Write the direct calculation first - only add error handling if truly needed

Apply Operations & Align Dimensions:

Compare source vs target dimensions, apply modifiers:

| Modifier    | Purpose                                             |
| ----------- | --------------------------------------------------- |
| BY      | Aggregate/allocate via mapping (changes dimensions) |
| ADD     | Add dimension (allocation)                          |
| REMOVE  | Remove dimension (aggregation)                      |
| SELECT  | Filter and remove dimension                         |
| FILTER  | Filter without changing dimensions                  |
| EXCLUDE | Exclude specific data                               |
| KEEP    | Keep only specified dimensions                      |

Preserve Sparsity:

- Use `BLANK` instead of `0` where appropriate
- Use `IFDEFINED(block, value)` instead of `IF(ISBLANK(block), 0, value)`
- Apply early scoping: Filter/scope BEFORE calculations
- Defer aggregations: Aggregate AFTER calculations when possible
- Choose `IF` vs `FILTER`:
  - `IF` for adding values to new cells
  - `FILTER` for subsetting existing cells

Chaining Modifiers:

- When multiple modifiers needed, chain them in the correct order
- Order matters, especially with non-commutative aggregators (AVG, FIRSTNONBLANK)
- Use separate brackets or semicolon within one bracket
  Quick Validation:
- Syntax is correct
- Dimensional alignment makes sense
- Logic matches requirements
- MP02: No `Dimension."Item"`; use `VAR_` metrics - see [modeling_principles section 4](../modeling-pigment-applications/modeling_principles.md)
WARNING: REQUIRED - Validate before applying:

You MUST call `tool:validate_formula` before calling `tool:create_or_update_formula` or `tool:update_list_property_formula`. Applying an invalid formula puts the metric/property into an error state.

- `tool:validate_formula` checks syntax, entity references, types, and dimensional alignment WITHOUT applying
- Returns error highlighting and hints if invalid - use these to fix the formula before retrying
- Use before including formulas in user messages

Exception: Do NOT use `tool:validate_formula` with formulas containing `Previous` or `PreviousOf` functions (the validator does not support them). For these, verify syntax manually and confirm iterative calculation is configured on the target metric.

Note: Formula builder tools are only for actual implementation when you have concrete metric/list IDs. For general formula discussions or learning, write formulas manually following the steps above.

If validation fails -> Loop back to Step 3

---

## Step 6: Optimize for Performance

REQUIRED: Read [formula_performance_patterns.md](./formula_performance_patterns.md) and apply ALL applicable patterns.

Pre-Delivery Checklist:

- [ ] Scoping clauses appear FIRST (FILTER, EXCLUDE, IFDEFINED)
- [ ] Using IFDEFINED instead of IF(ISBLANK())
- [ ] Using IFBLANK instead of IF(ISBLANK(...), default, ...)
- [ ] Using IF for sparse additions, FILTER for subsetting
- [ ] Aggregations (REMOVE, BY) appear AFTER calculations
- [ ] Using BY instead of ADD where a mapping exists
- [ ] Access rights wrapped in IFDEFINED(User, ...)
- [ ] Using BLANK instead of 0 for empty values
- [ ] Using BLANK instead of FALSE for boolean flags (FALSE is stored, BLANK is not)
- [ ] MP02: No `Dimension."Item"` or `Dimension.Property."Item"` in the formula
- [ ] MP02: No `DATE(YYYY, M, D)` for planning bounds - use `VAR_` metrics (Date or Month)
- [ ] MP02: Required `VAR_` metrics exist (create first if missing)
- [ ] MP02: Metric names use relative temporal labels only (e.g. `'Next Period Forecast'`, not `Forecast 2026`)
- [ ] MP02: User has not overridden MP02 without seeing the compliant alternative

Quick Examples:

Early scoping: Apply filters/scopes first

```pigment
// Good
'Revenue'[FILTER: 'Product'.'Active' = TRUE] * 'Growth'

// Bad
('Revenue' * 'Growth')[FILTER: 'Product'.'Active' = TRUE]
```

IF vs FILTER: Use IF for sparse operations

```pigment
// Good (sparse) - VAR_Reference_Month: input metric, type Dimension
IF(Month > VAR_Reference_Month, 10)

// Bad (dense)
10[ADD: Month][FILTER: Month > VAR_Reference_Month]
```

Access rights with IFDEFINED(User):

```pigment
IFDEFINED(User, 'Revenue'[AR: 'Rules'])
```

Do NOT deliver formulas without completing this checklist.

If formula seems slow or complex -> Loop back to Step 5 (try simpler approach)

---

## Step 7: Final Validation

Quick Checklist:

- Syntax valid (no errors)
- Dimensional alignment correct
- Logic produces expected results
- Sparsity best practices applied where relevant
- No circular references

WARNING: REQUIRED - Call `tool:validate_formula` before applying:

Do NOT call `tool:create_or_update_formula` or `tool:update_list_property_formula` without validating first. Applying an invalid formula puts the block into an error state.

- Call `tool:validate_formula` - it returns detailed error messages with position highlighting
- If valid, proceed to apply using `tool:create_or_update_formula` or `tool:update_list_property_formula`
- If invalid, fix the formula and re-validate before applying

Exception: Skip `tool:validate_formula` for formulas containing `Previous`/`PreviousOf` (not supported by the validator).

If validation fails -> Loop back to appropriate step based on failure type

---

## Step 8: Deliver

Provide:

1. Formula - Complete Pigment formula with comments following the commenting standard:
   - Top-level comment (required): `//` comment on its own line(s) above the formula explaining its purpose (what it computes and why)
   - Part-level comments (for multi-step formulas): `//` on their own line below the segment they describe, with a blank line before the next segment. Skip for one-liners or obvious formulas.
   - Use the same language as the block name
   - Maintain or enhance existing comments; replace them completely only if a formula update made them wrong or misleading
   - Comments must be included in the formula string passed to tools (`tool:create_or_update_formula`, `tool:update_list_property_formula`, etc.)
2. Explanation - What the formula does, key operations and dimensional transformations
3. Documentation referenced - Key files/functions consulted
4. Validation suggestions (if relevant) - How user can verify results

---

## Critical Rules

- Always validate before applying - Call `tool:validate_formula` before `tool:create_or_update_formula` / `tool:update_list_property_formula`. Invalid formulas put blocks into error states. Exception: skip for `Previous`/`PreviousOf` formulas.
- Always search documentation - Discovers functions you don't know about
- Pigment syntax ONLY - You MUST NEVER write code or functions using another language being Excel, SQL, Python, JavaScript, MDX, DAX, or ANY other programming or query language. Think ONLY in Pigment terms.
- Never invent functions - Only use documented Pigment functions
- Modifiers use square brackets - `[BY: ...]`, `[REMOVE: ...]`, `[FILTER: ...]`, etc.
- If unsure about syntax - Search documentation, never assume
- Verify dimensional alignment - Ensure source and target dimensions match
- Verify referenced entities exist - Use `tool:search` to confirm metric names, list names, and property names before writing formulas
- Apply sparsity best practices - Use BLANK, IFDEFINED, early filtering when relevant
- Iterate when needed - Go back and refine if validation fails

---

## Feedback Loops

| When                             | Loop Back To     | Action               |
| -------------------------------- | ---------------- | -------------------- |
| No clear approach in Step 3      | Step 1           | Refine requirements  |
| Validation fails in Step 5       | Step 3           | Redesign approach    |
| Formula seems slow in Step 6     | Step 5           | Try simpler approach |
| Final validation fails in Step 7 | Appropriate step | Fix specific issue   |
