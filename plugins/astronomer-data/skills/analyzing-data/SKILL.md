---
name: analyzing-data
description: Queries data warehouse and answers business questions about data. Handles questions requiring database/warehouse queries including "who uses X", "how many Y", "show me Z", "find customers", "what is the count", data lookups, metrics, trends, or SQL analysis.
---

## Cline Safety

- Use local code inspection and bundled references without an approval round. Ask before live Airflow MCP reads, Astro or Airflow CLI commands, warehouse queries, package installs, Docker or Astro dev commands, network calls, or reading task logs, variables, or connections that may contain sensitive data.
- Do not trigger DAGs, clear or retry tasks, pause or unpause DAGs, create or delete DAG runs, change deployments, deploy code, create tokens, write warehouse cache files, edit project guidance files, install packages, or mutate Airflow, Astro, or warehouse state unless the user explicitly approves the exact action and target environment.
- Treat Airflow connection details, variables, task logs, deployment metadata, warehouse credentials, query results, table contents, and business metrics as sensitive. Minimize data returned to the model, apply limits and filters, redact secrets, and never print credentials.


# Data Analysis

Answer business questions by querying the data warehouse. The kernel auto-starts on first `exec` call.

All CLI commands below are relative to this skill's directory. Before running any `scripts/cli.py` command, `cd` to the directory containing this file.

## Workflow

1. Pattern lookup - Check for a cached query strategy:
   ```bash
   uv run scripts/cli.py pattern lookup "<user's question>"
   ```
   If a pattern exists, follow its strategy. Record the outcome after executing:
   ```bash
   uv run scripts/cli.py pattern record <name> --success  # or --failure
   ```

2. Concept lookup - Find known table mappings:
   ```bash
   uv run scripts/cli.py concept lookup <concept>
   ```

3. Table discovery - If cache misses, search the codebase (recursive SQL file search for the concept) or query `INFORMATION_SCHEMA`. See [reference/discovery-warehouse.md](reference/discovery-warehouse.md).

4. Execute query:
   ```bash
   uv run scripts/cli.py exec "df = run_sql('SELECT ...')"
   uv run scripts/cli.py exec "print(df)"
   ```

5. Cache learnings - Ask before writing concept or pattern cache entries:
   ```bash
   # Cache concept -> table mapping
   uv run scripts/cli.py concept learn <concept> <TABLE> -k <KEY_COL>
   # Cache query strategy (if discovery was needed)
   uv run scripts/cli.py pattern learn <name> -q "question" -s "step" -t "TABLE" -g "gotcha"
   ```

6. Present findings to user.

## Kernel Functions

| Function | Returns |
|----------|---------|
| `run_sql(query, limit=100)` | Polars DataFrame |
| `run_sql_pandas(query, limit=100)` | Pandas DataFrame |

`pl` (Polars) and `pd` (Pandas) are pre-imported.

## CLI Reference

### Kernel

```bash
uv run scripts/cli.py warehouse list      # List warehouses
uv run scripts/cli.py start [-w name]     # Start kernel (with optional warehouse)
uv run scripts/cli.py exec "..."          # Execute Python code
uv run scripts/cli.py status              # Kernel status
uv run scripts/cli.py restart             # Restart kernel
uv run scripts/cli.py stop                # Stop kernel
uv run scripts/cli.py install <pkg>       # Install package
```

### Concept Cache

```bash
uv run scripts/cli.py concept lookup <name>                     # Look up
uv run scripts/cli.py concept learn <name> <TABLE> -k <KEY_COL> # Learn
uv run scripts/cli.py concept list                               # List all
uv run scripts/cli.py concept import -p /path/to/warehouse.md   # Bulk import
```

### Pattern Cache

```bash
uv run scripts/cli.py pattern lookup "question"                                      # Look up
uv run scripts/cli.py pattern learn <name> -q "..." -s "..." -t "TABLE" -g "gotcha"  # Learn
uv run scripts/cli.py pattern record <name> --success                                # Record outcome
uv run scripts/cli.py pattern list                                                   # List all
uv run scripts/cli.py pattern delete <name>                                          # Delete
```

### Table Schema Cache

```bash
uv run scripts/cli.py table lookup <TABLE>            # Look up schema
uv run scripts/cli.py table cache <TABLE> -c '[...]'  # Cache schema
uv run scripts/cli.py table list                       # List cached
uv run scripts/cli.py table delete <TABLE>             # Delete
```

### Cache Management

```bash
uv run scripts/cli.py cache status                # Stats
uv run scripts/cli.py cache clear [--stale-only]  # Clear
```

The cache is stored under the configured Astronomer agents directory. Treat cached concepts, table names, and query strategies as project-sensitive data.

## References

- [reference/discovery-warehouse.md](reference/discovery-warehouse.md) - Large table handling, warehouse exploration, INFORMATION_SCHEMA queries
- [reference/common-patterns.md](reference/common-patterns.md) - SQL templates for trends, comparisons, top-N, distributions, cohorts
