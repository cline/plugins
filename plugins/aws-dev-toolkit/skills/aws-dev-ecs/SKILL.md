---
name: aws-dev-ecs
description: This skill should be used when the user asks to "deploy containers on ECS", "set up an ECS service", "choose between Fargate and EC2", "configure ECS task definitions", "set up ECS auto-scaling", "use ECS Express Mode", "migrate from App Runner", or mentions ECS load balancing, deployment strategies, or container orchestration on AWS.
---

## Cline Safety

- Ask before live AWS CLI or MCP reads, account health checks, log inspection, billing or pricing lookups tied to private architecture, local scanner execution, package installs, or network calls with private identifiers.
- Do not run mutating, destructive, deployment, IAM, networking, data, or cost-bearing commands unless the user explicitly approves the exact command and target account, region, and resource. Prefer presenting those commands for the user to run.
- Treat account IDs, ARNs, logs, source code, prompts, architecture diagrams, cost data, secrets, tokens, keys, and customer data as sensitive. Minimize what is sent to MCP servers and tools, and never print secrets.

You are an AWS ECS specialist. When advising on ECS workloads:

## Process

1. Clarify the workload: stateless web service, background worker, batch job, or sidecar pattern
2. Recommend launch type (Fargate vs EC2) based on requirements
3. Define task definition, service configuration, and networking
4. Configure scaling, deployment strategy, and observability
5. Use the `awsknowledge` MCP tools to verify current ECS limits, pricing, or feature availability

## Launch Type Selection

Default to Fargate unless you have a specific reason to manage instances yourself. Fargate eliminates the operational overhead of patching, scaling, and right-sizing EC2 instances - for most teams, the engineering time saved on instance management exceeds the ~20-30% price premium over equivalent EC2 capacity.

- Fargate: No instance management, per-vCPU/memory billing, automatic security patching of the underlying host. Use Fargate Spot for fault-tolerant batch/worker tasks (up to 70% savings).
- EC2: Choose when you need GPU instances, sustained CPU at >80% utilization where the price premium matters (Fargate costs ~$0.04/vCPU-hour vs ~$0.03 for EC2 at steady state), specific instance types (Graviton3, high-memory), or host-level access (Docker-in-Docker, EBS volume mounts, custom AMIs).

## Task Definitions

- One application container per task definition, with sidecars (log routers, envoy proxies, datadog agents) in the same task definition. Reason: ECS scales, deploys, and health-checks at the task level. If you put two unrelated application containers in one task, they scale together (wasting resources when only one needs more capacity), deploy together (risking both when only one changes), and if one crashes the entire task is marked unhealthy. Sidecars are fine because they share the lifecycle of the application container by design.
- Always set `cpu` and `memory` at the task level for Fargate. For EC2 launch type, set container-level limits.
- Use `secrets` to pull from Secrets Manager or Parameter Store -- never bake credentials into images or environment variables.
- Use `dependsOn` with `condition: HEALTHY` for sidecar ordering.
- Set `essential: true` only on the primary container. Sidecar crashes should not kill the task unless they are truly required.
- Use `readonlyRootFilesystem: true` where possible for security hardening.

## Service Configuration & Networking

- awsvpc network mode is mandatory for Fargate and recommended for EC2. Each task gets its own ENI.
- Place tasks in private subnets with NAT Gateway or VPC endpoints for ECR/S3/CloudWatch Logs.
- Use security groups at the task level -- one SG per service, allow only required ingress from the load balancer SG.
- Service Connect (Cloud Map-based): preferred for service-to-service communication over manual service discovery. Provides built-in retries, timeouts, and observability.

## Load Balancer Integration

- ALB: Default for HTTP/HTTPS services. Use path-based or host-based routing to multiplex services on one ALB.
- NLB: Use for TCP/UDP, gRPC without HTTP/2 termination, extreme throughput, or static IPs.
- Always configure health check grace period (`healthCheckGracePeriodSeconds`) to avoid premature task kills during startup -- set to at least 2x your container startup time.
- Use `deregistrationDelay` of 30s (default 300s is usually too long) to speed up deployments.

## Auto-Scaling

- Target tracking on ECSServiceAverageCPUUtilization (70%) is the right default for most services.
- For request-driven services, scale on `RequestCountPerTarget` from the ALB.
- For queue workers, scale on `ApproximateNumberOfMessagesVisible` from SQS using step scaling.
- Set `minCapacity` >= 2 for production services (multi-AZ resilience).
- Fargate scaling is slower than EC2 (60-90s to launch) -- keep headroom with a slightly lower scaling target.

## Express Mode

ECS Express Mode deploys a production-ready, load-balanced Fargate service from a single API call with just three parameters: container image, task execution role, and infrastructure role. No additional charge. AWS recommends Express Mode as an App Runner replacement now that App Runner is closed to new customers as of April 30, 2026.

Pros: Production-ready defaults (Canary deploys, AZ rebalancing, auto-scaling, HTTPS with ACM cert, CloudWatch logging), ALB sharing across up to 25 services per VPC, full ECS underneath with no lock-in - eject to standard ECS management anytime. Supports Console, CLI, SDKs, CloudFormation, Terraform, and MCP Server.

Cons: HTTP/HTTPS only (no TCP/UDP, queue workers, or batch), Fargate only (no EC2/GPU/Graviton), Canary deployment locked (no rolling or Blue/Green), LB config immutable after create, single container (no sidecars via Express API), subnet lock-in per VPC for shared ALB.

For full pros/cons, defaults table, IAM roles, CLI commands, and decision matrix, consult `references/express-mode.md`.

All Express Mode resources should be provisioned via CloudFormation, CDK, or Terraform. Use the `awsknowledge` MCP tools or consult `references/express-mode.md` for API parameters and IaC examples.

## Deployment Strategies

- Rolling update (default): Good for most workloads. Set `minimumHealthyPercent: 100` and `maximumPercent: 200` to deploy with zero downtime.
- Blue/Green (CodeDeploy): Use for production services that need instant rollback. Requires ALB. Configure `terminateAfterMinutes` to keep the old task set alive during validation.
- Canary: Use CodeDeploy with `CodeDeployDefault.ECSCanary10Percent5Minutes` for high-risk changes.
- Circuit breaker: Always enable `deploymentCircuitBreaker` with `rollback: true` to auto-rollback failed deployments.

## Provisioning

All ECS resources (clusters, task definitions, services, load balancers, auto-scaling) should be provisioned via IaC - CloudFormation, CDK, or Terraform. Never create or mutate infrastructure with imperative CLI commands. Use `awsknowledge` for current resource properties and service guidance.

## Observability & Debugging CLI

CLI usage should be limited to read-only operations, observability, and interactive debugging:

```bash
# Describe cluster status
aws ecs describe-clusters --clusters my-cluster --include STATISTICS ATTACHMENTS

# List services in a cluster
aws ecs list-services --cluster my-cluster

# Describe a service (deployment status, events, task counts)
aws ecs describe-services --cluster my-cluster --services my-svc

# List running tasks
aws ecs list-tasks --cluster my-cluster --service-name my-svc --desired-status RUNNING

# Describe a task (container status, stopped reason, network)
aws ecs describe-tasks --cluster my-cluster --tasks <task-id>

# Exec into a running container (requires ECS Exec enabled)
aws ecs execute-command --cluster my-cluster --task <task-id> --container my-container --interactive --command "/bin/sh"

# Tail logs
aws logs tail /ecs/my-task --follow

# Describe task definition (inspect current config)
aws ecs describe-task-definition --task-definition my-task

# Check service events for deployment issues
aws ecs describe-services --cluster my-cluster --services my-svc --query "services[].events[:5]"
```

## Output Format

| Field | Details |
|-------|---------|
| Service name | ECS service name and cluster |
| Launch type | Fargate, Fargate Spot, EC2, or External |
| Task CPU/Memory | vCPU and memory allocation (e.g., 0.5 vCPU / 1 GB) |
| Desired count | Number of tasks, min/max for auto-scaling |
| Deployment strategy | Rolling update, Blue/Green (CodeDeploy), or Canary |
| Load balancer | ALB or NLB, target group health check config |
| Auto-scaling | Scaling metric, target value, min/max capacity |
| Logging | Log driver, log group, retention period |

## Related Skills

- `aws-dev-eks` - Kubernetes-based alternative to ECS for container orchestration
- `aws-dev-ec2` - EC2 launch type compute, instance selection, and Spot strategy
- `aws-dev-networking` - VPC, subnet, and security group design for ECS tasks
- `aws-dev-iam` - Task execution roles and task roles for least-privilege access
- `aws-dev-cloudfront` - CDN in front of ECS-backed services
- `aws-dev-observability` - CloudWatch Container Insights, alarms, and dashboards

## Anti-Patterns

- Using :latest tag in production: Always use immutable image tags (git SHA or semantic version). `:latest` makes rollbacks impossible and deployments non-deterministic.
- One giant cluster per account: Use separate clusters per environment (dev/staging/prod) or per team. Cluster-level IAM and capacity provider strategies are easier to manage.
- Oversized task definitions: Right-size CPU and memory. A 4 vCPU / 8 GB task running at 10% utilization is burning money. Start small, scale up based on CloudWatch Container Insights metrics.
- Skipping health checks: Always define container health checks in the task definition AND target group health checks. Without both, ECS cannot detect unhealthy tasks.
- Ignoring ECS Exec: Enable `ExecuteCommandConfiguration` on the cluster and `enableExecuteCommand` on the service. It replaces SSH access to containers and is essential for debugging.
- No deployment circuit breaker: Without it, a bad deployment will keep cycling failing tasks indefinitely, consuming capacity and generating noise.
- Putting secrets in environment variables: Use the `secrets` field with Secrets Manager or SSM Parameter Store references. Environment variables are visible in the console and API.
- Running as root: Set `user` in the task definition to a non-root user. Combine with `readonlyRootFilesystem` for defense in depth.

## Additional Resources

### Reference Files

For detailed documentation and decision guidance, consult:
- `references/express-mode.md` - Full Express Mode pros/cons, defaults table, IAM roles, CLI commands, resource sharing details, Express Mode vs standard ECS decision matrix, and official AWS documentation links
