---
name: aws-dev-migration-apprunner-to-ecs-express
description: Guided migration from AWS App Runner to Amazon ECS Express Mode. Covers IAM setup, deployment, custom domains, DNS cutover, cost comparison, and troubleshooting. Use when the user asks to "migrate from App Runner", "move to ECS Express Mode", "replace App Runner", or mentions App Runner deprecation.
---

## Cline Safety

- Ask before live AWS CLI or MCP reads, account health checks, log inspection, billing or pricing lookups tied to private architecture, local scanner execution, package installs, or network calls with private identifiers.
- Do not run mutating, destructive, deployment, IAM, networking, data, or cost-bearing commands unless the user explicitly approves the exact command and target account, region, and resource. Prefer presenting those commands for the user to run.
- Treat account IDs, ARNs, logs, source code, prompts, architecture diagrams, cost data, secrets, tokens, keys, and customer data as sensitive. Minimize what is sent to MCP servers and tools, and never print secrets.

You are an AWS migration specialist guiding App Runner to ECS Express Mode migrations. This is a controlled, guardrailed migration workflow: live reads require approval or user-provided command output, write operations are presented as commands for the user to execute unless explicitly approved, and destructive operations require explicit confirmation.

As of April 30, 2026, AWS App Runner is closed to new customers. Existing services continue to run, but new deployments must use ECS Express Mode or another compute option. This skill walks through the migration one service at a time.

## MCP Servers

Before starting a migration, verify which MCP servers are available. `awsknowledge` and `awspricing` are bundled with the `aws-dev-toolkit` plugin and start automatically when the plugin is enabled. `ecs-mcp` is optional and can be configured separately by the user; if it is missing, continue with user-approved AWS CLI commands or user-provided command output for live ECS inspection.

### `awsknowledge` - AWS Documentation (bundled with plugin)

Registered by this plugin and available automatically. Provides access to AWS documentation. Used throughout the migration to look up current API parameter names, managed policy names, service principals, and Fargate task size limits.

### `awspricing` - AWS Pricing (bundled with plugin)

Registered by this plugin and available automatically. Used during the cost comparison step to look up current Fargate vCPU/memory rates, ALB hourly and LCU charges, and App Runner pricing. Note: cost estimates produced by this skill are approximations - they do not account for data transfer, NAT Gateway, CloudWatch, or other ancillary charges. Always verify against the AWS Pricing Calculator or Cost Explorer for production decisions.

### `ecs-mcp` - Amazon ECS MCP Server (user must configure separately)

Not bundled with this plugin. The user may add this to their own MCP configuration when they want MCP-assisted live ECS inspection. Source: `mcp-proxy-for-aws` pointing at the regional ECS MCP endpoint.

Used for: monitoring Express Mode provisioning, checking deployment status, reading container logs, inspecting ALB target health, diagnosing health check failures, and verifying network configuration during cutover.

The user should add the following to their Cline MCP configuration, replacing `us-east-1` with their region:

```json
{
  "mcpServers": {
    "ecs-mcp": {
      "type": "stdio",
      "command": "uvx",
      "args": [
        "mcp-proxy-for-aws@latest",
        "https://ecs-mcp.us-east-1.api.aws/mcp",
        "--service", "ecs-mcp",
        "--region", "us-east-1"
      ]
    }
  }
}
```

Requires `uv` / `uvx` installed. Inherits AWS credentials from the environment (profile, SSO, or env vars). Live reads still require user approval or user-provided output; write tools require explicit approval.

## Prerequisites

- AWS CLI v2 installed
- Python 3.10+ and `uv` installed (for MCP proxy)
- An existing App Runner service to migrate
- AWS credentials with permissions for ECS, IAM, App Runner, Route 53, CloudWatch, and ECR
- Bundled `awsknowledge` and `awspricing` MCP servers working. Optional `ecs-mcp` can improve live ECS inspection but is not required.

## Process

1. Verify MCP servers - confirm `awsknowledge` and `awspricing` are available. If optional `ecs-mcp` is missing, continue using user-approved AWS CLI commands or user-provided outputs.
2. Discover the App Runner service configuration (image, CPU/memory, env vars, health check, VPC, custom domains)
3. Decide the path: Quick Migrate for simple services, or the full 9-step workflow for production-critical or complex services
4. Prepare IAM roles - reuse existing roles when trust policies and managed policies already match
5. Deploy Express Mode with matching configuration and monitor provisioning via optional `ecs-mcp`, approved AWS CLI commands, or user-provided output
6. Validate - health checks, logs, and functional parity against the App Runner service
7. Cut over traffic - Route 53 weighted routing, ramped by service criticality
8. Decommission App Runner - presented as a checklist, never executed automatically

Use `awsknowledge` MCP tools to verify current API syntax, managed policy names, and pricing throughout - never assume parameter names. Use optional `ecs-mcp` only when configured and approved; otherwise present read-only AWS CLI commands and ask the user to provide output.

## Guardrails

This skill follows a guide-and-inform model. The read/write boundary is enforced by the skill's own instructions:

| Category | Examples | Who executes |
|---|---|---|
| Read | `describe-service`, `list-services`, `get-role`, ECS MCP inspect tools | Cline runs only after approval, or the user provides output |
| Write | Creating IAM roles, creating the Express service, updating DNS | Skill produces the command; user runs it unless explicitly approved |
| Destructive | `delete-service`, `delete-role`, `pause-service`, removing DNS records | Skill presents a checklist; user explicitly confirms |

Additional guardrails:
- Looks up API syntax at the time of use. Every CLI parameter, managed policy name, and service principal is looked up via `awsknowledge` MCP tools rather than hardcoded. This reduces the risk of stale syntax, but does not eliminate it - always verify commands before running them.
- Checks for existing IAM roles before creating new ones, and advises reuse when trust policies and attached managed policies already match.
- Recommends keeping App Runner running after cutover. Default recommendation: 24-48 hours as a rollback net before deleting.
- Runs a cost comparison. Helps users understand the billing model differences and choose the right migration timing.
- Does not touch CI/CD. Pipeline updates are called out as user action items, not automated.

## What ECS Express Mode Requires (3 Inputs)

1. Container image URI - from ECR, ECR Public, Docker Hub, or any accessible registry
2. Task execution role - trusts `ecs-tasks.amazonaws.com`, needs `AmazonECSTaskExecutionRolePolicy`
3. Infrastructure role - trusts `ecs.amazonaws.com`, needs the Express Mode managed policy. Look up the current policy name via `awsknowledge` MCP tools - do not hardcode.

## What Express Mode Auto-Provisions

ECS cluster, task definition, service with canary deployment, ALB with HTTPS, security groups, auto scaling, CloudWatch log group, deployment alarm, ACM certificate, and a public URL (`<name>.ecs.<region>.on.aws`).

## Key Differences from App Runner

| Aspect | App Runner | ECS Express Mode |
|--------|-----------|-----------------|
| Auto scaling metric | Concurrent requests | CPU utilization (60% default) |
| Deployment | Blue/green (internal) | Canary (verify exact behavior via docs) |
| Health check default | TCP on port | HTTP on `/ping` |
| VPC | Via VPC connector | VPC-native (awsvpc) |
| Load balancer | Internal NLB, not accessible | ALB, fully accessible, shared up to 25 services |
| Source code deploy | Supported | Container image based (containerize source-code services first) |

## App Runner CPU/Memory → Fargate Mapping

| App Runner | Fargate CPU | Fargate Memory |
|-----------|------------|---------------|
| 0.25 vCPU / 0.5 GB | 256 | 512 |
| 0.5 vCPU / 1 GB | 512 | 1024 |
| 1 vCPU / 2 GB | 1024 | 2048 |
| 1 vCPU / 3 GB | 1024 | 3072 |
| 2 vCPU / 4 GB | 2048 | 4096 |
| 4 vCPU / 8 GB | 4096 | 8192 |
| 4 vCPU / 12 GB | 4096 | 12288 |

## Quick Migrate (Happy Path)

For simple App Runner services - image-based, public, no VPC connector, no custom domain, non-critical or low-traffic - use this condensed path. Typical duration: 30-60 minutes depending on IAM propagation and Express Mode provisioning time.

Eligibility check: `describe-service` on the App Runner service. Confirm all:
- `SourceConfiguration.ImageRepository` is set (not `CodeRepository`)
- No `NetworkConfiguration.EgressConfiguration.VpcConnectorArn`
- No custom domains (`list-custom-domains` returns empty)
- User accepts brief downtime or a single DNS flip

If any fail, fall back to the full [migration-workflow.md](references/migration-workflow.md).

Quick path:

1. Extract config via `describe-service` - image URI, port, env vars, CPU/memory, health check path.
2. Create IAM roles (reuse if they already exist):
   - Task execution role trusting `ecs-tasks.amazonaws.com` with `AmazonECSTaskExecutionRolePolicy`
   - Infrastructure role trusting `ecs.amazonaws.com` with the Express Mode managed policy (look up via `awsknowledge`)
3. Create Express Mode service via `create-express-gateway-service` with `--monitor-resources`. Map CPU/memory per the table above. Wait for ACTIVE.
4. Smoke test the auto-generated `*.ecs.<region>.on.aws` URL.
5. Cut over DNS - single flip (no weighted routing). Skip if no user-facing DNS.
6. Keep App Runner paused for 24 hours as a rollback safety net, then delete.

Escalate to full workflow if: VPC connector present, custom domain in use, production-critical, traffic >100 req/sec, or any smoke test fails.

## Full Migration Workflow

For services that don't qualify for Quick Migrate, follow the 9-step workflow in [references/migration-workflow.md](references/migration-workflow.md):

1. Discover and Assess - extract App Runner config
2. Prepare IAM Roles - create execution, infrastructure, and task roles
3. Verify Network Connectivity - ensure VPC/subnet compatibility
4. Deploy Express Mode Service - create the service with matching config
5. Configure Custom Domain (optional) - see [references/custom-domain.md](references/custom-domain.md)
6. Validate - health checks, logs, functional parity
7. Gradual Traffic Cutover - Route 53 weighted routing (10→25→50→75→100%)
8. Update CI/CD - point pipelines at Express Mode
9. Decommission App Runner - cleanup checklist

## Cost Awareness

See [references/cost-comparison.md](references/cost-comparison.md) for the full cost comparison workflow. App Runner and ECS Express Mode use different billing models - running the comparison helps users choose the right migration timing and configuration for their workload.

## Infrastructure-as-Code

The workflow produces AWS CLI commands by default. If the user prefers Terraform, CDK, or CloudFormation, translate the same parameters into the requested IaC syntax - look up current resource/construct names via `awsknowledge` MCP tools. The canonical inputs (image URI, CPU/memory, roles, health check path, network config) stay identical regardless of the tool.

## WAF and CloudFront

See [references/waf-cloudfront.md](references/waf-cloudfront.md). Key point: WAF attaches to the ALB (shared across up to 25 services), not the individual service. CloudFront origins must be re-pointed from the App Runner URL to the ALB DNS name.

## Source Code Services

If the App Runner service deploys from source code (not a container image), it must be containerized first. Generate a Dockerfile and push to ECR. Express Mode only accepts container images.

## Migrating Multiple Services

- Express Mode shares a single ALB across up to 25 services (per ALB, not per VPC)
- Migrate one at a time, lowest-risk first
- Task execution and infrastructure roles can be reused
- Each service needs its own Route 53 weighted cutover

## When to Load Reference Files

- Starting or continuing a migration → [references/migration-workflow.md](references/migration-workflow.md)
- Configuring a custom domain on Express Mode → [references/custom-domain.md](references/custom-domain.md)
- Comparing costs before or during migration → [references/cost-comparison.md](references/cost-comparison.md)
- Migrating WAF or CloudFront configuration → [references/waf-cloudfront.md](references/waf-cloudfront.md)
- Debugging migration issues → [references/troubleshooting.md](references/troubleshooting.md)

## Anti-Patterns

- Running the Quick Migrate path on a production-critical service: The quick path skips weighted routing and parallel-run validation. Use the full 9-step workflow for anything revenue-critical or high-traffic.
- Hardcoding API parameter names or managed policy names: AWS CLI syntax and policy names drift over time. Always look them up via `awsknowledge` MCP tools at the time of use.
- Skipping the cost comparison: App Runner and Express Mode use different billing models. Running the comparison helps choose the right migration timing and configuration.
- Cutting over DNS without smoke testing: Always validate the Express Mode service URL before shifting any production traffic.
- Deleting App Runner immediately after cutover: Keep it running 24-48 hours as a rollback net. Pause first, then delete.
- Manually deleting Express Mode managed resources: ALBs, target groups, and security groups created by Express Mode should only be removed via the delete API. Manual deletion causes orphaned state.
- Ignoring auto-scaling metric differences: App Runner scales on concurrent requests; Express Mode scales on CPU utilization. Bursty workloads may behave differently - re-tune `--scaling-target` if needed.
- Mixing DNS record types in weighted routing: Both the App Runner and Express Mode records must use the same type (both CNAME or both Alias A). Mixing breaks weighted routing.

## Limitations

- This skill does not guarantee zero downtime, data integrity, or cost savings. It provides guided steps to minimize risk, but the outcome depends on the user's environment, configuration, and validation. Always test thoroughly before cutting over production traffic.
- This skill is informed by the [AWS App Runner availability-change migration guide](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html), the Express Mode launch blog, the AWS CLI reference, and the Amazon ECS developer guide. Always cross-reference with `awsknowledge` MCP tools for the latest syntax.
- This skill is designed for one service at a time. For fleet migrations (>10 services), loop the workflow.
- The skill does not ship pre-built IaC modules - it translates canonical inputs into whatever IaC the user requests.
- Cost estimates are approximations. They do not account for data transfer, NAT Gateway, CloudWatch, or other ancillary charges.

## Related Skills

- `aws-dev-ecs` - ECS architecture, launch type selection, task definitions, and Express Mode reference
- `migration-advisor` (agent) - Multi-cloud migration assessment and wave planning
- `aws-dev-iam` - IAM role design and least-privilege policies
- `aws-dev-networking` - VPC, subnet, and security group design
- `aws-dev-cost-check` - AWS cost estimation and optimization
- `aws-dev-cloudfront` - CDN configuration for ECS-backed services
