import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "hermoso",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
