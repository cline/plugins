# Troubleshooting: App Runner to ECS Express Mode Migration

For each issue, use `ecs-mcp` to query live infrastructure and `awsknowledge` MCP tools to verify current API/policy names. Do not guess - diagnose from actual state.

---

## Service Won't Create

Invalid CPU/memory: Use `awsknowledge` MCP tools to look up current valid Fargate task sizes. Convert App Runner values using the mapping in SKILL.md.

Role errors: Present commands to inspect the role's trust policy. Task execution role must trust the ECS tasks service principal. Infrastructure role must trust the ECS service principal. Use `awsknowledge` MCP tools to look up exact principal names.

Policy not found: Use `awsknowledge` MCP tools to look up the current managed policy name for Express Mode infrastructure roles. Policy names can change - never assume them.

Image pull failure: Verify the image exists in ECR, the task execution role has the right managed policy, and (if using private subnets) NAT Gateway or VPC endpoints exist for ECR access.

Subnet issues: Verify subnets span at least 2 AZs with sufficient free IPs.

## Service Stuck Provisioning

Normal: 2-5 minutes. Monitor status via `ecs-mcp`.

If stuck beyond 10 minutes, present a CloudTrail lookup command to check recent ECS errors.

## Health Check Failures

Service ACTIVE but health check fails: Express Mode defaults to HTTP on `/ping`. If the app uses a different path, update the service. Use `ecs-mcp` to read container logs for startup errors.

Tasks keep restarting: Use `ecs-mcp` to get the stopped task reason and exit code:
- 137 → OOMKilled → increase memory
- 1 → application error → read logs
- 0 with restart → health check failing → check path and port

## Missing Environment Variables or Secrets

Use `ecs-mcp` to inspect the active service configuration and verify environment variables and secrets match what App Runner had.

If secrets access is denied, check the task execution role's permissions. Advise adding a scoped policy for specific secret ARNs - not a broad read/write policy.

## Custom Domain Issues

SSL error: Use `ecs-mcp` to inspect the ALB listener and verify the certificate is attached and covers the domain.

503 on custom domain: Use `ecs-mcp` to check the ALB listener rules and verify the host-header condition includes the custom domain.

## Route 53 Weighted Routing Not Working

List the DNS records for the domain. Both records must have the same Name and same Type with different SetIdentifiers.

Most common mistake: Mixing CNAME and Alias A record types. Route 53 treats these as separate record sets, not weighted alternatives. Use the same type for both.

Zone apex: Root domains (e.g., `example.com`) cannot use CNAME. Use Alias A for both or a subdomain.

## High Error Rate After Traffic Shift

Immediate action: Present Route 53 rollback commands - set App Runner weight to 100, Express Mode to 0.

Then use `ecs-mcp` to check ALB target health, container logs, and deployment alarm state.

## Cleanup

Never manually delete Express Mode managed resources (ALB, target groups, security groups). The delete API handles this - but always confirm with the user before executing.

CloudWatch logs persist after service deletion. Inform the user and let them decide whether to delete.

Orphaned resources from manual deletion: suggest force-deleting the service via the API. If that fails, advise opening an AWS Support case.
