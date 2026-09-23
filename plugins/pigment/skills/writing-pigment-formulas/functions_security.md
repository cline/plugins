# Security Functions

Access control and security-related operations in formulas.

Covers: ACCESSRIGHTS, RESETACCESSRIGHTS

---

## Quick Reference

| Function              | Purpose                        | Syntax Example                            |
| --------------------- | ------------------------------ | ----------------------------------------- |
| ACCESSRIGHTS      | Define read/write access       | `ACCESSRIGHTS(ReadBoolean, WriteBoolean)` |
| RESETACCESSRIGHTS | Remove inherited access rights | `RESETACCESSRIGHTS(Expression)`           |

---

## ACCESSRIGHTS

Constructs an Access Rights value based on specified read and write Boolean conditions. Used within Access Rights Metrics to define which users can read or write data.

Syntax: `ACCESSRIGHTS(ReadAccessBoolean, WriteAccessBoolean)`

Parameters:

- ReadAccessBoolean: Boolean. TRUE allows Members to read data, FALSE or BLANK prevents reading
- WriteAccessBoolean: Boolean. TRUE allows Members to write data, FALSE or BLANK prevents writing

Return Type: Access Rights

Examples:

```pigment
ACCESSRIGHTS(TRUE, FALSE) // Grants read-only access
ACCESSRIGHTS(User.Role = "Admin", TRUE) // Grants read access to Admins, write access to all
```

Key Points:

- Use BLANK instead of FALSE for better performance with Pigment's sparse engine
- Does not directly apply access rights to a Block; builds Access Rights values for use in Access Rights Metrics
- For performance: `IFDEFINED(User, 'Revenue'[AR: 'Rules'])` (see [formula_performance_patterns.md](./formula_performance_patterns.md))

---

## RESETACCESSRIGHTS

Removes inherited access rights from the referenced Block or expression. Direct access rights rules applied to the Block itself will still apply.

Syntax: `RESETACCESSRIGHTS(Expression)`

Parameters:

- Expression: The formula or Block reference from which to remove inherited access rights

Return Type: Same as Expression

Examples:

```pigment
// Remove inherited access rights from 'Metric A' only
RESETACCESSRIGHTS('Metric A') + 'Metric B'
```

Use Cases:

- Aggregations: Allow users with partial access to see totals or calculated results
- Shared Blocks: Control access rights inheritance when referencing Blocks shared from other Applications
- Performance Optimization: Reduce redundant access rights inheritance in complex models

Key Points:

- Only removes _inherited_ access rights (direct access rights rules still apply)
- Use as specifically as possible to avoid exposing more data than intended
- Application settings may need adjustment for shared Blocks

---

## Best Practices

1. Apply Access Rights at the Right Level: Apply as late as possible in calculation chains
2. Document Security Logic: Clearly document where and why access rights are applied or reset
3. Test Security: Verify access rights work correctly for different user roles
4. Minimize RESETACCESSRIGHTS: Only use when calculations truly require the full dataset

---

## Critical Rules

- Use BLANK over FALSE - Better performance with sparse engine
- ACCESSRIGHTS builds values - Used in Access Rights Metrics, not directly applied
- RESETACCESSRIGHTS removes inherited only - Direct rules still apply
- Performance pattern: `IFDEFINED(User, Data[AR: 'Rules'])` (see performance patterns)
- Test thoroughly - Verify for different user roles

---

## See Also

- [functions_logical.md](./functions_logical.md) - IFDEFINED for access rights patterns
- [formula_performance_patterns.md](./formula_performance_patterns.md) - Access rights optimization
- [formula_writing_workflow.md](./formula_writing_workflow.md) - Structured approach to writing formulas
