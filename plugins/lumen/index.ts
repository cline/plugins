import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentPlugin } from "@cline/sdk"

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const LAUNCHER =
	process.platform === "win32"
		? join(MODULE_DIR, "scripts", "run.cmd")
		: join(MODULE_DIR, "scripts", "run")

const plugin: AgentPlugin = {
	name: "lumen",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api, ctx) {
		api.registerMcpServer({
			name: "lumen",
			transport: {
				type: "stdio",
				command: LAUNCHER,
				args: ["stdio"],
				cwd: ctx.workspaceInfo?.rootPath,
			},
		})
	},
}

export default plugin
