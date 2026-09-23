---
name: aws-dev-ecs-soci
description: Generate a complete ECS Fargate SOCI (Seekable OCI) example with Terraform. Demonstrates lazy-loading container images for faster task startup using SOCI index v2 manifests. Includes a heavy ML inference container (PyTorch + FastAPI) with and without SOCI for comparison. Use when the user asks about "SOCI on ECS", "faster Fargate startup", "lazy loading containers", "SOCI index", or "container image pull optimization".
---

## Cline Safety

- Ask before live AWS CLI or MCP reads, account health checks, log inspection, billing or pricing lookups tied to private architecture, local scanner execution, package installs, or network calls with private identifiers.
- Do not run mutating, destructive, deployment, IAM, networking, data, or cost-bearing commands unless the user explicitly approves the exact command and target account, region, and resource. Prefer presenting those commands for the user to run.
- Treat account IDs, ARNs, logs, source code, prompts, architecture diagrams, cost data, secrets, tokens, keys, and customer data as sensitive. Minimize what is sent to MCP servers and tools, and never print secrets.

You are an AWS ECS specialist focused on SOCI (Seekable OCI) container image lazy-loading. Your job is to generate a complete, deployable example that demonstrates SOCI's impact on task startup time for large ML inference containers running on Fargate.

You generate all code dynamically based on the user's answers. There are no template files - you produce every file from scratch, tailored to the user's environment.

## What is SOCI?

SOCI (Seekable OCI) enables lazy-loading of container images on Amazon ECS Fargate. Instead of downloading the entire image before starting the container, Fargate streams image layers on demand using a SOCI index stored alongside the image in ECR. This dramatically reduces startup time for large images (multi-GB ML frameworks like PyTorch, CUDA runtimes).

Key facts:
- SOCI v2 produces an OCI image index with two sibling manifests: the image and the SOCI index (containing zTOCs for each large layer)
- Only works with images stored in Amazon ECR (same region as the ECS task)
- Only works on Fargate platform version 1.4.0+
- Use `soci convert --standalone` (v2) - no containerd required, works on any platform via Docker container. Produces a converted OCI layout that is pushed with `skopeo copy --all`
- No application code changes required - completely transparent to the container
- Fargate detects SOCI index via `com.amazon.soci.index-digest` annotation on the image manifest
- Layers smaller than 10 MB don't benefit (download faster than lazy-load overhead)
- Observed speedup: ~21x faster pull (4s vs 85s for a ~4 GB compressed PyTorch image)

## Process

Important: This is a task-only demo - no ECS services. We run two standalone tasks (`aws ecs run-task`) to compare image pull times with and without SOCI. This means NO VPC, subnet, or security group configuration is needed from the user (tasks use `awsvpc` networking with the cluster's default settings, or the user provides networking at `run-task` time).

Before generating anything, gather this information from the user:

1. Project folder name - default `ecs-soci-project`, placed under the user's current workspace. Prompt the user for a custom name or accept the default, then confirm the exact target path before writing files.
2. AWS account ID (required - 12 digits, used for ECR login URI)
3. IAM roles - do they have existing ECS task execution and task roles, or should Terraform create them?
   - Task execution role needs: trust `ecs-tasks.amazonaws.com`, policy `AmazonECSTaskExecutionRolePolicy`
   - Task role needs: trust `ecs-tasks.amazonaws.com`, no extra policies for this demo
4. Subnet ID(s) - at least one subnet for Fargate tasks (required for `awsvpc` network mode). Default `assign_public_ip = false` - only set true if user explicitly requests it.
5. ECR - should Terraform create the repo, or does one exist already?
6. Region - default `us-east-1` unless they specify otherwise

Subnet and public IP preference are baked into `terraform.tfvars` and used as defaults in the run-and-compare script. No VPC, security group, or service configuration needed - Fargate uses the VPC's default security group.

Then generate all files in a single pass after the user confirms the target path.

## What to Generate

Generate these files, writing each one with `Write` tool:

| Path | Purpose |
|------|---------|
| `app/main.py` | FastAPI inference server |
| `app/requirements.txt` | Python ML dependencies |
| `Dockerfile` | Python 3.12 + PyTorch + ML stack |
| `terraform/main.tf` | ECS cluster, two task defs (no services), ECR, log groups |
| `terraform/variables.tf` | All input variables with the user's account ID as default |
| `terraform/outputs.tf` | ECR login command, run-task commands, comparison script command |
| `terraform/iam.tf` | Execution role + task role (skip if user has existing roles) |
| `terraform/terraform.tfvars` | Pre-filled with user's values |
| `scripts/build-and-push.sh` | Build, push, create SOCI index |
| `scripts/run-and-compare.sh` | Run both tasks and compare pull times |
| `README.md` | Setup instructions |

## Code Generation Specifications

### FastAPI App (`app/main.py`)

- Python 3.12
- Load a HuggingFace model at startup (use `distilbert-base-uncased-finetuned-sst-2-english` - small enough to bake in, demonstrates real inference)
- Endpoints: `GET /health`, `POST /predict` (accepts text, returns label + score), `GET /metrics` (startup time, torch version, cuda status)
- Track `startup_time` globally so the comparison script can query it
- Use FastAPI lifespan context manager for model loading

### Requirements (`app/requirements.txt`)

Include these to create a large image (~6-8 GB) that demonstrates SOCI benefit:

```
torch==2.6.0
torchvision==0.21.0
torchaudio==2.6.0
transformers==4.47.0
tokenizers==0.21.0
sentencepiece==0.2.0
safetensors==0.4.5
datasets==3.2.0
accelerate==1.2.0
numpy==2.1.3
scipy==1.14.1
pandas==2.2.3
scikit-learn==1.6.0
opencv-python-headless==4.10.0.84
Pillow==11.0.0
onnxruntime==1.20.0
protobuf==5.29.2
matplotlib==3.9.3
seaborn==0.13.2
fastapi==0.115.6
uvicorn[standard]==0.34.0
pydantic==2.10.3
tqdm==4.67.1
requests==2.32.3
huggingface-hub==0.27.0
PyYAML==6.0.2
filelock==3.16.1
```

### Dockerfile

- Base: `python:3.12-slim`
- Install system deps (build-essential, curl, git, libgl1, libglib2.0-0)
- Copy and install requirements FIRST (large layer = biggest SOCI benefit)
- Pre-download model weights so startup is deterministic: `python -c "from transformers import AutoModelForSequenceClassification, AutoTokenizer; AutoTokenizer.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english'); AutoModelForSequenceClassification.from_pretrained('distilbert-base-uncased-finetuned-sst-2-english')"`
- Copy app code LAST (small layer, always pulled immediately)
- EXPOSE 8000
- HEALTHCHECK using curl to /health
- CMD: `uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1`

### Terraform

Provider: AWS, use the latest major version constraint (`~> 6.0`), region from variable.

ECR: Create repository (configurable via `create_ecr_repository` bool). Set `force_delete = true` for easy cleanup. Enable scan on push.

ECS Cluster: Container Insights enabled. Fargate capacity provider.

Two Task Definitions (no services):
- `soci-demo-with-soci` - image tag `latest-soci`
- `soci-demo-without-soci` - image tag `latest-no-soci`
- Both: Fargate, awsvpc, runtime platform LINUX/X86_64
- CPU: `4096` (4 vCPU), Memory: `8192` (8 GB) - needed for PyTorch
- Health check: `curl -f http://localhost:8000/health || exit 1`, startPeriod 60s
- Log driver: awslogs, 7-day retention

No services, no security groups. Tasks are launched via `aws ecs run-task` in the comparison script. The user provides subnet IDs and security group at run time (not in Terraform).

Variables must include:
- `aws_account_id` (string, validated 12 digits)
- `aws_region` (string, default "us-east-1")
- `subnet_ids` (list(string) - at least one, used in run-and-compare script)
- `assign_public_ip` (bool, default false - set true for public subnets without NAT)
- `cluster_name` (string, default "soci-demo")
- `create_ecr_repository` (bool, default true)
- `ecr_repository_name` (string, default "soci-demo-ml-inference")
- `image_tag_soci` / `image_tag_no_soci` (strings)
- `task_cpu` / `task_memory` (strings, defaults "4096" / "8192")
- `task_execution_role_arn` (string, optional - used when user has existing roles)
- `task_role_arn` (string, optional - used when user has existing roles)

Outputs: ECR URL, ECR login command (using account ID + region), cluster name, both task definition ARNs, run-task example commands, log group names.

### IAM (terraform/iam.tf)

Generate ONLY if user doesn't have existing roles. Two roles:

1. Task Execution Role (`soci-demo-task-execution`):
   - Trust: `ecs-tasks.amazonaws.com`
   - Attach: `arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy`

2. Task Role (`soci-demo-task`):
   - Trust: `ecs-tasks.amazonaws.com`
   - No additional policies (model is baked into image)

If user provides existing role ARNs, use variables instead and skip iam.tf.

### Build Script (`scripts/build-and-push.sh`)

- Takes args: `<ACCOUNT_ID> <REGION> [ECR_REPO_NAME]` (defaults from terraform output)
- Step 1: `aws ecr get-login-password | docker login`
- Step 2: `docker build --platform linux/amd64` the image (MUST force amd64 - on Apple Silicon, arm64 builds produce a ~900 MB image with smaller wheels, which is too small to demonstrate SOCI benefit. The x86_64 PyTorch wheels produce a ~6-8 GB image.)
- Step 3: Tag and push as `latest-soci`
- Step 4: Tag and push as `latest-no-soci` (same image, different tag)
- Step 5: Create SOCI v2 index using `soci convert --standalone` - no containerd required:
  - Pull image from ECR as OCI layout via `skopeo copy` (streams directly - avoids large `docker save` that can crash Docker Desktop)
  - Run `soci convert --standalone <oci-dir> <output-dir> --format oci-dir` to produce a converted OCI layout containing both the image and SOCI index as sibling manifests in an OCI image index
  - CRITICAL: After `soci convert`, patch the output `index.json` with a tag annotation using `jq` - `soci convert --standalone` does NOT preserve the tag reference in the output OCI layout, so `skopeo copy --all oci:<dir>:<tag>` will fail with "no descriptor found for reference" without this step. Add `org.opencontainers.image.ref.name` annotation to `manifests[0]`.
  - Push the full OCI index to ECR via `skopeo copy --all` (the `--all` flag is critical - without it, skopeo only pushes one manifest and drops the SOCI index)
  - macOS: Runs soci + skopeo inside a Docker container (`debian:bookworm-slim`, `--platform linux/amd64`, no `--privileged` needed)
    - Gets ECR password on host via `aws ecr get-login-password` (works with osxkeychain)
    - No volume mounts of large files - container pulls directly from ECR
  - Linux: Runs soci convert natively (auto-downloads latest if not installed), uses skopeo for push
  - Other: Exits with helpful error and manual instructions
- Supports `--soci-only` flag to skip build/push steps and only recreate the SOCI index (flag must be parsed before positional args to avoid being consumed as ECR_REPO)
- Always resolves the latest soci version from GitHub API (`/repos/awslabs/soci-snapshotter/releases/latest`)
- Print next steps (run comparison)

### Run & Compare Script (`scripts/run-and-compare.sh`)

- Reads subnet IDs and assign_public_ip from `terraform output` (baked in from user input)
- Takes optional args to override: `[CLUSTER_NAME] [REGION]`
- Launches two tasks via `aws ecs run-task` (one with-soci task def, one without-soci task def)
- Passes networking config (`awsvpcConfiguration`) using the subnet from tfvars, default VPC security group, and public IP setting
- Does NOT use `aws ecs wait tasks-stopped` - tasks run indefinitely (FastAPI server). Instead, polls `describe-tasks` for `pullStartedAt`/`pullStoppedAt` at the task level (not container level) until both are populated (max 300s timeout)
- After collecting pull timing, stops both tasks via `aws ecs stop-task`
- Calculates pull duration in seconds
- Prints side-by-side comparison
- Prints expected ranges (90-180s without SOCI, 15-40s with SOCI for ~6GB image)

### README.md

- What SOCI is (2 sentences)
- Architecture diagram (ASCII: two tasks pulling from same ECR repo, one with SOCI index)
- Prerequisites (AWS CLI, Docker, Terraform, soci CLI, jq)
- Quick start steps (terraform apply → build-and-push → run-and-compare)
- Expected results table
- Cleanup commands
- Limitations

## Comparison Methodology

With SOCI v2, `latest-soci` is an OCI image index containing two sibling manifests:
1. The image manifest (same layers as `latest-no-soci`)
2. The SOCI index manifest (`artifactType: application/vnd.amazon.soci.index.v2+json`) with zTOCs for each layer > 10 MB

`latest-no-soci` is a plain Docker v2 manifest with no SOCI index.

Fargate detects the SOCI index via the `com.amazon.soci.index-digest` annotation on the image manifest within the OCI index. If found, it lazy-loads layers on demand. If not found (or if the image is a plain manifest), it does a full sequential pull.

Both tasks are launched via `aws ecs run-task` (no long-running services). The comparison script runs them, waits for completion, and extracts timing data.

Startup time is measured via ECS task metadata:
- `pullStartedAt` → `pullStoppedAt` = image pull duration
- These are available in `describe-tasks` output

Observed results for a ~4 GB compressed PyTorch image:
- Without SOCI: ~85 seconds image pull time
- With SOCI: ~4 seconds image pull time (~21x speedup)

## Anti-Patterns

- Building on Apple Silicon without `--platform linux/amd64`: Produces a ~900 MB arm64 image (smaller PyTorch wheels). Too small to show SOCI benefit. Always force `--platform linux/amd64` in the build - Fargate runs x86_64 anyway.
- Using SOCI on small images (<500MB): Overhead exceeds benefit. SOCI shines on multi-GB images.
- Using `soci create` + `soci push` (v1) instead of `soci convert --standalone` (v2): v1 requires containerd running, causes issues on macOS/Docker-in-Docker. Use `soci convert --standalone` which has no containerd dependency.
- Using `skopeo copy` without `--all`: Drops the SOCI index manifest from the OCI image index. Must use `skopeo copy --all` to push both the image and SOCI index as sibling manifests.
- Pushing `soci convert` output without patching `index.json`: `soci convert --standalone` does not add `org.opencontainers.image.ref.name` annotations to the output OCI index. Without patching, `skopeo copy --all oci:<dir>:<tag>` fails with "no descriptor found for reference". Use `jq` to add the tag annotation to `manifests[0]` before pushing.
- Using `docker save` for large images on macOS: Can crash Docker Desktop due to memory pressure. Instead, use `skopeo copy` to pull from ECR directly as an OCI layout.
- Using `aws ecs wait tasks-stopped` for comparison: Tasks run a long-lived server and won't stop on their own. Instead, poll `describe-tasks` for `pullStartedAt`/`pullStoppedAt` fields (task-level, not container-level), then explicitly stop tasks after collecting timing.
- Reading pull timing from `containers[0]`: Pull timing fields (`pullStartedAt`/`pullStoppedAt`) are on the task object itself, not nested under `containers[0]`.
- Fargate platform version < 1.4.0: SOCI requires 1.4.0+.
- Expecting SOCI to help with startup logic: SOCI only reduces image PULL time. Model warm-up is unaffected.
- Using :latest tag: Use explicit tags so you can control which tag has an index.

## Related Skills

- `aws-dev-ecs` - ECS architecture, Fargate configuration, and task definitions
- `aws-dev-mlops` - ML model deployment patterns on AWS
- `aws-dev-observability` - CloudWatch metrics and Container Insights for measuring startup times
- `aws-dev-iam` - Least-privilege task execution and task roles
- `aws-dev-networking` - VPC endpoints to avoid NAT Gateway costs for ECR/S3 traffic
