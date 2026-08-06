---
name: aws-dev-iac-scaffold
description: Scaffold new AWS infrastructure-as-code projects using CDK, Terraform, SAM, or CloudFormation. Use when creating new IaC projects, adding new stacks/modules, or setting up deployment pipelines for AWS infrastructure.
---

## Cline Safety

- Ask before live AWS CLI or MCP reads, account health checks, log inspection, billing or pricing lookups tied to private architecture, local scanner execution, package installs, or network calls with private identifiers.
- Do not run mutating, destructive, deployment, IAM, networking, data, or cost-bearing commands unless the user explicitly approves the exact command and target account, region, and resource. Prefer presenting those commands for the user to run.
- Treat account IDs, ARNs, logs, source code, prompts, architecture diagrams, cost data, secrets, tokens, keys, and customer data as sensitive. Minimize what is sent to MCP servers and tools, and never print secrets.

Scaffold a new AWS IaC project.

Use the framework and project description from the user's request. If either is unclear, ask before generating files. Supported frameworks: CDK, Terraform, SAM, or CloudFormation.

## Process

1. Ask clarifying questions if the framework or description is unclear
2. Use the `awsiac` MCP tools to validate resource configurations and check for security issues
3. Use the `awsknowledge` MCP tools to look up current best practices for the chosen framework
4. Generate the project structure following the patterns in [templates/](templates/). Before writing files, tell the user the target workspace path and ask for approval unless they already explicitly asked you to scaffold files there.

## Framework-Specific Guidance

### CDK (TypeScript default)
- Use `cdk init app --language typescript` patterns
- Separate stacks by lifecycle (networking, data, compute)
- Use `cdk-nag` for compliance checks
- Outputs for cross-stack references

### Terraform
- Module-per-service structure
- Remote state in S3 + DynamoDB locking
- Use `terraform-aws-modules` where they exist
- Separate tfvars per environment

### SAM
- template.yaml at root
- Globals section for shared Lambda config
- Use SAM Accelerate for fast iteration

### CloudFormation
- Nested stacks for reuse
- Parameters with AllowedValues for guardrails
- Conditions for multi-environment templates

## Gotchas

- Always include a `.gitignore` appropriate for the framework
- CDK: don't put secrets in context - use SSM Parameter Store or Secrets Manager
- Terraform: never commit `.tfstate` - configure remote backend first
- SAM: `sam local` needs Docker - mention this in the README
- All frameworks: tag everything with at minimum `Environment`, `Project`, `Owner`
- Include a Makefile or justfile with common commands (deploy, destroy, diff, synth)

## Output

Generate the complete project structure with:
1. Entry point / main config file
2. At least one example resource
3. Environment-specific configuration
4. README with setup instructions
5. CI/CD pipeline config (GitHub Actions default, ask if different)
