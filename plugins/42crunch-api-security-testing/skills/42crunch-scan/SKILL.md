---
name: 42crunch-scan
description: >
  Run a 42Crunch live conformance and authorization scan against an API and fix
  SQG-blocking scan findings. Use this skill whenever the user wants to run a
  conformance test, authorization scan, BOLA test, BFLA test, generate or
  configure a scan config, or fix scan-reported issues. Triggers on phrases
  like "run scan", "scan only", "conformance test", "BOLA test", "BFLA test",
  "42crunch scan", "scan config", or any request focused on live API testing
  without running a static audit. Use 42crunch-api-security-testing when the user wants both
  audit and scan together.
---

# 42Crunch Scan Skill

## Cline Compatibility

When this workflow mentions `AskUserQuestion`, ask the user normally in Cline or use the host's question UI. Do not assume a separate tool named `AskUserQuestion` exists. Do not ask users to paste API keys, tokens, passwords, or cookies into chat; use existing 42Crunch config files, environment variables, user-created local files, or a secure host prompt when available. Confirm live scan targets and every audit/scan/code fix before running commands or editing files.

Runs a single phase: Scan (live conformance + authorization testing and
SQG-blocking fix loop). Requires explicit user permission before execution.
Does not run a static audit -- use the `42crunch-audit` skill for that.

Assumes the OAS file is already audit-clean (or the user is explicitly
running scan only). If the user mentions audit issues before scanning, suggest
running `42crunch-audit` first.

---

## Entry Point

1. Pre-flight checks. Read `../../references/pre-flight.md` and complete
   all steps (setup, OAS resolution, tag detection). When prompting for OAS
   file selection, use the context `"scan"` (e.g. "Which one should I scan?").
   Do not proceed if any step fails or the user cancels.

2. Resolve the scan target URL.

   Read `servers[0].url` from the OAS file.

   - If `SCAN42C_HOST` environment variable is set -> treat it as the proposed target and still ask for confirmation:
     - question: `"SCAN42C_HOST is set to <url>. Is this the correct target to scan, and are you authorized to send test traffic to it?"` -- options: `["Yes -- use this target", "No -- I'll provide a different URL", "Cancel"]`
     - If Yes -> store as `SCAN_TARGET_URL`.
     - If No -> ask the user to provide the URL and store it as `SCAN_TARGET_URL`.
     - If Cancel -> stop.
   - If not set -> call `AskUserQuestion`:
     - question: `"The OAS points to <servers[0].url> as the API target. Is this the right URL to scan against, and are you authorized to send test traffic to it?"` -- options: `["Yes -- use this URL", "No -- I'll provide a different URL"]`
     - If No -> ask the user to provide the URL and store it as `SCAN_TARGET_URL`.
     - If Yes -> store `servers[0].url` as `SCAN_TARGET_URL`.
   - If the selected URL appears to be production or internet-facing, ask one more explicit confirmation: `"This target looks production or externally hosted. Are you authorized to run 42Crunch scan traffic against it?"` Continue only if the user confirms.

3. OAS analysis for scan preview -- run silently before asking permission.

   Read the OAS file and collect:
   - Total operation count
   - Auth scheme types from `securitySchemes` (Bearer/JWT, API Key, Basic, OAuth2)
   - BOLA candidate count: operations where the path has `{...Id}`, `{...Key}`, `{...Ref}`, or similar resource-ID placeholders AND the method is GET, PUT, PATCH, or DELETE
   - Whether the OAS contains sample data: any operation with `example`, `examples`, or `default` values on its request body or parameter schemas

4. Ask for permission to configure the scan. Output the following scan
   preview as a chat message first:

   ```
   Ready to configure the scan?
     Target:   <SCAN_TARGET_URL>
     OAS:      <filename>  (<N> operations)
     Auth:     <scheme types>  [+  second user needed -- <N> BOLA candidate(s)]
     Samples:  OAS has sample data  /  No samples -- you'll need to provide test data
     Tag:      <category>:<tagname>           <- platform mode only, when a tag is assigned; omit if no tag
     Mode:     Platform / Free Trial
   ```

   Then call `AskUserQuestion`:
   - question: `"I'm ready to start configuring the scan. I'll ask for credentials, classify your operations, and set up test scenarios -- then run a happy path validation before the full scan. Shall I proceed?"`
   - options: `["Yes, let's configure", "No, cancel"]`

5. Execute the Scan. Mode is already resolved from pre-flight -- do not
   re-derive it.

   Reachability check -- read `../../references/reachability-check.md` and run
   the two-stage probe now. Return here once it completes (or stop if the user cancels).

   Read `../../references/scan-workflow.md` and apply only the
   commands for the identified mode throughout.
   The workflow sets up the scan config, collects credentials, gathers test data,
   classifies operations, validates happy paths, then asks for permission again
   before running the full scan. It presents a risk-classified findings report
   (Authorization failures / SQG-blocking conformance / informational conformance)
   and pauses for consent before applying any OAS changes.

  Mandatory checkpoint: after any direct edit to `CONF_FILE` (including
  `environments.default.variables.*`, auth wiring, or scenario chains), run
  `scan conf validate` and resolve all validation errors before continuing to
  happy-path or full scan runs.

   Free Trial mode: no SQG is enforced for scan. Present all findings for
   information. The user decides which (if any) to fix.

6. Present the final scan summary (see Output Format below).

Only continue after explicit user confirmation at each permission prompt.

---

## Output Format

After the scan completes, produce a summary in this shape:

```
Scan Complete
  Mode:           Platform / Free Trial
  SQG:            PASSED  (<sqg-name> -- your org's security quality gate is met)    <- platform mode, passed
  SQG:            FAILED  (<sqg-name> -- the quality gate is not met; fixes above are required)    <- platform mode, failed
  SQG:            N/A  (Free Trial -- scan findings are informational; no gate enforced)    <- free trial mode
  Tag:            <category>:<tagname>             <- platform mode only, when a tag is assigned; omit this row if no tag
  Authorization:  BOLA confirmed on 1 operation -- OAS updated . server-side fix applied
  Conformance:    1 SQG-blocking issue fixed (OAS + code) . 3 informational findings surfaced
  OAS updated:    <path/to/openapi.json>

```

Show only the one SQG line that matches the current mode and result.

If the user declined to apply fixes or no issues were found, note that instead.

---

## Environment Variables

| Variable       | Purpose |
|----------------|---------|
| `SCAN42C_HOST` | Scan target base URL (overrides OAS `servers[0]`) -- Both modes |

All other variables (`API_KEY`, `PLATFORM_HOST`, `TRIAL_TOKEN`) and general
constraints are defined in `../../references/pre-flight.md`.
