# Database Services Design Rubric

Applies to: Cloud SQL, Firestore, BigQuery, Memorystore (Redis), Cloud Spanner

Quick lookup (no rubric): Check `fast-path.md` first (Cloud SQL PostgreSQL -> RDS Aurora, Cloud SQL MySQL -> RDS Aurora, etc.)

## Eliminators (Hard Blockers)

| GCP Service            | AWS                | Blocker                                                                                                                                                                                    |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Firestore              | DynamoDB           | ACID transactions spanning >100 items required -> use RDS (DynamoDB limit: 100 items/transaction)                                                                                           |
| BigQuery               | _(no auto-target)_ | Plugin does not prescribe Athena/Redshift/Glue -- use `Deferred -- specialist engagement` in design output; OLTP latency needs -> Aurora or DynamoDB per workload review with specialists |
| Cloud SQL (PostgreSQL) | RDS Aurora         | PostGIS extension -> supported (Aurora supports PostGIS)                                                                                                                                    |

## Signals (Decision Criteria)

### Cloud SQL

- PostgreSQL, MySQL, SQL Server -> Direct RDS mapping (fast-path)
- High availability required -> RDS Multi-AZ or Aurora (preferred)
- Dev/test sizing -> RDS Aurora Serverless v2 (min 0.5 ACU, ~$43-58/mo depending on I/O mode)
- Production, always-on -> RDS Aurora Provisioned (or Serverless v2 if fluctuating)
- Migration tooling -- Read `preferences.json` -> `design_constraints.db_size.value` (set by Q13b in Clarify) to select the right tool: `"<10GB"` -> pg_dump/pg_restore; `"10-100GB"` or `"100-500GB"` -> pgcopydb; `">500GB"` -> AWS DMS strongly recommended; `"unknown"` -> default to pgcopydb

### Firestore

- Flexible schema + NoSQL -> DynamoDB
- Strong consistency required -> DynamoDB supports strongly consistent reads via `ConsistentRead` parameter
- Real-time sync + offline support -> DynamoDB Streams + Amplify (app-level)

### BigQuery

Do not use this rubric to pick an AWS product. For any `google_bigquery_*` resource, follow `design-infra.md` -> BigQuery specialist gate only: set `aws_service` to `Deferred -- specialist engagement`, `human_expertise_required: true`, and direct the customer to their AWS account team and/or a data analytics migration partner. Do not output Athena, Redshift, Glue, EMR, or similar as the automated mapping in `aws-design.json`.

The sections below are background for humans after engagement -- not for the agent to select automatically:

- Warehousing, SQL analytics, BI, and ML-on-data choices require assessment (e.g. query patterns, data volume, SLAs, cost model).
- BigQuery ML (`google_bigquery_ml_*`) uses the same specialist gate -- no automated SageMaker/Redshift ML target from this plugin.

### Memorystore (Redis)

- In-memory cache -> ElastiCache Redis (fast-path, 1:1 mapping)
- Cluster mode enabled -> ElastiCache Redis with cluster mode
- High availability required -> ElastiCache Redis Multi-AZ with auto-failover

### Cloud Spanner

- Global strong consistency -> Aurora DSQL (distributed SQL with strong consistency across regions)
- Single-region relational -> Aurora PostgreSQL (simpler, lower cost if global distribution not needed)
- Key-value access patterns dominant -> DynamoDB Global Tables (if workload is mostly key-value lookups)

## 6-Criteria Rubric

Apply in order:

1. Eliminators: Does GCP config require AWS-unsupported features? If yes: switch
2. Operational Model: Managed (Aurora, DynamoDB) vs Provisioned (EC2-based RDS)?
   - Prefer managed unless: Production + cost-optimized + predictable load -> Provisioned RDS
3. User Preference: From `preferences.json`: `design_constraints.database_tier`, `design_constraints.db_io_workload`?
   - If `database_tier = "standard"` -> Standard Aurora Multi-AZ
   - If `database_tier = "aurora-scale"` -> Aurora DSQL considered for global active-active
   - If `db_io_workload = "high"` -> Aurora I/O-Optimized recommended
4. Feature Parity: Does GCP config need features unavailable in AWS?
   - Example: Cloud SQL with binary log replication -> Aurora (full support)
   - Example: Firestore with offline-first SDK -> DynamoDB (plus app-level sync)
5. Cluster Context: Are other resources in cluster using RDS? Prefer same family
6. Simplicity: Fewer moving parts = higher score
   - Serverless > Provisioned > Self-Managed

## Examples

### Example 1: Cloud SQL PostgreSQL (dev environment)

- GCP: `google_sql_database_instance` (database_version=POSTGRES_13, region=us-central1)
- Signals: PostgreSQL, dev tier (implied from sizing)
- Criterion 1 (Eliminators): PASS
- Criterion 2 (Operational Model): Aurora Serverless v2 (dev best practice)
- -> AWS: RDS Aurora PostgreSQL Serverless v2 (0.5-1 ACU, dev tier)
- Confidence: `deterministic`

### Example 2: Firestore (mobile app)

- GCP: `google_firestore_document` (root_path=users, auto_id=true)
- Signals: NoSQL, real-time, offline-first (inferred from Firestore choice)
- Criterion 1 (Eliminators): PASS (DynamoDB supports eventual consistency)
- Criterion 2 (Operational Model): DynamoDB (managed NoSQL)
- Criterion 3 (User Preference): NoSQL type detected from GCP resource -> DynamoDB confirmed
- -> AWS: DynamoDB (on-demand billing for dev)
- Confidence: `inferred`

### Example 3: BigQuery (analytics)

- GCP: `google_bigquery_dataset` (location=us, schema=[large table])
- Agent output: `aws_service`: `Deferred -- specialist engagement`, `human_expertise_required`: `true`, `confidence`: `inferred`, `rubric_applied`: `["BigQuery specialist gate -- no automated AWS service target"]`
- User-facing: Engage AWS account team and/or data analytics migration partner before choosing AWS analytics architecture. Do not state Athena vs Redshift vs Glue as the plugin's recommendation.

## Output Schema

```json
{
  "gcp_type": "google_sql_database_instance",
  "gcp_address": "prod-postgres-db",
  "gcp_config": {
    "database_version": "POSTGRES_13",
    "region": "us-central1",
    "tier": "db-custom-2-7680"
  },
  "aws_service": "RDS Aurora PostgreSQL",
  "aws_config": {
    "engine_version": "13.12",
    "instance_class": "db.r6g.xlarge",
    "multi_az": true,
    "region": "us-east-1"
  },
  "confidence": "deterministic",
  "human_expertise_required": false,
  "rationale": "1:1 mapping; Cloud SQL PostgreSQL -> RDS Aurora PostgreSQL",
  "rubric_applied": [
    "Eliminators: PASS",
    "Operational Model: Managed RDS Aurora",
    "User Preference: database_tier=standard, db_io_workload=medium",
    "Feature Parity: Full (binary logs, replication)",
    "Cluster Context: Consistent with app tier",
    "Simplicity: RDS Aurora (managed, multi-AZ)"
  ]
}
```
