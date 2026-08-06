# Security Services Design Rubric

Applies to: Secret Manager and encryption/identity-adjacent security resources.

## Deterministic mappings

| GCP Service Type                       | AWS Service     | Notes                                                                                      |
| -------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `google_secret_manager_secret`         | Secrets Manager | Create one secret metadata resource.                                                       |
| `google_secret_manager_secret_version` | Secrets Manager | Represent current value as a secret version or migration TODO if plaintext is unavailable. |

## Secret migration rules

1. Never place cleartext secrets directly in generated Terraform variable defaults.
2. Generate Secrets Manager resources and reference them from compute/database resources via ARN, not plaintext environment values.
3. If source secret values are not available from discovery inputs, generate TODO placeholders with explicit migration steps.
4. Add least-privilege IAM access scoped to specific secret ARNs.

## Costing handoff

When `aws_service = "Secrets Manager"` is selected, estimate:

- Per-secret monthly storage cost
- API call cost (per 10K requests)

Use `shared/pricing-cache.md` first; use `estimate-infra.md` MCP fallback recipes only if needed.
