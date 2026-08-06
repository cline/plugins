import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "sap-fiori",
	manifest: {
		capabilities: ["skills", "mcp"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "fiori-mcp",
			transport: {
				type: "stdio",
				command: "npx",
				args: [
					"--yes",
					"@sap-ux/fiori-mcp-server@1.2.0",
					"fiori-mcp",
				],
			},
			metadata: {
				description:
					"SAP Fiori tools for discovering Fiori apps, searching Fiori/UI5 documentation, and creating or modifying Fiori elements applications.",
			},
		})
	},
}

export default plugin
