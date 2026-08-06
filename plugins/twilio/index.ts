import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "twilio",
	manifest: {
		capabilities: ["mcp", "skills"],
	},
	setup(api) {
		api.registerMcpServer({
			name: "twilio-docs",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.twilio.com/docs",
			},
		})
	},
}

export default plugin
