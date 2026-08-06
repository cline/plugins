import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "ui5",
	manifest: {
		capabilities: ["mcp", "skills"],
	},
	setup(api) {
		api.registerMcpServer({
			name: "ui5-mcp-server",
			transport: {
				type: "stdio",
				command: "npx",
				args: ["--yes", "@ui5/mcp-server@0.2.12"],
			},
			metadata: {
				description:
					"UI5 tools for API reference lookup, UI5 linting, project creation and validation, and Integration Card workflows.",
			},
		})
	},
}

export default plugin
