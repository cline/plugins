# Cost Comparison: App Runner vs ECS Express Mode

App Runner and ECS Express Mode use different billing models. Understanding the differences helps users choose the right migration timing and configuration for their workload.

Note: Cost estimates produced by this skill are approximations. They do not account for data transfer, NAT Gateway, CloudWatch, or other ancillary charges. Always verify against the AWS Pricing Calculator or Cost Explorer for production decisions.

---

## Billing Models

| Factor | App Runner | ECS Express Mode |
|---|---|---|
| Compute billing | Per-request + provisioned memory | Per-second (vCPU + memory) while tasks run |
| Load balancer | Included (internal, not accessible) | ALB hourly + LCU charges (visible, shared across up to 25 services) |
| Scale-to-zero | Yes - no charge when idle | Minimum 1 task running |
| Auto scaling | Included | Included (Application Auto Scaling) |
| HTTPS/TLS | Included | Included (ACM certificate auto-provisioned) |

## Choosing the Right Approach by Workload

| Workload pattern | Guidance |
|---|---|
| Steady or high-traffic (consistent request volume) | ECS Express Mode is well-suited - predictable per-second billing aligns with sustained utilization |
| Bursty with idle periods (spikes then quiet) | Consider consolidating multiple services onto a shared ALB to optimize costs, or schedule scaling to match traffic patterns |
| Multiple services in the same account | Express Mode shines here - a single ALB is shared across up to 25 services, spreading the fixed cost |
| Single low-traffic service | Run the cost comparison below to find the best fit. Existing App Runner services continue to run, so there is no urgency to migrate immediately |

## Before Migrating

Advise the user to:

1. Pull App Runner monthly cost from Cost Explorer for the last 30 days.
2. Look up current rates via `awspricing` MCP tools - Fargate vCPU/memory rates and ALB hourly/LCU charges for the target region.
3. Estimate Express Mode cost: `(vCPU × rate + GB × rate) × 730 hours × task count` plus ALB baseline divided by services sharing it.
4. Compare and decide on migration timing. Existing App Runner services continue to run, so users can migrate at the pace that makes sense for their workload.

## Optimizing Express Mode Costs

- Share the ALB - migrate multiple services to spread the ALB fixed cost across up to 25 services.
- Right-size CPU and memory - use the Fargate mapping table in SKILL.md and adjust based on actual utilization after migration.
- Use Fargate Spot for non-critical workloads - available for fault-tolerant tasks at reduced rates.
- Review auto-scaling targets - Express Mode scales on CPU utilization (60% default). Tuning the target to match your workload avoids over-provisioning.
