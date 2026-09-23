import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { AgentPlugin } from "@cline/sdk"

const pluginRoot = dirname(fileURLToPath(import.meta.url))

const plugin: AgentPlugin = {
	name: "imessage",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api, ctx) {
		if (process.platform !== "darwin") {
			ctx.logger?.log?.("iMessage MCP is only registered on macOS")
			return
		}

		api.registerMcpServer({
			name: "imessage",
			transport: {
				type: "stdio",
				command: "bun",
				args: ["server.ts"],
				cwd: pluginRoot,
			},
			metadata: {
				description:
					"Read allowlisted iMessage history from chat.db and send replies through Messages.app on macOS.",
			},
		})
	},
}

export default plugin
