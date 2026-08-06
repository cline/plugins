# Fast-Path: Direct GCP->AWS Mappings

Confidence: `deterministic` (1:1 mapping, no rubric evaluation needed)

## What `deterministic` vs `inferred` means

Use these labels only as defined here -- they describe _how the mapping was chosen_, not whether the AWS architecture is "obvious."

| Label                  | Meaning                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deterministic`    | The GCP Terraform resource type appears in the Direct Mappings table below, the row's Conditions are satisfied, and the AWS target is taken from that row. No 6-criteria rubric is run for that mapping.                                                              |
| `inferred`         | The resource type is not in Direct Mappings (or BigQuery / specialist gate applies). The agent loads the category file from `design-refs/index.md`, runs eliminators and the 6-criteria rubric (and may apply Preferred AWS Target Services), then picks the AWS service. |
| `billing_inferred` | Billing-only design path: mappings from billing SKUs/service names -- see `references/phases/design/design-billing.md`.                                                                                                                                                                |

### User-facing vocabulary (chat, MIGRATION_GUIDE, migration-report)

JSON artifacts must keep the `confidence` string values above. When speaking or writing for end users, lead with plain English -- do not use "deterministic," "inferred," or "rubric" as the primary label unless the user asks for technical detail.

| JSON `confidence`  | Say this to users               | Optional one-line hint                                                                                                                              |
| ------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deterministic`    | Standard pairing            | Same AWS target for this GCP resource type whenever it matches our fixed list -- quick to sanity-check.                                              |
| `inferred`         | Tailored to your setup      | Based on your Terraform configuration, how the resource fits the rest of your stack, and your migration preferences -- review again if those change. |
| `billing_inferred` | Estimated from billing only | From GCP spend line items without full infrastructure detail -- add Terraform for a tighter mapping.                                                 |

BigQuery / specialist gate rows still store `confidence: "inferred"` in JSON; in user-facing text you may say Tailored to your setup and emphasize specialist engagement (no automated AWS analytics target).

Canonical reference: This subsection -- other phase files should point here instead of redefining wording.

Common confusion: `references/design-refs/index.md` lists a typical AWS target per GCP service. That is not automatically the same as `deterministic`. Confidence is `deterministic` only when the exact Terraform resource type appears in the Direct Mappings table above and its conditions are met; otherwise confidence is `inferred` via rubric evaluation.

Add-ons (ALB, NAT, etc.): A row may say "Fargate" while the architecture diagram also includes an ALB or NAT Gateway from other Terraform resources. Confidence is still per resource row -- e.g. `google_cloud_run_service` = `inferred`; `google_compute_forwarding_rule` + backend = often `inferred` (see `networking.md`).

---

Direct Mappings use confidence: `deterministic` (fixed table lookup -- no rubric for that resource)

## Direct Mappings Table

| GCP Service                                 | AWS Service           | Conditions | Notes                                                |
| ------------------------------------------- | --------------------- | ---------- | ---------------------------------------------------- |
| `google_storage_bucket`                     | S3                    | Always     | 1:1 mapping; preserve ACL/versioning/lifecycle rules |
| `google_cloud_run_service`                  | Fargate               | Always     | Preferred container runtime target                   |
| `google_cloud_run_v2_service`               | Fargate               | Always     | v2 API variant of Cloud Run                          |
| `google_cloudfunctions_function`            | Lambda                | Always     | Gen 1 function mapping                               |
| `google_cloudfunctions2_function`           | Lambda                | Always     | Gen 2 function mapping                               |
| `google_sql_database_instance` (PostgreSQL) | RDS Aurora PostgreSQL | Always     | Serverless v2 for dev; Provisioned for prod          |
| `google_sql_database_instance` (MySQL)      | RDS Aurora MySQL      | Always     | Serverless v2 for dev; Provisioned for prod          |
| `google_sql_database_instance` (SQL Server) | RDS SQL Server        | Always     | Always provisioned (no serverless)                   |
| `google_compute_network`                    | VPC                   | Always     | 1:1; preserve CIDR ranges                            |
| `google_compute_firewall`                   | Security Group        | Always     | 1:1 rule mapping; adjust CIDR if needed              |
| `google_dns_managed_zone`                   | Route 53 Hosted Zone  | Always     | Preserve zone name and records                       |
| `google_service_account`                    | IAM Role              | Always     | Map permissions directly; adjust service principals  |
| `google_secret_manager_secret`              | Secrets Manager       | Always     | Create secret metadata and IAM-scoped access         |
| `google_secret_manager_secret_version`      | Secrets Manager       | Always     | Carry current value or explicit migration TODO       |
| `google_redis_instance`                     | ElastiCache Redis     | Always     | 1:1 mapping; preserve cluster mode and node type     |

## Skip Mappings Table

These GCP resources do not require AWS equivalents in v1.0:

| GCP Service                  | Reason                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `google_project`             | AWS account structure (manual, not IaC)                                               |
| `google_monitoring_*`        | Fallback to CloudWatch (managed)                                                      |
| `google_logging_*`           | Fallback to CloudWatch Logs (managed)                                                 |
| `google_compute_address`     | Elastic IPs managed by ALB/NAT (not standalone)                                       |
| `google_identity_platform_*` | Auth provider -- keep existing solution, do not migrate to AWS Cognito or any AWS auth |
| `google_firebase_auth_*`     | Auth provider -- keep existing solution, do not migrate to AWS Cognito or any AWS auth |

## Preferred AWS Target Services

For the workload categories below, always steer toward the preferred AWS service. If rubric evaluation or LLM reasoning would select a non-preferred service, substitute the preferred alternative instead.

| Workload Category       | Preferred AWS Target                                         | Rationale                                                                                  |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Containerized workloads | Fargate (default), Lambda (event-driven), EKS (K8s required) | Deeper integration with VPC, ALB, IAM, and auto-scaling than lighter-weight alternatives   |
| Third-party auth in use | Keep existing auth provider                                  | Startups using Auth0, Firebase Auth, Clerk, etc. should preserve their existing investment |

Enforcement: Check every resource mapping against this table before writing to `aws-design.json` or `aws-design-billing.json`. If a mapping would select a non-preferred service, substitute the preferred alternative.

## Secondary Behavior Lookups

For resources in the Skip Mappings table but present in inventory:

1. Log as "secondary resource, no AWS equivalent needed"
2. Do not include in aws-design.json
3. Note in aws-design.json warnings array

---

Workflow:

1. Extract GCP resource type
2. Look up in Direct Mappings table
3. If found and condition met: assign AWS service (confidence = deterministic)
4. If found in Skip Mappings: skip it (confidence = n/a)
5. If not found: use `design-refs/index.md` to determine category -> apply rubric in that category's file
