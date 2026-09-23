# alloydb

AlloyDB for PostgreSQL guidance for Cline.

## What It Adds

This plugin bundles seven skills for working with AlloyDB databases and Google Cloud AlloyDB resources. Each skill includes helper scripts for its workflow area, so Cline can guide users through concrete Toolbox-backed database and control-plane operations instead of only describing them.

- `alloydb-postgres-admin`: plan, inspect, create, and track clusters and instances.
- `alloydb-postgres-data`: inspect schemas and run bounded SQL work safely.
- `alloydb-postgres-monitor`: investigate active queries, locks, plans, and Cloud Monitoring metrics.
- `alloydb-postgres-health`: review table statistics, invalid indexes, bloat, autovacuum, and storage signals.
- `alloydb-postgres-optimize`: reason about settings, memory, extensions, and query tuning.
- `alloydb-postgres-replication`: inspect read pools, replication slots, publication tables, lag, and high availability state.
- `alloydb-postgres-access-management`: inspect users, roles, settings, and user creation flows.

The plugin does not register an MCP server and does not install runtime database tooling during plugin installation. The bundled scripts invoke `npx --yes @toolbox-sdk/server@1.1.0 --prebuilt alloydb-postgres` when the user approves running them, so first use may download and execute that pinned Toolbox package through npm.

## Install

```bash
cline plugin install alloydb
```

For local development from this repository:

```bash
cline plugin install ./plugins/alloydb --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Inspect my AlloyDB schema and suggest indexes for the slow customer lookup query.
```

```text
List long-running AlloyDB queries and explain which ones look risky to cancel.
```

```text
Plan a read pool instance for my AlloyDB cluster and show me the exact gcloud command before running it.
```

## Requirements

- Google Cloud project with the AlloyDB API enabled.
- IAM roles appropriate to the task, such as AlloyDB Viewer, AlloyDB Client, or AlloyDB Admin.
- Node.js and npm/npx for the bundled helper scripts.
- Google Cloud Application Default Credentials or another explicit Google Cloud authentication setup available to the Cline process.
- AlloyDB environment variables in the Cline process environment when using the helper scripts: `ALLOYDB_POSTGRES_PROJECT`, `ALLOYDB_POSTGRES_REGION`, `ALLOYDB_POSTGRES_CLUSTER`, `ALLOYDB_POSTGRES_INSTANCE`, `ALLOYDB_POSTGRES_DATABASE`, and optionally `ALLOYDB_POSTGRES_USER`, `ALLOYDB_POSTGRES_PASSWORD`, `ALLOYDB_POSTGRES_IP_TYPE`.
- Connection details such as project, region, cluster, instance, database, user, IP type, and network access.

## Security Notes

AlloyDB operations can read production data, create cloud resources, change users, change roles and settings, and modify database state through SQL. The skills prefer read-only discovery first, require confirmation before local command execution, cloud writes, user/role changes, and mutating SQL, and avoid printing or persisting credentials.

The bundled AlloyDB skill pack and helper scripts are Apache-2.0 licensed; see `LICENSE.alloydb-skills`.
