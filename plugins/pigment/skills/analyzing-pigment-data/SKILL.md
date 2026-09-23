---
name: analyzing-pigment-data
description: Always use this skill when querying, exploring, or analyzing existing data in a Pigment workspace. Covers the analysis workflow, query formulation, data concepts, analysis patterns, ambiguity handling, and result interpretation.
metadata:
  skill_path: /analyzing-pigment-data/SKILL.md
  base_directory: /analyzing-pigment-data
  includes:
    - "*.md"
---

# How to Use This Skill

This `SKILL.md` is self-contained. Read it fully before performing any data analysis.

# Analyzing Pigment Data

This skill teaches you how to answer analytical questions using data that already exists in a Pigment workspace. It covers how to discover what data is available, how to formulate effective queries, how to interpret results, and how to structure multi-step analyses.

This skill is for read-only exploration and analysis. If the user wants to create, modify, or configure application objects (metrics, dimensions, formulas, boards), use the relevant modeling skills instead.

---

## When to Use This Skill

- Answer data questions - "What were Q4 sales by region?"
- Explore available data - "What metrics exist in this app?"
- Understand metric structure - "What dimensions does Revenue have?"
- Compare values - "Compare actual vs budget for EMEA"
- Find top contributors - "Which products drive the most revenue?"
- Analyze trends - "Show me headcount over the last 12 months"
- Cross-metric analysis - "How do Sales and Costs compare by department?"

---

## Core Concepts

Pigment organizes data in a multidimensional model:

- Metrics - Named data blocks containing values (numbers, text, dates, booleans). A metric is the primary unit of analysis.
- Dimensions - The axes of a metric. A metric dimensioned by `Country` and `Month` stores one value per country per month.
- Items - The members of a dimension. `France`, `Germany`, `US` are items of the `Country` dimension.
- Properties - Attributes on dimension items. The `Country` dimension may have a `Region` property grouping countries into `EMEA`, `AMER`, `APAC`. Property dimensions (e.g. `Country > Region`) can be used as regular dimensions for breakdowns and filters.

When analyzing data, you query a metric and optionally:
- Break down (pivot) by one or more dimensions to see values at a finer grain
- Filter by dimension items to narrow the scope (e.g. only `Country` = `France`, `Germany`)

---

## Analysis Workflow

Follow this sequence for every analytical question:

### Step 1: Identify the application

Use `get_applications` to list available applications and obtain application IDs.

Never fabricate IDs - always retrieve them from tool responses.

### Step 2: Discover available metrics

Use `get_ai_metrics` to list AI-enabled metrics in the application. Only metrics with AI Search enabled can be queried via natural language.

If a metric the user mentions is not in the list, possible reasons:
- AI data access is not enabled on that metric
- The user does not have access to it
- The metric does not exist

In these cases, inform the user and suggest they check their Pigment workspace settings.

### Step 3: Understand metric structure

Use `get_metric_description` to inspect a metric before querying it. This reveals:
- Which dimensions the metric has (and therefore which breakdowns and filters are valid)
- The data type (number, text, date, boolean, dimension)
- Available scenarios (if any)
- Dimension items and properties

Always call this before your first query on a metric. It prevents invalid queries and helps you formulate precise requests.

### Step 4: Query the data

Use `query_data` to retrieve data using natural language. Formulate your query by specifying:
- The metric to analyze
- Optional breakdowns (dimensions to pivot by)
- Optional filters (dimension items to include or exclude)

### Step 5: Interpret and present results

After receiving data:
- Highlight the key findings concisely
- Compute derived values yourself if needed (ratios, percentages, rankings)
- Suggest follow-up analyses when patterns warrant deeper investigation

---

## Query Formulation Rules

### One metric per query

If the user asks about multiple metrics (e.g. "Compare Sales and Costs"), query each metric separately and combine the results yourself. Never request derived expressions like "Sales / Costs" in a single query.

### No value-based filtering at query time

The query tool cannot filter by metric values (e.g. "top 10", "greater than 1M", "largest change"). Instead:
1. Fetch the raw data with appropriate dimensional filters
2. Apply sorting, ranking, or thresholds yourself after receiving the results

Item-based filtering is supported (e.g. filter to `Country` = `France`).

### Manage data volume

Queries have limits on the number of values returned. If a query exceeds the limit:
1. Narrow item filters - restrict to fewer dimension items
2. Reduce breakdowns - use fewer pivot dimensions (the tool returns aggregated values for omitted dimensions)
3. Inform the user - if scope cannot be reduced while still answering the question, explain the limitation and ask how to refine

### Text metrics have special rules

Text data does not support numeric aggregation:
- All base dimensions must be included as breakdowns or single-item filters
- Filters on text metrics can only use one item per dimension

Use `get_metric_description` to check which dimensions are required.

---

## Analysis Patterns

### Top contribution analysis

Find the main contributors to a metric value.

Example: "Find the top 5 countries contributing to Sales"
- Query `Sales` broken down by `Country`
- Sort the results by value and take the top 5
- Optionally drill deeper: for each top country, break down by another dimension

### Variance analysis (compare two items)

Compare two items of the same dimension within a metric.

Example: "Compare Sales in FY24 vs FY25 by Product"
- Query `Sales` broken down by `Product`, filtered to `Year` = `FY24`
- Query `Sales` broken down by `Product`, filtered to `Year` = `FY25`
- Compute the difference and highlight significant variances

Always specify: the metric, the dimension to compare on, the two items, and any breakdown dimensions.

### Cross-metric comparison

Compare two different metrics along shared dimensions.

Example: "Compare Sales and Costs by Department"
- Query `Sales` broken down by `Department`
- Query `Costs` broken down by `Department`
- Present side-by-side and compute derived values (e.g. margin)

Breakdowns must only use dimensions shared by both metrics.

### Time series analysis

Analyze how a metric evolves over time.

Example: "Show Revenue trend by Month for the last year"
- Query `Revenue` broken down by `Month` (with appropriate time filters)
- Identify trends, shifts, seasonality, or outliers

Always specify: the metric, the time dimension, and the time range.

---

## Multi-Step Analysis

Complex questions often require a discovery phase followed by deeper analysis. Break these into explicit steps.

Example: "Analyze Sales performance - find the top regions and drill into their best products"

1. Step 1 (discovery): Query `Sales` broken down by `Region` -> identify top 3 regions
2. Step 2 (deep dive): For each top region, query `Sales` broken down by `Product`, filtered to that region -> identify top products
3. Step 3 (synthesis): Combine findings into a coherent narrative

Each step should be self-contained: specify the metric, breakdowns, and filters explicitly. Do not rely on implicit context from previous steps when formulating queries.

---

## Handling Ambiguity

User requests are often imprecise. Follow these rules in priority order:

1. Never assume - if more than one valid interpretation exists, ask the user to clarify
2. Use context - infer meaning from recently mentioned metrics or dimensions
3. Use exploration tools - call `get_ai_metrics` or `get_metric_description` to identify likely matches
4. Ask rather than guess - when in doubt, request clarification. Contextualize your question so the user understands what is ambiguous.

### Common ambiguity sources

| Ambiguity | Example | How to resolve |
|-----------|---------|----------------|
| Metric name | "Show me revenue" (multiple revenue metrics exist) | List the candidates and ask which one |
| Time range | "Last quarter" (fiscal vs calendar? which year?) | Ask for clarification or check available time dimension items |
| Comparison target | "Compare against plan" (Budget? Forecast? Target?) | List available scenario/version items |
| Breakdown level | "By region" (geographic region? business region?) | Check available dimensions and ask if ambiguous |
| Scope | "Sales performance" (all products? all countries?) | Ask if they want the full scope or a specific subset |

Querying tools is expensive. Do not call them until you are confident the user's intent is clear.

---

## Presenting Results

- Be concise - lead with key findings, not raw data
- Match depth to the question - simple questions get short answers; complex analyses get structured responses
- Highlight what matters - surface the most significant numbers, changes, or outliers
- Suggest next steps - when findings reveal something interesting, propose follow-up analyses
- Be transparent - explain what you queried and any limitations in the data

---

## Cross-References

- Understanding application structure: modeling-pigment-applications skill
- Building dashboards from analysis results: designing-pigment-boards skill
- Writing formulas for computed metrics: writing-pigment-formulas skill

