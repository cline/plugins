---
name: postman-to-oas
description: >
  Convert a Postman collection (v2.0 or v2.1) into a complete OpenAPI 3.0
  specification file. Reads the full collection and optional environment file
  to extract paths, methods, parameters, request bodies, response bodies,
  headers, and response codes. Use when the user wants to generate, create,
  or derive an OAS file from a Postman collection. Triggers on phrases like
  "convert postman to openapi", "postman collection to OAS", "generate spec
  from postman", "create openapi from postman", or any request to turn a
  Postman collection into an OpenAPI spec without an existing OAS file.
---

# Skill: Postman Collection to OpenAPI Specification

## Cline Compatibility

When this workflow mentions `AskUserQuestion`, ask the user normally in Cline or use the host's question UI. Do not assume a separate tool named `AskUserQuestion` exists. Do not ask users to paste API keys, tokens, passwords, or cookies into chat; use existing 42Crunch config files, environment variables, user-created local files, or a secure host prompt when available. Confirm live scan targets and every audit/scan/code fix before running commands or editing files.

Convert a Postman collection into a complete, valid OpenAPI 3.0 specification
file (`openapi.json`). No existing OAS file is required as input.

---

## Entry Point

Ask the user for the required inputs, then execute Steps 1-8.

Call `AskUserQuestion`:
- question:
  ```
  Please provide the following inputs:

  1. Postman collection file path (JSON, v2.0 or v2.1)

  2. Postman environment file path (optional, JSON -- skip if none)

  3. Output file path for the generated OpenAPI spec (default: openapi.json in the collection's directory)
  ```
- options: `["Provide paths one by one", "Provide all paths at once", "Cancel"]`
  - If "Provide paths one by one": ask for each separately, allowing the environment file to be skipped
  - If "Provide all paths at once": ask for all paths in one input, comma-separated
  - If "Cancel": exit gracefully

After collecting inputs:
> "I'll read the Postman collection and generate a complete OAS 3.0 spec at `<output path>`. This may take a moment."

---

## Step 1 -- Read and Parse the Postman Collection

Read the full contents of the Postman collection file. Confirm it is valid
Postman format by checking for `info.schema` containing `postman-collection`.

Identify the schema version:
- v2.1 schema URL contains `v2.1.0`
- v2.0 schema URL contains `v2.0.0`

Both versions are handled identically in subsequent steps.

Extract top-level metadata:
- `info.name` -> candidate for `info.title` in the OAS
- `info.description` -> candidate for `info.description` in the OAS
- `info.version` -> candidate for `info.version` in the OAS (fall back to `"1.0.0"`)
- `variable[]` -> collection-level variables (key/value pairs used as defaults)

If an environment file path was provided, read it and parse its `values` array
into a flat map: `{ key: value }`. These environment values take precedence
over collection-level variables when resolving `{{variableName}}` placeholders.

Environment values are also a preferred source of concrete examples in the
generated OAS when they map to request or response fields (for example:
`userId`, `picture_id`, `token`, `baseUrl`).

Build a merged variable map:
1. Start with collection `variable[]` entries
2. Overlay environment `values[]` entries (same key wins from environment)

Build an example-value map from the same merged variables and use it when
filling parameter and schema `example` fields.

---

## Step 2 -- Flatten the Collection into a Request List

Postman collections nest requests inside `item` arrays. Folders are `item`
entries that themselves contain an `item` array (no `request` property).
Requests are leaf `item` entries with a `request` property.

Recursively walk the entire `item` tree:
- If an entry has `item` (array): it is a folder -- recurse into it, tracking
  the folder name(s) as a breadcrumb for tag assignment
- If an entry has `request`: it is a leaf request -- extract it

Track folder breadcrumbs: the top-level folder name becomes the OAS `tag`.

For each leaf request, extract:

### URL
- Raw URL: `item.request.url.raw` (or `item.request.url` if it is a string)
- Resolve all `{{variableName}}` placeholders using the merged variable map
- Path segments: `item.request.url.path[]` -- join with `/`, prefix with `/`
- Host: `item.request.url.host[]` -- join with `.` to form the hostname
- Protocol: `item.request.url.protocol` (default `https`)
- Port: `item.request.url.port` if present

### Method
`item.request.method` -- normalize to uppercase: `GET`, `POST`, `PUT`, `DELETE`,
`PATCH`, `HEAD`, `OPTIONS`

### Path Variables
`item.request.url.variable[]` -> `{ key, value }` -- these are concrete values
for `{variableName}` placeholders in the path segments.

Identify parameterized path segments:
- A segment wrapped in `{{...}}` or `:name` or `{name}` style is a path parameter
- Cross-reference `url.variable` keys to determine the canonical OAS parameter name
- Convert all path parameter formats to OAS-style: `{paramName}`

### Query Parameters
`item.request.url.query[]` -> `{ key, value, description, disabled }`
- Exclude entries where `disabled: true`
- Resolve `{{variableName}}` in values using the variable map

### Request Headers
`item.request.header[]` -> `{ key, value, description, disabled }`
- Exclude entries where `disabled: true`
- Exclude `Content-Type` and `Accept` (these map to OAS `content` / `produces`)
- Resolve `{{variableName}}` in values
- Retain `Authorization` headers only to infer security schemes -- do not emit
  them as explicit header parameters

### Request Body
`item.request.body`:
- `mode: raw` and `options.raw.language: json` -> parse `raw` string as JSON;
  if parse fails, treat as a raw string schema
- `mode: raw` and language is `xml`, `text`, `html` -> record content type as
  `text/xml` or `text/plain`; do not attempt to parse the body further
- `mode: formdata` -> collect `{ key, value, type }` pairs (`type` is `text` or `file`)
- `mode: urlencoded` -> collect `{ key, value }` pairs
- `mode: graphql` -> record as `application/json` with a GraphQL body shape
- `mode: file` -> record as `multipart/form-data` with a binary file field
- No body or `mode: none` -> omit `requestBody` entirely

Skip bodies that contain obvious attack payloads:
- SQL keywords: `SELECT`, `UNION`, `DROP`, `INSERT`, `UPDATE`, `DELETE`, `--`
- NoSQL operators: `$ne`, `$gt`, `$lt`, `$where`, `$regex`
- XML injection: `<!DOCTYPE`, `ENTITY`, `CDATA`
- Path traversal: `../`, `..\`
- Script tags or event handlers in JSON string values

Skip attack-oriented requests entirely (do not emit them into `paths`):
- Requests under folders named like `Attacks`, `Security Tests`, `Exploits`, `Abuse`, `Negative Tests`
- Request names/descriptions that indicate exploit scenarios, for example:
  `SQL Injection`, `NoSQL Injection`, `XSS`, `XXE`, `Path Traversal`,
  `Log4Shell`, `Password Leakage`, `Privilege Escalation`, `BOLA`, `BFLA`,
  `Un-authenticated Access`, `Invalid JSON`, `HTTP Verb Tampering`
- Requests whose normalized path itself is attack-like (for example containing
  traversal segments such as `../`)

When in doubt, prefer excluding security test/demo requests from the OAS
contract and note the exclusion in the conversion summary.

### Responses
`item.response[]` -- each saved response in Postman:
- `status` -> HTTP status code (integer)
- `name` -> human-readable label for the response description
- `header[]` -> response headers `{ key, value }`
- `body` -> response body string; if parseable as JSON, parse it
- `_postman_previewlanguage` -> `json`, `html`, `text`, `xml`

If a request has no saved responses, the operation gets no `responses` entries
other than a placeholder `default` (see Step 7.5 -- Response rules).

---

## Step 3 -- Infer Authentication Schemes

Walk every request's `Authorization` header and `auth` block:

### Per-request `auth` block (`item.request.auth`)
- `type: bearer` -> Bearer JWT auth -> `securityScheme` type `http`, scheme `bearer`, `bearerFormat: JWT`
- `type: basic` -> Basic auth -> `securityScheme` type `http`, scheme `basic`
- `type: apikey` -> API key -> check `in` field: `header`, `query`, or `cookie`
- `type: oauth2` -> OAuth2; extract `authUrl`, `accessTokenUrl`, `scope` where available
- `type: noauth` -> explicitly public -- no security

### Collection-level `auth`
If the collection root has an `auth` block, it applies as the default to all
requests unless overridden per-request.

### `Authorization` header value patterns
- `Bearer {{token}}` or `Bearer <anything>` -> bearer JWT
- `Basic {{credentials}}` or `Basic <base64>` -> basic auth
- `ApiKey <value>` -> API key in header

Deduplicate: if the same auth pattern appears across multiple requests, define
it once in `components.securitySchemes` with a canonical name:
- `BearerAuth`, `BasicAuth`, `ApiKeyAuth`, `ApiKeyQuery`, `OAuth2`

Track which requests use which scheme. A request with `type: noauth` gets
`"security": []` in its operation.

---

## Step 4 -- Derive a Base URL and Servers Block

From the resolved URLs of all requests:
1. Collect all unique `protocol://host:port` combinations
2. If there is exactly one unique base URL, use it as `servers[0].url`
3. If there are multiple (e.g. `localhost` and a production domain):
   - List them all in `servers[]`
   - Add a `description` to each: `"Local development"`, `"Production"`, etc.
4. If the base URL contains `{{baseUrl}}` or similar variables, emit a
   server variable:
   ```json
   "servers": [{
     "url": "{baseUrl}",
     "variables": {
       "baseUrl": { "default": "<resolved value from environment>" }
     }
   }]
   ```
5. Fall back to `http://localhost` if no base URL can be determined

Strip the base URL from each request's path before building `paths` entries.

---

## Step 5 -- Synthesize Schema from Request and Response Bodies

For each unique request body (grouped by path + method):

### JSON body -> schema
Analyze the parsed JSON object and infer a JSON Schema:

- Top-level object -> `type: object`
- Each key becomes a `properties` entry
- Infer `type` from the value:
  - JavaScript `string` -> `type: string`; check for ISO date patterns -> add `format: date-time`
  - JavaScript `number` with no decimal -> `type: integer`
  - JavaScript `number` with decimal -> `type: number`
  - JavaScript `boolean` -> `type: boolean`
  - `null` -> `nullable: true` on the property (OAS 3.0 style)
  - Array -> `type: array`; infer `items` schema from the first element
  - Nested object -> `type: object`; recurse
- Mark a property as `required` if its value is non-null and non-empty
  (heuristic: present and non-null in the example -> likely required)
- Set `example` directly on each property schema using the Postman value
- When a property value is a resolved placeholder from the environment,
  preserve the resolved environment value as the `example`

### Form body -> schema
- Each form field becomes a `properties` entry with `type: string`
- Fields with `type: file` get `type: string, format: binary`

### URL-encoded body -> schema
- Same as form body but content type is `application/x-www-form-urlencoded`

### Response body -> schema
Apply the same JSON-to-schema inference for response bodies.

### Schema deduplication
After inferring all schemas, look for structurally identical or near-identical
schemas across different operations:
- If two schemas share the same set of top-level property names and types,
  they are candidates to merge into a single `components/schemas` entry
- Name schemas after the resource inferred from the path:
  - `/users/{userId}` -> `User`
  - `/vehicles/{vehicleId}` -> `Vehicle`
  - `/auth/login` request body -> `LoginRequest`; response -> `LoginResponse`
- Use PascalCase for all schema names
- Use `$ref: "#/components/schemas/Foo"` wherever a schema is reused

---

## Step 6 -- Build Path and Parameter Entries

For each unique combination of (normalized path, method) from the flattened
request list:

### Grouping
Multiple Postman requests with the same path and method (e.g. a success case
and an error case saved as separate requests) should be merged into one OAS
operation. Merge their saved responses and pick the most representative request
body example.

### Path Parameters
Every `{paramName}` segment in the normalized path must appear in `parameters`:

```json
{
  "name": "paramName",
  "in": "path",
  "required": true,
  "description": "<from Postman path variable description if present>",
  "schema": {
    "type": "string",
    "example": "<concrete value from Postman url.variable>"
  }
}
```

Infer `type` from the example value (numeric string that is always digits ->
`type: integer`; UUID pattern -> `type: string, format: uuid`).

Prefer environment-derived values for path parameter examples when available.

### Query Parameters

```json
{
  "name": "paramName",
  "in": "query",
  "required": false,
  "description": "<from Postman query param description if present>",
  "schema": {
    "type": "string",
    "example": "<value from Postman>"
  }
}
```

Mark `required: true` only if the parameter appears in every saved request
variant for this operation and has a non-empty value.

When query values come from `{{variableName}}`, use the resolved environment
value as the query parameter `example`.

### Header Parameters
Only emit non-auth, non-standard request headers as `in: header` parameters.
Omit: `Content-Type`, `Accept`, `Authorization`, `Host`, `User-Agent`,
`Content-Length`, `Connection`.

### Response Headers
For each saved response, extract non-standard response headers and add them
to the response `headers` map:

```json
"headers": {
  "X-Rate-Limit-Remaining": {
    "description": "",
    "schema": { "type": "integer" }
  }
}
```

Omit standard HTTP response headers: `Content-Type`, `Content-Length`,
`Transfer-Encoding`, `Connection`, `Date`, `Server`.

---

## Step 7 -- Assemble the Full OAS Document

Build the complete OpenAPI 3.0 document:

### 7.1 -- `openapi`
```json
"openapi": "3.0.3"
```

### 7.2 -- `info`
```json
"info": {
  "title": "<collection name>",
  "description": "<collection description, or empty string>",
  "version": "<collection version or '1.0.0'>"
}
```

### 7.3 -- `servers`
As derived in Step 4.

### 7.4 -- `tags`
One tag per top-level Postman folder. If the collection has no folders,
derive tags from the first path segment of each route (e.g. `/users/*` -> `Users`).

```json
"tags": [
  { "name": "Users", "description": "" },
  { "name": "Auth", "description": "" }
]
```

### 7.5 -- `paths`
For each (normalized path, method) operation:

```json
"/path/{param}": {
  "get": {
    "operationId": "<camelCase unique id>",
    "summary": "<request name from Postman, cleaned up>",
    "description": "<request description from Postman if present>",
    "tags": ["<folder breadcrumb or inferred tag>"],
    "parameters": [...],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/schemas/FooRequest" }
        }
      }
    },
    "responses": {
      "200": {
        "description": "<Postman response name or 'Success'>",
        "headers": { ... },
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Foo" }
          }
        }
      }
    },
    "security": [{ "BearerAuth": [] }]
  }
}
```

`operationId` rules:
- Globally unique across the entire spec
- Derive from the Postman request name: slugify to camelCase, remove special
  characters, prepend the HTTP method if ambiguous
  (e.g. "Get User By ID" -> `getUserById`, "Create Vehicle" -> `createVehicle`)
- Fall back to `<method><FirstPathSegmentPascalCase>` if name is generic

Response rules:
- Include every saved Postman response as a separate status code entry
- Only emit HTTP status codes that are explicitly saved in the Postman collection (`item.response[].code`)
- If a request has no saved responses at all, emit a single `default` entry:
  ```json
  "default": { "description": "Unexpected error" }
  ```
- A saved response with a parseable body gets `content`; one with an empty
  body omits `content` entirely (e.g. `204` or empty `text/plain` responses).

Security rules:
- If the collection has a global `auth` block, apply that scheme globally in
  the OAS root `security` field
- Override at the operation level:
  - `type: noauth` -> `"security": []`
  - Different scheme -> explicit per-operation `security`
- If auth is inconsistent across requests, omit the global `security` and
  apply per-operation only

### 7.6 -- `components`

#### `components.schemas`
All inferred and deduplicated schemas from Step 5. Order alphabetically.

#### `components.securitySchemes`
All auth schemes from Step 3:

```json
"securitySchemes": {
  "BearerAuth": {
    "type": "http",
    "scheme": "bearer",
    "bearerFormat": "JWT"
  },
  "BasicAuth": {
    "type": "http",
    "scheme": "basic"
  },
  "ApiKeyHeader": {
    "type": "apiKey",
    "in": "header",
    "name": "X-API-Key"
  }
}
```

Root key order: `openapi`, `info`, `servers`, `tags`, `paths`, `components`

---

## Step 8 -- Write the File and Self-Review

Output location:
- Use the path the user specified, or
- Default to `openapi.json` in the same directory as the Postman collection file

Format: JSON, 2-space indentation.

Before writing, run a self-review checklist:
- Every `$ref` target exists in `components`
- Every `{param}` in a path has a matching `in: path` parameter with `required: true`
- Every `operationId` is unique across the document
- Every response object has a `description` field
- No path string is missing a leading `/`
- Every `requestBody` is only on `POST`, `PUT`, `PATCH`, `OPTIONS` operations
  (never on `GET`, `DELETE`, `HEAD`)
- Every `in: path` parameter has `required: true`
- No duplicate paths (same path string + method combination)

Fix any violations found, then write the file.

---

## Step 9 -- Report to the User

After writing the file, output a summary table:

```
Postman -> OpenAPI Conversion Complete
  Output file:   <path to openapi.json>
  OAS version:   3.0.3
  Servers:       <N server URLs>
  Tags:          <list>
  Paths:         <N unique paths>
  Operations:    <N total operations>
  Schemas:       <N component schemas>
  Security:      <scheme names, or "None detected">

Requests processed:
  Total requests in collection:   <N>
  Operations generated:           <N>
  Requests merged (same path+method): <N>
  Requests skipped (attack payloads): <N>
  Requests skipped (attack/demo operations): <N>

Notes:
  - <any ambiguities, assumptions, or items that need manual review>
  - <any operations where response bodies could not be inferred>
  - <any path parameters that could not be confirmed -- mark as TODO>
```

---

## Edge Cases and Special Handling

### `{{variableName}}` placeholders
- Resolve all `{{variableName}}` occurrences in URLs, headers, and body values
  using the merged variable map before any processing
- For resolved placeholders, propagate the resolved value into generated OAS
  `example` fields for path/query/header parameters and body schemas whenever
  the placeholder maps to that field
- If a variable cannot be resolved (not in collection or environment), leave
  the placeholder text as-is and note it in the summary
- `{{baseUrl}}` in the URL path -> strip from the path; emit as a server variable
  or use the resolved value as the server URL

### Pre-request scripts and tests
- Ignore Postman pre-request scripts and test scripts entirely -- they are not
  part of the API contract

### Security demo folders mixed with functional endpoints
- Some collections include dedicated attack/demo folders alongside valid API
  examples. Treat attack/demo requests as out-of-contract and exclude them from
  the generated OAS.
- Keep legitimate business operations even if they share the same endpoint as a
  skipped attack variant; merge only non-skipped request variants.

### Collection-level / folder-level variables
- Variables defined at the folder level apply only to requests in that folder
- Merge order: environment file > collection variables > folder variables > request variables

### Postman Auth inheritance
- If a folder has an `auth` block, requests in that folder inherit it unless
  they override with their own `auth` block
- Track this inheritance during the recursive traversal

### Duplicate request names
- If two requests produce the same `operationId` candidate, append a numeric
  suffix: `getUser`, `getUser2`, `getUser3`

### Requests with no URL
- Skip silently and note in the summary

### GraphQL requests
- Emit as a single `POST /graphql` operation with `application/json` request
  body containing `query` (string) and `variables` (object) properties
- If multiple GraphQL requests are present, still emit only one operation and
  note the limitation

### Multiple content types
- If the same operation appears with both JSON and form bodies across different
  saved requests, emit both content types under `requestBody.content`

### OAS 3.0 compliance constraints
- Use `nullable: true` for nullable fields (OAS 3.0 style, not `type: ["string", "null"]`)
- Use `$ref` everywhere a schema appears more than once
- Do not use `$schema`, `$id`, or other JSON Schema draft-07+ keywords
- Keep all schema types from the OAS 3.0 subset: `string`, `number`, `integer`,
  `boolean`, `array`, `object`
- Always include `operationId` -- required for 42Crunch audit and scan tooling
- Use `format` where applicable: `date-time`, `date`, `uuid`, `email`, `uri`,
  `binary`, `byte`, `int32`, `int64`, `float`, `double`, `password`
