---
name: atomic-agents-create-schema
description: Use when creating or modifying Atomic Agents BaseIOSchema input or output contracts, including field descriptions, validators, typed errors, and schemas for agents or tools.
---

# Create Atomic Agents Schema

Use this skill when the user wants a schema for an Atomic Agents agent, tool, router, extractor, classifier, or structured output.

## Clarify

Ask only for missing information:

- Whether the schema is for an agent, a tool, or shared data.
- Input, output, or both.
- Required fields, optional fields, defaults, and constraints.
- Whether failure is expected and should be represented as a typed result.

## Rules

- Inherit from `BaseIOSchema`, not `pydantic.BaseModel`.
- Add a non-empty class docstring to every schema.
- Put `description=` on every `Field(...)`.
- Prefer `Literal[...]` for small closed sets.
- Add validators for cross-field rules or normalization that the type system cannot express.
- Give `Optional[T]` fields an explicit default, usually `None`.
- Use typed error variants for routine failures.

## Template

```python
from typing import Literal
from pydantic import Field, model_validator
from atomic_agents import BaseIOSchema


class TicketInput(BaseIOSchema):
    """A support ticket that needs classification."""

    title: str = Field(..., description="Short ticket title from the user.")
    body: str = Field(..., description="Full ticket body or transcript.")


class TicketClassification(BaseIOSchema):
    """Classification result for a support ticket."""

    status: Literal["ok", "error"] = Field(..., description="Whether classification succeeded.")
    category: Literal["billing", "bug", "question", "other"] | None = Field(
        default=None,
        description="Ticket category when status is ok.",
    )
    confidence: float | None = Field(
        default=None,
        ge=0,
        le=1,
        description="Model confidence from 0 to 1 when status is ok.",
    )
    error: str | None = Field(
        default=None,
        description="Reason classification failed when status is error.",
    )

    @model_validator(mode="after")
    def validate_status_fields(self) -> "TicketClassification":
        if self.status == "ok" and self.category is None:
            raise ValueError("category is required when status is ok")
        if self.status == "error" and not self.error:
            raise ValueError("error is required when status is error")
        return self
```

## Verify

Run an import and schema check:

```bash
python -c "from <module> import TicketInput; print(TicketInput.model_json_schema()['title'])"
```

If the import fails because a schema has no docstring, add the docstring. If JSON Schema lacks useful descriptions, add or improve `Field(description=...)` text.
