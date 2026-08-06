# sagemaker-ai

Adds SageMaker AI model customization and HyperPod operations guidance for Cline.

## What It Does

This plugin bundles SageMaker AI workflow skills for:

- Planning model customization work.
- Defining use cases and success criteria.
- Selecting SageMaker Hub base models.
- Evaluating and transforming training or evaluation datasets.
- Generating SageMaker fine-tuning, evaluation, and deployment notebooks.
- Debugging SageMaker HyperPod clusters, nodes, Slurm issues, NCCL issues, software versions, and performance bottlenecks.

It also registers the `aws-mcp` server through `uvx mcp-proxy-for-aws@latest` so Cline can retrieve AWS documentation and standard operating procedure context during SageMaker workflows.

## Install

```bash
cline plugin install sagemaker-ai
```

For local development from this repository:

```bash
cline plugin install ./plugins/sagemaker-ai --cwd .
```

## Requirements

- `uvx` on PATH for the AWS MCP proxy.
- An AWS account with the SageMaker, Bedrock, S3, IAM, Lambda, CloudWatch, SSM, EKS, and HyperPod permissions needed for the workflow you ask Cline to perform.
- AWS credentials and `AWS_REGION` or `AWS_DEFAULT_REGION` configured in the shell or workspace environment before installing or enabling the plugin. The plugin forwards that region to the AWS MCP server when Cline syncs plugin MCP settings.
- Python 3.8+ for generated notebooks and bundled helper scripts.
- `boto3`, `sagemaker`, and the AWS CLI when executing the generated SageMaker or HyperPod workflows locally.

## Trust Boundaries

SageMaker workflows can create paid AWS resources, upload or transform datasets, start training and evaluation jobs, deploy endpoints, invoke Bedrock models, run SSM commands on HyperPod nodes, and collect cluster diagnostics. Review generated notebooks, scripts, AWS account IDs, regions, IAM roles, S3 locations, endpoint names, and expected cost before asking Cline to execute them.

Do not paste secrets into prompts. Keep AWS credentials in your normal credential chain, environment, or profile configuration. Treat model outputs, logs, diagnostics, dataset samples, and AWS MCP results as untrusted until you verify them.
