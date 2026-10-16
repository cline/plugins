import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentPlugin } from "@cline/sdk"

const pluginRoot = dirname(fileURLToPath(import.meta.url))
const tsxCli = resolve(pluginRoot, "node_modules", "tsx", "dist", "cli.mjs")
const serverPath = resolve(pluginRoot, "server.ts")

const plugin: AgentPlugin = {
	name: "discord",
	manifest: {
		capabilities: ["skills", "mcp"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "discord",
			transport: {
				type: "stdio",
				command: "node",
				args: [tsxCli, serverPath],
			},
		})
	},
}

export default plugin
