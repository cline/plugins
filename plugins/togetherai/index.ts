import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "togetherai",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
