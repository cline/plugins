# Posting the link back to the PR/MR

Mechanics for section 6 "Post link back to PR/MR". Once the artifacts are created, surface the link from the PR/MR itself only when the user explicitly approves that mutation.

Skip this step entirely when the source is "local changes" or a branch with no associated open PR/MR. In those cases the link is reported only in chat output (see section Output).

## Block format

After explicit user approval, append a delimited block to the existing PR/MR description. Reuse the same delimiters on every run so the block can be replaced cleanly:

```
<!-- miro-pr-docs:start -->
## PR documentation

PR details on Miro: <link>

- <X> documents, <Y> diagrams, <Z> table rows
- High-risk files: <count>
- Security findings: <count>
<!-- miro-pr-docs:end -->
```

Link rules:
- If the original Miro URL contained `moveToWidget=<frameId>`, reuse that exact URL - clicking opens straight to the frame
- Otherwise use the plain board URL

Idempotency:
- If the description already contains the `<!-- miro-pr-docs:start -->` ... `<!-- miro-pr-docs:end -->` markers, replace the contents in place
- Otherwise append the block at the end of the existing description, preserving everything else verbatim
- Never overwrite the user-authored portion of the description

## Update the description

Use the same CLI selection from section 1. Read the current body, splice the new block, write it back. Do not run the edit command until the user approves the PR/MR mutation.

GitHub example (`gh`):
```bash
# Read current body
BODY=$(gh pr view $PR_NUMBER --json body -q .body)
# (splice: replace existing block or append) -> produce $NEW_BODY
gh pr edit $PR_NUMBER --body "$NEW_BODY"
```

GitLab example (`glab`):
```bash
BODY=$(glab mr view $MR_NUMBER -F json | jq -r .description)
# (splice) -> $NEW_BODY
glab mr update $MR_NUMBER --description "$NEW_BODY"
```

REST fallback: only after explicit user approval for token-backed REST writes, read and PATCH the PR/MR body via the platform's REST API with the user's token.

## Permission failure fallback

If editing the description fails because the user lacks permission (for example, when reviewing someone else's PR), ask before posting the same block as a PR/MR comment instead. Mention this fallback in the chat output so the user knows the description was not changed.
