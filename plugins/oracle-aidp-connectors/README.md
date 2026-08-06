# Oracle AIDP Connectors Plugin

Oracle AI Data Platform Workbench Spark connector skills for building notebook snippets that read from Oracle, OCI, external databases, SaaS APIs, object stores, and spreadsheet sources.

This plugin bundles skill and reference material plus a small helper Python package. It does not register MCP servers, contact Oracle services, upload helper code, run notebooks, or write credentials during installation.

## Included Skills

- `aidp-connectors-overview`: route from a data-source request to the right connector skill.
- `aidp-connectors-bootstrap`: guide first-time upload of the helper Python package into a Workbench workspace.
- Oracle and OCI connectors: ALH/ADW/ATP, generic Oracle Database, ExaCS, PeopleSoft, Siebel, Fusion REST, Fusion BICC, EPM Cloud, Essbase, OCI Streaming, OCI Object Storage, and Apache Iceberg.
- External database and Hadoop connectors: PostgreSQL, MySQL/HeatWave, SQL Server, Hive, Snowflake, custom JDBC, AWS S3, Azure ADLS Gen2, generic REST, Salesforce, and Excel.

## Requirements

The selected workflow may require an Oracle AI Data Platform Workbench workspace, a Spark notebook session, relevant connector jars or built-in AIDP connector support, network reachability to the source system, and credentials for the target database, SaaS account, object store, or OCI resource.

Some workflows require the bundled helper package under `scripts/oracle_ai_data_platform_connectors/` to be uploaded into the user's Workbench workspace or otherwise made importable by the notebook.

Use `.env.example` as a checklist for connector-specific variable names, but keep filled secrets in the user's own environment, OCI Vault, notebook-scoped state, or another user-owned secret store. Do not commit a filled `.env`.

## Getting Started

After installing the plugin, ask Cline to run the `aidp-connectors-bootstrap` skill for first-time setup. Then use `.env.example` to identify the variables for the target connector, make those values available from the notebook runtime or a user-owned secret store, and ask Cline for the specific connector skill such as `aidp-oracle-db`, `aidp-alh`, or `aidp-snowflake`.

## Trust Boundaries

Installation is passive. The plugin does not run Spark, upload files to Workbench, read databases, call REST APIs, or write to user data stores.

Live connector workflows can expose private data or mutate tables, buckets, streams, catalogs, shared workspace files, and SaaS systems. The bundled skills require explicit approval before writes, helper uploads, credential storage, or broad data access.

## Attribution

The bundled connector skills and helper package are derived from Oracle sample material licensed under MIT. See `LICENSE.oracle-aidp-connectors`.
Some bundled example notebooks include their own Oracle Universal Permissive License notices.
