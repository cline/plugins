import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentPlugin } from "@cline/core";

const OVERRIDE_RELATIVE = join(".cline", "conventions.md");

const CONVENTIONS = `# Engineering conventions

- Derive the contract from the repository rather than the issue text. Before changing a symbol or behavior, search every call site and read the existing tests, the types and data model, and the callers in that area. These encode the real contract the issue leaves out: exact error types and how they are wrapped, return shapes, defaults, and identity, caching, and mutation semantics. When sibling code exists, match its API shape and reuse its helpers instead of inventing a divergent one.

- Treat the request as an exhaustive checklist and implement exactly what was asked. Give error, edge, and negative clauses (errors when X, silently ignored, no-op when missing, every input variant) the same weight as the happy path, and cover each one. A fix that only handles the happy path is incomplete; real callers hit the error, edge, and boundary inputs. Keep edits scoped, and fix the root cause rather than the symptom.

- Reproduce the reported failure against the real code before fixing it, but never let a test you wrote yourself define correctness; it can bake in the same wrong assumption as your fix. Make the smallest correct change at the root cause, covering every case it implies. When your own check disagrees with the code's actual behavior, suspect the check first, and never weaken correct code so a self-authored test passes.

- Verify by running the project's own build and tests and reading the result. Learn the repository's true test invocation and run the tests that cover what you touched. Do not stop at the first green run: exercise edge and error paths as well (empty, undefined, and malformed input, boundary values, adjacent ids, repeated input, concurrency). Run the whole relevant test file unmodified and never narrow a failing run to force a pass. A test that fails on code you changed is the requirement itself, not a stale artifact.

- When the answer is a boundary value (start or end offset, cutoff, inclusive versus exclusive bound), write the competing conventions side by side and justify the choice from the task's own wording. A boundary that is off by one is still wrong.

- Task-private graders, oracles, answer keys, and reference solutions are forbidden inputs, not repository context. Never go looking for them. Solve and test only from the public task contract.

- When the next step is clear, keep going without asking. Continue until the requested change is implemented and verified, or a genuine blocker stops progress. Editing alone is not done, and a throwaway script is not a substitute for the project's real tests.

- Ground every claim about code, tests, or tools in something you actually read or ran. The code is the source of truth; docs and comments describe intent and can go stale.
`;

const plugin: AgentPlugin = {
	name: "muse-code-harness",
	manifest: {
		capabilities: ["rules"],
	},

	setup(api, ctx) {
		const root = ctx.workspaceInfo?.rootPath;
		const overridePath = root ? join(root, OVERRIDE_RELATIVE) : undefined;
		const content =
			overridePath && existsSync(overridePath)
				? readFileSync(overridePath, "utf8")
				: CONVENTIONS;
		api.registerRule({
			id: "muse-code-harness",
			source: "muse-code-harness plugin",
			content,
		});
	},
};

export default plugin;
