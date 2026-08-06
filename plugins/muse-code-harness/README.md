# muse-code-harness

Injects a compact set of rigorous engineering conventions into the system prompt of every session, adapted from the harness prompting style that Meta's Muse Spark models were co-trained with. The conventions steer the agent toward deriving the real contract from call sites and existing tests, weighing edge and error cases as heavily as the happy path, reproducing a bug before fixing it, making the smallest correct fix at the root cause, and verifying with the project's own test suite instead of throwaway scripts.

In informal before and after sessions on a real bug from the Cline repo with muse-spark-1.2, adding these conventions changed how the model worked noticeably: it oriented from repository context first, probed edge cases as it went, and finished in fewer turns at lower cost.

## Install

```bash
cline plugin install muse-code-harness
```

## Override per project

Create `<workspace>/.cline/conventions.md` to replace the bundled conventions with your own for that project. If the file exists it is injected verbatim instead of the bundled set.
