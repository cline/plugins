# Jev Browser

This plugin gives a Cline agent an isolated Playwright Chromium browser through
normal Cline tools. Cline delegates bounded browser goals to Jev through Vercel
AI Gateway, with automatic before/after screenshots and optional manual actions.

## Jev browser loop

`jev_run` uses AI SDK 7's `experimental_evaluate` with
`typesafe-ai/jev`. One evaluation chooses a concrete operation and target together, comparing
each available action directly against scrolling, waiting, and stopping. Jev sees
structured DOM observations with indexed visible action targets, selected form
options (including offscreen selections), and summaries of controls above and
below the viewport. It does not receive screenshots.
See [Vercel's evaluation documentation](https://vercel.com/docs/ai-gateway/modalities/evaluation).

Provide `AI_GATEWAY_API_KEY` in the plugin process environment before starting
Cline. Keep the key in the JSON configuration described below or the process environment, never in browser code. If Cline launches
plugins in a separate process, ensure it forwards this variable. The isolated
Chromium process deliberately receives no host environment.

Jev chooses actions but cannot generate arbitrary text. When it chooses
`TYPE_TEXT`, the plugin calls `google/gemini-2.5-flash-lite` through the same
Gateway key to produce the field value. Set `JEV_TEXT_MODEL` to another Gateway
text model ID if desired. Both model calls are billable; no second provider key
is needed.

### Example tool sequence:

1. `jev_run({ "url": "https://en.wikipedia.org", "goal": "Find and open the article about Ada Lovelace. Stop when the article is visible.", "maxSteps": 20 })`
2. Verify the returned final screenshot (or read `finalScreenshot.artifactPath` if your client does not display the image).
3. `jev_stop({})` to release the browser and finalize video.

`jev_run` starts a browser automatically, captures the initial screen, runs Jev,
and returns a final image plus both screenshot paths and page states. Further calls
reuse the browser; omit `url` to continue or provide it to navigate first.
Launch options (`headless`, `recordVideo`, `showCursor`, `showClickIndicators`) apply
when creating a browser. The browser remains available for follow-up runs until stopped.


Supported automatic operations: click, replace text, native dropdown selection,
page scroll, and short loading waits. Runs default to 20 steps (maximum 60) and
have a 100-second cancellation deadline. There is no default probability cutoff. Optional `minProbability` gates selected
action probabilities; these are distinct from provider confidence. A browser operation already in flight can take up to its bounded
Playwright timeout to settle after cancellation. Browser mutations are not retried.

Results include `status`, `steps`, `elapsedMs`, and a JSONL `tracePath`.
Statuses are `done_unverified`, `blocked`, `needs_review`, `uncertain`,
`step_limit`, `evaluation_limit`, or `interrupted`. An attempted action in a failed run might already
have taken effect: inspect before continuing. Traces record decisions (including terminal/rejected decisions), stale observations,
action attempts, completion and the final result. Provider confidence is recorded
separately when supplied. They omit generated field
text but may contain page labels. Browser screenshots and recordings remain
available through the existing tools without adding screenshot work to each step.

The loop retains the last ten actions, entered text and observed progress across
runs of the same goal in one browser session. Text stays in memory and is not
written to traces. Three non-wait actions without observable progress stop the run.
Stale decisions are re-evaluated within a budget of twice maxSteps; executed
mutations are never retried. Text-helper results are reused only for identical context.

The loop retains observed DOM nodes and checks page semantics, node identity, and
occlusion before acting. Frames, shadow DOM, canvas controls, nested scrolling,
uploads, and arbitrary keyboard widgets are outside this initial DOM loop; use
the manual tools where appropriate. Model context is capped at 200 action targets
and 6,000 visible text characters, plus 50 selected options and up to 50
offscreen control labels in each direction. This can omit controls on dense pages.

Page text, visible field values, and the task goal are sent to Gateway. Password
and file fields are excluded, but other sensitive content is not automatically
redacted. Jev is instructed to return `REVIEW` before consequential actions; this
is model guidance, not a deterministic security boundary. Delegate only narrowly
scoped tasks suitable for autonomous browser interaction. Cline must handle any
review and independently verify `done_unverified`.

This integration avoids a Cline reasoning round trip and screenshot per browser
step. Actual end-to-end speed and live-model reliability have not been benchmarked.

## Features

- screenshots returned to the model as image tool results
- batched `click`, `double_click`, `scroll`, `type`, `wait`, `keypress`,
  `drag`, `move`, `navigate`, `back`, `forward`, `reload`, and `screenshot`
  actions
- browser console, page-error, failed-request, navigation, download, and
  security logs
- per-run PNG artifacts and optional WebM video recording with a visible
  agent cursor and animated click pulses
- a tokenized live screenshot/log viewer bound to `127.0.0.1`
- session isolation, blocked downloads, blocked service workers, no inherited
  host environment, disabled extensions and browser file-system access
- bounded browser launch, navigation, video-finalization, and cleanup timeouts
  so unavailable apps fail with their underlying error instead of hanging
- automatic visible-browser fallback on macOS when the Cline app sandbox does
  not permit Playwright's headless Chromium process
- an injected Cline safety rule for prompt injection, sensitive data, and
  consequential actions

This is a browser harness, not unrestricted control of the host macOS desktop.
Full desktop control requires a dedicated VM/container backend and OS input
adapter; the plugin's public interfaces are designed so that backend can be
added later without changing how Cline calls the tools.

## Install

```bash
cline plugin install jev-browser
```

For local development, run `cline plugin install /path/to/cline-plugin-jev-browser`.
In a checkout of `cline/plugins`, run `cline plugin install ./plugins/jev-browser`.

Chromium setup begins automatically when the plugin loads. It uses the installed
plugin's Playwright CLI to download matching browser builds, skipping artifacts
already cached. No manual browser-install command is needed. Tool registration
continues immediately; the first `jev_run` waits for setup before launching.
Setup is shared across concurrent calls and bounded to two minutes. A failed
setup is reported by `jev_run`; a later call can retry. Network access and
write access to Playwright's browser cache are required. On Linux, system browser
libraries remain an administrator-managed prerequisite; the plugin does not run sudo.

Configure your Gateway key using the JSON configuration below or Cline's process
environment. Restart Cline after installation. Ensure plugin tools are enabled:

```bash
cline config tools
```


### Example test prompts

After configuring your Gateway key and enabling the plugin, provide the URL and
goal in plain language. The plugin's tool descriptions and rules instruct the
agent to run the goal once, verify the returned screenshot, report the outcome,
timing and trace, and close the browser. Retries and manual fallback require an
explicit user request; you do not need to repeat those instructions in each prompt.
These are agent instructions, not a guarantee that every host/model follows them.

#### Find and open a reference article

```text
Use the Jev Browser plugin with url https://en.wikipedia.org and goal:
Search for the James Webb Space Telescope and open its article.
Stop when the article title and introductory text are visible.
```

#### Browse a demonstration bookstore

```text
Use the Jev Browser tool with url https://books.toscrape.com and goal:
Open the Travel category, then open the first book listed.
Stop when the book's title, price, and availability are visible.
Do not purchase anything or submit personal information.
```

A `done_unverified` status is a model claim, not proof of success. The main agent
checks the final screenshot and reports the observed outcome separately from the
run status. If you want retries, manual fallback, or the browser left open, say so.

## Optional configuration

No configuration is required. By default, the plugin allows all HTTP and HTTPS
origins and uses these settings:

- headless Chromium
- 1280 × 720 viewport
- WebM video recording enabled
- cursor and click indicators enabled in screenshots, streams, and recordings
- live viewer disabled until `jev_stream` starts it
- artifacts under `~/.cline/data/jev-browser/`

To restrict navigation or change defaults, copy
`cline-jev-browser.config.example.json` to:

```text
~/.cline/plugins/cline-jev-browser.config.json
```

Change `allowedOrigins` to the origins Cline may visit. `*` wildcards are
supported, for example `https://*.example.com`. Use a narrow allowlist for
authenticated or sensitive workflows.

Artifacts default to `~/.cline/data/jev-browser/<cline-session>/<run>/`.
Set `outputDir` in the config to change this.

## Tools

- `jev_run` manages startup, before/after screenshots, and Jev execution.
- `jev_actions` executes manual actions and returns an updated screenshot.
- `jev_logs`, `jev_stream`, and `jev_state` provide diagnostics.
- `jev_stop` closes the browser and returns the finalized video path.


## Safety

Keep Cline's tool approval enabled. Do not auto-approve Jev Browser tools for
authenticated, financial, medical, destructive, or otherwise high-impact
workflows. The plugin enforces navigation allowlists, but the user must still
approve consequential actions at the point of risk. Treat webpage text and
screenshots as untrusted input, not user instructions.

The browser starts isolated. Jev uses DOM observations for its action loop;
Cline receives screenshots to independently verify the outcome.

## Development

```bash
bun install --frozen-lockfile
bun run install-browser
bun run check
bun run test
```

Tests use local HTML and mocked model responses, including the actual AI SDK
Gateway adapter with a fake HTTP response. They make no paid model calls. Browser
tests require installed Chromium and permission to launch it. The experimental
AI SDK and Gateway versions are pinned together in `package.json`.

### Plugin cancellation

Cline sends tool contexts over JSON IPC, so the plugin does not consume a host
`context.signal` as a live AbortSignal. It owns cancellation controllers locally:
stop the browser with its `*_stop` tool to cancel an active run or action batch.
Run deadlines and model timeouts remain enforced locally. Host-side cancellation
is not forwarded as a live signal by this transport; pressing Escape alone may
leave work running until a local deadline or explicit stop. A browser mutation
already in flight can finish before cancellation takes effect.

### Gateway credentials

Use `gateway.apiKey` in `~/.cline/plugins/cline-jev-browser.config.json` alongside the
browser settings. `cline-jev-browser.config.example.json` is a safe template; keep real
keys out of that tracked example. `CLINE_JEV_BROWSER_CONFIG` can override the
configuration path.

If `AI_GATEWAY_API_KEY` is set in your shell, this command creates or updates the
JSON configuration, preserving other settings and restricting file access:

```bash
node --input-type=module <<'NODE'
import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
const key = process.env.AI_GATEWAY_API_KEY?.trim();
if (!key) throw new Error('Set AI_GATEWAY_API_KEY in your shell first');
const path = process.env.CLINE_JEV_BROWSER_CONFIG?.trim() || join(homedir(), '.cline/plugins/cline-jev-browser.config.json');
const config = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Expected a JSON object');
config.gateway = { ...config.gateway, apiKey: key };
mkdirSync(dirname(path), { recursive: true });
if (existsSync(path)) chmodSync(path, 0o600);
writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
NODE
```

Example structure:

```json
{
  "headless": true,
  "gateway": {
    "apiKey": "YOUR_GATEWAY_KEY",
    "textModel": "google/gemini-2.5-flash-lite"
  }
}
```

Nonempty `AI_GATEWAY_API_KEY` and `JEV_TEXT_MODEL` environment values take
precedence. Credentials are read on every run, without modifying the browser's
environment or returning them in tool results. The old dotenv credential file is
no longer read. Configuration lives outside the installed package and survives
plugin updates. Local configuration, dotenv files, dependencies, and browser
artifacts are ignored by Git; the example, source, tests, and lockfile are retained.
