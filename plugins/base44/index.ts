import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "base44",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
