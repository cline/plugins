# AWS Dev Toolkit

Adds AWS development guidance for Cline, with AWS documentation, infrastructure analysis, and pricing MCP servers plus detailed skills for architecture, migration, debugging, service design, and operations.

## What It Adds

- Registers `awsknowledge`, an AWS documentation and recommendation MCP server.
- Registers `awsiac`, a local AWS IaC MCP server for CloudFormation, CDK, Terraform, and SAM validation workflows.
- Registers `awspricing`, a local AWS pricing MCP server for pricing lookups and cost-aware architecture comparisons.
- Bundles 35 Cline skills for AWS planning, Well-Architected review, IaC review, debugging, cost optimization, migration, containers, serverless, networking, observability, storage and data stores, ML/AI, IoT, and agent platform design.

## Install

```bash
cline plugin install aws-dev-toolkit
```

For local development from this repository:

```bash
cline plugin install ./plugins/aws-dev-toolkit --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Review this Terraform service for AWS security, reliability, and cost issues, then suggest a simpler deployment plan.
```

Cline can use the bundled skills to plan the review, consult AWS docs, run local IaC checks when approved, compare costs, and produce actionable architecture feedback.

## Cline Primitives

- MCP: `awsknowledge` exposes AWS documentation search and recommendations.
- MCP: `awsiac` exposes IaC validation and security review helpers through a local `uvx`-launched MCP server.
- MCP: `awspricing` exposes AWS pricing data through a local `uvx`-launched MCP server.
- Skills: 35 prefixed `aws-dev-*` workflow skills cover the toolkit's main AWS development lanes while avoiding collisions with narrower AWS plugins or user-defined skills.

## Requirements

- `uvx` available on PATH for the local IaC and pricing MCP servers.
- First launch may download and execute the pinned `awslabs.aws-iac-mcp-server@1.0.19` and `awslabs.aws-pricing-mcp-server@1.0.31` packages through `uvx`.
- AWS credentials configured through the AWS CLI, IAM Identity Center, or environment variables for live account inspection.
- Optional local scanners such as `checkov`, `cfn-nag`, `tfsec`, CDK, Terraform, SAM, Docker, `kubectl`, or `eksctl` depending on the workflow.
- IAM permissions scoped to the requested AWS services and accounts.

## Trust Boundaries

The skills require confirmation before live AWS API calls, account health checks, log reads, pricing lookups tied to private architecture, IaC scanner execution, deployment commands, IAM changes, network changes, or any cost-bearing or mutating operation.

For AWS MCP documentation lookups, reduce the request to a sanitized docs question. For live AWS MCP API calls or local IaC analysis, send only the minimum approved identifiers, template snippets, and payload needed for the requested operation. Do not include secrets, unneeded account IDs, customer data, private code unrelated to the review, log payloads, billing details, or confidential architecture.
