import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "runway-api",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
