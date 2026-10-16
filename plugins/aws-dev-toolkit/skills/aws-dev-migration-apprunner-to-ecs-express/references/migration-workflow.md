# Migration Workflow: App Runner to ECS Express Mode

At each step, use the `awsknowledge` MCP tools to look up current API syntax and the `ecs-mcp` MCP to inspect live infrastructure. Supplement with web search for blog posts and community solutions. Present commands for the user to execute - do not run writes directly. Never assume parameter names; verify via `awsknowledge` MCP tools.

---

## Step 1: Discover and Assess

Goal: Understand the current App Runner service configuration.

Ask the user for their App Runner service ARN. Use `awsknowledge` MCP tools to look up the current `describe-service` API syntax, then present the command for the user to run. Extract:

- Source type - image-based or source-code-based. If source-code, stop: the user must containerize first (Dockerfile → ECR). Express Mode only accepts images.
- Container image, port, environment variables - these transfer directly.
- CPU and memory - convert to Fargate units using the mapping in SKILL.md.
- Instance role - if set, the app calls AWS APIs at runtime and needs a task role on Express Mode.
- Health check config - protocol and path. Express Mode defaults to HTTP on `/ping`.
- VPC connector - if egress goes through a VPC, Express Mode must be in the same VPC.
- Custom domains - if present, these need reconfiguration on the Express Mode ALB (Step 5).
- Auto-deploy from ECR - if enabled, disable it before proceeding.

Present the extracted configuration to the user for confirmation before proceeding.

---

## Step 2: Prepare IAM Roles

Goal: Create the IAM roles Express Mode requires.

Present commands for the user to check if suitable roles already exist before creating new ones. Use `awsknowledge` MCP tools to look up current managed policy names - never hardcode them.

1. Task execution role - allows ECS to pull images and write logs.
2. Infrastructure role - allows ECS to provision ALB, security groups, auto scaling. Cannot be changed after service creation.
3. Task role (conditional) - only needed if Step 1 found an App Runner instance role. Either update the existing role's trust policy to also trust ECS, or create a new role with the same permissions.

---

## Step 3: Verify Network Connectivity

Goal: Ensure Express Mode can reach the same backends as App Runner.

If no VPC connector was found in Step 1: Express Mode will need a VPC. Present commands for the user to verify the default VPC exists in the target region. If the default VPC has been deleted, the user must specify a VPC, subnets, and security groups explicitly.

If a VPC connector was found: Present commands for the user to:
- Get the VPC connector's subnets and security groups
- Verify subnets span at least 2 AZs with sufficient free IPs
- Verify internet access exists (NAT Gateway or VPC endpoints)

Record the network configuration for Step 4.

---

## Step 4: Deploy Express Mode Service

Goal: Create the Express Mode service with matching configuration.

Use `awsknowledge` MCP tools to look up the current `create-express-gateway-service` API parameters. Present the create command with:
- Container image, port, environment variables, and secrets from Step 1
- CPU and memory in Fargate units from Step 1
- Health check path from Step 1 (set explicitly if different from Express Mode default)
- Task execution role and infrastructure role from Step 2
- Task role from Step 2 (if applicable)
- Network configuration from Step 3 (if applicable)

Use `ecs-mcp` to monitor provisioning and wait for the service to reach ACTIVE status. Retrieve the auto-generated service URL via `ecs-mcp`.

---

## Step 5: Configure Custom Domain (Optional)

Goal: Make Express Mode accessible on the same custom domain as App Runner.

Skip if no custom domain was found in Step 1.

→ Load [custom-domain.md](custom-domain.md) for the workflow.

---

## Step 6: Validate

Goal: Confirm Express Mode achieves functional parity with App Runner before sending real traffic. Note: behavior will not be identical - auto-scaling, health checks, and load balancing work differently. Focus on verifying that the application responds correctly and backend connectivity works.

Check:

1. Health - hit the service URL with the health check path. Expect the same response as App Runner.
2. Logs - use `ecs-mcp` to read container logs. Check for startup errors, missing config, connection failures.
3. Deployment alarm - use `ecs-mcp` to verify the auto-created CloudWatch alarm is in OK state.
4. Functional parity - ask the user to run smoke tests against the Express Mode URL.
5. Observability - use `ecs-mcp` to identify the new CloudWatch log group and remind the user to update monitoring tools and dashboards.

Gate: Get explicit user confirmation that all checks pass before proceeding.

---

## Step 7: Gradual Traffic Cutover

Goal: Shift production traffic from App Runner to Express Mode while minimizing downtime risk. Note: DNS-based cutover cannot guarantee zero downtime - DNS propagation delays, client-side caching, and TTL behavior mean some requests may still reach the old endpoint during transitions.

Present Route 53 weighted routing commands for DNS between App Runner and Express Mode.

Key rules:
- Both DNS records must use the same record type (both CNAME, or both Alias A). Mixing types breaks weighted routing.
- Zone apex domains (e.g., `example.com`) cannot use CNAME - use Alias A or a subdomain.
- Start with a small percentage on Express Mode and increase gradually.

Tiered cutover - pick the ramp that matches the service:

| Service profile | Recommended ramp | Dwell per stage |
|---|---|---|
| High-traffic / revenue-critical (>100 req/sec sustained, payments, auth) | 5% → 10% → 25% → 50% → 75% → 100% | 30-60 min, then 24 hr at 100% before decommission |
| Standard production (10-100 req/sec, user-facing) | 10% → 50% → 100% | 15-30 min per stage |
| Low-traffic / internal / staging (<10 req/sec, tolerant of brief errors) | 50% → 100% or single flip | 5-15 min, or skip tiering entirely |
| Zero live traffic (cron jobs, async workers, pre-launch services) | Single flip | n/a |

Default to the high-traffic ramp if unsure. Only downgrade to a faster ramp when the user confirms the service profile.

At each stage, monitor via `ecs-mcp`:
- ALB 5xx error rate
- ALB target response time
- Target health (healthy host count)
- Application error logs

Rollback trigger: If error rates spike or latency degrades, immediately shift all traffic back to App Runner. Load [troubleshooting.md](troubleshooting.md) if needed.

---

## Step 8: Update CI/CD

Goal: Point deployment pipelines at Express Mode before decommissioning App Runner.

Use web search for the official GitHub Action for Express Mode deployments. Use `awsknowledge` MCP tools to look up the current `update-express-gateway-service` API syntax for CLI-based pipelines.

Confirm with the user that their pipeline is updated and a test deployment succeeds.

---

## Step 9: Decommission App Runner

Goal: Safely remove App Runner after confirming Express Mode handles all traffic.

Only proceed after 24-48 hours at 100% traffic on Express Mode with no issues.

⚠️ Do not execute any deletions automatically. Present the following as a checklist:

### Recommended sequence:

1. Pause App Runner service - stops billing, preserves config for rollback.
2. Observe for 24-48 more hours.
3. Present cleanup checklist for the user to review individually:

   - [ ] Delete the App Runner service
   - [ ] Remove App Runner IAM access role (if not used elsewhere)
   - [ ] Remove App Runner instance role (if not reused as ECS task role)
   - [ ] Remove VPC connectors used only by App Runner
   - [ ] Remove App Runner custom domain associations
   - [ ] Remove App Runner auto scaling configurations
   - [ ] Remove the App Runner weighted DNS record from Route 53
   - [ ] Convert the Express Mode weighted DNS record to a standard Alias A record
   - [ ] Delete App Runner CloudWatch log groups (if no longer needed)
   - [ ] Delete Express Mode CloudWatch log groups from failed test runs (if any)

For each item the user approves, execute one at a time with confirmation.

---

## Migration Complete

Confirm with the user:
- ✅ Express Mode service is ACTIVE and serving all traffic
- ✅ App Runner service is deleted
- ✅ CI/CD pipelines target Express Mode
- ✅ DNS records cleaned up
- ✅ App Runner resources removed
- ✅ Monitoring updated
