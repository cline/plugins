# astronomer-data

Airflow MCP and a broad Astronomer/Airflow skill pack for Cline users building, operating, testing, and troubleshooting data pipelines.

## Cline Primitives

- MCP server: registers `airflow` through `uvx astro-airflow-mcp==0.8.2 --transport stdio`. The server exposes Airflow inspection and operation tools for DAGs, runs, tasks, logs, health, config, and related workflow state.
- Airflow operations skills: `airflow`, `authoring-dags`, `testing-dags`, `debugging-dags`, `deploying-airflow`, `migrating-airflow-2-to-3`, `migrating-ai-sdk-to-common-ai`, `airflow-hitl`, and `airflow-plugins`.
- Astro workflow skills: `setting-up-astro-project`, `managing-astro-local-env`, `managing-astro-deployments`, and `troubleshooting-astro-deployments`.
- Data engineering skills: `analyzing-data`, `warehouse-init`, `checking-freshness`, `profiling-tables`, `tracing-upstream-lineage`, `tracing-downstream-lineage`, `annotating-task-lineage`, and `creating-openlineage-extractors`.
- DAG framework skills: `dag-factory`, `blueprint`, `cosmos-dbt-core`, and `cosmos-dbt-fusion`.

The plugin intentionally does not register automatic startup hooks. Installing it does not start Airflow, warm caches, run warehouse queries, install packages, deploy projects, or mutate local configuration.

## Install

```bash
cline plugin install astronomer-data
```

For local development from this repository:

```bash
cline plugin install ./plugins/astronomer-data --cwd .
```

The MCP server runs from PyPI through `uvx` with `astro-airflow-mcp==0.8.2`. By default it targets local Airflow at `http://localhost:8080`. To persist connection values into the plugin-owned MCP entry, set any of these variables before installing or reinstalling:

```bash
AIRFLOW_API_URL=https://airflow.example.com
AIRFLOW_USERNAME=admin
AIRFLOW_PASSWORD=<password>
AIRFLOW_AUTH_TOKEN=<token>
AIRFLOW_VERIFY_SSL=false
AIRFLOW_CA_CERT=/path/to/ca.pem
AF_READ_ONLY=true
```

Use either `AIRFLOW_AUTH_TOKEN` or username/password. Set `AF_READ_ONLY=true` when Cline should inspect Airflow without triggering, clearing, pausing, unpausing, deleting, or mutating workflow state.

Changing these values later requires reinstalling the plugin with the new environment or updating the plugin-owned MCP entry in Cline's MCP settings.

## Requirements

- `uvx` available on `PATH` for the plugin-owned MCP server.
- Optional `af` CLI for command-example workflows; use the MCP tools when `af` is not installed.
- Network access to the target Airflow webserver when using remote Airflow.
- Airflow API credentials, or a local Airflow instance using the default URL.
- Astro CLI only for Astro project setup, local environment, and deployment workflows.
- Warehouse credentials only when using the data analysis and warehouse discovery skills.

## Security Notes

The Airflow MCP can expose DAGs, task logs, variables, connections metadata, assets, and operational controls. The data skills can expose warehouse schemas, query results, and business metrics. Treat all of that as sensitive.

Destructive or production-impacting actions require explicit user confirmation. This includes triggering DAGs, clearing or retrying task instances, deleting DAG runs, pausing or unpausing DAGs, creating tokens, changing deployments, writing warehouse cache files, editing project guidance files, running warehouse queries, and running `astro deploy`.
