import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "atomic-agents",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
