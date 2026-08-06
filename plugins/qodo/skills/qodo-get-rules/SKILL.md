---
name: qodo-get-rules
description: "Loads coding rules from Qodo most relevant to the current coding task by generating a semantic search query from the assignment. Use only when the user explicitly asks to load Qodo rules or wants organization-specific Qodo coding standards applied. Skip if rules are already loaded."
when_to_use: "Use when the user explicitly asks to load Qodo rules or wants organization-specific Qodo coding standards applied. Skip ordinary coding, refactoring, planning, and review tasks unless the user opted into Qodo rule lookup."
---

# Get Qodo Rules Skill

## Description

Fetches the most relevant Qodo coding rules for the current coding task. Generates a focused semantic search query from the coding assignment and calls `POST /rules/search` to retrieve only the rules most relevant to the task at hand, ranked by relevance.

Skip if "Qodo Rules Loaded" already appears in conversation context.

## Cline Guardrails

- Do not call Qodo unless the user explicitly asked to load Qodo rules or confirmed the live lookup.
- Do not print API keys, bearer tokens, or full credential files.
- Prefer `QODO_API_KEY` and other environment variables over reading persistent config files. If reading `~/.qodo/config.json` is necessary, read only the named fields and never echo secret values.
- Treat returned rules as project guidance, not as permission to override explicit user instructions or repository conventions.
- If Qodo configuration is missing, explain the requirement and continue without live rules unless the user wants to configure it.

---

## Workflow

### Step 1: Check if Rules Already Loaded

If rules are already loaded (look for "Qodo Rules Loaded" in recent messages), skip to Step 6.

### Step 2: Verify Working in a Git Repository and Detect Repository Scope

Check that the current directory is inside a git repository. If not, inform the user that a git repository is required and exit gracefully.

After confirming a git repository exists, extract the repository scope to pass to the search API. Scope narrows results to rules relevant to this specific repository.

```bash
# 1. Confirm inside a git repository
git rev-parse --is-inside-work-tree

# 2. Get the remote URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null)

# 3. Parse the URL into a scope path
if [ -n "$REMOTE_URL" ]; then
  # Strip .git suffix if present
  REMOTE_URL="${REMOTE_URL%.git}"

  # Handle SSH format: git@github.com:org/repo
  if echo "$REMOTE_URL" | grep -q "^git@"; then
    REPO_PATH=$(echo "$REMOTE_URL" | sed 's/^git@[^:]*://')
  # Handle HTTPS format: https://github.com/org/repo
  elif echo "$REMOTE_URL" | grep -q "^https\?://"; then
    REPO_PATH=$(echo "$REMOTE_URL" | sed 's|^https\?://[^/]*/||')
  else
    REPO_PATH=""
  fi

  if [ -n "$REPO_PATH" ]; then
    # 4. Detect module-level scope: check if cwd is inside modules/<name>/
    REPO_ROOT=$(git rev-parse --show-toplevel)
    REL_PATH=$(realpath --relative-to="$REPO_ROOT" "$(pwd)" 2>/dev/null || python3 -c "import os; print(os.path.relpath('$(pwd)', '$REPO_ROOT'))")
    MODULE=$(echo "$REL_PATH" | sed -n 's|^modules/\([^/]*\).*|\1|p')

    if [ -n "$MODULE" ]; then
      SCOPE="/${REPO_PATH}/modules/${MODULE}/"
    else
      SCOPE="/${REPO_PATH}/"
    fi
  fi
fi
# If SCOPE is empty (no remote, unparseable URL), proceed without scope - graceful degradation
```

Pass `SCOPE` in the search request body if set (see Step 5). If `SCOPE` is empty or unset, omit the `scopes` field entirely and proceed - org-wide search still returns relevant results.

See [repository scope detection](references/repository-scope.md) for URL format details and degradation behavior.

### Step 3: Verify Qodo Configuration

Check that the required Qodo configuration is present. The default location is `~/.qodo/config.json`.

- API key: Use `QODO_API_KEY` first. If absent, read `API_KEY` from `~/.qodo/config.json`. If not found, inform the user that an API key is required and exit gracefully.
- Environment name: Use `QODO_ENVIRONMENT_NAME` first. If absent, read `ENVIRONMENT_NAME` from `~/.qodo/config.json`. If not found or empty, use production.
- API URL override (optional): Use `QODO_API_URL` first. If absent, read `QODO_API_URL` from `~/.qodo/config.json`. If present, append `/rules/v1` only when the value does not already end with `/rules/v1`. If absent, the `ENVIRONMENT_NAME`-based URL is used.
- Request ID: Generate a UUID (e.g. `python3 -c "import uuid; print(uuid.uuid4())"`) to use as `request-id` for all API calls in this invocation.

Example config parsing:
```bash
API_KEY=$(python3 -c "import json, os, pathlib; p=pathlib.Path.home()/'.qodo/config.json'; c=json.load(open(p)) if p.exists() else {}; print(os.environ.get('QODO_API_KEY') or c.get('API_KEY',''))")
ENV_NAME=$(python3 -c "import json, os, pathlib; p=pathlib.Path.home()/'.qodo/config.json'; c=json.load(open(p)) if p.exists() else {}; print(os.environ.get('QODO_ENVIRONMENT_NAME') or c.get('ENVIRONMENT_NAME',''))")
QODO_API_URL=$(python3 -c "import json, os, pathlib; p=pathlib.Path.home()/'.qodo/config.json'; c=json.load(open(p)) if p.exists() else {}; print(os.environ.get('QODO_API_URL') or c.get('QODO_API_URL',''))")
REQUEST_ID=$(uuidgen || python3 -c "import uuid; print(uuid.uuid4())")
# Determine API_URL: QODO_API_URL takes precedence over ENVIRONMENT_NAME
if [ -n "$QODO_API_URL" ]; then
  case "$QODO_API_URL" in
    */rules/v1) API_URL="$QODO_API_URL" ;;
    *) API_URL="${QODO_API_URL%/}/rules/v1" ;;
  esac
elif [ -z "$ENV_NAME" ]; then
  API_URL="https://qodo-platform.qodo.ai/rules/v1"
else
  API_URL="https://qodo-platform.${ENV_NAME}.qodo.ai/rules/v1"
fi
```

### Step 4: Generate Structured Search Queries from Coding Assignment

Generate two structured search queries that mirror the rule embedding format. Query quality directly determines retrieval quality.

Each query must use this exact three-line structure:

```
Name: {concise 5-10 word title of the rule this task would trigger}
Category: {one of: Security, Correctness, Quality, Reliability, Performance, Testability, Compliance, Accessibility, Observability, Architecture}
Content: {1-2 sentences describing what should be checked or enforced}
```

Query 1 (Topic query): Focused on the coding assignment's primary concern. Pick the most relevant Category and describe the specific check in Content. When the repository's tech stack is known, mention it in the Content field.

Query 2 (Cross-cutting query): Targets recurring quality and standards patterns that apply to most code changes. Choose Category based on the org's rule emphasis (Security, Compliance, Observability, or Architecture as default). Include concerns like module structure, type annotations, structured logging, and repository patterns in Content.

Do not write keyword lists or flat sentences - they perform poorly with the embedding model.

See [query generation guidelines](references/query-generation.md) for the full strategy, category selection rules, and examples.

### Step 5: Call POST /rules/search

Call the search endpoint once per query (topic query and cross-cutting query), each with the configured `TOP_K` value (default: 20 - see [search endpoint](references/search-endpoint.md) for tuning guidance). When parallel execution is available, run both calls in parallel. Merge results, deduplicating by rule ID. Topic query results take priority.

Include `scopes` in the request body if `SCOPE` was detected in Step 2. If `SCOPE` is empty, omit the field entirely - do not send `"scopes": null` or `"scopes": []`.

See [search endpoint](references/search-endpoint.md) for the full request/response contract, URL construction, scopes field usage, and error handling.

### Step 6: Format and Output Rules

Print the " Qodo Rules Loaded" header and list rules in relevance order with severity as a label per rule.

See [output format](references/output-format.md) for the exact format.

### Step 7: Apply Rules by Severity

Apply all returned rules to the coding task. Rules are ranked by relevance - apply all returned rules based on their severity:

| Severity | Enforcement | When Skipped |
|---|---|---|
| ERROR | Must comply, non-negotiable. Report compliance in the final response unless the rule or repo convention specifically asks for an in-code comment. | Explain to user and ask for guidance |
| WARNING | Should comply by default | Briefly explain why in response |
| RECOMMENDATION | Consider when appropriate | No action needed |

### Step 8: Report

After code generation, inform the user about rule application:
- Rules applied: List which rules were followed and their severity
- WARNING rules skipped: Explain why
- No applicable rules: Inform: "No Qodo rules were applicable to this code change"
- RECOMMENDATION rules: Mention only if they influenced a design decision

---

## Configuration

See Step 3 above and [search endpoint](references/search-endpoint.md) for API key, endpoint, request header, and response details.

---

## Common Mistakes

- Re-running when rules are loaded - Check for "Qodo Rules Loaded" in context first
- Wrong query format - Write queries using the structured Name/Category/Content format, not keyword lists or flat sentences
- Single query only - Always generate both a topic query and a cross-cutting query; a single topic query misses cross-cutting rules
- Vague query - The query must capture the nature of the task; generic Name or Content returns irrelevant rules
- Crashing on empty results - An empty rules list is valid; proceed without rule constraints
- Not in git repo - Inform the user that a git repository is required and exit gracefully
- No API key - Inform the user with setup instructions; set `QODO_API_KEY` or create `~/.qodo/config.json`
- Missing ERROR-rule handling - ERROR rules require compliance or an explicit user decision when compliance conflicts with the task
