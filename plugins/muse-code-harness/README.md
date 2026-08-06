# muse-code-harness

Injects a compact set of rigorous engineering conventions into the system prompt of every session. The conventions steer the agent toward deriving the real contract from call sites and existing tests, weighing edge and error cases as heavily as the happy path, reproducing a bug before fixing it, making the smallest correct fix at the root cause, and verifying with the project's own test suite instead of throwaway scripts.

The wording is inspired by the harness prompting conventions that frontier coding agents are trained with, adapted for Cline. In our informal before and after sessions on a real bug from the Cline repo, adding these conventions changed how the model worked noticeably: it oriented from repository context first, probed edge cases as it went, and finished in fewer turns at lower cost.

## Install

```bash
cline plugin install ./plugins/muse-code-harness
```

Or drop the directory into `~/.cline/plugins/` (user scoped) or `<workspace>/.cline/plugins/` (project scoped).

## Override per project

Create `<workspace>/.cline/conventions.md` to replace the bundled conventions with your own for that project. If the file exists it is used verbatim instead of the bundled set.

## What gets injected

The bundled `conventions.md`: eight rules covering contract derivation, exhaustive edge case coverage, reproduce before fixing, verification with the project's real tests, boundary value discipline, a ban on hunting for graders or answer keys, autonomous continuation until verified, and grounding claims in what was actually read or run.
