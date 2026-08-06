# Together AI

Together AI workflow skills for Cline.

## What It Does

This plugin bundles Together AI skills for chat completions, batch inference, embeddings, evaluations, fine-tuning, images, video, audio, sandboxes, dedicated endpoints, dedicated containers, and GPU clusters.

Each skill includes workflow guidance plus local reference files and example Python or TypeScript scripts. The plugin does not register an MCP server and does not run Together AI calls during install.

The bundled skills ask Cline to get approval before running scripts, installing SDKs, spending credits, uploading data, creating or deleting endpoints, launching clusters, or using remote execution.

## Install

```bash
cline plugin install togetherai
```

For local development from this repository:

```bash
cline plugin install ./plugins/togetherai --cwd .
```

## Requirements

- `TOGETHER_API_KEY` in the environment before running Together AI API examples.
- Python examples generally expect `together>=2.0.0`; TypeScript examples expect `together-ai`.
- Some workflows may also require external provider keys, Docker/container tooling, Kubernetes/Slurm access, Jig, Sprocket, or Together Cloud cluster permissions.

## Security Notes

Together AI workflows can spend credits, upload datasets or models, generate media, execute remote code, and provision billable infrastructure. Review scripts and target resources before running them, keep API keys out of source control, and clean up endpoints, clusters, sandboxes, storage, and generated artifacts when they are no longer needed.

## Attribution

The bundled Together AI skill material is MIT licensed. See `LICENSE.togetherai-skills`.
