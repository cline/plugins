---
name: box
description: Build and troubleshoot Box integrations for uploads, folders, folder listings, downloads and previews, shared links, collaborations, search, metadata, event-driven automations, and Box AI retrieval flows. Also covers working with Box content via the Box MCP server - search, read, upload, organize files, run Box AI queries, and extract structured metadata. Use when the agent needs to add Box APIs or SDKs to an app, wire Box-backed document workflows, organize or share content, react to new files, fetch Box content for search, summarization, extraction, or question-answering, or operate on Box content through MCP tools.
---

# Box

## Overview

Implement Box content workflows in application code. Reuse the repository's existing auth and HTTP or SDK stack whenever possible, identify the acting Box identity before coding, and make the smallest end-to-end path work before layering on sharing, metadata, webhooks, or AI.

## Route The Request

### Tool selection

After completing step 0 (tool inventory), use this table to pick the right tool for the operation:

| Operation type | Prefer | Rationale |
| --- | --- | --- |
| Most agent workflows (search, AI, content management, metadata, hubs) | MCP | Structured I/O, concurrent-safe, covers the common cases |
| Bulk operations (batch moves, folder trees, batch metadata) | CLI | Compact output, `--fields` filtering, full API surface without requiring manual REST auth |
| Verification and smoke tests | CLI | Reproducible, user can copy-paste commands |
| Operations outside MCP scope | CLI | Full API coverage |
| Last-resort fallback when MCP is unavailable and CLI is unavailable or not an option | Direct REST | Only after explicit user confirmation and REST auth setup guidance |
| Building application code (SDK/REST endpoints, webhook handlers) | SDK or REST in code | Not agent tooling - write code the user ships |

MCP covers the majority of common agent workflows and is the default when it has a matching tool. Use CLI when the operation falls outside MCP's scope, when compact and field-filtered output matters, or for reproducible verification commands. If MCP is unavailable, guide the user through MCP setup first; if CLI is unavailable, guide the user through CLI setup next. Use direct REST only as a last resort after explicitly asking the user to confirm that REST fallback is acceptable.

### Domain routing

Choose which reference files to read based on what the user needs:

| If the user needs... | Read first | Pair with | Minimal verification |
| --- | --- | --- | --- |
| Uploads, folders, listings, downloads, shared links, collaborations, or metadata | `references/content-workflows.md` | `references/auth-and-setup.md` | Read-after-write call using the same actor |
| Organizing, reorganizing, or batch-moving files across folders; bulk metadata tagging; migrating folder structures | `references/bulk-operations.md` | `references/content-workflows.md`, `references/auth-and-setup.md`, `references/ai-and-retrieval.md` | Inventory source, verify move count matches plan |
| Event-driven ingestion, new-file triggers, or webhook debugging | `references/webhooks-and-events.md` | `references/auth-and-setup.md`, `references/troubleshooting.md` | Signature check plus duplicate-delivery test |
| Search, document retrieval, summarization, extraction, or Box AI | `references/ai-and-retrieval.md` | `references/auth-and-setup.md` | Retrieval-quality check before answer formatting |
| 401, 403, 404, 409, 429, missing content, or wrong-actor bugs | `references/troubleshooting.md` | `references/auth-and-setup.md` | Reproduce with the exact actor, object ID, and endpoint |
| Unsure which workflow applies | `references/workflows.md` | `references/auth-and-setup.md` | Choose the smallest Box object/action pair first |

## Workflow

Follow these steps in order when coding against Box.

0. Inventory available Box tooling:
   - MCP: Call `who_am_i`. If it fails, try `mcp_auth`. If auth still fails, read `references/auth-and-setup.md` for MCP setup steps. Record whether MCP is available.
   - CLI: Run `box users:get me --json`. Record whether CLI is available.
   - If MCP is unavailable, walk the user through MCP setup and retry MCP auth before considering other tooling.
   - If CLI is unavailable, walk the user through CLI setup and retry `box users:get me --json`.
   - If MCP remains unavailable and CLI remains unavailable or the user declines CLI, ask for explicit confirmation before using direct REST fallback. If approved, use `references/rest-calls.md` for auth and request patterns.
   - If the task is building application code (adding SDK endpoints, webhook handlers), tooling availability is secondary - proceed to step 1.
1. Inspect the repository for existing Box auth, SDK or HTTP client, env vars, webhook handlers, Box ID persistence, and tests.
2. Determine the acting identity before choosing endpoints: connected user, enterprise service account, app user, or platform-provided token.
3. Select the tool using the tool selection table and identify the domain reference using the domain routing table above.
4. Confirm whether the task changes access or data exposure. Shared links, collaborations, auth changes, large-scale downloads, and broad AI retrieval all need explicit user confirmation before widening access or scope.
5. Read the reference for the selected tool (`references/mcp-tool-patterns.md` for MCP, `references/box-cli.md` for CLI, `references/rest-calls.md` for direct REST fallback) and the domain reference from the routing table:
   - Box MCP tool usage patterns: `references/mcp-tool-patterns.md`
   - Box CLI local verification: `references/box-cli.md`
   - Direct REST fallback patterns: `references/rest-calls.md`
   - Auth setup, actor selection, SDK vs REST: `references/auth-and-setup.md`
   - Workflow router: `references/workflows.md`
   - Content operations: `references/content-workflows.md`
   - Bulk file organization, batch moves, folder restructuring: `references/bulk-operations.md`
   - Webhooks and events: `references/webhooks-and-events.md`
   - AI and retrieval: `references/ai-and-retrieval.md`
   - Debugging and failure modes: `references/troubleshooting.md`
6. Implement the smallest end-to-end flow that proves the integration works.
7. Add a runnable verification step. Prefer the repository's tests first; otherwise use native Box CLI commands when CLI is available and authenticated. Use direct Box REST verification only as a last resort after explicit user confirmation.
8. Summarize the deliverable with auth context, Box IDs, env vars or config, and the exact verification command or test.

## Guardrails

- Preserve the existing Box auth model unless the user explicitly asks to change it.
- Check the current official Box docs before introducing a new auth path, changing auth scope, or changing Box AI behavior.
- Prefer an official Box SDK when the codebase already uses one or the target language has a maintained SDK. Otherwise use direct REST calls with explicit request and response handling.
- In agent workflows, do not jump straight to direct REST when MCP or CLI can be set up. Offer setup guidance for MCP first and CLI second before proposing REST fallback.
- Never use direct REST fallback silently. Ask the user for explicit confirmation before proceeding with REST calls.
- Keep access tokens, client secrets, private keys, and webhook secrets in env vars or the project's secret manager.
- Distinguish file IDs, folder IDs, shared links, metadata template identifiers, and collaboration IDs.
- Treat shared links, collaborations, and metadata writes as permission-sensitive changes. Confirm audience, scope, and least privilege before coding or applying them.
- Require explicit confirmation before widening external access, switching the acting identity, or retrieving more document content than the task truly needs.
- When a task requires understanding document content - classification, extraction, categorization - use Box AI (Q&A, extract) as the first method attempted. Box AI operates server-side and does not require downloading file bodies. Fall back to metadata inspection, previews, or local analysis only if Box AI is unavailable, not authorized, or returns an error on the first attempt.
- Pace Box AI calls at least 1-2 seconds apart. For content-based classification of many files, classify a small sample first to validate the prompt and discover whether cheaper signals (filename, extension, metadata) can sort the remaining files without additional AI calls.
- Avoid downloading file bodies or routing content through external AI pipelines when Box-native methods (Box AI, search, metadata, previews) can answer the question server-side.
- Request only the fields the application actually needs, and persist returned Box IDs instead of reconstructing paths later.
- Run Box CLI commands strictly one at a time. The CLI does not support concurrent invocations and parallel calls cause auth conflicts and dropped operations. For bulk work in agent-driven sessions, default to CLI and use REST only after MCP/CLI setup attempts fail or CLI is not an option and the user explicitly confirms REST fallback.
- Make webhook and event consumers idempotent. Box delivery and retry paths can produce duplicates.
- Keep AI retrieval narrow for search and Q&A tasks. Search and filter first, then retrieve only the files needed for the answer. This does not apply to Box AI classification - when classifying documents, Box AI should be tried first per the content-understanding guardrail above.
- Do not use `box configure:environments:get --current` as a routine auth check because it can print sensitive environment details.

## Verification

- Prefer the repository's existing tests or app flows when they already cover the changed Box behavior.
- If no better verification path exists, prefer native `box` CLI commands when `box` is installed and authenticated.
- Use direct REST verification only after confirming MCP and CLI are unavailable or not an option and after the user explicitly approves REST fallback.
- For REST fallback, guide the user through token setup (`BOX_ACCESS_TOKEN`) and safe auth handling before issuing requests.
- Confirm CLI auth with `box users:get me --json`.
- Verify mutations with a read-after-write call using the same actor, and record the object ID.
- For webhooks, test the minimal happy path, duplicate delivery, and signature failure handling.
- For AI flows, test retrieval quality separately from answer formatting.

Example smoke checks:

```bash
box users:get me --json
box folders:get 0 --json --fields id,name,item_collection
box folders:items 0 --json --max-items 20
box search "invoice" --json --limit 10
curl -sS -H "Authorization: Bearer $BOX_ACCESS_TOKEN" -H "Accept: application/json" "https://api.box.com/2.0/folders/0?fields=id,name,item_collection"
```

## Deliverable

The final answer should include:

- Acting auth context used for the change
- Box object type and IDs touched
- Env vars, secrets, or config expected by the integration
- Files or endpoints added or changed
- Exact verification command, script, or test path
- Any permission-sensitive assumptions that still need confirmation

## References

- `references/mcp-tool-patterns.md`: best-practice patterns for working with Box content via the Box MCP server - search, file writes, metadata extraction, Box AI tool selection, and general guidelines
- `references/auth-and-setup.md`: auth path selection, SDK vs REST choice, existing-codebase inspection, and current Box doc anchors
- `references/box-cli.md`: CLI-first local auth, smoke-test commands, and safe verification patterns
- `references/rest-calls.md`: direct REST fallback patterns, auth setup, and safe request templates
- `references/workflows.md`: quick workflow router when the task is ambiguous
- `references/content-workflows.md`: uploads, folders, listings, downloads, shared links, collaborations, metadata, and file moves
- `references/bulk-operations.md`: organizing files at scale, batch moves, folder hierarchy creation, serial execution, and rate-limit handling
- `references/webhooks-and-events.md`: webhook setup, event-feed usage, idempotency, and verification
- `references/ai-and-retrieval.md`: search-first retrieval, Box AI usage, and external AI guardrails
- `references/troubleshooting.md`: common failure modes and a debugging checklist
- `examples/box-prompts.md`: example prompts for realistic use cases
