# WAF and CloudFront: App Runner vs ECS Express Mode

The WAF and CloudFront attachment points differ between App Runner and ECS Express Mode. This reference covers what changes during migration.

---

## WAF

Attachment point differs:
- App Runner: WAF attaches to the App Runner service directly (service-level WebACL association).
- ECS Express Mode: WAF attaches to the ALB created by Express Mode, not the service. Because one ALB is shared across up to 25 services, a WebACL on the ALB applies to all services behind it.

Migration steps:
1. Get the new ALB ARN via `ecs-mcp`.
2. Look up the current `wafv2 associate-web-acl` syntax via `awsknowledge` MCP tools.
3. Present the command for the user to re-associate the WebACL to the new ALB ARN.

If different services need different WAF rules:
- Use multiple ALBs (separate Express Mode deployments), or
- Scope rules via host-header match conditions inside the WebACL.

Rate-limit counters reset on cutover - expect a brief window where per-IP limits start fresh.

## CloudFront

If CloudFront sits in front of the App Runner service:

1. Re-point the origin from the App Runner URL to the ALB DNS name (or the custom domain once the DNS flip completes).
2. CloudFront's origin-shield and caching configuration stays unchanged.
3. If using Origin Access Control, verify it's compatible with the ALB origin type.

Present all origin changes as commands for the user to execute - do not modify CloudFront distributions directly.
