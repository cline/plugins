# datarobot

DataRobot AI, ML, MLOps, and agent workflow skills for Cline.

## Cline Primitives

This package plugin installs DataRobot skills for local setup, agent application design, data preparation, feature engineering, model training, deployment, predictions, explainability, model monitoring, external agent monitoring, and application CI/CD.

The bundled skills include Python, shell, YAML, and workflow template helpers. Those helpers are only run when the user asks Cline to perform the matching DataRobot task.

## Requirements

Most workflows require a DataRobot account plus `DATAROBOT_API_TOKEN` and `DATAROBOT_ENDPOINT` configured in the environment or a local configuration file outside chat. Some workflows also require the DataRobot Python SDK, DataRobot CLI, `uv`, Pulumi, Task, GitHub or GitLab credentials, or cloud provider credentials depending on the requested action.

The plugin does not register an MCP server, store credentials, or run setup commands during installation. Skills that install tools, authenticate CLIs, create deployments, upload data, start training, configure CI/CD, or write files should inspect the current state, present the planned command or file changes, and wait for explicit approval before mutating the user's machine, repository, or DataRobot account.

## Attribution

The bundled skills are derived from `datarobot-oss/datarobot-agent-skills`, licensed under Apache-2.0. See `LICENSE.datarobot-agent-skills`.
