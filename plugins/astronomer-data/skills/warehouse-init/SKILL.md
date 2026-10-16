---
name: warehouse-init
description: Initialize warehouse schema discovery. Generates .astro/warehouse.md with all table metadata for instant lookups. Run once per project, refresh when schema changes. Use when user says "/astronomer-data:warehouse-init" or asks to set up data discovery.
---

## Cline Safety

- Use local code inspection and bundled references without an approval round. Ask before live Airflow MCP reads, Astro or Airflow CLI commands, warehouse queries, package installs, Docker or Astro dev commands, network calls, or reading task logs, variables, or connections that may contain sensitive data.
- Do not trigger DAGs, clear or retry tasks, pause or unpause DAGs, create or delete DAG runs, change deployments, deploy code, create tokens, write warehouse cache files, edit project guidance files, install packages, or mutate Airflow, Astro, or warehouse state unless the user explicitly approves the exact action and target environment.
- Treat Airflow connection details, variables, task logs, deployment metadata, warehouse credentials, query results, table contents, and business metrics as sensitive. Minimize data returned to the model, apply limits and filters, redact secrets, and never print credentials.


# Initialize Warehouse Schema

Generate a comprehensive, user-editable schema reference file for the data warehouse.

Scripts: `../analyzing-data/scripts/` - All CLI commands below are relative to the `analyzing-data` skill's directory. Before running any `scripts/cli.py` command, `cd` to `../analyzing-data/` relative to this file.

## What This Does

1. Discovers all databases, schemas, tables, and columns from the warehouse
2. Enriches with codebase context (dbt models, gusty SQL, schema docs)
3. Records row counts and identifies large tables
4. Generates `.astro/warehouse.md` - a version-controllable, team-shareable reference
5. Enables instant concept-to-table lookups without warehouse queries

## Process

### Step 1: Read Warehouse Configuration

```bash
uv run scripts/cli.py warehouse list
```

Get the list of configured warehouses and databases to discover. Do not print the raw `~/.astro/agents/warehouse.yml` file into the transcript because it may contain passwords, tokens, account identifiers, private key paths, or other sensitive values. If the CLI output is not enough, ask before reading the file and redact credential fields before showing content.

### Step 2: Search Codebase for Context

Find business context in code before querying warehouse metadata. Use Cline's normal file search/read tools, or background agents if the current Cline surface exposes them and the user has approved that workflow.

Search for:

1. dbt models: recursive `.yml` files under `/models/`, plus `/schema.yml`
   - Extract table descriptions, column descriptions
   - Note primary keys and tests
2. Gusty/declarative SQL: recursive `.sql` files under `/dags/` with YAML frontmatter
   - Parse frontmatter for: description, primary_key, tests
   - Note schema mappings
3. `AGENTS.md`, `.cline/`, or other project guidance files with data layer documentation

Return a mapping of:

```text
table_name -> {description, primary_key, important_columns, layer}
```

### Step 3: Warehouse Discovery

Discover metadata one database at a time, or in parallel only if Cline exposes approved background-agent execution in the current surface. Ask before running warehouse queries.

For each database in `configured_databases`, use the CLI to run SQL queries:

```bash
# Scripts are relative to ../analyzing-data/
uv run scripts/cli.py exec "df = run_sql('...')"
uv run scripts/cli.py exec "print(df)"
```

1. Query schemas:

```sql
SELECT SCHEMA_NAME FROM {DATABASE}.INFORMATION_SCHEMA.SCHEMATA
```

2. Query tables with row counts:

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, ROW_COUNT, COMMENT
FROM {DATABASE}.INFORMATION_SCHEMA.TABLES
ORDER BY TABLE_SCHEMA, TABLE_NAME
```

3. For important schemas (`MODEL_*`, `METRICS_*`, `MART_*`), query columns:

```sql
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COMMENT
FROM {DATABASE}.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'X'
```

Return a structured summary:

- Database name
- List of schemas with table counts
- For each table: name, row_count, key columns
- Flag any tables with >100M rows as "large"

### Step 4: Discover Categorical Value Families

For key categorical columns (like OPERATOR, STATUS, TYPE, FEATURE), discover value families:

```bash
uv run scripts/cli.py exec "df = run_sql('''
SELECT DISTINCT column_name, COUNT(*) as occurrences
FROM table
WHERE column_name IS NOT NULL
GROUP BY column_name
ORDER BY occurrences DESC
LIMIT 50
''')"
uv run scripts/cli.py exec "print(df)"
```

Group related values into families by common prefix/suffix (e.g., `Export*` for ExportCSV, ExportJSON, ExportParquet).

### Step 5: Merge Results

Combine warehouse metadata + codebase context:

1. Quick Reference table - concept → table mappings (pre-populated from code if found)
2. Categorical Columns - value families for key filter columns
3. Database sections - one per database
4. Schema subsections - tables grouped by schema
5. Table details - columns, row counts, descriptions from code, warnings

### Step 6: Generate warehouse.md

Write the file to:
- `.astro/warehouse.md` (default - project-specific, version-controllable)
- `~/.astro/agents/warehouse.md` (if `--global` flag)

## Output Format

```markdown
# Warehouse Schema

> Generated by `/astronomer-data:warehouse-init` on {DATE}. Edit freely to add business context.

## Quick Reference

| Concept | Table | Key Column | Date Column |
|---------|-------|------------|-------------|
| customers | HQ.MODEL_ASTRO.ORGANIZATIONS | ORG_ID | CREATED_AT |
<!-- Add your concept mappings here -->

## Categorical Columns

When filtering on these columns, explore value families first (values often have variants):

| Table | Column | Value Families |
|-------|--------|----------------|
| {TABLE} | {COLUMN} | `{PREFIX}*` ({VALUE1}, {VALUE2}, ...) |
<!-- Populated by /astronomer-data:warehouse-init from actual warehouse data -->

## Data Layer Hierarchy

Query downstream first: `reporting` > `mart_*` > `metric_*` > `model_*` > `IN_*`

| Layer | Prefix | Purpose |
|-------|--------|---------|
| Reporting | `reporting.*` | Dashboard-optimized |
| Mart | `mart_*` | Combined analytics |
| Metric | `metric_*` | KPIs at various grains |
| Model | `model_*` | Cleansed sources of truth |
| Raw | `IN_*` | Source data - avoid |

## {DATABASE} Database

### {SCHEMA} Schema

#### {TABLE_NAME}
{DESCRIPTION from code if found}

| Column | Type | Description |
|--------|------|-------------|
| COL1 | VARCHAR | {from code or inferred} |

- Rows: {ROW_COUNT}
- Key column: {PRIMARY_KEY from code or inferred}
{IF ROW_COUNT > 100M: - ⚠️ WARNING: Large table - always add date filters}

## Relationships

```
{Inferred relationships based on column names like *_ID}
```
```

## Command Options

| Option | Effect |
|--------|--------|
| `/astronomer-data:warehouse-init` | Generate .astro/warehouse.md |
| `/astronomer-data:warehouse-init --refresh` | Regenerate, preserving user edits |
| `/astronomer-data:warehouse-init --database HQ` | Only discover specific database |
| `/astronomer-data:warehouse-init --global` | Write to ~/.astro/agents/ instead |

### Step 7: Pre-populate Cache

After generating warehouse.md, populate the concept cache:

```bash
# Scripts are relative to ../analyzing-data/
uv run scripts/cli.py concept import -p .astro/warehouse.md
uv run scripts/cli.py concept learn customers HQ.MART_CUST.CURRENT_ASTRO_CUSTS -k ACCT_ID
```

### Step 8: Offer Project Guidance Integration (Ask User)

Ask the user:

> Would you like to add the Quick Reference table to your project guidance file?
>
> This ensures the schema mappings are always in context for data queries, improving accuracy from ~25% to ~100% for complex queries.
>
> Options:
> 1. Yes, add to AGENTS.md or .cline guidance - Append Quick Reference section
> 2. No, skip - Use warehouse.md and cache only

If user chooses Yes:

1. Ask which project guidance file to update, preferring `AGENTS.md` if it exists.
2. If exists, append the Quick Reference section (avoid duplicates)
3. If not exists, ask before creating a new guidance file

Quick Reference section to add:

```markdown
## Data Warehouse Quick Reference

When querying the warehouse, use these table mappings:

| Concept | Table | Key Column | Date Column |
|---------|-------|------------|-------------|
{rows from warehouse.md Quick Reference}

Large tables (always filter by date): {list tables with >100M rows}

> Auto-generated by `/astronomer-data:warehouse-init`. Run `/astronomer-data:warehouse-init --refresh` to update.
```
If yes: Append the Quick Reference section to the user-approved project guidance file.

## After Generation

Tell the user:

```
Generated .astro/warehouse.md

Summary:
  - {N} databases, {N} schemas, {N} tables
  - {N} tables enriched with code descriptions
  - {N} concepts cached for instant lookup

Next steps:
  1. Edit .astro/warehouse.md to add business context
  2. Commit to version control
  3. Run /astronomer-data:warehouse-init --refresh when schema changes
```

## Refresh Behavior

When `--refresh` is specified:

1. Read existing warehouse.md
2. Preserve all HTML comments (`<!-- ... -->`)
3. Preserve Quick Reference table entries (user-added)
4. Preserve user-added descriptions
5. Update row counts and add new tables
6. Mark removed tables with `<!-- REMOVED -->` comment

## Cache Staleness & Schema Drift

The runtime cache has a 90-day TTL by default. After 90 days, cached entries expire and will be re-discovered on next use.

### When to Refresh

Run `/astronomer-data:warehouse-init --refresh` when:
- Schema changes: Tables added, renamed, or removed
- Column changes: New columns added or types changed
- After deployments: If your data pipeline deploys schema migrations
- Weekly: As a good practice, even if no known changes

### Signs of Stale Cache

Watch for these indicators:
- Queries fail with "table not found" errors
- Results seem wrong or outdated
- New tables aren't being discovered

### Manual Cache Reset

If you suspect cache issues:

```bash
# Scripts are relative to ../analyzing-data/
uv run scripts/cli.py cache status
uv run scripts/cli.py cache clear --stale-only
uv run scripts/cli.py cache clear
```

## Codebase Patterns Recognized

| Pattern | Source | What We Extract |
|---------|--------|-----------------|
| `/models//*.yml` | dbt | table/column descriptions, tests |
| `/dags//*.sql` | gusty | YAML frontmatter (description, primary_key) |
| `AGENTS.md`, `.cline/` | docs | data layer hierarchy, conventions |
| `/docs//*.md` | docs | business context |

## Example Session

```
User: /astronomer-data:warehouse-init

Agent:
→ Reading warehouse configuration...
→ Found 1 warehouse with databases: HQ, PRODUCT

-> Searching codebase for data documentation...
  Found: AGENTS.md with data layer hierarchy
  Found: 45 SQL files with YAML frontmatter in dags/declarative/

-> Starting warehouse discovery...
  [Database: HQ] Discovering schemas...
  [Database: PRODUCT] Discovering schemas...

-> HQ: Found 29 schemas, 401 tables
-> PRODUCT: Found 1 schema, 0 tables

-> Merging warehouse metadata with code context...
  Enriched 45 tables with descriptions from code

-> Generated .astro/warehouse.md

Summary:
  - 2 databases
  - 30 schemas
  - 401 tables
  - 45 tables enriched with code descriptions
  - 8 large tables flagged (>100M rows)

Next steps:
  1. Review .astro/warehouse.md
  2. Add concept mappings to Quick Reference
  3. Commit to version control
  4. Run /astronomer-data:warehouse-init --refresh when schema changes
```
