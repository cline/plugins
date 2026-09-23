---
name: atomic-agents-create-tool
description: Use when creating or modifying an Atomic Agents BaseTool with typed input/output schemas, BaseToolConfig, run or run_async, env-driven credentials, and typed failure results.
---

# Create Atomic Agents Tool

Use this skill when the user wants to wrap an API, database call, local computation, search, or service as a tool an Atomic Agent can invoke.

## Clarify

Ask for missing details in one message:

- Tool purpose.
- Input and output fields.
- External dependencies and credentials.
- Sync, async, or both.
- Expected failure modes such as not found, rate limit, timeout, or invalid input.

## Rules

- Use `BaseTool[InputSchema, OutputSchema]` with explicit generic parameters.
- Keep schemas as `BaseIOSchema` classes with docstrings and field descriptions.
- Use `BaseToolConfig` for API keys, base URLs, timeouts, and retry settings.
- Read credentials from environment variables or injected config, never hardcode them.
- Add timeouts to HTTP and database calls.
- Return an output schema instance, never a raw dict.
- Model routine failures as typed outputs. Raise only for programmer errors.
- If async is needed, implement `run_async`, not `arun`.

## Skeleton

```python
import os
from typing import Literal
import httpx
from pydantic import Field
from atomic_agents import BaseIOSchema, BaseTool, BaseToolConfig


class SearchConfig(BaseToolConfig):
    api_key: str = Field(
        default_factory=lambda: os.environ.get("SEARCH_API_KEY", ""),
        description="Search API key.",
    )
    base_url: str = Field(
        default="https://api.example.com",
        description="Search API base URL.",
    )
    timeout_seconds: float = Field(default=15, ge=1, le=120, description="HTTP timeout.")


class SearchInput(BaseIOSchema):
    """Search request."""

    query: str = Field(..., description="User search query.")


class SearchOutput(BaseIOSchema):
    """Search result or typed failure."""

    status: Literal["ok", "error"] = Field(..., description="Outcome code.")
    results: list[str] = Field(default_factory=list, description="Search results.")
    error: str | None = Field(default=None, description="Failure reason when status is error.")


class SearchTool(BaseTool[SearchInput, SearchOutput]):
    """Search an external service."""

    def __init__(self, config: SearchConfig | None = None):
        super().__init__(config or SearchConfig())

    def run(self, params: SearchInput) -> SearchOutput:
        cfg: SearchConfig = self.config
        if not cfg.api_key:
            return SearchOutput(status="error", error="SEARCH_API_KEY is not set")

        try:
            response = httpx.get(
                f"{cfg.base_url}/search",
                params={"q": params.query},
                headers={"Authorization": f"Bearer {cfg.api_key}"},
                timeout=cfg.timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            return SearchOutput(status="error", error=str(error))

        data = response.json()
        return SearchOutput(status="ok", results=[item["title"] for item in data["items"]])
```

## Verify

Unit-test the tool without live services where possible. For live tests, ask before using credentials or making network calls.
