# Amazon ECS Express Mode - Detailed Reference

ECS Express Mode provisions a complete production application stack from a single API call requiring only three parameters: a container image, task execution role, and infrastructure role. No additional charge beyond the underlying AWS resources. AWS recommends Express Mode as a migration path from App Runner, which closed to new customers on April 30, 2026.

## Pros

- 3-parameter deployment - Container image, execution role, infrastructure role. Everything else gets sensible defaults.
- Production-ready from day one - Canary deployments, AZ rebalancing, auto-scaling (CPU/memory/request count), health checks, HTTPS with auto-provisioned ACM certificate, CloudWatch logging - all configured automatically.
- Full ECS underneath - All underlying resources (service, task definition, ALB, security groups, scaling policies) are created in your account and remain directly accessible. Customize any resource after creation without leaving Express Mode.
- ALB sharing across services - Up to 25 Express Mode services in the same VPC share an ALB via host-header routing, significantly reducing per-service cost. Express Mode auto-provisions and deprovisions ALBs as services are added/removed.
- Cluster sharing - Express Mode services can coexist in the same cluster with standard ECS services.
- IaC support - Available via Console, CLI, SDKs, CloudFormation, Terraform, and the AWS Labs MCP Server for ECS.
- No vendor lock-in risk - Unlike App Runner, Express Mode is just ECS. "Eject" to standard ECS management at any time by managing the underlying resources directly.

## Cons / Limitations

- HTTP/HTTPS workloads only - Express Mode provisions an ALB and expects HTTP traffic. Not suitable for TCP/UDP services (use NLB + standard ECS), queue workers, batch jobs, gRPC without HTTP/2, or non-web workloads.
- Fargate only - No EC2 launch type. Rules out GPU instances, Graviton selection, host-level access, Docker-in-Docker, EBS volume mounts, or custom AMIs.
- Canary deployment locked - Deployment strategy is set to Canary and cannot be changed after creation. No rolling update or Blue/Green (CodeDeploy) option.
- Load balancer config immutable - Load balancer configurations cannot be updated on Express Mode services. If NLB, custom listener rules, or multi-protocol support is needed, use standard ECS.
- Service name and cluster immutable after create - Cannot be changed on updates.
- Subnet lock-in per VPC - The first Express Mode service in a VPC defines the subnets for that VPC's shared ALB (internet-facing or internal). Subsequent services must match those AZs.
- Single container only - No sidecar support in the Express Mode API. Envoy proxies, log routers, or datadog agents as sidecars require editing the task definition directly after creation.
- Default VPC requirements - If no subnets are specified, requires a default VPC with at least two public subnets in two AZs with at least 8 free IPs per CIDR block per subnet.
- x86_64 Linux only by default - Defaults to X86_64 architecture on Linux. ARM/Graviton requires post-creation task definition changes.
- Container name sensitivity - The default container is named "Main". Renaming it can break Express Mode's ability to manage subsequent updates via the Express Mode Console or APIs.

## Defaults Table

All underlying resources remain accessible for direct management.

| Resource | Default | Customizable via Express Mode? |
|----------|---------|-------------------------------|
| Launch type | Fargate capacity provider | No |
| Task CPU/Memory | 1 vCPU / 2 GB | Yes (`--cpu`, `--memory`) |
| Deployment strategy | Canary | No (locked) |
| AZ rebalancing | Enabled | No (editable on service directly) |
| Auto-scaling metric | CPU at 60% target | Yes (`--scaling-target`) |
| Min/Max tasks | 1 / 20 | Yes (`--scaling-target`) |
| Health check grace | 300s | No (editable on service directly) |
| Container port | 80 | Yes (`--primary-container`) |
| Health check path | `/` | Yes (`--health-check-path`) |
| Logging | CloudWatch Logs, non-blocking, 25MB buffer | Yes (log group, prefix) |
| Subnets | Default VPC public subnets | Yes (`--network-configuration`) |
| ALB scheme | Internet-facing (public) or Internal (private) | Based on subnet type |

## Resources Created by Express Mode

Express Mode automatically provisions and configures:

- ECS default cluster (if not already existing) with Fargate capacity providers
- Task definition with container, logging, and networking configurations
- Service with canary deployment and auto-scaling
- Application Load Balancer with HTTPS listener, listener rules, and target groups
- Security groups with minimal required ingress (service SG + LB SG)
- Service Linked Roles for auto-scaling and load balancing
- Application Auto Scaling scalable target and target tracking scaling policy
- CloudWatch Log group specific to the service
- Metric alarm for detecting faulty deployments
- ACM certificate for HTTPS

## Resource Sharing and Cost Optimization

- Load balancer sharing - Up to 25 Express Mode services in the same VPC share an ALB. Express Mode auto-provisions additional ALBs as needed and deprovisions unused ones as services are removed.
- Cluster sharing - Express Mode services can be grouped in ECS Clusters alongside standard (non-Express) ECS services.

## IAM Roles

| Role | Required? | Purpose |
|------|-----------|---------|
| `ecsTaskExecutionRole` | Yes | Pull images from ECR, send logs to CloudWatch, retrieve secrets |
| `ecsInfrastructureRoleForExpressServices` | Yes | Manage AWS resources (ALB, SGs, scaling) on your behalf |
| Task Role (`--task-role-arn`) | Optional | Allow application code to call other AWS services (S3, DynamoDB, etc.) |

Auto-created service-linked roles: `ecsServiceRoleForECS`, `AWSServiceRoleForElasticLoadBalancing`, `AWSServiceRoleForApplicationAutoScaling_ECSService`.

## CLI Commands

```bash
# Create an Express Mode service (minimal - 3 required params)
aws ecs create-express-gateway-service \
  --execution-role-arn arn:aws:iam::role/ecsTaskExecutionRole \
  --infrastructure-role-arn arn:aws:iam::role/ecsInfrastructureRoleForExpressServices \
  --primary-container 'image=nginx'

# Create with custom scaling, port, and service name
aws ecs create-express-gateway-service \
  --execution-role-arn arn:aws:iam::role/ecsTaskExecutionRole \
  --infrastructure-role-arn arn:aws:iam::role/ecsInfrastructureRoleForExpressServices \
  --primary-container 'image=my-app:v1,port=8080' \
  --scaling-target '{"minTaskCount": 2}' \
  --service-name my-api

# Monitor an Express Mode deployment (interactive terminal UI)
aws ecs monitor-express-gateway-service \
  --service-arn arn:aws:ecs:us-east-1:123456789012:service/my-cluster/my-svc

# Monitor with custom timeout (default 30 min)
aws ecs monitor-express-gateway-service \
  --service-arn my-express-gateway-service \
  --timeout 60

# Delete an Express Mode service and its managed resources
aws ecs delete-express-gateway-service --service <service-name-or-arn>
```

## When to Use Express Mode vs Standard ECS

| Scenario | Express Mode | Standard ECS |
|----------|-------------|-------------|
| Stateless HTTP/HTTPS web apps and APIs | Yes | Yes |
| Rapid prototyping | Yes (fastest path) | Possible but more config |
| App Runner migration | Yes (recommended) | Possible |
| TCP/UDP services | No | Yes (NLB) |
| Queue workers / batch jobs | No | Yes |
| GPU workloads | No | Yes (EC2 launch type) |
| Graviton / ARM | No (x86 default, manual change) | Yes |
| Custom deployment strategy | No (Canary locked) | Yes (Rolling, Blue/Green, Canary) |
| Sidecar containers | No (manual post-creation) | Yes |
| NLB or custom LB config | No | Yes |
| Service-to-service (non-HTTP) | No | Yes (Service Connect, NLB) |

## Official Documentation

- [Amazon ECS Express Mode Overview](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html)
- [Resources created by Express Mode](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-work.html)
- [Creating an Express Mode service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-create-full.html)
- [App Runner to Express Mode migration](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html)
- [CLI: create-express-gateway-service](https://docs.aws.amazon.com/cli/latest/reference/ecs/create-express-gateway-service.html)
- [CLI: monitor-express-gateway-service](https://docs.aws.amazon.com/cli/latest/reference/ecs/monitor-express-gateway-service.html)
- [CLI: delete-express-gateway-service](https://docs.aws.amazon.com/cli/latest/reference/ecs/delete-express-gateway-service.html)
