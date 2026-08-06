---
name: atomic-agents-framework
description: Use when working in a Python project that imports atomic_agents, or when the user asks about Atomic Agents schemas, agents, tools, context providers, prompts, providers, memory, hooks, testing, or orchestration.
---

# Atomic Agents Framework

Use this skill to orient Cline around Atomic Agents framework conventions before editing or reviewing an Atomic Agents project.

## Core Model

Atomic Agents applications are built around typed boundaries:

- `BaseIOSchema` describes every agent and tool input or output.
- `AtomicAgent[InputSchema, OutputSchema]` transforms a typed input into a typed output.
- `AgentConfig` wires the provider client, model, prompt, history, hooks, and provider-specific API parameters.
- `BaseTool[InputSchema, OutputSchema]` exposes deterministic capabilities to agents.
- `BaseDynamicContextProvider` injects runtime context into the system prompt.
- `ChatHistory` stores multi-turn conversation state.
- `SystemPromptGenerator` keeps the prompt split into background, steps, and output instructions.

## Canonical Imports

Prefer current top-level imports:

```python
from atomic_agents import (
    AgentConfig,
    AtomicAgent,
    BaseIOSchema,
    BaseTool,
    BaseToolConfig,
    BasicChatInputSchema,
    BasicChatOutputSchema,
)
from atomic_agents.context import (
    BaseDynamicContextProvider,
    ChatHistory,
    SystemPromptGenerator,
)
from instructor import Mode
```

Avoid legacy paths such as `atomic_agents.lib.base.*` or `atomic_agents.agents.base_agent`.

## Minimum Agent Shape

```python
import os
import instructor
import openai
from atomic_agents import AgentConfig, AtomicAgent, BasicChatInputSchema, BasicChatOutputSchema
from atomic_agents.context import ChatHistory, SystemPromptGenerator

client = instructor.from_openai(openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"]))

agent = AtomicAgent[BasicChatInputSchema, BasicChatOutputSchema](
    config=AgentConfig(
        client=client,
        model=os.environ.get("OPENAI_MODEL", "gpt-5-mini"),
        history=ChatHistory(),
        system_prompt_generator=SystemPromptGenerator(
            background=["You are a concise assistant for this application."],
            steps=["Read the user request.", "Answer using the provided context."],
            output_instructions=["Return a direct answer."],
        ),
    )
)
```

Use the project's existing provider, model, and configuration style when one exists.

## Routing

Use the more specific skills when the user is building a concrete component:

- `atomic-agents-create-schema` for `BaseIOSchema` contracts.
- `atomic-agents-create-agent` for `AtomicAgent` wiring.
- `atomic-agents-create-tool` for `BaseTool` implementations.
- `atomic-agents-create-context-provider` for dynamic prompt context.
- `atomic-agents-new-app` for a fresh scaffold.
- `atomic-agents-explore-codebase` for mapping an existing codebase.
- `atomic-agents-review-code` for framework-specific review.

## Defaults

- Design schemas first. Field descriptions are part of the LLM prompt.
- Use explicit generic parameters on `AtomicAgent` and `BaseTool`.
- Wrap chat clients with the matching `instructor.from_*` factory before passing them into `AgentConfig.client`.
- Keep provider-specific knobs in `AgentConfig.model_api_parameters`.
- Use typed error outputs for routine failures instead of throwing through agent/tool execution.
- Keep `BaseDynamicContextProvider.get_info()` cheap, synchronous, and free of secrets.
- Avoid shared `ChatHistory` across concurrent agents.

## Verification

For edits, run the smallest relevant check:

```bash
python -m compileall <package>
python -c "from <module> import <SchemaOrAgent>; print('ok')"
```

For tests, prefer offline unit tests first. Ask before running installs, live provider calls, or integration tests that need API keys.
