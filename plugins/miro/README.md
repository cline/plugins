# miro

Use Miro boards from Cline for board context, visual planning, diagrams, documents, tables, and code review artifacts.

## What It Does

This plugin registers the `miro` MCP server at `https://mcp.miro.com/` and bundles six Miro workflow skills:

- `miro-browse`: inspect board structure, frames, documents, diagrams, images, and other board items.
- `miro-diagram`: create or update diagrams on a board.
- `miro-doc`: create or update markdown-style Miro documents.
- `miro-table`: create or update structured Miro tables.
- `miro-code-spec`: extract board specs into local `.miro/specs/` files for implementation planning.
- `miro-code-review`: create useful board artifacts for non-trivial PR, MR, branch, or local-diff reviews.

## Install

```bash
cline plugin install miro
```

For local development from this repository:

```bash
cline plugin install ./plugins/miro --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Summarize this Miro board and list the frames that look relevant to the checkout redesign: https://miro.com/app/board/...
```

Or:

```text
Create a sequence diagram for the login flow on this Miro board: https://miro.com/app/board/...
```

## Requirements

- A Miro account with access to the target boards.
- MCP OAuth or account authorization through the normal Cline MCP flow when the Miro MCP server requests it.
- Board edit permissions for creation or update workflows.
- Local `git`, and optionally `gh` or `glab`, for the visual code review skill.

## Security Notes

The MCP server can read and modify boards according to the permissions granted to the authenticated Miro account. Ask before overwriting local `.miro/specs/` content, changing PR or MR descriptions, or creating large sets of board artifacts.

Bundled Miro skill material is listed as MIT-licensed in the source package metadata. See `NOTICE.miro.md`.
