---
name: atomic-agents-create-context-provider
description: Use when adding an Atomic Agents BaseDynamicContextProvider to inject current time, user state, retrieved docs, cached schemas, session state, or other dynamic prompt context.
---

# Create Atomic Agents Context Provider

Use this skill when an agent needs runtime context in its system prompt.

## Clarify

Ask only for missing details:

- What information should appear in the prompt.
- Where the information comes from.
- How fresh it needs to be.
- Which agents should receive it.
- Whether the context may contain secrets or private data.

## Rules

- Subclass `BaseDynamicContextProvider`.
- Set a clear, unique `title` in `super().__init__(title=...)`.
- Implement `get_info(self) -> str`.
- Keep `get_info()` synchronous, cheap, and deterministic.
- Do not perform HTTP, DB, or file I/O inside `get_info()`.
- Refresh slow data outside `get_info()` and store a cached string or data object.
- Never include API keys, tokens, passwords, or unnecessary private content in the returned context.
- Register the provider on each agent before any `run()` that depends on it.

## Simple Provider

```python
from datetime import datetime, timezone
from atomic_agents.context import BaseDynamicContextProvider


class TimeContext(BaseDynamicContextProvider):
    def __init__(self):
        super().__init__(title="Current Time")

    def get_info(self) -> str:
        return datetime.now(timezone.utc).isoformat()
```

## Cached Provider

```python
from atomic_agents.context import BaseDynamicContextProvider


class RetrievedDocsContext(BaseDynamicContextProvider):
    def __init__(self):
        super().__init__(title="Retrieved Documents")
        self._docs: list[tuple[str, str]] = []

    def set_docs(self, docs: list[tuple[str, str]]) -> None:
        self._docs = docs

    def get_info(self) -> str:
        if not self._docs:
            return "No documents retrieved."
        return "\n\n".join(f"[{source}]\n{text}" for source, text in self._docs)
```

## Registration

```python
docs_context = RetrievedDocsContext()
agent.register_context_provider("retrieved_docs", docs_context)

docs_context.set_docs(search(query))
result = agent.run(input_schema)
```

## Verify

Check that the provider returns a string and that the agent registers it before use. For code review, look for slow I/O or secrets in `get_info()`.
