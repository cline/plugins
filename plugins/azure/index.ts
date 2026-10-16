import type { AgentPlugin } from "@cline/sdk"

const AZURE_MCP_VERSION = "3.0.0-beta.18"

const plugin: AgentPlugin = {
	name: "azure",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "azure",
			transport: {
				type: "stdio",
				command: "npx",
				args: ["-y", `@azure/mcp@${AZURE_MCP_VERSION}`, "server", "start"],
			},
		})
	},
}

export default plugin
