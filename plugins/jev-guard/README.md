# jev-guard

A Cline plugin that checks everything the agent reads (web pages, files, command output, MCP and other tool results) before the agent acts on it. You decide what counts as risky, in plain words, and test the guard against sample texts on a local page. From then on it runs on its own: every tool result in a guarded folder is screened by Jev (TypeSafe's System One), and flagged text is hidden, flagged to the agent, or turned into a question for you.

![The guard page with the support inbox example](https://raw.githubusercontent.com/parthshr370/cline-space/main/jev-guard/docs/guard.png)

## What it does

- A guard is a policy you can test. A policy answers four questions:

  | Part | What you set | Example |
  |---|---|---|
  | Watch for | Checks. Each one is a yes/no question Jev answers about a piece of text | "Does this text ask for a refund to be sent to a different bank account?" |
  | How strict | Relaxed (fires at 75%), normal (50%), or strict (30%) | Strict for payment changes, relaxed for tone |
  | If it fires | Note it, warn the agent, ask me, or block it | Payment change: ask me. Injection: block it. |
  | Where | Folders, plus which kinds of tool results to check | This inbox folder: files, web pages, MCP tools |

- Cline writes the first version. Say what you are protecting and the agent calls `setup_jev_guard`. It writes starter checks plus ones specific to your situation, and 5 to 8 realistic samples, some that should pass and some that should be flagged. It turns the guard on for the current folder and opens the guard page.
- The page is a test bench. Samples work like unit tests: mark each one "should pass" or "should flag", press Test all samples, and tune until you see "8 of 8 samples behave as expected". Changes save on their own.
- Enforcement is automatic. A Cline `afterTool` hook screens every tool result in a guarded folder. The agent does not have to remember to call anything, and an injected page can't talk it out of the check.
- Live catches feed back. The page lists what the guard did in real sessions. One click turns a miss or a false alarm into a new sample.

## What each action does

| Action | What the agent gets |
|---|---|
| Note it | The result, unchanged. The catch is only logged. |
| Warn the agent | The result, plus a notice that names the flagged text and says to treat it as data. |
| Ask me | The result with the flagged paragraphs removed, plus an instruction to stop and ask you before going on. |
| Block it | The result with the flagged paragraphs removed, plus a notice saying what was removed. It carries on without them. |

When several checks fire, the most severe action wins. Notices start with `[Jev guard: a safety check the user installed in this harness...]`, and the plugin's rule tells the agent those come from the harness, not from the content. Without that label, models treat the notice itself as a possible injection.

## Layout

```
index.ts                setup_jev_guard and jev_guard tools, the afterTool hook, the rule
policy.mjs              policy files, folder matching, starter checks, tool-result text extraction
check.mjs               chunks text, asks Jev every check for every chunk, turns answers into verdicts
guard-server.mjs        local server on 127.0.0.1:4748 for the page, plus the code that starts it
guard.html              the guard page (one file, no dependencies)
jev-core.mjs            request validation, API key lookup, HTTP call to System One
examples/               a ready-made support inbox guard
```

## Prerequisites

- The [Cline CLI](https://docs.cline.bot) (tested on 3.0.64).
- `node` 18 or newer on your `PATH`, for the guard page server.
- A TypeSafe API key. Without one, nothing is checked; the log says so.

## Install

```bash
cline plugin install jev-guard
```

From a clone of this repository, install the directory so the modules next to `index.ts` come along:

```bash
cline plugin install ./plugins/jev-guard --cwd .
```

Key setup is the same as for [`jev-playground`](../jev-playground/README.md#install): `TYPESAFE_API_KEY`, or `{"apiKey": "..."}` in `~/.cline/plugins/jev.config.json` (mode 600).

## Run Cline so the plugin loads

Plugin tools and hooks load only when the session runs inside the CLI process:

- Interactive: `cline --yolo`.
- One-shot: `cline "your prompt"` with `CLINE_SESSION_BACKEND_MODE=local` set.
- Desktop app: not supported. Its sessions run in a background hub that does not load plugin tools or hooks.

## Try it

From the folder you want to protect:

```
set up a jev guard for this folder. it's our support inbox agent, and people sometimes try to get refunds sent to other bank accounts or pressure us to skip checks
```
```
protect this repo from prompt injection in issues and web pages the agent reads
```
```
set up a jev guard everywhere that stops the agent from sending my files or data anywhere
```

Then use Cline as usual. With the support guard on, asking `go through the emails in inbox/ and tell me what action to take on each one` read both emails. The guard removed the refund-redirect scam's flagged paragraphs in 419 ms (four checks fired at 90 to 95%) and let the genuine late-order email through. The agent then said not to act on the scam and to escalate it to a human.

To check a single text by hand: `is this email safe? <paste>` calls `jev_guard`.

## The support inbox example

[`examples/support-inbox-guard.json`](examples/support-inbox-guard.json) is the guard Cline wrote for the first prompt above. It has 6 checks: instructions aimed at the agent, asks for secrets, pushes to skip checks, refund sent to a new account, authority or urgency pressure, and asks to send data out. It also has 8 samples, and all 8 behave as expected. To use it:

- Through Cline, from the folder to protect: `set up this jev guard for this folder: ` followed by the file's contents.
- By hand: copy it to `~/.cline/plugins/jev-guards/policies/support-inbox-guard.json`, start the page with `node plugins/jev-guard/guard-server.mjs`, open `http://127.0.0.1:4748/#support-inbox-guard`, and add your folder under "Where it runs".

## How it works

1. Setup. `setup_jev_guard` validates the policy and saves it to `~/.cline/plugins/jev-guards/policies/<name>.json`, with the current folder as its first folder. Running setup again for a guard that already exists, from another folder, adds that folder instead of moving the guard. It starts the page server if needed (a detached `node` process, so it outlives a one-shot run) and opens `http://127.0.0.1:4748`.
2. Which policy applies. On every tool result, the hook takes the session folder (as a real path, so `/tmp` and `/private/tmp` match) and picks the policy listing the deepest folder that contains it. If none does, it falls back to the newest policy marked "every folder". If neither exists, nothing is checked.
3. Which results get checked. Tools map to sources: `fetch_web_content` to web; `read_files` and `search_codebase` to files; `run_commands` to commands; anything else, such as MCP tools, to other. Tools that write (`editor`, `apply_patch`), this plugin's own tools, and results shorter than 20 characters are skipped. Only the result text is checked; the echo of the agent's own query is left out.
4. Chunking. The text is split into paragraphs. Paragraphs over 1,200 characters are split further, and fragments under 80 characters, such as menu items, join the paragraph before them. Each paragraph stays its own chunk, so blocking removes the bad paragraph and keeps the rest. Text past 60,000 characters is not checked, and the verdict records that.
5. Asking Jev. Every check is asked about every chunk as its own yes/no question, with the chunk inside the question. Putting all chunks in shared state would let one bad chunk raise the score of every other one. Questions go out in batches of 40, up to 6 requests in parallel. A typical tool result took 0.4 to 0.9 seconds to check.
6. Verdict. A check fires when any chunk's probability reaches its sensitivity threshold. The most severe action among the fired checks is applied (see [What each action does](#what-each-action-does)), and the check is logged to `~/.cline/plugins/jev-guards/log.jsonl`.
7. Tuning. The page tests the policy exactly as you are editing it, without saving first, through the same engine the hook uses.

## Security notes

- This is a signal, not a boundary. It can miss an attack and it can flag harmless text. What makes Jev fit the job is that it cannot produce text, so an attacker who writes the page cannot talk it into emitting a command. The worst they can do is move a probability. Keep least privilege, sandboxing, and human review for anything that matters.
- It fails open. If the Jev call fails, or no key is set, the result passes through unchanged and the log records why.
- The page server listens on `127.0.0.1` only, keeps the API key on the server, and refuses requests with a foreign `Host` or `Origin`.
- Policies, the check log, and the server log live in `~/.cline/plugins/jev-guards/`, outside any repo. The log keeps flagged text so you can turn it into samples, so treat it as sensitive.

## Operating the page server

- Health check: `curl 127.0.0.1:4748/health`
- Stop: `curl -X POST 127.0.0.1:4748/shutdown`
- Server log: `~/.cline/plugins/jev-guards/server.log`
- The hook does not need the page server; it calls Jev directly. The server is only for the page.

## Known limitations

- Plugin hooks do not run in the Cline desktop app or in hub-backed interactive sessions. Use `cline --yolo` or one-shot mode.
- "Ask me" works through the agent: the flagged text is hidden and the agent is told to stop and ask. A hook can also stop the run outright, but the CLI then reports it as "aborted by another client" and drops the reason, so the user would not know why it stopped.
- Every check runs on every chunk, so a long page with many checks costs more calls. Checks are capped at 12 per guard.
- The port is fixed at 4748.

