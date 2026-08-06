---
name: atomic-agents-create-agent
description: Use when creating, wiring, or modifying an AtomicAgent with AgentConfig, provider clients, schemas, prompts, history, hooks, or context providers.
---

# Create Atomic Agent

Use this skill when the user wants to add an `AtomicAgent`, wire a provider client, or turn schemas into a runnable LLM-backed component.

## Clarify

Bundle missing questions into one message:

- What the agent should do in one sentence.
- Whether the input and output are free-form chat or custom structured schemas.
- Which provider and model the project uses.
- Whether the agent is conversational or stateless.
- Whether it needs tools, context providers, hooks, or streaming.

## Plan

State the target file, schema names, provider, history choice, and prompt sections before editing. Use existing project conventions when present.

## Implementation Rules

- Define or import schemas before constructing the agent.
- Use `AtomicAgent[InputSchema, OutputSchema]` with explicit generic parameters.
- Wrap the chat client with the appropriate Instructor factory before passing it to `AgentConfig.client`.
- Use `SystemPromptGenerator(background=..., steps=..., output_instructions=...)` for non-trivial behavior.
- Add `ChatHistory()` only when multi-turn memory is needed.
- Keep provider-specific settings in `model_api_parameters`.
- For Gemini, set `assistant_role="model"` and match the Instructor mode.
- For providers that use JSON mode, keep the Instructor factory mode and `AgentConfig.mode` aligned.

## Skeleton

```python
import os
import instructor
import openai
from atomic_agents import AgentConfig, AtomicAgent, BasicChatInputSchema, BasicChatOutputSchema
from atomic_agents.context import ChatHistory, SystemPromptGenerator


def build_agent() -> AtomicAgent[BasicChatInputSchema, BasicChatOutputSchema]:
    client = instructor.from_openai(
        openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    )

    return AtomicAgent[BasicChatInputSchema, BasicChatOutputSchema](
        config=AgentConfig(
            client=client,
            model=os.environ.get("OPENAI_MODEL", "gpt-5-mini"),
            history=ChatHistory(),
            system_prompt_generator=SystemPromptGenerator(
                background=["You are the application's assistant."],
                steps=[
                    "Read the request.",
                    "Use available context and tools when needed.",
                    "Return the answer in the output schema.",
                ],
                output_instructions=["Be concise and explicit about uncertainty."],
            ),
            model_api_parameters={"temperature": 0.2},
        )
    )
```

## Verify

Run import checks first. Do not run a live provider call unless the user expects it and credentials are configured.

```bash
python -c "from <module> import build_agent; agent = build_agent(); print(type(agent).__name__)"
```
