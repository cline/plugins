# Access Rights: Design, Implementation, and Governance

Purpose: Definitive reference for designing, implementing, applying, debugging, and governing Access Rights (AR) in Pigment. Use with [writing-pigment-formulas](../writing-pigment-formulas/functions_security.md) for formula syntax and [optimizing-pigment-performance](../optimizing-pigment-performance/performance_access_rights.md) for AR performance.

---

## 1. Why Access Rights Matter

AR is not only security-it is model architecture. Good AR enables clean UX, scales across apps, and avoids brittle workarounds (e.g. hiding data only in Boards). Design AR with the same rigor as data modeling and formulas.

Principle: Design Access Rights as part of the model's architecture, not as an afterthought.

---

## 2. Core Concepts

### 2.1 Access Rights vs Permissions vs Roles

| Concept                | Controls                            | Examples                                 |
| ---------------------- | ----------------------------------- | ---------------------------------------- |
| Access Rights (AR) | Cell-level data read/write          | User can write US data, read FR data     |
| Permissions        | Feature access (actions)            | Create metrics, edit boards, import data |
| Roles              | Bundles of permissions + default AR | Admin, Modeler, Contributor, Reader      |

Golden rule: AR protects data; Permissions protect actions; Roles define defaults. Fine-grained data security is enforced by AR rules, not by roles alone.

### 2.2 Where Access is Configured

- Application Settings -> Roles, permissions & access
- Subsections: Overview, Roles, Board access, Board access configuration, Data access rights (AR metrics and rules), Public Blocks
- Only Primary Owner, Security Admin, or Workspace Admin can manage these settings.

### 2.3 Default Roles (Summary)

- Admin: Full control including security.
- Modeler: Build content; cannot configure security.
- Contributor / Reader: Default Read/Write (Contributor) or Read-only (Reader). AR rules typically restrict Contributor and Reader to specific data slices.

### 2.4 User and Role dimensions: reserved for security only

The User and Role dimensions are system dimensions that exist in the Security context. They represent who can access the application (users) and what permission bundle they have (roles). Use them only for access rights, permissions, and security configuration.

Do not use User or Role for business or modeling purposes. For example:

- Workforce planning - Model employees with a dedicated Employee (or similar) dimension, not with the User dimension. User = application users (who log in); Employee = business entity (people in your workforce data).
- Responsible / owner - If you need "plan owner" or "responsible person" in a metric, use a business dimension (e.g. Employee, Cost Center Manager) and map it to User only where needed for AR. Do not use User as the primary dimension for planning data.
- Role - Reserve for application roles (Admin, Modeler, Contributor, Reader). Do not reuse "Role" for business roles (e.g. "Sales Role", "HR Role") unless they are explicitly aligned with application roles; otherwise create a separate dimension with a distinct name (e.g. Department, Job Function).

This keeps security (who sees what) clearly separate from the model (what you are planning or reporting on) and avoids confusion between "users of the app" and "entities in the data".

---

## 3. Non-Negotiable Rules

### 3.1 Always Use BLANK (Never FALSE)

- In AR metrics, use BLANK for "no access", never FALSE.
- BLANK preserves sparsity and performance; FALSE densifies and hurts performance.
- See [performance_access_rights.md](../optimizing-pigment-performance/performance_access_rights.md) and [functions_security.md](../writing-pigment-formulas/functions_security.md).

### 3.2 Layering: Deny-by-Default

- AR rules are restrictive: if any applied rule does not grant access for a cell, the user has no access.
- Every layer must grant access for the user to see or edit. Adding rules can only restrict further (except Ignore overrides-see below).

### 3.3 Build != Apply

- Build an AR metric: Define who gets Read/Write (boolean matrix, ACCESSRIGHTS formula). This is just data.
- Apply an AR rule: In Data access rights -> Rules, create an Apply rule that links the AR metric to a target (e.g. all metrics using Country).
- Until you Apply the metric via a rule, it has no effect. Build and Apply are two distinct steps.

### 3.4 Data vs Presentation

- AR secures data (cell-level); enforced everywhere (Boards, Explorer, exports, API).
- Board permissions control UI (who sees which boards/sections). They do not protect data.
- Anti-pattern: "Security by Board"-never rely only on Board permissions for sensitive data. Always enforce AR on the data.

### 3.5 Do not assume: AR semantics vs formula semantics (agents)

Access Rights do not follow the same logic as general Pigment formulas. Do not infer AR behavior from formula AND/OR/blank rules.

- In AR, BLANK = no access. A cell where the AR metric is BLANK is not accessible to the user, regardless of other rules or roles.
- Combining rules is intersection. When multiple AR rules apply to the same data, the user has access only where every rule grants access. If one rule returns BLANK (no access) for a cell and another returns TRUE (access), the result is no access for that cell-not access.
- Do not assume that "blank AND true" or "one layer grants, another is blank" yields access; it does not. In formulas, multiplicative/AND semantics can be "blank x value = blank"; in AR, the layering rule is stricter: any layer that does not grant access denies access.
- When mixing Role default access and data access rules, verify behavior from this document and product documentation rather than inferring from general formula semantics. If documentation does not explicitly cover the combination, state the gap and recommend verification instead of proposing a solution as if it will work.

---

## 4. Design Principles

### 4.1 Build at the Highest Possible Dimension

- Prefer Role x Region, User x Region, or Role x Department over User x Country or User x Employee x Month.
- Higher-level AR -> smaller metrics, better performance, easier maintenance. Use mapping metrics or dimension replacement to map down to detail.

### 4.2 Use Mapping Metrics

- Mapping metrics (e.g. Region -> Country, Role -> User via 'Users roles') translate high-level AR to detailed data.
- Keep them in a Security section. Avoid User dimension in mappings when possible; use Role and map to User at the end.

### 4.3 Prefer Roles over Individual Users

- Build AR by Role (e.g. Role x Department), then map to users via 'Users roles' (or custom mapping).
- Benefits: smaller metrics, easier governance, less duplication. Use user-level AR only for true exceptions.

### 4.4 Dimension Replacement

- Use a property (e.g. Country.Region) or a mapping metric to replace a dimension in AR (e.g. secure by Region, apply to metrics by Country via Country.Region). Reduces AR size and keeps logic at a higher level.

---

## 5. Mandatory Formula Patterns

### 5.1 Guard with IFDEFINED('Users roles', ...)

- Always wrap the ACCESSRIGHTS call in `IFDEFINED('Users roles', ACCESSRIGHTS(ReadFlag, WriteFlag))`.
- Ensures AR is computed only for users who are members of the application. Without this, AR may be evaluated for all workspace users (performance and correctness). See [performance_access_rights.md](../optimizing-pigment-performance/performance_access_rights.md).

### 5.2 Keep AR Metrics Thin

- AR metrics should only reference precomputed booleans and call ACCESSRIGHTS(ReadFlag, WriteFlag). No business logic inside the AR formula.
- Precompute conditions (e.g. Can_Read, Can_Write) in separate metrics; the AR metric only applies them.

### 5.3 No Direct User Inputs in AR Metrics

- Do not let users type into the AR metric. Use boolean input metrics (e.g. Country_Read_Allowed, Country_Write_Allowed) maintained by admins, and reference them in the AR formula. Separates data entry from formula logic and improves auditability.

---

## 6. Applying Rules: Apply vs Ignore

### 6.1 Apply Rules

- Apply rule: makes an AR metric active on a target (e.g. "Apply AR_Country to all metrics using Country").
- Defines where the AR is enforced.

### 6.2 Ignore Rules

- Ignore rule: excludes a scope from an AR metric's effect (e.g. "Ignore AR_Country on metric Total_Company_Sales").
- Use sparingly for exceptions where a broad Apply is too strict. Do not use Ignore to grant access that would otherwise be denied-fix the AR logic instead.

### 6.3 Scope of Apply Rules

- All metrics using dimension X (recommended when possible).
- Specific metric(s) for exceptions or very sensitive metrics.
- List properties (including transaction values) to secure list data.
- List item values: hides item labels in selectors/lists; does not secure metric data. Metrics that use those items need their own AR rules.

### 6.4 Enabling and Precedence

- Rules can be toggled on/off. Multiple Apply rules on the same data -> intersection (most restrictive). Ignore excludes that scope from the AR metric.

---

## 7. Decision Frameworks

### 7.1 Role-Based vs User-Based

- All users in a role share the same access? -> Role-based AR (Role x dimension, map to users via 'Users roles').
- Each user needs a unique slice? -> User-specific AR (or Role + user overrides for exceptions).

### 7.2 Granularity

- Dimension very large? -> Build security at a higher level and map down.
- Stable hierarchy/property? -> Use property replacement.
- Access varies over time? -> Consider mapping metrics (e.g. User x Quarter -> Region). Only use lowest-level AR when unavoidable.

---

## 8. Common Patterns (Summary)

| Pattern                      | When to Use                                 | Key Idea                                                                                               |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Country-level (per user) | Each user sees only certain countries       | User x Country booleans -> AR metric -> Apply to all metrics with Country                              |
| Role-driven country      | Same access by role                         | Role x Country booleans -> map to User via 'Users roles' -> AR metric -> Apply to metrics with Country |
| Region->Country          | Region managers see all countries in region | AR at Region; apply to metrics with Country using dimension replacement by Country.Region          |
| Sensitive data overlay   | One metric (e.g. Salary) restricted         | Separate AR metric (e.g. AR_Salary) applied only to that metric (and related); layer with base AR      |
| Scenario-specific        | Restrict a scenario (e.g. Board Budget)     | Use Scenarios section in Roles & Access to set Read/Write per role for that scenario               |
| List item security       | Hide list items from some users             | List item rule + property; also apply AR on metrics that use that list for data protection         |

---

## 9. Boards vs AR / Public Blocks

- Board permissions: who sees which boards/sections (UX). Do not rely on them for data security.
- AR: cell-level data; enforced everywhere. Use both: AR for data, Board permissions for presentation.
- Public Blocks: override AR-block is visible to everyone in the app. Use with care.

---

## 10. Multi-Application (Hub & Spoke)

- AR rules do not cross apps. Each app has its own AR setup.
- Pattern: Build and maintain AR logic (user-role mappings, boolean matrices) in a central Hub. In each spoke app, link that data and create thin AR metrics that reference it; then Apply rules in each app. Shared dimensions (e.g. Country, Role) should be linked or have identical codes across apps. Data links do not carry AR-re-apply AR in the receiving app.

---

## 11. Performance (Summary)

- Use BLANK never FALSE; IFDEFINED('Users roles', ...); keep AR metrics thin; broad Apply rules (e.g. all metrics with dimension X) can enable row-level filtering and are often more performant than many narrow rules.
- Avoid User x Time in AR when possible. Prefer higher-level dimensions and mapping.
- Full details: [performance_access_rights.md](../optimizing-pigment-performance/performance_access_rights.md).

---

## 12. Debugging

### 12.1 "User cannot see data they should"

Check in order: (1) Role default access, (2) IFDEFINED guard in AR formula, (3) AR metric values for that user/item (inputs/mappings), (4) Rule scope (metric/dimension covered?), (5) Ignore rules, (6) Scenario access, (7) Board permissions, (8) Public Blocks, (9) List item vs metric AR (right layer?).

### 12.2 "User can see data they shouldn't"

Check: (1) Rule actually applied and enabled? (2) Correct dimension in rule scope? (3) Block set to Public? (4) Test via impersonation and raw data (Explorer), not only Boards.

---

## 13. Governance and Naming

- Security dashboard: central place for User<->Role, AR matrices, documentation.
- Naming: e.g. AR_Country, Bool_Country_Read_Allowed, Map_User_to_Region. Clear prefixes help modelers and agents. Align with general conventions in [modeling_naming_conventions.md](../modeling-pigment-applications/modeling_naming_conventions.md).
- Refactoring: Prefer role-based AR and dimension replacement when scaling. Test with impersonation before rollout.

---

## 14. Anti-Patterns

| Anti-pattern                             | Why Bad                     | Fix                                  |
| ---------------------------------------- | --------------------------- | ------------------------------------ |
| Security by Board only                   | No data protection          | Enforce AR on data                   |
| FALSE for no access                      | Densifies, poor performance | Use BLANK                            |
| One giant AR metric                      | Unmaintainable, slow        | Split by dimension (MS12)            |
| Heavy logic inside ACCESSRIGHTS          | Slow, opaque                | Precompute booleans, thin AR         |
| User x Time in AR                        | Exploding size              | Remove time or use mapping           |
| Forgetting IFDEFINED('Users roles', ...) | Wrong users / perf          | Always wrap AR                       |
| AR metric but no Apply rule              | No effect                   | Create Apply rule for each AR metric |
| List item rule only for sensitive data   | Data still in metrics       | Apply AR on metrics too              |

---

## 15. Quick Q&A for Agents

- "Restrict by Country/Region/Department?" -> Dimension-based AR (User or Role x dimension), Apply to all metrics using that dimension. Prefer Role + 'Users roles' when many users share access.
- "Only HR sees Salary?" -> Sensitive data overlay: separate AR metric for Salary, Apply only to Salary metric (and related); others BLANK.
- "Hide Board instead of AR?" -> Use Board permissions for UX, but always secure the data with AR.
- "Multiple apps?" -> Hub for logic; link into each app; create thin AR metrics and Apply rules per app.
- "User can't see data?" -> Debug checklist section 12.1 (role, IFDEFINED, AR values, rule scope, scenario, board, public, list vs metric).
- "User sees too much?" -> Rule applied? Correct scope? Block Public? Impersonate to confirm.

---

## 16. Configuration Checklist

1. Gather requirements (what to restrict, by which dimension, which roles/users).
2. Choose highest possible grain (Role/dimension); decide Role vs User.
3. Prepare mappings/properties (e.g. Country.Region, 'Users roles').
4. Create boolean inputs (Read/Write per dimension); keep in Security section.
5. Build AR metrics (ACCESSRIGHTS(Read, Write), guarded by IFDEFINED('Users roles', ...)); keep formulas thin.
6. Apply rules (Data access rights -> Rules): Apply each AR metric to the right scope (e.g. all metrics with dimension X).
7. Add Board permissions where needed (in addition to AR).
8. Test with impersonation (different roles); check edge cases and write access.
9. Document and maintain (Security dashboard, naming, review when adding new metrics/lists).

---

## See Also

- [functions_security.md](../writing-pigment-formulas/functions_security.md) - ACCESSRIGHTS, RESETACCESSRIGHTS syntax
- [performance_access_rights.md](../optimizing-pigment-performance/performance_access_rights.md) - AR performance, IFDEFINED(User)
- [modeling_principles.md](../modeling-pigment-applications/modeling_principles.md) - MS12, MP10, Roles, security folder
