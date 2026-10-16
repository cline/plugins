# Reachability Check

Two-stage probe to confirm `SCAN_TARGET_URL` is reachable before configuring
the scan. Run immediately after `SCAN_TARGET_URL` is confirmed. If the check
completes (passes or the user chooses "Continue anyway"), return to the calling
workflow and proceed. If the user cancels, stop.

---

Stage 1 -- probe the base URL:

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 5 <SCAN_TARGET_URL>/
```

- 2xx, 3xx, 401, 403, or 405 -> API is reachable. Proceed silently.
- Connection refused or timeout -> call `AskUserQuestion`:
  - question: `"I couldn't reach <SCAN_TARGET_URL> -- the connection timed out or was refused. How would you like to proceed?"`
  - options: `["Try a different URL", "Continue anyway -- the API may be temporarily down", "Cancel"]`
  - If Try a different URL -> ask for new URL, store as `SCAN_TARGET_URL`, re-run from Stage 1.
  - If Continue anyway -> proceed with warning noted.
  - If Cancel -> stop.
- 404 -> ambiguous (server may be up but nothing is mounted at root). Proceed to Stage 2.

---

Stage 2 -- probe the first simple OAS path (only reached when Stage 1 returns 404):

Find the first `GET` path in the OAS that has no required path parameters. Strip
any `{param}`-style segments and probe:

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 5 <SCAN_TARGET_URL><first_simple_path>
```

- Any HTTP response -> server is up; root just has no handler. Proceed silently.
- Connection refused or timeout -> same `AskUserQuestion` as Stage 1.
- 404 again -> call `AskUserQuestion`:
  - question: `"The server responded but both / and <path> returned 404 -- the base URL may be incorrect (the API may be mounted at a different prefix). How would you like to proceed?"`
  - options: `["Try a different URL", "Continue anyway", "Cancel"]`
  - If Try a different URL -> ask for new URL, store as `SCAN_TARGET_URL`, re-run from Stage 1.
  - If Continue anyway -> proceed with warning noted.
  - If Cancel -> stop.
