# Scan Workflow

> Command conventions used throughout this file
> - `<binary>` -- the full path resolved during binary discovery (e.g. `~/.42crunch/bin/42c-ast`). Never call `42c-ast` by name alone unless it is confirmed to be on PATH.
> - Platform mode: prefix every command with `API_KEY="<resolved-value>" PLATFORM_HOST="<value>"` (both values read from `~/.42crunch/conf/env` on macOS/Linux or `%APPDATA%\42Crunch\conf\env` on Windows).
> - Free Trial mode: add `--freemium-host stateless.42crunch.com:443` and `--token <TRIAL_TOKEN>` to every command.
> - Cline secret handling: do not display commands with real secret values in chat or logs. Prefer loading secrets from the 42Crunch config file or environment at execution time, and show placeholders when explaining commands.
> - PowerShell string quoting: when a variable is immediately followed by `:` inside a double-quoted string, PowerShell parses `$varName:` as a PSDrive reference (like `$env:TEMP`) and throws `InvalidVariableReferenceWithDrive`. Always use `${varName}` to delimit the name -- e.g. `"${opName}: ..."` not `"$opName: ..."`. This applies to any inline PowerShell generated during the session, not just the static snippets below.
> - Target safety: `SCAN42C_HOST` is only a proposed target, not permission. Before any reachability probe, happy-path validation, or full scan traffic, confirm the exact target URL with the user. If the target appears production or internet-facing, continue only after the user explicitly confirms they are authorized to scan it.

---

## Step 1 -- Locate or Create Scan Config

> Free Trial mode: omit `--tag` and `--report-sqg` from all commands in this step.
> These flags require platform access and must not be used in free trial mode.

### 1a -- Resolve git root and alias

Resolve the git root first. Run from the OAS file's directory:

```bash
git -C "<oas-file-directory>" rev-parse --show-toplevel 2>/dev/null || echo "NOT_GIT"
```

- Git root found -> store as `GIT_ROOT`. All relative paths (OAS path in
  `conf.yaml`, `--conf-file`, `scan run` / `scan conf validate` arguments) are
  relative to this directory. All `42c-ast` commands must be run from `GIT_ROOT`
  (use `cd "$GIT_ROOT" &&` or equivalent).
- NOT_GIT -> use the agent's working directory as the project root and note to
  the user that there is no git repository.

Walk upward from `GIT_ROOT` looking for `.42c/conf.yaml`.

If `.42c/conf.yaml` exists and the OAS path is listed:
- Extract the `alias` value for that path.

If `.42c/conf.yaml` does not exist or the OAS path is not in it:
- Derive an alias from `info.title` in the OAS file: lowercase, replace spaces/underscores/special characters with hyphens, collapse consecutive hyphens, strip leading/trailing hyphens.
  - Example: `info.title: "My Banking API"` -> `my-banking-api`, `info.title: "Vulnerable API v2"` -> `vulnerable-api-v2`
  - If `info.title` is absent or empty, fall back to the OAS filename stem using the same transformation rules.
- Add (or create) the entry in `$GIT_ROOT/.42c/conf.yaml`:
  ```yaml
  apis:
    <relative-oas-path-from-git-root>:
      alias: <derived-alias>
  ```

### 1b -- Check for existing scan config

Check whether `.42c/scan/<alias>/scanconf.json` exists.

If it exists:
- Validate it:
  ```bash
  # Platform mode
  API_KEY="<value>" PLATFORM_HOST="<value>" <binary> scan conf validate <relative-oas-path> \
    --conf-file .42c/scan/<alias>/scanconf.json

  # Free Trial mode
  <binary> scan conf validate <relative-oas-path> \
    --freemium-host stateless.42crunch.com:443 \
    --token <TRIAL_TOKEN> \
    --conf-file .42c/scan/<alias>/scanconf.json
  ```
- If valid (`statusCode: 0`): store `CONF_FILE=.42c/scan/<alias>/scanconf.json` and proceed to Step 2.
- If invalid: treat as missing (re-generate).

If it does not exist (or was invalid):
- Ensure the output directory exists:
  ```bash
  mkdir -p .42c/scan/<alias>
  ```
- Generate a baseline config using the relative OAS path (not alias, not absolute path).
  Platform mode: include `--tag` only when a tag was resolved. Free Trial mode: omit `--tag`.
  ```bash
  # Platform mode
  API_KEY="<value>" PLATFORM_HOST="<value>" <binary> scan conf generate \
    --output-format json \
    --output .42c/scan/<alias>/scanconf.json \
    [--tag <category>:<tag>] \
    <relative-oas-path>

  # Free Trial mode
  <binary> scan conf generate \
    --freemium-host stateless.42crunch.com:443 \
    --token <TRIAL_TOKEN> \
    --output-format json \
    --output .42c/scan/<alias>/scanconf.json \
    <relative-oas-path>
  ```
- Validate (use the same mode-appropriate command as above).
- If valid: store `CONF_FILE=.42c/scan/<alias>/scanconf.json` and proceed to Step 2.
- If invalid: surface the error to the user and stop.

Scan Configuration Normalization after first generation (required):
- On first `scan conf generate`, the generated `environments.default.variables`
  includes one variable per OpenAPI security scheme (for example bearer auth,
  oauth2, apiKey, or basic auth variables) typically with `"required": true`.
  - Normalize these generated security-related variables to `"required": false`
    before proceeding, unless the user explicitly wants strict required inputs.
- The generated `authenticationDetails` is also initialized with one default credential
  per OpenAPI security scheme defined in the OAS (for example bearer, oauth2, basic, or apiKey).
  - Use this generated default credential as the User 1 credential for that
    scheme. Update/wire that default entry as needed; do not create an additional
    User 1 credential unless the user explicitly asks for multiple primary
    identities.

### 1c -- Write target URL to config

Write `SCAN_TARGET_URL` (confirmed in the skill's URL resolution step) into
`environments.default.variables.host` in `CONF_FILE`. No URL resolution or
user prompting is needed here -- the URL was already confirmed and reachability
checked before the workflow started.

Important schema rule for `environments.default.variables`:
- Variable entries must be objects with a source strategy, not raw string literals.
- Keep generated security-scheme variables optional for scan execution -- set `"required": false`
  for each generated security-scheme variable in `environments.default.variables`.
- For values used by operation templates (for example `{{username}}`, `{{password}}`),
  add entries under `environments.default.variables` using `"from": "environment"`
  with both `"name"` and `"required": false`.
- Use this shape for scan variables:
  ```json
  "host": {
    "name": "SCAN42C_HOST",
    "from": "environment",
    "required": false,
    "default": "<SCAN_TARGET_URL>"
  },
  "username": {
    "name": "SCAN42C_USERNAME",
    "from": "environment",
    "required": false,
    "default": "<user1-username>"
  },
  "password": {
    "name": "SCAN42C_PASSWORD",
    "from": "environment",
    "required": false,
    "default": "<user1-password>"
  }
  ```

After writing `SCAN_TARGET_URL` (and after any direct edits to `CONF_FILE`),
run an immediate config validation checkpoint before proceeding.

```bash
# Platform mode
API_KEY="<value>" PLATFORM_HOST="<value>" <binary> scan conf validate <relative-oas-path> \
  --conf-file <CONF_FILE>

# Free Trial mode
<binary> scan conf validate <relative-oas-path> \
  --freemium-host stateless.42crunch.com:443 \
  --token <TRIAL_TOKEN> \
  --conf-file <CONF_FILE>
```

If validation fails, stop and fix the config before Step 2.

---

## Step 2 -- Authentication Setup

Read the OAS `securitySchemes` and global/operation `security` definitions to
determine the auth scheme, then collect credentials using the per-scheme flows
below. Ask normal Cline questions for non-secret choices and identifiers, but
never collect passwords, tokens, cookies, API keys, or client secrets in chat.
Never generate, guess, or suggest credential values.

BOLA/BFLA second-user identification (do this before collecting any credentials):
Identify all BOLA/BFLA candidates in the OAS. Flag every operation where ALL
of the following are true:
- The path contains at least one path parameter whose name ends in `Id`, `Key`,
  or `Ref` (e.g. `{userId}`, `{orderId}`, `{documentRef}`), or is a UUID/integer
  field whose name matches a resource type -- indicating a specific resource
  instance, not a collection.
- The HTTP method is GET, PUT, PATCH, or DELETE (i.e. the operation reads or
  mutates a specific resource instance, not a collection).

HTTP method does NOT gate BOLA candidacy -- a PUT or PATCH on `/{resourceId}`
is just as much a BOLA candidate as a DELETE or GET on the same path.

Flag privileged operations (admin-only actions) separately as BFLA candidates
even if they have no path ID parameter. Use these heuristics to detect them
automatically; fall back to asking the user if none match:

- Path segment contains `admin`, `internal`, `management`, `staff`, `system`,
  or `superuser` (e.g. `/admin/users`, `/internal/reports`).
- Operation is in a tag group named `Admin`, `Internal`, `Management`, or similar.
- `security` requirement on the operation references a scheme whose name includes
  `admin` or `superuser`.
- Request body or parameter has a field whose enum or description restricts it to
  admin use (e.g. `role: admin`).
- If none of the above match and the OAS provides no clear signals, call
  `AskUserQuestion`: `"I couldn't automatically detect any privileged operations.
  Are there any admin-only or elevated-privilege endpoints I should test for
  BFLA?"` -- options: `["Yes -- I'll flag them", "No -- skip BFLA testing"]`.

This determines whether a second user (User 2) is needed before credential
prompts are shown, so the user understands why they're being asked for two sets.

### Per-scheme credential collection

For each auth scheme, collect credentials using Cline's normal user prompt only
for non-secret identifiers such as usernames and endpoint choices. Do not ask
for passwords, API keys, bearer tokens, cookies, or client secrets in chat; load
them from user-approved environment variables, existing local config, a
user-created local file, or a secure host prompt when available. Never generate,
guess, or suggest values. Collect in this order: User 1 first, then User 2
(BOLA only), then admin (BFLA only).

Login endpoint (`POST /login`, `POST /auth/token`, etc. -- most common):

Announce which endpoint will be used. Then make a single `AskUserQuestion` call sized to the situation:

- No BOLA found -- use 2 questions:
  - `header: "User 1"`, question: `"What is User 1's username or email?"`  -> store as `{{username}}`
  - Obtain User 1's password or PIN from an approved local/secure source, not chat -> store as `{{password}}`

- BOLA found -- use 4 questions (all in the same call):
  - `header: "User 1"`, question: `"What is User 1's username or email?"`                                       -> store as `{{username}}`
  - Obtain User 1's password or PIN from an approved local/secure source, not chat                              -> store as `{{password}}`
  - `header: "User 2"`, question: `"What is User 2's username or email? (must NOT share User 1's resources)"`  -> store as `{{user2Username}}`
  - Obtain User 2's password or PIN from an approved local/secure source, not chat                              -> store as `{{user2Password}}`

For BFLA (admin) credentials, use a separate prompt after the BOLA pair for the non-secret admin username, then obtain `{{adminPassword}}` from an approved local/secure source.

Bearer / JWT (no login endpoint in OAS):

- `AskUserQuestion`: `"I need a bearer token for User 1. Do you have one available in a local/secure source, or should I acquire one from an endpoint?"` -- options: `["I have a token in a local/secure source", "I need to acquire one -- I'll specify the endpoint"]`
  - If local/secure source -> read the token only from the approved source, store as `{{user1Token}}`
  - If acquire -> ask for endpoint, then collect username + password as above
- If BOLA found -> repeat for User 2, store as `{{user2Token}}`

API Key: read the key value only from an approved local/secure source, store as `{{apiKey}}`. Header/param name from `securitySchemes[*].name` and `in`.

Basic Auth: use the same adaptive single-call pattern as Login endpoint -- 2 questions (no BOLA) or 4 questions (BOLA). For BFLA admin, use a separate 2-question call with `header: "Admin"`.

OAuth2: `AskUserQuestion`: `"Do you have an access token in a local/secure source, or should I use the token endpoint from the OAS?"` -- options: `["I have an access token in a local/secure source", "Use the token endpoint -- I'll provide client credentials through an approved source"]`. Collect accordingly.

Do not proceed until at least the primary user's credentials are confirmed.

### Writing credential acquisition flows into `authenticationDetails`

When a credential requires a request sequence (e.g. a login call) to acquire its token,
add a `requests` array to the credential object.

Rule: always use `$ref` to reference an existing operation -- never inline `request` objects.
Inline blocks have no `operationId`, which the VS Code extension rejects with
`Unable to parse request that has no operationId set`. The `42c-ast` CLI accepts both
formats, but the extension does not -- always use `$ref` regardless.

Pattern:
```json
"authenticationDetails": [
  {
    "<SchemeName>": {
      "type": "<bearer|oauth2|basic|apiKey>",
      "default": "<CredentialName>",
      "credentials": {
        "<CredentialName>": {
          "description": "<description>",
          "credential": "{{<tokenVar>}}",
          "requests": [
            {
              "$ref": "#/operations/<LoginOperationId>/request",
              "responses": {
                "200": {
                  "expectations": { "httpStatus": 200 },
                  "variableAssignments": {
                    "<tokenVar>": {
                      "in": "body", "from": "response", "contentType": "json",
                      "path": { "type": "jsonPointer", "value": "/<tokenField>" }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  }
]
```

Replace `<LoginOperationId>` with the `operationId` of the operation that issues the
token (look for a `POST /login`, `POST /auth/token`, or equivalent). Replace
`<tokenField>` with the JSON Pointer path to the token value in the response body.

Variable scoping -- credential context only:
`variableAssignments` in a credential acquisition step are scoped to the credential
context. Only the token variable `<tokenVar>` (the one referenced by `"credential"`) is reliably
available in the operation context at scan time. Any extra variables captured here are NOT in the operation context during full fuzzing scans.

Rule: capture only the credential (for example Bearer token, API key, or Basic Auth)
in `authenticationDetails`. For any other data needed from the login response,
add an explicit `before` block on each operation that needs it and capture the value
there instead (See Step 4 -- Class-B: dependency chain pattern).
  - If many operations share the same variable, use the global
    before block (see Step 4 -- Global `before` block). Do not rely on
    variableAssignments in `authenticationDetails` for anything beyond the
    credential token itself.

Rule: use existing generated default credential for User 1.
After initial scan config generation, treat the scheme's default generated
credential in `authenticationDetails` as User 1. Populate or adjust that
credential's `credential`, `requests`, and `variableAssignments` fields as
needed instead of creating a second User 1 credential entry.

Second user (BOLA): use `environment` to override the credential variables for that
step without duplicating the operation:
```json
"<SecondCredentialName>": {
  "credential": "{{<secondTokenVar>}}",
  "requests": [
    {
      "$ref": "#/operations/<LoginOperationId>/request",
      "environment": {
        "<usernameVar>": "{{<user2UsernameVar>}}",
        "<passwordVar>": "{{<user2PasswordVar>}}"
      },
      "responses": {
        "200": {
          "expectations": { "httpStatus": 200 },
          "variableAssignments": {
            "<secondTokenVar>": {
              "in": "body", "from": "response", "contentType": "json",
              "path": { "type": "jsonPointer", "value": "/<tokenField>" }
            }
          }
        }
      }
    }
  ]
}
```

`environment` overrides apply only to that single step. The keys must match the template
variable names used in the referenced operation's `requestBody`. If the login operation
uses hardcoded values instead of `{{variables}}`, update its `requestBody` to use
template variables first -- otherwise `environment` overrides have no effect.

---

## Step 2.5 -- Test Data

Before classifying operations, establish the source of test data for the scan.

Check the OAS for existing sample data: scan all operation request bodies and
parameters for `example`, `examples`, or `default` values on their schemas.

Call `AskUserQuestion`:

If OAS has sample data:
- question: `"Do you have test data to use for testing, or shall I use the samples present in the OAS?"`
- options: `["Use OAS samples", "I have my own test data -- I'll provide a Postman collection"]`

If OAS has NO sample data:
- question: `"The OAS doesn't include sample values for request bodies or parameters. Do you have test data available, or will you provide values manually as we go?"`
- options: `["I'll provide a Postman collection", "I'll provide values manually as needed"]`

If the user selects a Postman collection:
1. Call `AskUserQuestion` -- question: `"Please share the path to your Postman collection file (v2.1 JSON format)."` -- wait for the file path.
2. Parse the Postman v2.1 JSON.
3. Build a test data lookup table keyed by HTTP method + path pattern:
   ```
   { "<METHOD> <path>": { body: {...}, pathVars: {...}, queryParams: {...} } }
   ```
4. Announce: `"Loaded test data from Postman collection: <N> request(s) matched."`
5. This table is used in Step 3 (classification) and Step 4 (scenario building) to
   auto-populate Class-C operations -- no reactive import needed in Step 5.

If re-seeding is needed after a destructive scan operation (Step 3 Class-D), use
the seed command captured here. If no seed command was provided and Class-D
operations exist, note to the user that they may need to manually restore test
records between scan runs if the primary user's account is deleted.

---

## Step 2.6 -- Built-in Variables

The scan config supports a set of built-in variables that generate dynamic values at scan runtime. These can be used in place of or concatenated with static string values for parameters and request body properties.

| Variable | Description |
|---|---|
| `{{$randomString}}` | Random alphanumeric string of 20 characters |
| `{{$randomuint}}` | Random uint32 integer |
| `{{$uuid}}` | Unique UUID |
| `{{$timestamp}}` | Current time in UNIX format |
| `{{$timestamp3339}}` | Current date and time in RFC 3339 format |
| `{{$randomFromSchema}}` | Value generated from the schema defined in the OAS |

When to use them: built-in variables are most useful for operations that require unique values across iterations. For example, when testing a user registration endpoint, using a static email address causes the second and subsequent iterations to fail with `409 Conflict`. Instead, compose the value with a built-in variable to guarantee uniqueness each time:

```json
"email": "user{{$randomuint}}@email.com"
```

Built-in variables can be concatenated with any static string prefix or suffix. They are evaluated fresh on every request -- each iteration gets a different value.

Where to place them -- scenario-level `environment`, not global variables:

Do not put built-in variable expressions in `environments.default.variables`. Global variables must be static strings (or environment-variable overrides). Instead, pass built-in variable expressions in the `environment` block of the scenario request step that needs them:

```json
"scenarios": [
  {
    "key": "happy.path",
    "fuzzing": true,
    "requests": [
      {
        "fuzzing": true,
        "$ref": "#/operations/UserRegistration/request",
        "environment": {
          "reg_username": "user{{$randomuint}}",
          "reg_email": "user{{$randomuint}}@example.com",
          "reg_password": "password"
        }
      }
    ]
  }
]
```

This keeps the operation reusable: a `before` block that calls `UserRegistration` can supply its own fixed throwaway values in its own `environment` override, while the happy-path scenario independently supplies randomised values -- neither one interferes with the other.

Common patterns:

```json
"username": "testuser_{{$randomString}}",
"email": "user{{$randomuint}}@example.com",
"referenceId": "{{$uuid}}",
"createdAt": "{{$timestamp3339}}"
```

Keep these available when classifying operations in Step 3 -- Class-A operations that create uniquely-keyed resources (users, accounts, orders) should use built-in variables rather than static literals to avoid collision failures across scan iterations.

---

## Step 3 -- Operation Classification

Before writing any scenario into the scan config, analyse every operation in
the OAS and classify it. Before presenting the table, give the user a brief
explanation of the four classes so they can meaningfully validate the results.

### Classification overview

Output this explanation before the table:

```
I've classified every API operation into one of four testing modes:

  A -- Standalone      Runs with sample or generated data -- no setup needed.
  B -- Dependency      Needs a dynamic ID from a prior operation
                      (e.g. create a resource first, then fetch it by ID).
  C -- Manual data     Requires values I can't generate automatically --
                      I'll use your Postman collection or ask you to provide them.
  D -- Throwaway user  Destroys the currently authenticated account
                      (e.g. DELETE /account) -- I'll use a temporary test user
                      to keep your primary session intact.

Here is how I've classified your operations:
```

### Classification categories

A -- Standalone
All required inputs (path params, query params, request body) can be
satisfied from:
- OAS `example` / `examples` / `default` values on the schema
- Static literal values
- Environment variables (e.g. `{{username}}`, `{{password}}`)
- The `{{$randomuint}}` / `{{$randomstring}}` macros for uniqueness

B -- Dependency-chain required
One or more path or query params contain a dynamic ID that can only come from
a prior operation's response body (e.g. `{orderId}`, `{userId}`, `{documentId}`).

Detection heuristic:
1. Identify path params that look like resource IDs (end in `Id`, `Key`, `Ref`,
   or are a UUID/integer field named after a resource).
2. Find the operation that creates or returns that resource (typically a `POST`
   or `GET` on the parent collection path).
3. Find the response body field in that operation's success schema that provides
   the ID value.
4. Propose the chain: `<CreatorOp> -> <TargetOp>` with the JSON Pointer to
   extract the variable.

C -- User-data-required
Inputs cannot be resolved automatically and no plausible creator operation
exists. If a Postman collection was provided in Step 2.5, use values from the
lookup table. Otherwise ask the user to provide the values directly.

D -- Throwaway-user required
The operation destroys the currently authenticated principal's own resource
(e.g. `DELETE /account`, `DELETE /users/me`, `DELETE /profile`).

Class-D requires the absence of a resource-identifying path parameter. If the
operation has a path parameter that names the target (e.g. `DELETE /users/{username}`,
`DELETE /accounts/{accountId}`), it is NOT Class-D -- the caller is naming an explicit
target, not implicitly deleting themselves. Classify it as B or A instead, with a
`before` block to seed the target resource if needed. Class-D applies only when the
operation's sole implicit target is the authenticated user (no path parameter identifies
a different resource).

Do NOT use `"skipped": true` -- the scanner ignores this field and will
execute the operation against User1, deleting the primary test user and
breaking all subsequent happy paths in the same run.

Do NOT use `environment` overrides on the token variable -- the
`authenticationDetails` credential tokens are acquired and cached at session
start. Overriding the variable at step level does not change which cached
credential is injected; the operation will still run as User1.

Instead:
1. Add a named throwaway credential to `authenticationDetails` with only
   the login acquisition step.
2. Set `"auth": ["AccessToken/<throwaway-credential-name>"]` directly on
   the operation's `request` definition -- using `Scheme/CredentialName`
   notation. Do not use the default credential.
3. Build a `happy.path` scenario with a `before` block:
   - Before block: register the throwaway user (with environment overrides for
     the throwaway credentials) by adding the register step to the operation's `before` block.
   - Happy Path: run the destructive operation (it authenticates as the throwaway
     via the operation's `auth` setting).

This leaves User1 intact while still validating the operation across
multiple fuzzing iterations.

### Example classification table

```
Operation              | Class  | BOLA? | Proposed data source
-----------------------|--------|-------|----------------------------------------------
UserLogin              | A      | no    | env vars: {{username}} / {{password}}
UserRegistration       | A      | no    | {{$randomuint}} macro for username/email
CreateResource         | A      | no    | OAS body example + {{userId}} from auth
CancelResource         | B      | yes   | CreateResource -> /{resourceId}
RetrieveResource       | B      | yes   | CreateResource -> /{resourceId}
UpdateResource         | B      | yes   | CreateResource -> /{resourceId}  <- PUT, BOLA
DeleteUser             | B      | yes   | UserRegistration -> /{userId}
DeleteAccount          | D      | no    | register+login throwaway -> delete throwaway
```

`BOLA? = yes` has a direct consequence in Step 4: every operation marked as a BOLA candidate will receive an additional BOLA test scenario (using User 2's token) alongside its happy path scenario. Every operation marked as a BFLA candidate must run its happy path as admin (`auth: ["<SchemeName>/AdminToken"]`) and will receive a BFLA test scenario that replays the same request with User 1's low-privilege token.

Output the classification explanation and table above as a chat message, then call `AskUserQuestion`:
- question: `"Does this classification look correct, or do you need to correct any misclassifications?"`
- options: `["Yes -- proceed", "No -- I need to correct some classifications"]`

---

## Step 4 -- Build Scenario Chains

For every Class-B operation, inject an operation-level `before` dependency step
along-side the `happy.path` scenario. The `before` step creates or fetches the
resource, while the `happy.path` step executes the target request. Show the user
each proposed chain in plain English before writing it.

#### `before` block rules:
1. Always prefer to reference existing OAS operations in `before` blocks -- avoid creating
a utility request as a substitute. If an operation already exists in the spec
(e.g. `UserRegistration`, `UserLogin`), use `"$ref": "#/operations/<OperationId>/request"`
with `environment` overrides to supply different inputs. Only add an entry to
the top-level `requests` section when no OAS operation covers the call.

2. Mandatory variable wiring rule -- if the referenced creator operation uses any
template variables in `paths`, `queries`, `headers`, or `requestBody`, every
`before` step that references it MUST resolve those variables. Use
a step-level `environment` block unless the variables are already resolved
globally via `environments.default.variables`, global static defaults, or a
global `before` assignment. Do not rely on values supplied only in another
scenario.

### Class-B: dependency chain pattern

```json
"<OperationId>": {
  "operationId": "<OperationId>",
  "request": { ... },
  "before": [
    {
      "$ref": "#/operations/<CreatorOperationId>/request",
      "environment": {
        "<creatorVar1>": "<value1>",
        "<creatorVar2>": "<value2>"
      },
      "responses": {
        "<successCode>": {
          "expectations": { "httpStatus": <successCode> },
          "variableAssignments": {
            "<varName>": {
              "in": "body",
              "from": "response",
              "contentType": "json",
              "path": { "type": "jsonPointer", "value": "/<fieldName>" }
            }
          }
        }
      }
    }
  ],
  "scenarios": [
    {
      "key": "happy.path",
      "requests": [
        {
          "fuzzing": true,
          "$ref": "#/operations/<OperationId>/request"
        }
      ],
      "fuzzing": true
    }
  ]
}
```

The `<varName>` captured from the creator's response is then referenced as
`{{varName}}` in the target operation's `paths` or `queries` array.

Before running Step 5, verify each Class-B `before` chain is self-contained:
- every referenced creator input variable is resolved either in that step's
  `environment` or globally (`environments.default.variables` / global `before`);
- no creator input depends only on another scenario's `environment` block;

### Global `before` block

If multiple operations share the same dependency variable (e.g. many operations
need `customerId` from a login call), add the creator to the global `before`
block rather than repeating it in every scenario:

```json
"before": [
  {
    "$ref": "#/operations/<AuthOp>/request",
    "responses": {
      "200": {
        "expectations": { "httpStatus": 200 },
        "variableAssignments": {
          "customerId": {
            "in": "body", "from": "response", "contentType": "json",
            "path": { "type": "jsonPointer", "value": "/user/customerId" }
          }
        }
      }
    }
  }
]
```

### Class-C: user-provided data

If a Postman collection was imported in Step 2.5, look up the operation in
the test data table and inject the extracted values as static literals in the
`paths` / `queries` / `requestBody.json` fields of the operation's `request`
block. If the operation is not in the table, ask the user to provide non-secret
sample values. For secret or credential fields, use an approved local/secure
source instead of chat.

### Class-D: throwaway-user pattern

For operations that delete the primary user's own account, the throwaway
credential must be fully defined in `authenticationDetails` and the operation
must reference it directly. The operation's `before` block registers the
throwaway user before each iteration, so the scenario only needs to delete it.

Step A -- Add the register step to the operation's `before` block

Add the register operation to the `before` block of the Class-D operation so
the throwaway user exists before each scenario iteration. Accept both 201
(created) and 409 (already exists -- idempotent):

```json
"before": [
  {
    "$ref": "#/operations/<RegisterOperationId>/request",
    "environment": {
      "<emailVar>": "<throwaway@example.com>",
      "<credentialVar>": "<throwawayCredential>"
    },
    "responses": {
      "201": { "expectations": { "httpStatus": 201 } },
      "409": { "expectations": { "httpStatus": 409 } }
    }
  }
]
```

Then, inside the `AccessToken` credentials map, add a named throwaway entry
with only the login acquisition step:

```json
"<throwaway-credential-name>": {
  "credential": "{{AccessToken}}",
  "requests": [
    {
      "$ref": "#/operations/<LoginOperationId>/request",
      "environment": {
        "<emailVar>": "<throwaway@example.com>",
        "<credentialVar>": "<throwawayCredential>"
      },
      "responses": {
        "200": {
          "expectations": { "httpStatus": 200 },
          "variableAssignments": {
            "AccessToken": {
              "in": "body", "from": "response", "contentType": "json",
              "path": { "type": "jsonPointer", "value": "/<tokenField>" }
            }
          }
        }
      }
    }
  ]
}
```

Step B -- Set `auth` on the operation definition itself

Use `Scheme/CredentialName` notation directly on the operation's `request`
block -- not as a scenario-step override:

```json
"<DeleteSelfOperationId>": {
  "operationId": "<DeleteSelfOperationId>",
  "request": {
    "operationId": "<DeleteSelfOperationId>",
    "auth": ["AccessToken/<throwaway-credential-name>"],
    "request": { ... }
  },
  ...
}
```

Step C -- Build a 1-step scenario: delete only

The throwaway user is already registered in the operation's `before` block
(Step A), which runs before every scenario iteration. There is no need to
re-register after deletion -- the `before` block handles that automatically.

```json
"scenarios": [
  {
    "key": "happy.path",
    "fuzzing": true,
    "requests": [
      {
        "fuzzing": true,
        "$ref": "#/operations/<DeleteSelfOperationId>/request"
      }
    ]
  }
]
```

The operation's `auth` field ensures only the throwaway credential is used --
User1 is never touched. Before each subsequent iteration, the operation's
`before` block re-registers the throwaway user so the `authenticationDetails`
login step can always acquire a fresh token.

Step D -- Add a utility request for idempotent pre-cleanup (optional)

If the register operation rejects existing accounts (no 409 tolerance), add a
named utility request to the `requests` section that deletes any pre-existing
throwaway account, then reference it in the register operation's `before` block:

```json
"requests": {
  "<DeleteThrowawayUtil>": {
    "request": {
      "type": "42c",
      "details": {
        "method": "DELETE",
        "url": "{{host}}<delete-path>",
        "headers": [{ "key": "Authorization", "value": "Bearer {{AccessToken}}" }]
      }
    },
    "defaultResponse": "200",
    "responses": { "200": { "expectations": { "httpStatus": 200 } } }
  }
}
```

Then in the register operation's `before` block: login as the throwaway -> call
`<DeleteThrowawayUtil>` -> the register step in the happy path always finds a
clean slate.

### BOLA authorization test pattern (BOLA? = yes operations)

For every operation marked `BOLA? = yes` in the Step 3 table, register it
with the top-level `authorizationTests` entry. The scanner replaces the
source credential with the target credential on an otherwise identical
execution of the operation's happy path -- including any `before` blocks
already defined on that operation, so valid resource IDs are always in scope.

Step 1 -- Define the authorization test (once, top-level):

```json
"authorizationTests": {
  "<BolaTestName>": {
    "key": "authentication-swapping-bola",
    "source": ["<SchemeName>/User1Token"],
    "target": ["<SchemeName>/User2Token"]
  }
}
```

Step 2 -- Tag each BOLA candidate operation:

```json
"<TargetOperationId>": {
  "operationId": "<TargetOperationId>",
  "authorizationTests": ["<BolaTestName>"],
  ...
}
```

No additional scenario block is needed. The scanner runs the BOLA test by
replaying the operation's `happy.path` scenario using User 2's token.

A 2xx response on the BOLA authorization test is a confirmed BOLA finding.
A 401 or 403 means the server enforces ownership -- not a finding.

### BFLA authorization test pattern (BFLA candidates)

For every operation flagged as a BFLA candidate (privileged / admin-only),
register it with a BFLA entry in `authorizationTests`. The scanner replaces
the admin credential with the low-privilege credential on an otherwise
identical execution of the operation's happy path.

Mandatory auth pinning for privileged operations:
Set the privileged operation's auth to the admin credential on the operation
request definition itself. This ensures the baseline happy path executes as
admin and the BFLA test is a true credential swap from admin to low-privilege.

```json
"<PrivilegedOperationId>": {
  "operationId": "<PrivilegedOperationId>",
  "request": {
    "operationId": "<PrivilegedOperationId>",
    "auth": ["<SchemeName>/AdminToken"],
    "request": { ... }
  },
  ...
}
```

Step 1 -- Define the authorization test (once, top-level):

```json
"authorizationTests": {
  "<BflaTestName>": {
    "key": "authentication-swapping-bfla",
    "source": ["<SchemeName>/AdminToken"],
    "target": ["<SchemeName>/User1Token"]
  }
}
```

Step 2 -- Tag each BFLA candidate operation:

```json
"<PrivilegedOperationId>": {
  "operationId": "<PrivilegedOperationId>",
  "authorizationTests": ["<BflaTestName>"],
  ...
}
```

No additional scenario block is needed. A 2xx response on the BFLA
authorization test is a confirmed BFLA finding.

## Step 4.5 -- Scan Config Validation Checkpoint

After all Step 2 to Step 4 edits are complete (credentials, operation
classification, scenario chains, and authorization test wiring), validate
`CONF_FILE` again before running happy-path validation.

```bash
# Platform mode
API_KEY="<value>" PLATFORM_HOST="<value>" <binary> scan conf validate <relative-oas-path> \
  --conf-file <CONF_FILE>

# Free Trial mode
<binary> scan conf validate <relative-oas-path> \
  --freemium-host stateless.42crunch.com:443 \
  --token <TRIAL_TOKEN> \
  --conf-file <CONF_FILE>
```

Validation result handling:
- `statusCode: 0` -> continue to Step 5.
- Any non-zero status or schema errors (for example `unknown env from` paths)
  -> fix config shape and re-run this checkpoint.
- Do not run Step 5 until this checkpoint passes.

---

## Step 5 -- Happy Path Validation Run

Before running the full scan, validate all happy paths in strict mode.

### Configure and run

Set `happyPathOnly: true` in `runtimeConfiguration`:

```json
"happyPathOnly": true
```

Leave `laxTestingModeEnabled` at its generated default (`false`). Never set it
to `true` before happy paths are confirmed -- in lax mode, fuzzing runs even on
operations with failing happy paths, producing a cascade of false positives.

```bash
# macOS / Linux -- Platform mode
API_KEY="<value>" PLATFORM_HOST="<value>" <binary> scan run --enrich=false \
  <relative-oas-path> --conf-file <CONF_FILE> > /tmp/42c-happy-out.json 2>&1

# macOS / Linux -- Free Trial mode
<binary> scan run --enrich=false <relative-oas-path> \
  --freemium-host stateless.42crunch.com:443 \
  --token <TRIAL_TOKEN> --conf-file <CONF_FILE> > /tmp/42c-happy-out.json 2>&1
```

```powershell
# Windows -- Platform mode
$env:API_KEY="<value>"; $env:PLATFORM_HOST="<value>"
& <binary> scan run --enrich=false <relative-oas-path> --conf-file <CONF_FILE> `
  > "$env:TEMP\42c-happy-out.json" 2>&1

# Windows -- Free Trial mode
& <binary> scan run --enrich=false <relative-oas-path> `
  --freemium-host stateless.42crunch.com:443 `
  --token <TRIAL_TOKEN> --conf-file <CONF_FILE> `
  > "$env:TEMP\42c-happy-out.json" 2>&1
```

Extract only failing happy paths -- never include raw output in your response.

> Platform note: macOS/Linux use the Python snippet below. Windows users
> should use the PowerShell equivalent that follows.

```bash
# macOS / Linux
python3 << 'EOF'
import json, re
raw = open("/tmp/42c-happy-out.json").read()
match = re.search(r'\{[\s\S]*\}', raw)
if not match:
    print("No JSON in output"); exit(0)
data = json.loads(match.group())
results = data.get("results", data.get("scanResults", []))
if isinstance(results, dict):
    results = [results]
fails = [
    (r.get("operationId", r.get("path","?")), t.get("testKey","?"), t.get("httpStatus",""), t.get("reason",""))
    for r in results
    for t in r.get("testResults", [])
    if t.get("status") == "fail" and "happy" in t.get("testKey","").lower()
]
if fails:
    print(f"happy_path_failures[{len(fails)}]{{operation,test,status,reason}}:")
    for op, test, code, reason in fails:
        print(f"  {op},{test},{code},{reason[:60]}")
else:
    print("happy_path_failures: none")
EOF
```

```powershell
# Windows
$raw = Get-Content "$env:TEMP\42c-happy-out.json" -Raw
$jsonMatch = [regex]::Match($raw, '\{[\s\S]*\}')
if (-not $jsonMatch.Success) { Write-Host "No JSON in output"; exit }
$data = $jsonMatch.Value | ConvertFrom-Json
$results = if ($data.results) { $data.results } elseif ($data.scanResults) { $data.scanResults } else { @() }
if ($results -is [PSCustomObject]) { $results = @($results) }
$fails = @()
foreach ($r in $results) {
    foreach ($t in $r.testResults) {
        if ($t.status -eq 'fail' -and $t.testKey -match 'happy') {
            $op     = if ($r.operationId) { $r.operationId } elseif ($r.path) { $r.path } else { '?' }
            $test   = if ($t.testKey) { $t.testKey } else { '?' }
            $code   = if ($t.httpStatus) { $t.httpStatus } else { '' }
            $reason = if ($t.reason) { $t.reason.Substring(0, [Math]::Min(60, $t.reason.Length)) } else { '' }
            $fails += "$op,$test,$code,$reason"
        }
    }
}
if ($fails.Count -gt 0) {
    Write-Host "happy_path_failures[$($fails.Count)]{operation,test,status,reason}:"
    foreach ($f in $fails) { Write-Host "  $f" }
} else {
    Write-Host "happy_path_failures: none"
}
```

### Parse results per operation

For each operation where the happy path failed, determine the root cause:

| Observed symptom | Root cause | Action |
|---|---|---|
| HTTP 400 / 422 with validation error | Bad sample data -- request body or parameters fail server validation | Use Postman collection lookup table if available; otherwise ask the user to provide valid values |
| HTTP 2xx but conformance FAIL (undocumented fields in response) | Excessive response data -- server returns fields not in the OAS schema (potential OWASP API3 Excessive Data Exposure) | Block and call `AskUserQuestion`: question: `"The response for <operation> includes fields not in your OAS schema: [list fields]. Undocumented fields in responses can expose internal data that clients shouldn't see (OWASP API3). How would you like to handle it?"` options: `["Add these fields to the OAS", "Accept as-is"]`. Do not proceed to the full scan until the user has made an explicit choice for every affected operation. |
| HTTP 2xx but wrong success code (e.g. got `200`, expected `201`) | Status code mismatch -- `defaultResponse` in the scan config doesn't match reality | Update `defaultResponse` for that operation |
| HTTP 404 | Unresolved path variable -- scenario chain is missing or the `variableAssignment` JSON Pointer is wrong | Inspect the chain; fix the JSON Pointer, or build a missing chain |
| HTTP 401 / 403 | Auth failure -- token is invalid, expired, or wrong scheme applied | Re-collect credentials; verify the token is still valid |

Group all failures by root cause before asking for any user input. Present
the full failure table first, then resolve one root cause type at a time.

### Postman collection fallback

If an operation still fails with HTTP 400/422 after checking the already-loaded
Step 2.5 lookup table (or no collection was provided), ask the user to supply
the values manually. Do not ask for a new Postman collection -- if a collection
was already imported, re-examine the existing lookup table entries for the
failing operation before requesting manual input.

### Iteration

After resolving each batch of failures, re-run using the same command as above (output to `/tmp/42c-happy-out.json` on macOS/Linux, `%TEMP%\42c-happy-out.json` on Windows) and re-extract with the same extraction snippet above.

For each operation where the root cause cannot be resolved (e.g. the required
resource cannot be created in this environment), call `AskUserQuestion`:
- question: `"The happy path for <operationId> is still failing (<root-cause summary>). What would you like to do?"`
- options: `["Try a different fix", "Skip this operation -- I'll come back to it later", "Abort the scan setup"]`

If Skip is chosen: record the operation ID and reason in a `skipped_operations` session
variable. Exclude it from all future happy-path re-runs and announce it in the final summary.

Repeat until all non-skipped happy paths pass.

### Database Reset Reminder (After Happy Path)

The happy path scenarios have now executed against your live API and may have
created, modified, or deleted records in your database. Before the full scan
runs, the database should be restored to a clean state so that conformance
fuzzing and authorization tests start from known data.

Call `AskUserQuestion`:
- question: `"The happy path scenarios have finished running and may have modified your database (created, updated, or deleted records). Please reset your database to a clean state before the full scan starts. Have you reset the database?"`
- options: `["Yes -- database is reset, ready to proceed", "No -- continue without resetting (results may be affected)"]`

Proceed regardless of the answer. If the user selects No, surface a one-line
warning before continuing:
> [WARN] Proceeding without a database reset -- scan results may be affected by
> residual state from happy path runs.

### Restore runtime flags

Once all happy paths pass, set `happyPathOnly: false` before the full scan:

```json
"happyPathOnly": false
```

---

## Step 5.5 -- Permission Gate Before Full Scan

All happy paths have passed. Before running the full security scan, ask the
user for explicit consent. Call `AskUserQuestion`:

- question: `"All happy paths passed successfully. I'm ready to run the full security scan against <SCAN_TARGET_URL>. This will execute authorization tests (BOLA/BFLA) and conformance fuzzing across all <N> operations. Shall I proceed?"`
- options: `["Yes -- run the full scan", "No -- stop here"]`

Only proceed to Step 6 after explicit confirmation.

---

## Step 6 -- Full Scan

Run the full scan, capturing output to a temp file for extraction:

```bash
# macOS / Linux -- Platform mode
API_KEY="<value>" PLATFORM_HOST="<value>" <binary> scan run --enrich=false --report-sqg \
  <relative-oas-path> --conf-file <CONF_FILE> > /tmp/42c-scan-out.json 2>&1

# macOS / Linux -- Free Trial mode
<binary> scan run --enrich=false <relative-oas-path> \
  --freemium-host stateless.42crunch.com:443 \
  --token <TRIAL_TOKEN> --conf-file <CONF_FILE> > /tmp/42c-scan-out.json 2>&1
```

```powershell
# Windows -- Platform mode
$env:API_KEY="<value>"; $env:PLATFORM_HOST="<value>"
& <binary> scan run --enrich=false --report-sqg <relative-oas-path> --conf-file <CONF_FILE> `
  > "$env:TEMP\42c-scan-out.json" 2>&1

# Windows -- Free Trial mode
& <binary> scan run --enrich=false <relative-oas-path> `
  --freemium-host stateless.42crunch.com:443 `
  --token <TRIAL_TOKEN> --conf-file <CONF_FILE> `
  > "$env:TEMP\42c-scan-out.json" 2>&1
```

Immediately after the command completes, extract the summary as TOON
(Token-Oriented Object Notation -- https://github.com/toon-format/toon) --
never include raw stdout content in your response.

> Platform note: macOS/Linux use the Python snippet below. Windows users
> should use the PowerShell equivalent that follows.

```bash
# macOS / Linux
python3 << 'EOF'
import json, re

raw = open("/tmp/42c-scan-out.json").read()
match = re.search(r'\{[\s\S]*\}', raw)
if not match:
  print("No JSON found in scan output")
  raise SystemExit(0)

data = json.loads(match.group())
report = data.get("report", {})
summary = report.get("summary", {})

sqg = "PASSED" if data.get("sqgPass") else ("FAILED" if "sqgPass" in data else "N/A")
print(f"sqgPass: {sqg}")
for d in data.get("sqgDetails", []):
    rules = d.get("blockingRules", [])
    if rules:
        print(f"blockingRules[{len(rules)}]: {', '.join(rules)}")

auth_summary = (((summary.get("authorizationTestRequests") or {}).get("executed") or {}).get("total"))
issue_summary = (((summary.get("issues") or {}).get("total")))
if auth_summary is not None:
  print(f"authorizationRequests: {auth_summary}")
if issue_summary is not None:
  print(f"issuesTotal: {issue_summary}")

def severity_from_criticality(value):
  mapping = {
    5: "critical",
    4: "high",
    3: "medium",
    2: "low",
    1: "info",
    0: "info",
  }
  return mapping.get(value, "")

failures = []
operations = report.get("operations") or {}
if isinstance(operations, dict):
  for operation_id, operation in operations.items():
    for section_name in ("authorizationRequestsResults", "conformanceRequestsResults", "customRequestsResults"):
      for entry in operation.get(section_name, []) or []:
        outcome = entry.get("outcome") or {}
        if outcome.get("testSuccessful") is True:
          continue
        test = entry.get("test") or {}
        severity = severity_from_criticality(outcome.get("criticality"))
        failures.append((
          operation_id,
          test.get("key", "?"),
          severity,
        ))

if not failures:
  legacy_results = data.get("results", data.get("scanResults", []))
  if isinstance(legacy_results, dict):
    legacy_results = [legacy_results]
  for result in legacy_results:
    for test_result in result.get("testResults", []):
      if test_result.get("status") == "fail":
        failures.append((
          result.get("operationId", result.get("path", "?")),
          test_result.get("testKey", "?"),
          test_result.get("severity", ""),
        ))

if failures:
  unique_failures = []
  seen = set()
  for failure in failures:
    if failure in seen:
      continue
    seen.add(failure)
    unique_failures.append(failure)
  print(f"\nfailures[{len(unique_failures)}]{{operation,test,severity}}:")
  for op, test, sev in unique_failures:
        print(f"  {op},{test},{sev}")
else:
    print("failures: none")
EOF
```

```powershell
# Windows
$raw = Get-Content "$env:TEMP\42c-scan-out.json" -Raw
$jsonMatch = [regex]::Match($raw, '\{[\s\S]*\}')
if (-not $jsonMatch.Success) { Write-Host "No JSON found in scan output"; exit }
$data = $jsonMatch.Value | ConvertFrom-Json
$report = if ($data.report) { $data.report } else { $null }
$summary = if ($report -and $report.summary) { $report.summary } else { $null }
$sqg = if ($null -ne $data.sqgPass) { if ($data.sqgPass) { 'PASSED' } else { 'FAILED' } } else { 'N/A' }
Write-Host "sqgPass: $sqg"
foreach ($d in $data.sqgDetails) {
    if ($d.blockingRules -and $d.blockingRules.Count -gt 0) {
        Write-Host "blockingRules[$($d.blockingRules.Count)]: $($d.blockingRules -join ', ')"
    }
}
if ($summary -and $summary.authorizationTestRequests -and $summary.authorizationTestRequests.executed) {
  Write-Host "authorizationRequests: $($summary.authorizationTestRequests.executed.total)"
}
if ($summary -and $summary.issues) {
  Write-Host "issuesTotal: $($summary.issues.total)"
}

function Get-SeverityFromCriticality {
  param([int]$criticality)
  switch ($criticality) {
    5 { 'critical' }
    4 { 'high' }
    3 { 'medium' }
    2 { 'low' }
    default { 'info' }
  }
}

$failures = @()
if ($report -and $report.operations) {
  $report.operations.PSObject.Properties | ForEach-Object {
    $opName = $_.Name
    $op = $_.Value
    foreach ($sectionName in @('authorizationRequestsResults', 'conformanceRequestsResults', 'customRequestsResults')) {
      $entries = $op.$sectionName
      if (-not $entries) { continue }
      foreach ($entry in $entries) {
        if ($entry.outcome -and $entry.outcome.testSuccessful -eq $true) { continue }
        $testKey = if ($entry.test -and $entry.test.key) { $entry.test.key } else { '?' }
        $severity = if ($entry.outcome) { Get-SeverityFromCriticality([int]$entry.outcome.criticality) } else { '' }
        $failures += "$opName,$testKey,$severity"
      }
    }
  }
}

if ($failures.Count -eq 0) {
$results = if ($data.results) { $data.results } elseif ($data.scanResults) { $data.scanResults } else { @() }
if ($results -is [PSCustomObject]) { $results = @($results) }
foreach ($r in $results) {
    foreach ($t in $r.testResults) {
        if ($t.status -eq 'fail') {
            $op  = if ($r.operationId) { $r.operationId } elseif ($r.path) { $r.path } else { '?' }
            $test = if ($t.testKey) { $t.testKey } else { '?' }
            $sev  = if ($t.severity) { $t.severity } else { '' }
            $failures += "$op,$test,$sev"
        }
    }
}
}

$failures = $failures | Select-Object -Unique
if ($failures.Count -gt 0) {
    Write-Host "`nfailures[$($failures.Count)]{operation,test,severity}:"
    foreach ($f in $failures) { Write-Host "  $f" }
} else {
    Write-Host "failures: none"
}
```

Use only the TOON output above when rendering Step 7. Do not load or display
the raw scan output file content.

## Step 6.5 -- Database Reset Reminder (After Full Scan)

The full scan (conformance fuzzing and authorization tests) has now completed.
It may have made malformed requests, cross-user resource accesses (BOLA/BFLA),
and repeated operations that further mutated your database state.

Call `AskUserQuestion`:
- question: `"The full security scan has finished. Conformance fuzzing and authorization tests (BOLA/BFLA) may have further modified your database. Would you like to reset your database before reviewing results and applying fixes?"`
- options: `["Yes -- I'll reset the database now", "No -- continue to results"]`

If the user selects Yes: display the message `"Please reset your database
and confirm when ready."`, then call a second `AskUserQuestion`:
- question: `"Database reset complete?"`
- options: `["Yes -- ready to review results"]`

Then proceed to Step 7.

---

Free Trial mode: `sqgPass` will be absent or `true`. Present all findings
informally -- no quality gate is enforced. Note to the user:
> "In free trial mode the scan shows all findings for your information -- there
> is no automatic quality gate. Authorization failures (red) are real
> vulnerabilities worth fixing regardless of the gate (OWASP API1/API5).
> Conformance findings (yellow) document gaps between your OAS contract and
> your API's actual behaviour."

Then ask which (if any) findings the user wants to address.

### Blocking rule formats

| Rule | Meaning |
|---|---|
| `"severity_threshold"` | High/critical results exceed the SQG limit |
| `"forbidden_test:<test-key>"` | A specific test type is forbidden by the SQG |

---

## Step 7 -- Display Results and Apply Fixes

### 7a -- Render the risk-classified findings report

Before touching anything, display the full scan picture grouped into three tiers.
Use plain-English descriptions -- do not surface raw test keys or scan-report field names.

Platform mode header:
```
Scan Results  |  SQG (<sqg-name>): PASSED / FAILED
```

Free Trial mode header:
```
Scan Results  |  SQG: N/A (Free Trial -- no scan SQG enforced)
```

```
- [HIGH] Authorization Failures (BOLA / BFLA) -
  (for each confirmed auth failure)
  Operation:  <HTTP method> <path>
  Test:       BOLA (accessed with user-2 token) / BFLA (accessed with low-priv token)
  Risk:       Horizontal privilege escalation -- user B can read/modify user A's
              resources. / Vertical privilege escalation -- unprivileged user can
              invoke admin-only operations.
  Fix:        Add / correct `security` requirement on this operation in the OAS, and add server-side ownership / privilege check in the route handler.

- [MED] Conformance -- SQG-Blocking -
  (for each conformance finding matched in sqgDetails[].blockingRules)
  Operation:  <HTTP method> <path>
  Issue:      <plain-English description of what the API returned vs what the OAS says>
  Severity:   <HIGH / CRITICAL / ...>
  Risk:       <what the mismatch means: data over-exposure, broken contract, etc.>
  Fix:        <one-line OAS change to align the contract with reality>, and corresponding server-side code fix in the route handler or serializer.

- [LOW] Conformance -- Informational (not SQG-blocking) -
  (for each conformance finding NOT in sqgDetails[].blockingRules)
  Operation:  <HTTP method> <path>
  Issue:      <description>
  Severity:   <MEDIUM / LOW / ...>
  Note:       This finding does not block the SQG. No automatic fix will be applied.

(write "(none)" in any tier that has no findings)
```

### After rendering -- Security implication narratives

If any BOLA finding was confirmed, add:
> "A confirmed BOLA vulnerability means an authenticated user can access or
> modify another user's resources by changing an ID in the URL -- this is one
> of the most common and impactful API vulnerabilities (OWASP API1). The OAS
> fix I'm proposing adds or corrects the `security` requirement on the affected
> operation to document the contract correctly; you'll also want to verify your
> server-side authorisation checks the resource owner on each request."

If any BFLA finding was confirmed, add:
> "A confirmed BFLA vulnerability means a low-privilege user can invoke an
> admin-only operation (OWASP API5). The fix documents the required privilege
> level in the OAS; your backend authorisation logic is the definitive
> enforcement point."

---

### 7b -- Determine fix candidates

Platform mode:
1. All authorization failures (BOLA/BFLA confirmed) -> always a fix candidate.
2. Conformance findings matched in `sqgDetails[].blockingRules` -> fix candidate
   regardless of severity.
3. Conformance findings not in `sqgDetails[].blockingRules` -> surface only;
   do not include in the fix list.

Free Trial mode:
1. All authorization failures (BOLA/BFLA confirmed) -> always a fix candidate.
2. There are no SQG-blocking conformance findings -- all conformance findings are
   informational. Surface them to the user and ask which (if any) they want to fix.

### 7c -- Consent Gate

Platform mode -- call `AskUserQuestion`:
- question: `"Here is the complete scan report (shown above). I can apply the following fixes to <filename>: [HIGH] Authorization fixes: [list] [MED] SQG-blocking conformance fixes: [list]. The [LOW] informational findings are not SQG-blocking and will not be fixed automatically -- let me know if you'd like to address any of them too. What would you like to do?"`
- options: `["Yes -- apply all fixes now", "Show me the diff first", "No -- skip fixes for now"]`

Free Trial mode -- call `AskUserQuestion`:
- question: `"Here is the complete scan report (shown above). No SQG enforcement applies in free trial mode. [HIGH] Authorization fixes I can apply: [list] [LOW] Conformance findings (informational -- your call whether to fix): [list]. What would you like to do?"`
- options: `["Yes -- apply the authorization fixes", "Show me the diff first", "No -- skip fixes; summarise findings only"]`

If the user chooses "Show me the diff first" in either mode, display the proposed
change for each fix one at a time in unified diff format then call `AskUserQuestion`:
- question: `"Apply this change?"` -- options: `["Yes", "No -- skip this one"]`

Only advance to the next fix after the user confirms the current one.

Only apply fixes after explicit user confirmation.

### 7d -- Apply fixes

| Finding type | Fix action |
|---|---|
| Authorization -- BOLA/BFLA confirmed | Add or correct `security` requirements on the affected operations in the OAS |
| SQG-blocking conformance | Correct response schemas, required fields, or parameter definitions to align the OAS with actual API behaviour |
| Non-SQG-blocking conformance (any severity) | Surface only; ask user if they want to address them |

### 7e -- Server-side / Implementation Fixes

OAS fixes document the contract but do not secure the API. Every SQG-blocking finding has a root cause in the server-side code. After 7d, continue to 7e to locate and fix the implementation.

#### 7e-1 -- Gate

Trigger 7e for every confirmed finding that is SQG-blocking:
- [HIGH] Authorization failures (BOLA / BFLA confirmed)
- [MED] Conformance findings matched in `sqgDetails[].blockingRules`

Skip 7e entirely only when the scan has zero SQG-blocking findings.

#### 7e-2 -- Consent gate for code fixes

Call `AskUserQuestion`:
- question: `"The OAS has been updated. The following SQG-blocking issues also require server-side code fixes -- the API implementation is the root cause. Should I locate and fix the code? <list all SQG-blocking findings by operation>"`
- options: `["Yes -- find and fix the code", "Show me the relevant code first", "No -- skip code fixes"]`

If "Show me the relevant code first" is chosen, locate each handler (step 7e-3) and display the relevant code block without making any changes, then call `AskUserQuestion` again with the same options to proceed.

#### 7e-3 -- Locate route handlers

For each SQG-blocking finding:

1. Search the codebase for files that register or handle the affected HTTP method + path. Use grep for the path fragment and common framework patterns: `router.get/post/put/delete/patch`, `@app.route`, `@GetMapping`, `@PostMapping`, `@RestController`, `app.get(`, `Route::get(`, etc.
2. If not found by path, widen the search to the operation ID or a handler name derived from the path.
3. Read the identified handler file and any middleware it calls (auth middleware, serializers, validators, permission decorators).
4. Report: `"Found handler for <METHOD> <path> in <file>:<line>."`
5. If no handler is found after the widened search, report it as not found and skip the fix for that operation -- do not block the remaining fixes.

#### 7e-4 -- Apply fix by finding type

| Finding type | Root cause to look for in the code | Server-side fix |
|---|---|---|
| BOLA (OWASP API1) | Handler fetches a resource by a path/query ID without verifying that it belongs to the authenticated user | Add an ownership check after the resource is fetched: compare `resource.owner_id` (or equivalent field) to the authenticated user's ID; return `403 Forbidden` if they do not match |
| BFLA (OWASP API5) | Handler for a privileged/admin operation does not check the caller's role, scope, or group membership before executing | Add a role/scope/permission check at the top of the handler; return `403 Forbidden` if the caller lacks the required privilege |
| Conformance -- undocumented response fields | Response serializer or ORM query returns fields not present in the OAS schema | Call `AskUserQuestion`: _"The response for `<METHOD> <path>` includes fields not declared in the OAS: `<field list>`. Are these intentional?"_ -- options: `["Add them to the OAS (field is intentional)", "Remove them from the code (field should not be returned)"]`. Apply the chosen fix: extend the OAS schema, or filter/exclude the fields in the serializer/handler |
| Conformance -- missing required response fields | Handler response omits a field marked `required` in the OAS schema | Add the missing field to the response payload or serializer |
| Conformance -- wrong response status code | Handler returns a status code that differs from what the OAS declares as the success code | Update the handler to return the status code declared in the OAS |
| Conformance -- wrong or missing Content-Type / headers | Handler does not set the `Content-Type` or other response headers required by the OAS | Add the required headers to the response |
| Conformance -- schema type/format mismatch | Handler returns a field with a different type or format than declared (e.g., returns a string where the OAS declares integer) | Coerce or cast the field to the declared type/format in the serializer or handler |

#### 7e-5 -- Diff and confirm before writing

For each proposed code change, display it in unified diff format and call `AskUserQuestion`:
- question: `"Apply this fix to <file>?"` -- options: `["Yes", "No -- skip this one"]`

Only write the change after explicit confirmation. Advance to the next finding only after the current one is confirmed or skipped.

#### 7e-6 -- Summary

After all code fixes are applied or skipped, append to the final output:

```
- Server-side Fixes -
  Fixed:   <n> issue(s) across <m> file(s)
  Skipped: <k> issue(s) (user declined or handler not found)
-
```

---

## Flags Reference

```
--conf-file <path>      explicit path to scan config bundle (preferred)
--conf-name <name>      scan config name from .42c dir (default "default")
-d, --directory <path>  working directory (default: .42c at git root)
--tag <cat>:<tag>       apply platform tag for SQGs / data dictionaries
--output-report <file>  write just the config bundle (report section) to file
--report-sqg            include sqg_pass in the report
```

### `scan conf generate` -- important notes

- `<api-reference>` must be a file path (relative from git root), NOT an alias.
  Aliases are not resolved by `generate` -- passing an alias causes "no such file or directory".
- Do not use `-d` or `--conf-name` when generating. Using those flags writes a
  fragmented multi-file format to disk instead of outputting the monolithic bundle to stdout.
- Use `--output-format json --output .42c/scan/<alias>/scanconf.json` to write the config directly.

### api-reference formats accepted by `scan run` and `scan conf validate`

- Path to an OAS file (`.json` / `.yaml` / `.yml`) -- use with `--conf-file`
- Alias defined in `.42c/conf.yaml` -- use with `--conf-name`
- `<api-id>:<revision>` (requires valid `API_KEY` -- fetched from platform)


---

## Scanconf Template

When building or repairing a config manually (config is missing, invalid, or
has structural gaps), read `./scanconf-templates.md` for the complete JSON
patterns and the rules-at-a-glance table.
