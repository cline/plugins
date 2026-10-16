# Data Warehouses Sources

Source Type: SQL-Based

## Overview

Data warehouses like Snowflake, Redshift, BigQuery, and Databricks expose metadata through SQL interfaces (INFORMATION_SCHEMA, system tables).

## What to Extract

- Datasets - Tables, views, materialized views
- Containers - Databases, schemas
- Column Metadata - Column names, types, comments, constraints
- Tags - Column and table tags (Snowflake tags, BigQuery labels)
- Users - Table owners
- Groups - Role-based access control groups
- Lineage - Extract from view definitions, query logs, and audit logs
- Usage Statistics - Query counts, user access patterns from query history

## Required Aspects

| Aspect                   | Required                | Description                                                                |
| ------------------------ | ----------------------- | -------------------------------------------------------------------------- |
| `dataPlatformInstance`   | PASS ALWAYS               | Links entity to data platform. Always required.                        |
| `containerProperties`    | PASS ALWAYS               | For databases/schemas as containers                                        |
| `subTypes`               | PASS ALWAYS               | Identifies entity subtype (Table, View, Materialized View, External Table) |
| `container`              | PASS ALWAYS               | Links datasets to parent containers                                        |
| `datasetProperties`      | PASS ALWAYS               | Dataset name, qualified name, custom properties                            |
| `schemaMetadata`         | PASS ALWAYS               | Column definitions with types                                              |
| `viewProperties`         | PASS IF VIEW              | View definition SQL (required for all views)                               |
| `upstreamLineage`        | PASS IF LINEAGE ENABLED   | Upstream table dependencies                                                |
| `globalTags`             | PASS IF SOURCE PROVIDES   | Snowflake tags, BigQuery labels, etc.                                      |
| `ownership`              | PASS IF SOURCE PROVIDES   | Table/schema owners                                                        |
| `datasetProfile`         | PASS IF PROFILING ENABLED | Row counts, column stats                                                   |
| `datasetUsageStatistics` | PASS IF USAGE ENABLED     | Query log usage statistics                                                 |
| `browsePathsV2`          | AUTO AUTO                 | Auto-generated from `container` aspect                                     |
| `status`                 | AUTO AUTO                 | Auto-generated for all entities                                            |

## Implementation Guide

-> See [SQL Sources Guide](../sql.md) for implementation details

## Lineage Considerations

Data warehouses often provide rich lineage through:

- View definitions (can be parsed for table dependencies)
- Query logs (QUERY_HISTORY, ACCESS_HISTORY)
- Audit logs

See [Lineage Extraction Guide](../lineage.md) for SQL parsing patterns.

## Special Considerations

- Query History: Use query logs for usage statistics and lineage
- Tags/Labels: Extract warehouse-native tagging systems (Snowflake tags, BigQuery labels)
- Performance: Query logs can be very large; implement efficient filtering
- Permissions: Respect access controls when extracting metadata

## Example Sources in DataHub

- `src/datahub/ingestion/source/snowflake/`
- `src/datahub/ingestion/source/redshift/`
- `src/datahub/ingestion/source/bigquery/`
- `src/datahub/ingestion/source/databricks/`
