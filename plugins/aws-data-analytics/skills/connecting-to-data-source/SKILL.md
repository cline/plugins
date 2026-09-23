---
name: connecting-to-data-source
description: >-
  Create and troubleshoot AWS Glue connections to JDBC databases (Oracle, SQL Server,
  PostgreSQL, MySQL, RDS), Redshift, Snowflake, and BigQuery. Gathers connection hints
  from user, discovers existing connections and RDS/Redshift candidates, registers
  credentials in Secrets Manager or IAM DB auth, configures VPC, and tests. Triggers
  on: connect to database, set up Glue connection, register data source, connect to
  Snowflake/BigQuery/RDS, connection timeout, test connection, troubleshoot connection.
  Do NOT use for moving data (use ingesting-into-data-lake), creating tables (use
  creating-data-lake-table), queries (use querying-data-lake), catalog exploration
  (use exploring-data-catalog), or SaaS (Salesforce, ServiceNow, SAP, MongoDB, Kafka).
version: 1
---

## Cline Safety

- Use sanitized AWS documentation and bundled reference lookups without an approval round. Ask before live AWS account/API reads, Athena query execution, Glue job, crawler, or connection changes, data scans, schema or sample-row reads, credential registration, IAM updates, vector index mutations, package installs, or network calls with private identifiers.
- Do not run mutating, destructive, deployment, IAM, data-movement, data-access, or cost-bearing commands unless the user explicitly approves the exact command and target account, region, database, catalog, table, bucket, index, or connection. Prefer presenting those commands for the user to run.
- Treat account IDs, ARNs, schemas, table names, sample rows, query results, credentials, logs, source code, customer data, and architecture details as sensitive. Minimize what is sent to MCP servers and tools, and never print secrets.


# Connect to Data Source

Register an external data source with AWS Glue so downstream skills (ingesting-into-data-lake) can move data from it. A Glue connection stores the network config, driver, and credential reference for one source. Create once per source, reuse across jobs.

## Philosophy

A connection is a named pipe, not a pipeline. This skill produces a tested, reusable Glue connection. It does not move data.

## Common Tasks

You MUST execute commands using available `aws-mcp` AWS API tools when connected -- they provide validation, sandboxed execution, and audit logging. Fall back to AWS CLI only if MCP is unavailable. You MUST explain each step before executing.

## Workflow

### 1. Verify Dependencies and Context

- You MUST check whether AWS MCP tools or AWS CLI are available and inform the user if missing
- You MUST confirm target AWS region and verify credentials with `aws sts get-caller-identity`

### 2. Classify the Source

Ask the user which source type they want to connect to, or infer from hints:

| User says... | Source type | Connection type | Reference |
|---|---|---|---|
| "Oracle", "SQL Server", "Postgres", "MySQL", "RDS \<engine\>" | JDBC database | `JDBC` | [jdbc-setup.md](references/jdbc-setup.md) |
| "Redshift", "my cluster", "my data warehouse on AWS" | Redshift | `JDBC` | [jdbc-setup.md](references/jdbc-setup.md) (Redshift section) |
| "Snowflake" | Snowflake | `SNOWFLAKE` | [snowflake-setup.md](references/snowflake-setup.md) |
| "BigQuery", "Google analytics warehouse" | BigQuery | `BIGQUERY` | [bigquery-setup.md](references/bigquery-setup.md) |

If the user names DynamoDB or a local file, stop and tell them: DynamoDB is read directly by Glue without a connection, and local files belong in the ingesting-into-data-lake skill's local-upload workflow.

### 3. Gather Connection Hints from the User

You MUST ask for hints the user can provide -- do not guess.

For all sources:

- Desired connection name (lowercase, hyphens: `oracle-prod-sales`, `snowflake-analytics`)
- Existing Secrets Manager secret, or create one
- Is source reachable from a Glue VPC (same, peered, VPN, Direct Connect)

JDBC: hostname/endpoint, port, database, whether RDS/Aurora/self-managed, IAM DB auth enabled (Aurora/RDS MySQL/Postgres), SSL required.

Snowflake: account identifier, warehouse, role, default database, auth (password, key-pair, OAuth).

BigQuery: GCP project ID, location, whether service account JSON is provisioned.

### 4. Discover Existing Connections and Candidate Sources

Check what exists before creating.

Existing Glue connections:

```bash
aws glue get-connections --filter ConnectionType=<TYPE> --region <REGION>
```

If a suitable one exists, confirm and skip to Step 7.

Candidate sources in account (JDBC/Redshift only):

- RDS: `aws rds describe-db-instances`
- Aurora: `aws rds describe-db-clusters`
- Redshift: `aws redshift describe-clusters`

Present candidates to user; let them pick. See [discovery.md](references/discovery.md).

### 5. Register Credentials

You MUST encourage AWS Secrets Manager over plaintext passwords. You SHOULD prefer IAM database authentication where supported (Aurora/RDS MySQL and PostgreSQL, Redshift). See [credential-security.md](references/credential-security.md).

- You MUST confirm with user before creating a new Secrets Manager secret
- You MUST NOT write plaintext credentials into chat or logs
- For IAM DB auth, no secret is needed

### 6. Create the Glue Connection

Follow the source-specific reference for connection properties:

```bash
aws glue create-connection --connection-input '<JSON>' --region <REGION>
```

Private sources require `PhysicalConnectionRequirements` (SubnetId, SecurityGroupIdList, AvailabilityZone). See [network-setup.md](references/network-setup.md).

### 7. Test the Connection

You MUST run or propose the Glue TestConnection check before handing off. Engine-level verification is recommended after the user approves it because it may run jobs, queries, or crawlers.

#### Phase A: Glue TestConnection (network and credential sanity check)

```bash
aws glue test-connection --connection-name <NAME> --region <REGION>
```

This validates that Glue can reach the source and authenticate. It does NOT prove the connection works end-to-end with the query engine the user plans to use.

#### Phase B: Engine-level verification

After TestConnection passes, ask whether the user wants to verify the connection with their intended engine by running a minimal operation:

- Glue ETL (default): Run a smoke-test Glue job that reads one row via the connection. See [troubleshooting.md](references/troubleshooting.md).
- Athena: If the user plans to query via Athena with a federated connector, run a `SELECT 1` through the Athena connection to confirm the Lambda-based connector can reach the source.
- Glue Crawler: If the user plans to crawl the source, run a test crawl on a single table.

Phase B catches issues that TestConnection misses: driver compatibility at job runtime, catalog configuration, Spark-level serialization, and engine-specific auth flows (e.g., Snowflake SNOWFLAKE type works in ETL but not via JDBC crawlers).

After TestConnection succeeds, tell the user the connection passed the basic Glue check and recommend the appropriate engine-level verification. If any approved test fails, go to Step 8.

### 8. Troubleshoot (only if test failed)

Diagnose in order: network, credentials, driver. See [troubleshooting.md](references/troubleshooting.md).

Constraints:

- You MUST check VPC routing, security groups, and S3 VPC endpoint before blaming credentials
- You MUST verify Glue role can read the Secrets Manager secret
- You MUST NOT rotate credentials without user confirmation

## Argument Routing

- No args: Walk through Steps 1-7 interactively
- Source type keyword (e.g., `snowflake`, `oracle`): Skip to Step 2 with the type prefilled
- Existing connection name: Skip to Step 7 (test) then Step 8 if failing
- Hostname or RDS endpoint: Skip to Step 4 with the candidate prefilled

## Gotchas

- Glue's `SNOWFLAKE` connection type is distinct from `JDBC` configured for Snowflake. You MUST use `SNOWFLAKE` for Spark ETL jobs; do not use JDBC.
- Connection names are immutable. Choose carefully.
- `PhysicalConnectionRequirements.AvailabilityZone` MUST match the subnet's AZ or the connection fails at job runtime, not creation time.
- IAM database authentication tokens expire in 15 minutes. The Glue job generates a fresh token on each connection; do not cache.
- An S3 VPC gateway endpoint MUST exist in the VPC used by private-source connections. Without it, Glue jobs cannot read their scripts or write results to S3.

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `Connect timed out` | VPC routing, SG rule, or NAT gateway missing | See [troubleshooting.md](references/troubleshooting.md) |
| `Access denied for user` / `ORA-01017` | Credentials wrong, Secrets Manager access missing, or IAM DB auth misconfigured | See [troubleshooting.md](references/troubleshooting.md) |
| `No suitable driver found` | Custom driver JAR not set or wrong class name | See [troubleshooting.md](references/troubleshooting.md) |
| `SSL handshake failed` | `JDBC_ENFORCE_SSL` mismatch between Glue and source | See [troubleshooting.md](references/troubleshooting.md) |
| `UnableToFindVpcEndpoint` | S3 VPC endpoint missing | Create S3 gateway endpoint in the connection's VPC |

## References

- [jdbc-setup.md](references/jdbc-setup.md) -- Oracle, SQL Server, PostgreSQL, MySQL, RDS, Redshift
- [snowflake-setup.md](references/snowflake-setup.md) -- Glue `SNOWFLAKE` type, auth modes
- [bigquery-setup.md](references/bigquery-setup.md) -- Glue `BIGQUERY` type, GCP service accounts
- [discovery.md](references/discovery.md) -- Finding existing connections and candidate sources
- [credential-security.md](references/credential-security.md) -- Secrets Manager and IAM DB auth
- [network-setup.md](references/network-setup.md) -- VPC, subnets, security groups, endpoints
- [troubleshooting.md](references/troubleshooting.md) -- Connection errors and diagnostic flow
