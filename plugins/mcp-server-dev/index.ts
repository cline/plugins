import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "mcp-server-dev",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
