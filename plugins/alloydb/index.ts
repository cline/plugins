import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "alloydb",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
