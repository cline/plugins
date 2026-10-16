# huggingface

Bundles Hugging Face AI and ML workflow skills and registers the Hugging Face MCP server.

## What It Adds

This plugin includes curated skills for common Hugging Face work:

- Hub and CLI workflows.
- Dataset exploration and publishing.
- Model selection, local model usage, and Transformers.js.
- LLM, vision, TRL, and sentence-transformers training.
- Gradio Spaces, ZeroGPU, LoRA demo Spaces, and Trackio experiment tracking.
- Paper lookup and paper publishing workflows.

It also registers the `huggingface` MCP server at `https://huggingface.co/mcp?login`. The MCP server exposes Hugging Face Hub tools for authenticated model, dataset, Space, and account workflows.

## Requirements

The bundled skills are available immediately after installation. Some workflows require local tools such as `hf`, `uv`, Python packages, Node packages, GPU access, or Hugging Face Jobs/Spaces permissions; the relevant skill explains those requirements when used.

The MCP server requires Hugging Face authentication through the MCP login flow. This plugin does not store static API tokens in headers.

## Trust Boundary

Many skills describe workflows that can launch cloud jobs, publish Hub repositories, upload datasets or model artifacts, and consume paid compute. Cline should confirm account, organization, visibility, hardware, and cost-sensitive actions before making changes.
