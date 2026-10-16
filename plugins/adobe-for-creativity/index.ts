import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "adobe-for-creativity",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "Adobe for creativity",
			transport: {
				type: "streamableHttp",
				url: "https://adobe-creativity.adobe.io/mcp",
			},
		})

	},
}

export default plugin
