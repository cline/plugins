---
name: gcp-to-aws
description: Migrate workloads from Google Cloud Platform to AWS, including GCP infrastructure, Terraform-managed services, billing exports, and AI or agentic application code. Use when the user asks to migrate from GCP to AWS, estimate AWS migration costs, map Cloud Run or Cloud SQL to AWS, move OpenAI or Gemini workloads to Bedrock, or generate a phased AWS migration plan.
---

# GCP-to-AWS Migration

Use this skill to run a structured GCP-to-AWS migration assessment. It discovers source assets, clarifies migration requirements, designs an AWS architecture, estimates AWS costs, and generates migration artifacts.

## Scope

Use this skill for:

- GCP infrastructure migrations to AWS.
- Terraform-based GCP estates.
- GCP billing export analysis for migration sizing.
- Cloud Run, Cloud SQL, GKE, Cloud Functions, Pub/Sub, Cloud Storage, VPC, DNS, and related service mappings.
- AI provider migration planning such as OpenAI, Gemini, Anthropic, LangChain, LangGraph, CrewAI, AutoGen, and custom agent loops to Amazon Bedrock or AWS-native agent infrastructure.

Do not use this skill for:

- Azure or on-premises migrations to AWS.
- AWS-to-GCP reverse migrations.
- General AWS architecture advice with no migration intent.
- GCP-to-GCP refactors.
- Multi-cloud designs that do not involve migrating off GCP.

## Operating Defaults

- Re-platform by default: choose AWS services that match the current GCP workload shape before proposing deeper rewrites.
- Use development-tier sizing unless the user provides production traffic, availability, compliance, or cost constraints.
- Do not present human labor, professional services, or people-time work as dollar estimates.
- Use Terraform as the default generated IaC format.
- Preserve existing application architecture patterns unless the user asks for a modernization plan.
- Estimate costs before generating infrastructure code.
- Use bundled pricing references by default with an explicit accuracy caveat. Use live AWS Pricing MCP data only when the user has separately configured and authorized such a server.

## Inputs

The user must provide at least one source:

- Terraform files: `.tf`, `.tfvars`, or `.tfstate`.
- Application code with GCP SDK, AI SDK, or AI framework usage.
- GCP billing or cost export files in CSV or JSON.

If none are present, stop and ask the user for at least one source type.

## Migration State

State lives in one run-specific directory under `.migration/`, for example `.migration/0226-1430/`.

The status file is `$MIGRATION_DIR/.phase-status.json`:

```json
{
  "migration_id": "0226-1430",
  "last_updated": "2026-02-26T15:35:22Z",
  "current_phase": "design",
  "phases": {
    "discover": "completed",
    "clarify": "completed",
    "design": "in_progress",
    "estimate": "pending",
    "generate": "pending"
  }
}
```

Valid phases are `discover`, `clarify`, `design`, `estimate`, and `generate`.
Valid status values are `pending`, `in_progress`, and `completed`.

## Phase Order

Run phases in this order:

1. Discover: scan Terraform, app code, and billing exports.
2. Clarify: ask targeted questions and record preferences.
3. Design: map source workloads to AWS architecture.
4. Estimate: produce AWS cost estimates.
5. Generate: create migration artifacts and documentation.

Never enter Design, Estimate, or Generate until Clarify has completed. There is no quick-skip exception.

## State Validation

Before every phase:

1. Find `$MIGRATION_DIR`. If multiple `.migration/*/` directories exist, list them and ask whether to resume latest, start fresh, or cancel.
2. Read `$MIGRATION_DIR/.phase-status.json` when present.
3. If status JSON is invalid, stop and ask the user to repair or delete it.
4. If `current_phase` is present, it must be one of the valid phases.
5. If any phase status is not `pending`, `in_progress`, or `completed`, stop.
6. If a later phase is complete while an earlier phase is incomplete, stop and ask the user to reconcile the state file.
7. At most one phase can be `in_progress`.

## Execution Protocol

When invoked:

1. Determine the current phase from `.phase-status.json`; if missing, initialize a new migration directory and start Discover.
2. Load the phase reference file for the selected phase.
3. Execute the phase steps in order.
4. Before a phase completion, load `references/shared/handoff-gates.md` and validate required outputs.
5. Advance phase state only after the phase emits `HANDOFF_OK`.
6. Use read-merge-write updates for `.phase-status.json`; preserve prior completed phases.
7. Re-read artifacts from disk before each phase and handoff gate. Do not rely on chat memory.
8. If a gate emits `GATE_FAIL`, stop, explain the failure, and do not update state to force progress.

Phase reference files:

| Phase | Load |
| --- | --- |
| Discover | `references/phases/discover/discover.md` |
| Clarify | `references/phases/clarify/clarify.md` |
| Design | `references/phases/design/design.md` |
| Estimate | `references/phases/estimate/estimate.md` |
| Generate | `references/phases/generate/generate.md` |

## MCP Servers

This plugin registers one MCP server:

- `aws-knowledge`: AWS documentation, regional availability, and architecture guidance.

If the user has separately configured an AWS Pricing MCP server, use it for missing or stale pricing data. Otherwise use the bundled pricing references, mark estimates with the appropriate cached or stale pricing source, and include the expected accuracy range.

## Reference Loading

Keep context bounded:

- Load phase references on demand.
- Load conditional AI references only when discovery shows matching AI providers or agentic frameworks.
- Do not speculatively load every reference file.
- Re-read required artifacts from `.migration/` before making phase decisions.

Conditional design references:

| File | Condition |
| --- | --- |
| `references/design-refs/ai-gemini-to-bedrock.md` | `ai-workload-profile.json` exists and `summary.ai_source` is `gemini` or `both` |
| `references/design-refs/ai-openai-to-bedrock.md` | `ai-workload-profile.json` exists and `summary.ai_source` is `openai` or `both` |
| `references/design-refs/ai-anthropic-to-bedrock.md` | `ai-workload-profile.json` exists and `summary.ai_source` is `anthropic` |
| `references/design-refs/ai.md` | `ai-workload-profile.json` exists and `summary.ai_source` is `other` |
| `references/design-refs/design-ref-harness.md` | `agentic_profile.is_agentic == true` and selected approach is `harness` |
| `references/design-refs/design-ref-agentic-to-agentcore.md` | `agentic_profile.is_agentic == true` and selected approach is `strands` |
| `references/shared/retarget-gotchas.md` | `agentic_profile.is_agentic == true` and selected approach is `retarget` |

## Outputs

Depending on the input source and phase path, the migration can generate:

- `gcp-resource-inventory.json`
- `gcp-resource-clusters.json`
- `ai-workload-profile.json`
- `billing-profile.json`
- `preferences.json`
- `aws-design.json`, `aws-design-ai.json`, or `aws-design-billing.json`
- `estimation-infra.json`, `estimation-ai.json`, or `estimation-billing.json`
- `generation-infra.json`, `generation-ai.json`, or `generation-billing.json`
- `terraform/`
- `scripts/`
- `ai-migration/`
- `MIGRATION_GUIDE.md`
- `README.md`

The `.migration/` directory should include a `.gitignore` so generated planning artifacts are not accidentally committed unless the user explicitly asks.
