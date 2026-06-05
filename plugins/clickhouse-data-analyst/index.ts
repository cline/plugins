import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "data-analyst",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin

