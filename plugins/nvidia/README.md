# NVIDIA Plugin

NVIDIA workflow skills for AI-Q research, cuOpt routing guidance, Dynamo serving checks, NemoClaw onboarding, Omniverse/OpenUSD work, and Physical AI infrastructure.

This plugin bundles skill and reference material only. It does not register MCP servers, start local services, install NVIDIA tooling, clone repositories, or write credentials during installation.

## Included Skills

- `aiq-deploy`: install, run, validate, troubleshoot, and stop NVIDIA AI-Q Blueprint infrastructure.
- `aiq-research`: use a reachable AI-Q backend for deep research workflows.
- `cuopt-user-rules`: clarify and shape NVIDIA cuOpt routing and optimization requests.
- `dynamo-interconnect-check`: inspect NIXL, UCX, NCCL, RDMA, and NVLink readiness for Dynamo disaggregated serving.
- `dynamo-router-starter`: configure and smoke-test Dynamo router modes.
- `nemoclaw-user-get-started`: guide first-time NemoClaw and OpenClaw sandbox onboarding.
- `omniverse-cad-to-simready`: coordinate CAD/source asset conversion into simulation-ready USD workflows.
- `omniverse-realtime-viewer`: design Omniverse realtime USD viewer apps.
- `omniverse-usd-performance-tuning`: diagnose and optimize USD scene loading, memory, FPS, and asset structure.
- `physical-ai-infrastructure-setup-and-resilient-scaling`: plan and operate Physical AI Kubernetes, inference, OSMO, and workload infrastructure.
- `physical-ai-neural-reconstruction`: route NVIDIA NuRec neural reconstruction workflows.

## Requirements

Requirements depend on the selected skill. Common workflows may need NVIDIA API keys, NGC credentials, Hugging Face access, CUDA/GPU drivers, Docker, NVIDIA Container Toolkit, Kubernetes, Helm, Terraform, Azure CLI, Python, uv, Node.js, Omniverse/OpenUSD tooling, or access to NVIDIA service endpoints.

The bundled skills include guidance to ask for explicit approval before installs, remote scripts, containers, cluster/cloud changes, paid services, model or dataset downloads, credential writes, or destructive asset changes.

## Trust Boundaries

Packaged helper scripts and references are available for the agent to inspect, but they are not run at install time. Live NVIDIA, cloud, dataset, model, repository, and infrastructure operations can affect local machines, paid accounts, clusters, credentials, and private assets, so Cline should explain the action and wait for user approval before performing them.
