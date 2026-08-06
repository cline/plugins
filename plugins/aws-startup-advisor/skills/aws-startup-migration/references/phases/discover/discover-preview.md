# Migration Preview Heuristic

> Loaded by `discover.md` Step 3 to compute a lightweight preview signal and rough cost
> estimate from discovery artifacts alone -- before Clarify, Design, or Estimate run.
> This is NOT the full complexity tier (that lives in `migration-complexity.md` and requires
> preferences + billing). This is a fast, honest "at a glance" for the user.

---

## Step 1: Compute complexity_signal

Read from available discovery artifacts:

| Input                    | Source                                                  | Key                                                                             |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `primary_resource_count` | `gcp-resource-inventory.json`                           | Count resources where `classification: "PRIMARY"`                               |
| `has_database`           | `gcp-resource-inventory.json`                           | Any resource type matching `google_sql_*`, `google_spanner_*`, `google_redis_*` |
| `has_bigquery`           | `gcp-resource-inventory.json` or `billing-profile.json` | Any `google_bigquery_*` resource or BigQuery billing SKU                        |
| `has_ai_profile`         | File presence                                           | `ai-workload-profile.json` exists                                               |
| `is_agentic`             | `ai-workload-profile.json`                              | `agentic_profile.is_agentic == true` (if file exists)                           |
| `billing_monthly_usd`    | `billing-profile.json`                                  | `summary.total_monthly_spend` (null if absent)                                  |

Classify (first match wins, top to bottom):

```
IF has_bigquery
   OR is_agentic == true
   OR primary_resource_count > 8
   OR (billing_monthly_usd != null AND billing_monthly_usd > 10000)
THEN complexity_signal = "complex"

ELSE IF primary_resource_count <= 3
   AND has_database == false
   AND has_bigquery == false
   AND is_agentic != true
   AND (billing_monthly_usd == null OR billing_monthly_usd < 1000)
THEN complexity_signal = "likely_simple"

ELSE
   complexity_signal = "standard"
END
```

Fast-path eligibility:

```
eligible_for_clarify_fast_path =
   complexity_signal == "likely_simple"
   AND has_ai_profile == false // any AI profile -> full Clarify, even non-agentic
```

---

## Step 2: Compute rough AWS cost range

Purpose: Give the user a ballpark before Estimate runs. Always label as rough. Never invent GCP spend if billing data is absent.

### Service type -> dev-tier AWS line item mapping

For each PRIMARY resource in `gcp-resource-inventory.json`, map to a dev-tier AWS equivalent and look up its monthly cost from `references/shared/pricing-cache.md`:

| GCP Primary Type                                                     | Typical AWS Target          | Dev-tier sizing for preview      |
| -------------------------------------------------------------------- | --------------------------- | -------------------------------- |
| `google_cloud_run_v2_service` / `google_cloud_run_service`           | Fargate                     | 0.5 vCPU, 1GB RAM, 730 hrs/mo    |
| `google_cloudfunctions_function` / `google_cloudfunctions2_function` | Lambda                      | 1M requests, 128MB, 200ms avg    |
| `google_compute_instance`                                            | EC2 t4g.small               | On-demand, us-east-1             |
| `google_container_cluster`                                           | EKS (2x t4g.small nodes)    | On-demand, us-east-1             |
| `google_sql_database_instance`                                       | RDS db.t4g.micro            | Single-AZ, gp3 20GB              |
| `google_redis_instance`                                              | ElastiCache cache.t4g.micro | Single-AZ                        |
| `google_storage_bucket`                                              | S3                          | 50GB standard + 10K GET + 1K PUT |
| `google_pubsub_topic`                                                | SQS                         | 1M requests/mo                   |
| `google_filestore_instance`                                          | EFS                         | 10GB standard                    |
| `google_spanner_instance`                                            | Aurora Serverless v2        | 0.5-1 ACU                        |
| `google_bigquery_dataset`                                            | Deferred -- specialist      | $0 (not estimated)               |

Sum the dev-tier line items to get `aws_monthly_range_usd.low`. Multiply by 1.5 for `high` (accounts for NAT gateway, data transfer, CloudWatch, and sizing variance).

If `billing-profile.json` exists: Set `gcp_monthly_usd` from `summary.total_monthly_spend`. Show both GCP actual and AWS range.

If only IaC: Set `gcp_monthly_usd: null`. Show AWS range only -- never invent GCP spend.

If neither IaC nor billing: Omit cost preview entirely (`cost_preview: null`).

---

## Step 3: Build key_decisions_ahead

Generate 2-4 bullets based on what was detected. Use only signals present in discovery artifacts:

| Signal                   | Decision bullet                                              |
| ------------------------ | ------------------------------------------------------------ |
| Any compute resource     | "Target region and deployment model (Fargate vs EKS)"        |
| `has_database == true`   | "Database migration tooling and cutover window"              |
| `has_ai_profile == true` | "Bedrock model selection for [detected model IDs]"           |
| `is_agentic == true`     | "Agentic migration path (retarget / Harness / Strands)"      |
| `has_bigquery == true`   | "BigQuery analytics target (specialist engagement required)" |

Always include "Target region" if any compute is present. Cap at 4 bullets.

---

## Step 4: Build timeline_hint string

| complexity_signal | timeline_hint                                            |
| ----------------- | -------------------------------------------------------- |
| `likely_simple`   | "3-6 weeks (likely simple infra; confirm after Clarify)" |
| `standard`        | "8-12 weeks (standard migration; confirm after Clarify)" |
| `complex`         | "12-16+ weeks (complex stack; confirm after Clarify)"    |

Always append "(confirm after Clarify)" -- full tier classification requires preferences.

---

## Step 5: Write migration-preview.json

Write `$MIGRATION_DIR/migration-preview.json`:

```json
{
  "preview_version": 1,
  "computed_at": "<ISO timestamp>",
  "primary_resource_count": 3,
  "complexity_signal": "likely_simple",
  "eligible_for_clarify_fast_path": true,
  "services_summary": [
    { "gcp_type": "google_cloud_run_v2_service", "typical_aws_target": "Fargate" },
    { "gcp_type": "google_storage_bucket", "typical_aws_target": "S3" }
  ],
  "cost_preview": {
    "gcp_monthly_usd": 240.00,
    "aws_monthly_range_usd": { "low": 120, "high": 180 },
    "disclaimer": "Dev-tier rough estimate (+-30%); full analysis in Estimate phase"
  },
  "timeline_hint": "3-6 weeks (likely simple infra; confirm after Clarify)",
  "ai_detected": false,
  "key_decisions_ahead": [
    "Target region and deployment model (Fargate vs EKS)",
    "Cutover window"
  ]
}
```

Field rules:

- `cost_preview` is `null` if neither IaC nor billing data was available
- `cost_preview.gcp_monthly_usd` is `null` if no billing data (IaC-only run)
- `ai_detected` is `true` if `ai-workload-profile.json` exists
- `services_summary` lists only PRIMARY resources, deduplicated by `gcp_type`
- `eligible_for_clarify_fast_path` is `false` whenever `ai_detected == true`, regardless of infra complexity

---

## Step 6: Build preview chat message

Output this block as part of `discover.md` Step 3's user message (chat only -- not a file):

```
### Your migration at a glance *(preview -- not final)*

| | |
|---|---|
| Services | [primary_resource_count] resources -> [services_summary as "Fargate, S3"] *(standard pairings)* |
| AWS cost (rough) | ~$[low]-$[high]/mo [vs GCP ~$[gcp]/mo if billing present] *(dev-tier estimate, +-30%)* |
| Timeline (rough) | [timeline_hint] |
| AI | [if ai_detected: "[model IDs] detected -- AI migration path will run" else "None detected"] |
| Decisions ahead | [key_decisions_ahead joined by "; "] |

*Full cost breakdown in Estimate; runnable Terraform in Generate.*
[if eligible_for_clarify_fast_path: "Your stack looks straightforward -- next step is 3 quick questions."]
[if ai_detected and not eligible_for_clarify_fast_path: "AI workload detected -- full Clarify recommended for best results."]
```

Do NOT write this to a file. Chat output only.
