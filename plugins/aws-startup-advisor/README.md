# AWS Startup Advisor

Plan startup-friendly AWS architectures, cost estimates, security baselines, migration paths, and early build workflows from Cline.

## What It Adds

- Registers `awsknowledge`, an AWS documentation and recommendation MCP server.
- Registers `awspricing`, a local AWS pricing MCP server launched with `uvx`.
- Bundles `aws-startup-knowledge` for AWS Activate, startup programs, partner offers, sample architectures, and startup learning resources.
- Bundles `aws-startup-prompts` for turning common startup prompt patterns into Cline-ready plans.
- Bundles `aws-startup-build` for codebase-aware AWS MVP and production-readiness discovery before implementation.
- Bundles `aws-startup-migration` for GCP-to-AWS and AI-provider-to-AWS migration planning.

## Install

```bash
cline plugin install aws-startup-advisor
```

For local development from this repository:

```bash
cline plugin install ./plugins/aws-startup-advisor --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Review this early-stage app and suggest the simplest AWS architecture, expected cost drivers, and first production hardening steps.
```

Cline can inspect the repo, use startup-focused skills for requirements and architecture decisions, consult AWS knowledge when current documentation matters, and use AWS pricing data when the user approves cost estimation.

## Cline Primitives

- MCP: `awsknowledge` exposes AWS documentation and recommendations for architecture, startup programs, migration, and service guidance.
- MCP: `awspricing` exposes AWS pricing lookups and cost analysis through a local `uvx`-launched MCP server.
- Skills: four prefixed `aws-startup-*` skills cover knowledge lookup, prompt patterns, build discovery, and migration workflows.

## Requirements

- `uvx` available on PATH for the local pricing MCP server.
- First launch may download and execute the pinned `awslabs.aws-pricing-mcp-server@1.0.31` package through `uvx`.
- Optional AWS credentials through the AWS CLI, IAM Identity Center, or environment variables for explicitly approved AWS API usage.
- IAM permissions scoped to AWS Pricing API access and any approved live AWS reads.
- Optional AWS CLI, Terraform, CDK, SAM, Docker, or application CLIs depending on the workflow.

## Trust Boundaries

Use AWS knowledge queries for sanitized documentation questions. Do not send secrets, customer data, private source code, account IDs, billing exports, pitch materials, investor data, or unreleased architecture details unless the user explicitly approves the minimum necessary context.

Installing this plugin does not launch `uvx`. Cline hosts may launch enabled MCP servers when they initialize MCP tools, so `awspricing` can download and execute its pinned package before the first pricing tool call in that host session. Users who do not want that package execution should disable or remove the `awspricing` MCP entry until they need pricing support.

Ask before pricing lookups tied to private architecture, account inventory reads, Cost Explorer queries, migration discovery, IaC generation, infrastructure changes, IAM changes, deployment commands, service quota requests, or any cost-bearing action.

This plugin does not install separate startup agents, rewrite account settings, or run automatic hooks.
