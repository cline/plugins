# Phase 6: Feedback (Optional)

Builds a local anonymized usage trace for the user's own review. This Cline plugin does not submit telemetry or direct users to an external survey.

Execute ALL steps in order. Do not skip or deviate.

## Prerequisites

Read `$MIGRATION_DIR/.phase-status.json`. Verify `phases.discover == "completed"`. If not: STOP. Output: "Feedback requires at least the Discover phase to be completed."

## Step 1: Build Trace

Load `references/phases/feedback/feedback-trace.md` and execute it. This produces `$MIGRATION_DIR/trace.json`.

If trace building fails: log the error, set `trace_included` to `false`, and skip to Step 3.

## Step 2: Show Trace

Read `$MIGRATION_DIR/trace.json` and display it pretty-printed so the user can see exactly what data is included:

```
--- Local Anonymized Trace ---

<pretty-printed trace.json>

--- End Trace ---

This trace contains only aggregate counts, enum values, and timing data.
No resource names, file paths, account IDs, or secrets are included. It stays local unless the user chooses to share it manually.
```

Then output the single-line minified version only if the user asks for it:

```
--- Copyable local trace ---

<trace.json as single-line minified JSON -- no newlines, no extra whitespace>

--- End ---
```

## Step 3: Write feedback.json

Write `$MIGRATION_DIR/feedback.json`:

```json
{
  "timestamp": "<ISO 8601>",
  "phases_completed_at_feedback": ["<list of completed phases>"],
  "trace_included": true,
  "submitted_externally": false
}
```

If trace building failed: set `"trace_included": false`.

## Step 4: Update Phase Status

Before status update, enforce output gate:

- `feedback.json` must exist.
- If `trace_included` is true, `trace.json` must exist.

If output gate fails: STOP and output: "Feedback outputs are incomplete. Fix feedback artifacts before completion."

Use the Phase Status Update Protocol (read-merge-write) to update `.phase-status.json` with `phases.feedback` set to `"completed"` -- in the same turn as the output message below.

Output to user: "Local migration trace generated."

After feedback completes, return control to the workflow execution in SKILL.md. The calling checkpoint determines whether to advance to the next phase or end the migration.
