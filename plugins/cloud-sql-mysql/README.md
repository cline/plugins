# cloud-sql-mysql

Adds Cloud SQL for MySQL guidance skills for administration, schema and data work, lifecycle operations, and monitoring.

## What It Does

Bundles four guidance-only skills:

- `cloud-sql-mysql-admin` helps plan instance, database, and user administration tasks.
- `cloud-sql-mysql-data` helps inspect schemas, write bounded SQL, and review MySQL query plans.
- `cloud-sql-mysql-lifecycle` helps plan backups, restores, clones, and operation tracking.
- `cloud-sql-mysql-monitor` helps triage query, system, table, and index-health signals.

## Install

```bash
cline plugin install cloud-sql-mysql
```

For local development from this repository:

```bash
cline plugin install ./plugins/cloud-sql-mysql --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Use Cloud SQL for MySQL guidance to review this migration plan.
```

Or:

```text
Help me triage slow queries on this Cloud SQL MySQL instance.
```

## Requirements

- Google Cloud project with the Cloud SQL Admin API enabled.
- Application Default Credentials or another already configured Google Cloud authentication path.
- IAM and MySQL permissions appropriate to the task. Do not default to Admin.
- Project, region, instance, and database context supplied by the user, environment, or workspace docs.

Suggested permission shape:

| Workflow | Typical access |
| --- | --- |
| Inspect instances and metadata | Cloud SQL Viewer |
| Connect to a database | Cloud SQL Client plus database user or IAM database authentication |
| Query data | MySQL grants for the target database and operation |
| Create instances, users, backups, restores, or clones | Cloud SQL Admin or narrower custom roles approved for that operation |

## Trust Boundaries

These skills are guidance only; they do not register MCP servers, install packages, or add command executors. Cline may still have shell, database, or other tools from the host or other plugins, so use Cline approvals and tool policies to block destructive SQL, backups, restores, exports, and `gcloud` or `mysql` commands. Treat project IDs, instance names, database names, schemas, query text, query results, logs, connection details, and IAM identities as sensitive. Ask before suggesting writes, DDL, user changes, backups, restores, clones, broad scans, exports, or production-impacting operations.

The original Cloud SQL skill package includes executable helper scripts. This Cline plugin intentionally omits those scripts and keeps the plugin guidance-only.

## Attribution

Adapted from Google's Cloud SQL for MySQL Agent Skills and distributed under Apache-2.0. See `LICENSE.cloud-sql-mysql` and `NOTICE.cloud-sql-mysql`.
