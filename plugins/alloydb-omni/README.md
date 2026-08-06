# alloydb-omni

AlloyDB Omni container, Kubernetes, and database guidance for Cline.

## What It Adds

This plugin bundles nine skills for working with AlloyDB Omni. Database workflow skills include helper scripts, so Cline can guide users through concrete Toolbox-backed inspection and tuning operations instead of only describing them.

- `alloydb-omni-container`: run, inspect, stop, remove, log, and connect to local container deployments.
- `alloydb-omni-kubernetes`: inspect and manage AlloyDB Omni Operator resources in Kubernetes.
- `alloydb-omni-data`: inspect schemas and run bounded SQL work safely.
- `alloydb-omni-monitor`: troubleshoot active queries, locks, transactions, and server state.
- `alloydb-omni-performance`: analyze query plans, query stats, table stats, and cardinality signals.
- `alloydb-omni-health`: review bloat, invalid indexes, autovacuum, tablespaces, and table health.
- `alloydb-omni-optimize`: reason about settings, memory, extensions, and columnar engine tuning.
- `alloydb-omni-replication`: inspect replication slots, publication tables, lag, and sync state.
- `alloydb-omni-access-control`: inspect roles, permissions, and security-related settings.

The plugin does not register an MCP server and does not install runtime database tooling during plugin installation. The bundled scripts invoke `npx --yes @toolbox-sdk/server@1.1.0 --prebuilt alloydb-omni` when the user approves running them, so first use may download and execute that pinned Toolbox package through npm.

RPM and RPM-orchestrator installation workflows are out of scope for this first plugin. For those environments, the database-operation skills can still help once the user provides a reachable PostgreSQL connection, but deployment setup should follow the user's chosen AlloyDB Omni documentation and local runbooks.

## Install

```bash
cline plugin install alloydb-omni
```

For local development from this repository:

```bash
cline plugin install ./plugins/alloydb-omni --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Plan a local AlloyDB Omni container for development and show me the docker command before running it.
```

```text
Inspect my AlloyDB Omni Kubernetes DBCluster and summarize unhealthy resources.
```

```text
Analyze this AlloyDB Omni query plan and suggest indexes or columnar settings.
```

## Requirements

- An AlloyDB Omni instance or a plan to create one locally.
- Local tooling for the chosen deployment path, usually `docker` or `podman` for containers, `kubectl` for Kubernetes, and `psql` for database access.
- Node.js and npm/npx for the bundled helper scripts.
- Connection details such as host, port, database, user, and network path.
- AlloyDB Omni environment variables in the Cline process environment when using the helper scripts: `ALLOYDB_OMNI_HOST`, `ALLOYDB_OMNI_PORT`, `ALLOYDB_OMNI_DATABASE`, `ALLOYDB_OMNI_USER`, `ALLOYDB_OMNI_PASSWORD`, and optionally `ALLOYDB_OMNI_QUERY_PARAMS`.
- Credentials supplied through the user's environment or approved local credential handling.

## Security Notes

AlloyDB Omni operations can read local or production-like data, create containers, modify Kubernetes resources, and change database state. The skills prefer read-only inspection first, require confirmation before local command execution, container or Kubernetes changes, user/role changes, settings changes, and mutating SQL, and avoid printing or persisting credentials.

The bundled AlloyDB Omni skill pack and helper scripts are Apache-2.0 licensed; see `LICENSE.alloydb-omni-skills`.
