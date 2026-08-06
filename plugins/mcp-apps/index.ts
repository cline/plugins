import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "mcp-apps",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
