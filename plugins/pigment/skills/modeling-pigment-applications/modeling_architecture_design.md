# Pigment Architecture Design

Purpose: Design a complete Pigment architecture by systematically gathering requirements and making architectural decisions across five pillars. Architecture serves as a high-level blueprint for builders and developers: it defines what needs to be built without prescribing every detail.

Core principle: Architecture precedes building. Dimensional structure is the foundation that defines UX, performance, calculations, and data handling. Getting it wrong requires rebuilding everything.

---

## What an Architecture Defines

An architecture in Pigment is a high-level blueprint that follows Pigment best practices and aligns with how the Pigment engine works. It must define:

| Component                 | Description                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Dimensional structure | Which dimensions are in metric structures; granularity; use of properties vs mapped dimensions |
| Data flows            | How data moves through the system                                                              |
| Applications          | Which applications to create and how they relate (hub vs spokes)                               |
| Functionalities       | Use cases and how data flows within each                                                       |
| End user activity     | Which functionality end users interact with, especially input data                             |

The dimensional structure of the matrix is the most critical architectural decision. It must be determined before starting an application because it defines UX, performance, calculations, and data handling.

---

## Architectural Process

Work through each pillar systematically: gather requirements and make decisions before proceeding to the next. Do not skip pillars.

---

## Pillar 1: Dimensional Structure

Objective: Define which dimensions belong in metric structures before building begins.

For detailed guidance on dimensions, properties, and hierarchies, see [modeling_dimensions_and_hierarchies.md](./modeling_dimensions_and_hierarchies.md) and [modeling_fundamentals.md](./modeling_fundamentals.md).

### Key Decisions

- Which dimensions are required in the structure?
- What is the granularity of each dimension (month vs quarter, country vs region, etc.)?
- Can any dimensions be replaced with properties or mapped dimensions?

### Standard Dimensions to Consider

| Dimension             | Typical use                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version           | Present on almost every metric (Actuals, Budget, Forecast, etc.)                                                                                            |
| Time              | Managed by Pigment Calendar native feature. Month is most common; week/day in some cases; quarter/year are usually properties of month, aggregated in views |
| Organization      | Cost center, department, or team level; in finance, often a mix of cost center and department                                                               |
| Chart of accounts | For finance use cases (cost types)                                                                                                                          |
| Other             | Country, product, employee, or use-case-specific dimensions                                                                                                 |

### Design Rules

- Minimize dimensions - Rarely more than 5 per metric. If more than 5, challenge whether dimensions can be inferred from properties or use mapped-dimension features.
- Use properties for aggregations - What you report on is not necessarily what goes in the structure. Example: plan at month level -> only month in structure; quarter and year are properties of month, aggregated in views. Example: country in structure, region as property of country.
- Use mapped dimensions when mappings change over time - e.g. employee moving cost centers: create a metric by Employee x Month x Version with type Dimension (Cost Center); use this in views to display data in the correct cost center over time.
- Access rights drive structure - If access is driven at country level, country must be in the structure.
- Challenge any structure with more than 5 dimensions.

### Questions to Ask When Information Is Missing

- At what level of granularity will users input data for each business dimension?
- At what level of granularity will calculations occur?
- Do dimension item mappings change over time (e.g. employee moving cost centers)?
- What level drives user access rights?
- Are there organizational hierarchies with varying granularity needs (some departments drive access at lower levels)?

---

## Pillar 2: End User UX

Objective: Let desired user experience drive architectural decisions. Pigment is highly flexible; architecture choices must be guided by the desired end user experience.

### Input and Planning UX

- On which dimensions do users need to input?
- How should dimensions be organized in the view (columns vs rows)?
- Do users need to see parent dimensions while inputting?
- Do users need simultaneous widgets with aligned dimensions?
- Does data need pre-population?

These requirements directly influence which dimensions go in the metric structure and how tables are organized.

### Reporting and Display

- What are the key final reports (e.g. P&L)?
- What variations are shown (budget vs forecast vs actuals)?
- What KPIs and calculations are required?
- Can calculations use calculated items and "show value as" features?

Best practice: Do not create aggregated metrics when not necessary.
Avoid creating aggregated metrics when view capabilities can achieve the same result. Views offer powerful aggregation, grouping, and calculation features (grouping by properties, Show Value As, Calculated Items) that eliminate the need for many "helper" or "reporting" metrics.
Why this matters:

- Reduces model complexity - fewer metrics = easier maintenance
- Improves performance - fewer calculations to compute and store
- Better separation of concerns - model focuses on core logic; views handle presentation and ad-hoc analysis
- More flexible - users can pivot/group/calculate in views without rebuilding the model

### When to Use Views Instead of Creating Metrics

Anti-pattern (unnecessary metric):

```
Metric: Revenue (by Country)
Metric: Revenue by Region  <-- UNNECESSARY
```

Best practice (use view grouping):

- Keep only `Revenue (by Country)`
- In the view, group by `Country.Region` property (either in Rows, Columns or Pages)
- The view will automatically aggregate Revenue to the Region level

Rule: If a dimension has a parent hierarchy or property (e.g., Country -> Region, Employee -> Department), do not create separate metrics for parent levels. Use view grouping or pivoting.

Best practice: Maximize use of calculated items and show value as:

- Use calculated items for calculations between items or modalities of a dimension (e.g., FY 2027 vs FY 2026, Actual vs Forecast) in report views.
- Use show value as for display transformations: temporal comparisons, cumulative series, offsets, differences from another item or metric, and derived presentations of a single metric when the view supports it (e.g., YTD). Avoid extra metrics when the display is sufficient and not needed downstream.

### Workflow and Access Rights

- If access rights need to change between workflow steps, separate logic and input into different metrics.

### Questions to Ask When Information Is Missing

- Can you provide wireframes or mockups of the desired input screens?
- Can you share examples of current reports before Pigment?
- What variations need to appear as columns in reports?
- What KPIs or ratios are required, and how are they calculated?
- Do certain calculations require separate metrics vs calculated items?
- What workflow steps exist, and do access rights need to change between steps?

---

## Pillar 3: Data and Its Cycle

Objective: Understand data sources, granularity, and transformation requirements.

### Data Sources and Where They Load

| Data type                        | Typical load target                            | Examples                                             |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Transactional data           | Transaction lists                              | GL from ERPs, HR roster, CRM (e.g. Salesforce)       |
| Metadata                     | Dimensions (loaded separately; requires codes) | Products, cost centers, chart of accounts            |
| Historical outputs / budgets | Direct to metrics                              | When detail level doesn't justify a transaction list |

Exception: Transactional data can be loaded into a dimension list when that list is useful in the structure; this is rare.

### Data Granularity

Data granularity is critical. When available data granularity does not match planning/input granularity, the architecture must accommodate through aggregation, allocation, or programmatic generation. If data cannot support requirements, challenge those requirements.

### Design Rules

- Minimum transformation in Pigment - Pigment is not an ETL tool; cleaning and transformation should be done outside Pigment before loading.
- Load only what is required - Do not add properties or blocks "just in case." Unused data creates bloated, confusing applications.
- Separate metadata from transactional loading - Metadata requires codes and verification; it typically comes from a different source than transactional data. Loading metadata from transactional data often yields only names without robust structure.

### Questions to Ask When Information Is Missing

- What are all data sources (ERPs, HR, CRM, etc.)?
- At what granularity is data available for each dimension?
- At what granularity do users need to plan?
- What is the gap between available data granularity and planning requirements?
- Where will data transformation occur (before or within Pigment)?
- What metadata is available for each dimension?
- What historical data needs to be loaded, and is it transactional or already aggregated?

---

## Pillar 4: Governance and Security

Objective: Determine application structure based on ownership, access, and sensitivity.

For detailed guidance on application structure, hub pattern, and folder organization, see [modeling_principles.md](./modeling_principles.md). For Access Rights design, see `skill:securing-pigment-applications` ([securing_access_rights.md](../securing-pigment-applications/securing_access_rights.md)).

### Key Decisions

- How many applications are needed?
- What belongs in the hub vs specific applications?
- Where do shared dimensions reside?

### Application Separation Criteria

| Criterion                                      | Action                                          |
| ---------------------------------------------- | ----------------------------------------------- |
| Different teams managing different use cases   | Separate applications                           |
| Sensitive data (e.g. individual employee data) | Independent application (strict access control) |
| Different planning cycles                      | Potentially separate applications               |

### Hub and Dimension Placement

- Every workspace needs a hub application, even when starting with a single use case. The hub contains dimensions shared across applications and simplifies adding new connected applications.
- Dimensions used by multiple applications -> place in hub, with one exception: when dimension items are created automatically or manually by end users or business logic within a specific application, that dimension should reside in that application and be shared outward.
- Transactional data typically loads into the application where it is used; if it must be accessed by users across multiple applications, it can be placed in the hub.

### User Experience

- Users cannot natively navigate between applications; manual links on boards are required. Architect each application to provide a complete journey for a specific user type, minimizing cross-application navigation.

### Common FP&A Pattern

| Application            | Role                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Hub                | Shared dimensions and resources                                                                                                  |
| Workforce planning | Independent (sensitive, individual-level data)                                                                                   |
| Revenue planning   | Separate (different team/cycle)                                                                                                  |
| FP&A application   | Actuals, P&L, plan vs actuals, light planning (e.g. OPEX); pulls planning data from workforce and optionally other planning apps |

### Questions to Ask When Information Is Missing

- Which teams will manage which use cases?
- What data is sensitive and requires restricted access?
- Do any use cases involve individual-level data?
- Which dimensions are shared across multiple use cases?
- Are any dimensions created automatically by business logic within a specific use case?
- Which users need access to which data?
- Do users need to navigate between applications?

---

## Pillar 5: Planning Cycle

Objective: Design version management and historical plan protection. The planning cycle (version/scenario management) is why customers adopt EPM tools: to plan budgets, reforecasts, and compare against actuals.

For detailed guidance on scenarios vs version dimensions, see `skill:planning-cycles-pigment-applications`.

### Version Dimension

- Create a version dimension (e.g. Actuals, Budget, Forecast). It should exist in the structure of almost every metric in the application. Critical for FP&A; less so for supply chain or SPM.

### Dual Challenge: Completed Versions

When a planning version is complete:

1. Numbers must be fixed as an unchangeable reference.
2. Numbers must remain available for reuse in new planning cycles.

### Snapshots vs Live Versions

| Approach          | Use                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Snapshots     | Fixed copies; numbers never change. Accessed via data slices. Reports must use data slices to leverage snapshots. Snapshots cannot serve as the basis for new planning runs. |
| Live versions | Maintain a live version of historical plans (alongside snapshots) to enable replanning from historical data.                                                                 |

Constraint: Avoid too many live versions; max ~10 recommended (actual limit depends on volume and other factors). Pigment is a live calculation engine.

### Protecting Historical Plans

Build logic so that changes to numbers, formulas, or data do not retroactively impact historical plans:

- Dated loads - When loading employee rosters or similar data, date the loads so switchover logic prevents new loads from impacting historical budgets.
- Historical data reloads - If reloading past-period data that was used to generate historical plans, implement logic to isolate these changes (e.g. effective dating of transactions, copies/imports from transaction lists or metrics).

### Version Initialization

Determine how new versions will be initialized:

- Import from another version
- Bulk copy from an existing version
- Clone all data (Clone data 2)
- Re-import from a scenario
- Start from scratch

### Report-Driven Design

- Examine the customer's final reports, especially variations/versions displayed as columns.
- Determine whether the standard combination of data slices + calculated items with versions and snapshots suffices, or if a custom solution is required.

### Questions to Ask When Information Is Missing

- What versions/scenarios are needed?
- How many live versions will exist concurrently (max ~10 recommended)?
- How should completed plans be protected from changes?
- Do users need to replan based on historical budgets?
- When loading new data, should it impact historical plans?
- How will new planning cycles be initialized?
- Do transaction lists need effective dating?

---

## Validation Before Finalizing

Before locking the architecture, validate:

- [ ] Can the dimensional structure support all required inputs and calculations?
- [ ] Does the structure enable the desired UX?
- [ ] Does data granularity match structural requirements?
- [ ] Are governance and security requirements met?
- [ ] Is version management adequate for the planning cycle?
- [ ] Are there fewer than ~10 live versions?
- [ ] Have all dimensions been challenged for necessity?

---

## See Also

- [./modeling_fundamentals.md](./modeling_fundamentals.md) - Core concepts (dimensions, properties, metrics vs transaction lists)
- [./modeling_dimensions_and_hierarchies.md](./modeling_dimensions_and_hierarchies.md) - Hierarchies, dimension vs property
- [./modeling_principles.md](./modeling_principles.md) - Folder structure, hub, Library
- [./modeling_naming_conventions.md](./modeling_naming_conventions.md) - Naming conventions
- `skill:planning-cycles-pigment-applications` - Scenarios vs version dimension, planning cycles
- [./modeling_time_and_calendars.md](./modeling_time_and_calendars.md) - Time dimensions and calendars
- `skill:securing-pigment-applications` - Access rights design and governance
