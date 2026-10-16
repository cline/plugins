import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "exa",
	manifest: {
		capabilities: ["mcp", "skills"],
	},
	setup(api) {
		api.registerMcpServer({
			name: "exa",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.exa.ai/mcp?client=cline-plugin&tools=web_search_exa,web_fetch_exa",
			},
		})
	},
}

export default plugin
