import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentPlugin } from "@cline/sdk"

const pluginDir = dirname(fileURLToPath(import.meta.url))

const plugin: AgentPlugin = {
	name: "aikido",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "aikido-mcp",
			transport: {
				type: "stdio",
				command: "npx",
				args: ["--no-install", "aikido-mcp"],
				cwd: pluginDir,
			},
		})
	},
}

export default plugin
