# AWS Data Analytics

Adds AWS data lake and analytics guidance for Cline, with a shared AWS MCP server for AWS documentation and approved AWS API workflows plus detailed skills for Glue, Athena, S3 Tables, and S3 Vectors.

## What It Adds

- Registers `aws-mcp`, the managed AWS MCP server launched through `uvx mcp-proxy-for-aws@1.6.0`.
- Bundles detailed skills for connecting external data sources with AWS Glue, creating S3 Tables backed Iceberg tables, ingesting data into a lake, querying with Athena, finding and auditing catalog assets, and storing or querying vectors with S3 Vectors.
- Includes skill reference files for Glue connection setup, Iceberg table creation, catalog discovery, ingestion, query workgroups, and S3 Vectors patterns.
- Keeps the AWS MCP server name shared with other AWS plugins so users do not get duplicate AWS MCP entries.

## Install

```bash
cline plugin install aws-data-analytics
```

For local development from this repository:

```bash
cline plugin install ./plugins/aws-data-analytics --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Find the orders table in our AWS Glue catalog, profile it with Athena, and suggest a safe ingestion plan into S3 Tables.
```

Cline can use the bundled skills to resolve the asset, choose a workgroup, bound exploratory queries, and use AWS MCP or the AWS CLI for the AWS-side steps.

## Cline Primitives

- MCP: `aws-mcp` supports AWS documentation lookup and, when credentials and approval are present, AWS API access through the AWS MCP proxy.
- Skills: seven workflow skills cover Glue connection setup, S3 Tables table creation, data ingestion, Athena querying, catalog exploration, fuzzy asset lookup, and S3 Vectors operations.

## Requirements

- `uvx` available on PATH so Cline can launch the AWS MCP proxy.
- First launch may download and execute the pinned `mcp-proxy-for-aws@1.6.0` package through `uvx`.
- AWS credentials configured through the AWS CLI, IAM Identity Center, or environment variables.
- IAM permissions scoped to the services you use, commonly Athena, Glue, S3, S3 Tables, S3 Vectors, Secrets Manager, IAM, and any source system involved in ingestion.
- Data source credentials and network access for Glue connections to JDBC databases, Redshift, Snowflake, or BigQuery.

## Trust Boundaries

The skills treat schemas, sample rows, query results, credentials, account IDs, logs, billing details, and architecture details as sensitive. They instruct Cline to ask before live AWS API calls, data scans, Glue job or crawler changes, Athena query execution, IAM changes, vector index creation, credential registration, and any action that can change infrastructure or create cost.

For AWS MCP documentation lookups, reduce the request to a sanitized docs question. For live AWS MCP API calls, send only the minimum approved identifiers and payload needed for the requested operation. Do not include secrets, unneeded account IDs, customer data, private code, log payloads, billing details, or confidential architecture.
