import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentPlugin } from "@cline/core";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const BUNDLED_CONVENTIONS = join(MODULE_DIR, "conventions.md");
const PROJECT_OVERRIDE_RELATIVE = join(".cline", "conventions.md");

function loadConventions(workspaceRoot: string | undefined): string | undefined {
	if (workspaceRoot) {
		const override = join(workspaceRoot, PROJECT_OVERRIDE_RELATIVE);
		if (existsSync(override)) {
			return readFileSync(override, "utf8");
		}
	}
	if (existsSync(BUNDLED_CONVENTIONS)) {
		return readFileSync(BUNDLED_CONVENTIONS, "utf8");
	}
	return undefined;
}

const plugin: AgentPlugin = {
	name: "muse-code-harness",
	manifest: {
		capabilities: ["rules"],
	},

	setup(api, ctx) {
		const content = loadConventions(ctx.workspaceInfo?.rootPath);
		if (!content) {
			ctx.logger?.log?.("muse-code-harness: no conventions file found, rule not registered");
			return;
		}
		api.registerRule({
			id: "muse-code-harness",
			source: "muse-code-harness plugin",
			content,
		});
	},
};

export default plugin;
