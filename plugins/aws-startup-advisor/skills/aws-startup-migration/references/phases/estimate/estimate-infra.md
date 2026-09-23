# Estimate Phase: Infrastructure Cost Analysis

> Loaded by estimate.md when aws-design.json exists.

Execute ALL steps in order. Do not skip or optimize.

## Pricing Mode

The parent `estimate.md` determines pricing source before loading this file.

Price lookup order for each AWS service in `aws-design.json`:

1. `shared/pricing-cache.md` (primary) -- Read once. Before using, check staleness: compute `days_since_cache = today − cache "Last updated" date`. If `days_since_cache > 30`, set `pricing_source: "cached_stale"` for all AI model prices and prepend a warning to the estimate output: "Pricing cache is more than 30 days old -- AI model prices may have changed. Verify via the AWS Pricing MCP server or aws.amazon.com/bedrock/pricing." Infrastructure prices (Fargate, RDS, S3, etc.) remain reliable; only AI model prices need the stale flag. If `days_since_cache <= 30`, use the price directly and set `pricing_source: "cached"`.
2. MCP with recipes (secondary) -- If a service is NOT in pricing-cache.md and MCP is available, use the Pricing Recipes table below. Set `pricing_source: "live"`.
3. Cache after MCP failure -- If MCP was attempted but failed, and the service IS in the cache, use the cached price. Set `pricing_source: "cached_fallback"`.
4. Unavailable -- If a service is NOT in the cache AND MCP failed, set `pricing_source: "unavailable"`. Add to `services_with_missing_fallback` and warn the user.

For typical migrations (Fargate, Aurora/RDS, Aurora Serverless v2, S3, ALB, NAT Gateway, Lambda, Secrets Manager, CloudWatch, ElastiCache, DynamoDB), ALL prices are in `pricing-cache.md`. Zero MCP calls needed.

## Step 0: Validate Design Output

Before pricing queries, validate `aws-design.json`:

1. File exists: If missing, STOP. Output: "Phase 3 (Design) not completed. Run Phase 3 first."
2. Valid JSON: If parse fails, STOP. Output: "Design file corrupted (invalid JSON). Re-run Phase 3."
3. Required fields:
   - `clusters` array is not empty: If empty, STOP. Output: "No clusters in design. Re-run Phase 3."
   - Each cluster has `resources` array: If missing, STOP. Output: "Cluster [id] missing resources. Re-run Phase 3."
   - Each resource has `aws_service` field: If missing, STOP. Output: "Resource [address] missing aws_service. Re-run Phase 3."
   - Each resource has `aws_config` field: If missing, STOP. Output: "Resource [address] missing aws_config. Re-run Phase 3."

If all validations pass, proceed to Part 1.

## Pricing Recipes (MCP Fallback Only)

Only use these recipes when a service is NOT in `pricing-cache.md` and MCP is available.
Do NOT call get_pricing_service_codes, get_pricing_service_attributes, or get_pricing_attribute_values -- go directly to get_pricing.

| AWS Service          | service_code      | filters                                                                                                              | output_options                                                                                                                                     |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fargate              | AmazonECS         | `[{"Field":"productFamily","Value":"Compute"}]`                                                                      | `{"pricing_terms":["OnDemand"],"product_attributes":["usagetype","location"],"exclude_free_products":true}`                                        |
| Aurora PostgreSQL    | AmazonRDS         | `[{"Field":"databaseEngine","Value":"Aurora PostgreSQL"},{"Field":"deploymentOption","Value":"Single-AZ"}]`          | `{"pricing_terms":["OnDemand"],"product_attributes":["instanceType","databaseEngine","deploymentOption","location"],"exclude_free_products":true}` |
| RDS PostgreSQL       | AmazonRDS         | `[{"Field":"databaseEngine","Value":"PostgreSQL"},{"Field":"deploymentOption","Value":"Multi-AZ"}]`                  | `{"pricing_terms":["OnDemand"],"product_attributes":["instanceType","databaseEngine","deploymentOption","location"],"exclude_free_products":true}` |
| Aurora MySQL         | AmazonRDS         | `[{"Field":"databaseEngine","Value":"Aurora MySQL"},{"Field":"deploymentOption","Value":"Single-AZ"}]`               | `{"pricing_terms":["OnDemand"],"product_attributes":["instanceType","databaseEngine","deploymentOption","location"],"exclude_free_products":true}` |
| Aurora Serverless v2 | AmazonRDS         | `[{"Field":"usagetype","Value":["Aurora:ServerlessV2Usage","Aurora:ServerlessV2IOOptimizedUsage"],"Type":"ANY_OF"}]` | `{"pricing_terms":["OnDemand"],"product_attributes":["usagetype","databaseEngine","location"],"exclude_free_products":true}`                       |
| S3                   | AmazonS3          | `[{"Field":"storageClass","Value":"General Purpose"}]`                                                               | `{"pricing_terms":["OnDemand"],"product_attributes":["storageClass","volumeType","location"],"exclude_free_products":true}`                        |
| ALB                  | AWSELB            | `[{"Field":"productFamily","Value":"Load Balancer-Application"}]`                                                    | `{"pricing_terms":["OnDemand"],"product_attributes":["productFamily","location"],"exclude_free_products":true}`                                    |
| NAT Gateway          | AmazonEC2         | `[{"Field":"productFamily","Value":"NAT Gateway"}]`                                                                  | `{"pricing_terms":["OnDemand"],"product_attributes":["productFamily","location","group"],"exclude_free_products":true}`                            |
| Lambda               | AWSLambda         | `[{"Field":"group","Value":"AWS-Lambda-Duration"}]`                                                                  | `{"pricing_terms":["OnDemand"],"product_attributes":["group","location","usagetype"],"exclude_free_products":true}`                                |
| Secrets Manager      | AWSSecretsManager | `[]`                                                                                                                 | `{"pricing_terms":["OnDemand"],"exclude_free_products":true}`                                                                                      |
| CloudWatch Logs      | AmazonCloudWatch  | `[{"Field":"usagetype","Value":"DataProcessing-Bytes"}]`                                                             | `{"pricing_terms":["OnDemand"],"product_attributes":["productFamily","location","usagetype"],"exclude_free_products":true}`                        |
| ElastiCache Redis    | AmazonElastiCache | `[{"Field":"cacheEngine","Value":"Redis"},{"Field":"instanceType","Value":"cache.t4g","Type":"CONTAINS"}]`           | `{"pricing_terms":["OnDemand"],"product_attributes":["instanceType","cacheEngine","location"],"exclude_free_products":true}`                       |
| DynamoDB             | AmazonDynamoDB    | `[]`                                                                                                                 | `{"pricing_terms":["OnDemand"],"product_attributes":["group","location"],"exclude_free_products":true}`                                            |

Important notes on MCP filters:

- Fargate: Use `productFamily=Compute`, NOT EC2-style filters (operatingSystem, tenancy, capacitystatus do not exist in AmazonECS)
- Aurora (PostgreSQL/MySQL): Use `deploymentOption=Single-AZ`. Aurora handles multi-AZ replication natively -- there is no "Multi-AZ" pricing option for Aurora
- Lambda: Filter by `group=AWS-Lambda-Duration` for compute pricing, separate call with `group=AWS-Lambda-Requests` for request pricing
- CloudWatch: Filter by specific `usagetype=DataProcessing-Bytes` for log ingestion pricing (avoids pulling all vended log types)

Batching rule: If MCP calls are needed, group up to 4 requests in parallel per turn.

---

## Part 1: Calculate Current GCP Costs

Determine the current GCP monthly infrastructure costs. Use the best available source:

1. `billing-profile.json` (preferred) -- Use actual billing data as the GCP baseline. Highest confidence (+/-5%).
2. `gcp-resource-inventory.json` (fallback) -- Estimate costs from discovered resource configurations. Wider range (+/-20-30%).
3. `preferences.json` -> `gcp_monthly_spend` -- User-provided monthly spend from clarification.
4. Ask the user -- If none of the above are available, ask: "I need your current GCP monthly spend to produce a meaningful cost comparison. What is your approximate GCP monthly infrastructure cost?" Use the user's answer. If the user declines or is unsure, present AWS costs without a GCP comparison and note: "GCP baseline unavailable -- AWS costs shown without comparison."

Present the GCP baseline as a total and per-service breakdown, noting which source was used.

### CUD-Aware Baseline (when billing data available)

If `billing-profile.json` contains `commitments.has_active_cuds == true`:

1. Use list price as the GCP baseline: The `services[].monthly_cost` values already use list price (commitment fee rows excluded by discover phase). Use `cost_basis.total_at_list` as the total GCP baseline for comparison.
2. Do not include commitment fees in workload costs: Commitment fee rows are billing artifacts with no AWS equivalent -- they are already excluded from `services[]`.
3. Record the effective discount for Part 3: Note `commitments.effective_discount_percent` -- this is the customer's current GCP discount rate that will be compared against AWS Savings Plan rates.

This ensures the comparison is GCP list price vs. AWS on-demand (both uncommitted baselines), with commitment options presented separately as optimization opportunities.

---

## Part 2: Calculate Projected AWS Costs

Security baseline coverage (always required): Add a `security_baseline` entry to `projected_costs.breakdown` with `service: "AWS Security Baseline (Tier 1)"`, low/mid/high estimates of $3/$15/$30 per month, `accuracy: "+/-25%"`, and a `components` sub-object breaking down CloudTrail S3 storage (~$1.50/mo mid), GuardDuty (~~$13/mo mid after free trial), AWS Budgets ($0), and the free controls. If `preferences.json.compliance` contains any of `soc2`, `pci`, `hipaa`, `fedramp`, also add a sibling `security_baseline_compliance` entry with low/mid/high estimates of $3/$14/$25 per month, `accuracy: "+/-25%"`, `emission_reason` field citing the declared compliance values, and a `components` sub-object breaking down AWS Config (~$6/mo mid continuous), Config S3 storage (~~ $0.50/mo mid), Security Hub + FSBP (~$7/mo mid after free trial), and extra standards (free). Per-unit rates are grounded in the AWS Pricing API for us-east-1 as of 2026-05-04 (Config pricing effective 2025-09-01, Security Hub effective 2026-03-01). Cite source as `references/shared/pricing-cache.md § Security Baseline` or live `get_pricing` calls for `AmazonGuardDuty`, `AWSConfig`, and `AWSSecurityHub` service codes. Both line items are added as flat additives to each tier total (Premium/Balanced/Optimized) rather than being tier-dependent.

For each service in `aws-design.json`, calculate monthly cost using rates from `pricing-cache.md`. Track `pricing_source` per service.

Secret Manager coverage (mandatory): If any mapped resource has `gcp_type` of `google_secret_manager_secret` or `google_secret_manager_secret_version`, ensure an `aws_service` entry for Secrets Manager is present in the estimate breakdown. Do not collapse this into a generic "supporting" line item.

BigQuery / deferred analytics (mandatory): For any resource where `aws_service` is exactly `Deferred -- specialist engagement` OR `gcp_type` starts with `google_bigquery_`:

- Do not apply Athena, Redshift, Glue, or EMR rates as the plugin's "projected" analytics stack.
- Exclude these resources from Premium / Balanced / Optimized numeric totals (or list them under a `deferred_services[]` / `excluded_from_totals` section in `estimation-infra.json` with reason: _pending specialist engagement_).
- In the user-facing summary, state that AWS analytics costs are unknown until the AWS account team and/or data analytics migration partner defines the target architecture.

Calculate 3 cost tiers to show the optimization range:

| Tier          | Description                             | Examples                                                            |
| ------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Premium   | Latest generation, highest availability | db.r6g instances, Fargate Spot disabled, Multi-AZ everything        |
| Balanced  | Standard generation, typical setup      | db.t4g instances, Fargate on-demand, Single-AZ where acceptable     |
| Optimized | Cost-minimized with trade-offs          | db.t4g with reserved pricing, Fargate Spot 70%, S3-IA for cold data |

Per-service calculation approach:

| Domain                     | Formula                                                                               | Key inputs from aws-design.json                                               |
| -------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Compute (Fargate)          | (vCPU x vCPU rate + memory GB x memory rate) x 730 hours x instance count             | `aws_config.cpu`, `aws_config.memory`                                         |
| Compute (Lambda)           | requests x request rate + (requests x duration x memory GB) x GB-second rate          | Estimated from usage patterns                                                 |
| Database (Aurora)          | instance rate x 730 hours x instance count + storage GB x storage rate + I/O estimate | `aws_config.instance_class`, `aws_config.allocated_storage`                   |
| Database (RDS)             | instance rate x 730 hours x instance count + storage GB x storage rate                | `aws_config.instance_class`, `aws_config.allocated_storage`                   |
| Storage (S3)               | GB x per-GB rate + request estimates                                                  | `aws_config.storage_gb` or source `gcp_config`                                |
| Networking (ALB)           | fixed monthly + LCU estimate                                                          | From compute service count                                                    |
| Networking (NAT)           | fixed monthly x count + GB processed x data rate                                      | From VPC design                                                               |
| Security (Secrets Manager) | secrets_count x per-secret monthly rate + api_calls_10k x per-10K API rate            | `aws_config.secrets_count`, `aws_config.api_calls_10k` (or inferred defaults) |
| Supporting                 | Per-unit rates x quantities (secrets, log GB, metrics)                                | Inferred from service count                                                   |

Show calculation breakdown per service: rate x quantity = cost. Present all 3 tiers side-by-side.

---

## Part 3: Cost Comparison

Present a side-by-side comparison:

- GCP current monthly total (at list price)
- AWS Premium / Balanced / Optimized monthly totals
- Difference (savings or increase) per tier vs GCP
- Per-service breakdown for the Balanced tier

### Commitment Context (if CUDs detected)

If `billing-profile.json` has `commitments.has_active_cuds == true`, add a `commitment_context` section to the comparison:

- GCP effective committed rate: The customer currently pays `effective_discount_percent`% below list via CUDs
- AWS equivalent: 1-year Savings Plans typically save 20-30%; 3-year Savings Plans save 40-60%
- Fair comparison framing: Present both an uncommitted comparison (GCP list vs. AWS on-demand) and a committed comparison (GCP net-of-CUD vs. AWS with 1yr SP)
- Migration timing note: If the customer has active CUDs, note that CUD fees continue regardless of usage -- migrating mid-commitment means paying both GCP CUD fees and AWS costs until the CUD term expires

Include in `estimation-infra.json` under `cost_comparison`:

```json
"commitment_context": {
  "gcp_has_active_cuds": true,
  "gcp_effective_discount_percent": 8.2,
  "gcp_monthly_at_list": 2450.00,
  "gcp_monthly_net_of_discounts": 2280.00,
  "aws_1yr_savings_plan_typical_discount": "20-30%",
  "aws_3yr_savings_plan_typical_discount": "40-60%",
  "note": "GCP baseline uses list price for apples-to-apples comparison. Customer currently saves 8.2% via CUDs. AWS Savings Plans offer comparable or deeper discounts post-migration."
}
```

If `commitments.has_active_cuds == false` or the section is absent, omit `commitment_context` from the output.

---

## Part 4: GCP Data Transfer Egress (Vendor Fees Only)

This section covers GCP vendor/network charges for outbound data during migration -- not human labor or professional-services costs (those are never presented as dollar estimates by this advisor).

Billing data check: Before generating this section, check if `$MIGRATION_DIR/billing-profile.json` exists.

### IF billing data IS available (`billing-profile.json` exists):

Data transfer -- egress fees from GCP during migration. GCP charges for outbound data transfer; volume depends on database sizes and storage to migrate. Use the billing data to estimate the volume of data that needs to move.

Set `billing_data_available: true` in the output `migration_cost_considerations` object.

### IF billing data is NOT available (`billing-profile.json` does not exist):

Omit GCP data transfer fee estimates. Without billing data, there is no grounding for egress projections. Instead, include only this note in the output:

Set `migration_cost_considerations` to:

```json
{
  "categories": [],
  "billing_data_available": false,
  "note": "Data transfer cost estimates require GCP billing data. Re-run discovery with a GCP billing export to see GCP egress fee projections."
}
```

In the user-facing summary, when billing data is missing, state: "GCP data transfer egress estimates require billing data. Provide a billing export and re-run discovery to see vendor egress projections."

---

## Part 5: ROI Analysis

Present the monthly and annual cost difference between GCP baseline and each AWS tier (Premium, Balanced, Optimized). This is the recurring savings (or increase) the customer can expect.

- If AWS is cheaper: present the monthly and annual savings for each tier
- If AWS is more expensive: state clearly and note that cost savings alone do not justify migration -- operational benefits must be the driver

Operational efficiency factors to highlight (qualitative -- do not assign dollar values):

- Reduction in operational overhead from managed services (Fargate vs self-managed, RDS vs self-hosted DB)
- Reduced on-call burden from AWS-managed HA, patching, and scaling
- Engineering time freed for product work instead of infrastructure maintenance

Non-cost benefits to present: operational efficiency, global reach, service breadth, enterprise integration, vendor diversification, scaling flexibility (auto-scaling, spot instances, savings plans).

Note: GCP data transfer egress fees (if estimated in Part 4) are vendor one-time charges excluded from recurring ROI calculations -- not human migration costs.

---

## Part 6: Cost Optimization Opportunities

Present applicable optimizations with estimated savings:

| Optimization                       | Savings Range | Applies To                       | When                                    |
| ---------------------------------- | ------------- | -------------------------------- | --------------------------------------- |
| Reserved Instances / Savings Plans | 40-60%        | RDS, Aurora                      | Post-migration (after validating usage) |
| Compute Savings Plans              | 20-50%        | Fargate, Lambda                  | Post-migration                          |
| S3 Intelligent-Tiering / S3-IA     | 38-50%        | S3 storage                       | During migration                        |
| Spot Instances                     | 60-90%        | Batch/non-critical EC2 workloads | If batch jobs exist                     |

For each applicable optimization, calculate the before and after monthly cost.

---

## Part 7: Recommendation

Present 3 paths:

1. Migrate with Optimizations (Best ROI) -- optimized service choices, monthly cost, projected annual savings
2. Phased Migration (Lower Risk) -- cluster-by-cluster per design evaluation order, validate each before proceeding
3. Stay on GCP (Lowest Cost) -- only if AWS is more expensive and costs are the sole metric

Include migrate/stay decision factors:

- Migrate if: operational efficiency matters, AWS-specific services needed, batch workloads (Spot savings), long-term AWS strategy, growing infrastructure
- Stay if: cost is the only metric and AWS is more expensive, team deeply experienced with GCP, no need for AWS-specific services

---

## Output

Read `shared/schema-estimate-infra.md` for the `estimation-infra.json` schema and validation checklist, then write `estimation-infra.json` to `$MIGRATION_DIR/`.

## Completion Handoff Gate (Fail Closed)

Before returning control to `estimate.md`, require:

- `estimation-infra.json` exists and passes `shared/schema-estimate-infra.md` validation.

If this gate fails: STOP and output: "estimate-infra did not produce a valid `estimation-infra.json`; do not complete Phase 4."

## Present Summary

After writing `estimation-infra.json`, present a concise summary to the user:

1. Pricing source and accuracy: State whether prices came from cache or live API, and the accuracy range (+/-5-10% for infrastructure from cache/live, +/-15-25% if cache is stale). Example: "Estimates based on cached AWS pricing (2026-03-07), accuracy +/-5-10%."
2. GCP baseline vs AWS projected (balanced tier) -- one-line comparison
3. Three-tier table: Premium, Balanced, Optimized with monthly totals. Under or beside each label, use the short subtitles: Premium -- _Highest resilience / highest monthly estimate in this model_; Balanced -- _Default scenario; compare GCP to this first_; Optimized -- _Lower monthly estimate; reservations / Spot / storage trade-offs assumed_. Add a one-line How to read: three figures are pricing scenarios for the same architecture (high -> mid -> low); not three Terraform stacks. When Terraform is generated later, it aligns with Balanced.
4. Per-service cost breakdown (balanced tier, 1 line per service)
5. If billing data available: Estimated GCP data transfer egress fees. If billing data NOT available: "Data transfer cost estimates require GCP billing data."
6. Monthly and annual savings (or increase) vs GCP per tier
7. Top 2-3 optimization opportunities with savings amounts

Keep it under 25 lines. The user can ask for details or re-read `estimation-infra.json` at any time.

## Generate Phase Integration

The Generate phase (`generate.md`) uses `estimation-infra.json` as follows:

1. `projected_costs.breakdown` -- Budget allocation per cluster migration phase
2. `migration_cost_considerations` -- Data transfer egress cost estimates (if billing data available)
3. `optimization_opportunities` -- Which optimizations to implement and when (some during initial migration, some post-migration)
4. `cost_comparison` -- Set cost monitoring targets and alerts for each migrated cluster
5. `recommendation.next_steps` -- Prerequisites for starting generation
6. Cost tier vs Terraform -- Generated `terraform/` implements one baseline aligned with the Balanced scenario; Premium and Optimized are estimate-only bands unless the user changes IaC. See `generate-artifacts-infra.md` (`terraform/README.md`, `migration_summary` output).

The generated artifacts reference the cost estimates to set per-cluster cost monitoring thresholds and validate that actual AWS spend aligns with projections after each cluster migration.
