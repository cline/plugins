# migration-to-aws

Structured GCP-to-AWS migration planning for Cline.

## What It Does

This plugin adds a `gcp-to-aws` skill for assessing GCP infrastructure, Terraform projects, billing exports, and AI application code before planning an AWS migration. The workflow discovers source assets, asks migration-scoping questions, designs AWS service mappings, estimates costs, and can generate migration artifacts such as Terraform, scripts, provider adapters, and documentation under `.migration/`.

## Cline Primitives

- MCP: registers `aws-knowledge` for AWS documentation, regional availability, and architecture guidance.
- Skill: bundles `gcp-to-aws`, a phased migration workflow for Discover, Clarify, Design, Estimate, and Generate.

## Requirements

- At least one migration input source: Terraform files, application code, or GCP billing/cost exports.
- Optional: a user-managed AWS Pricing MCP if the user wants live pricing beyond the bundled pricing references.
- AWS credentials in the normal AWS environment or config files when using generated AWS commands or a separately configured pricing MCP.
- Permission to create a local `.migration/` directory in the workspace.

## Trust Boundary

The plugin does not run migration commands or local MCP executables at install time. Generated migration artifacts stay in the local `.migration/` directory unless the user asks to move or commit them. Treat billing exports, Terraform state, and generated migration plans as sensitive project data.
