import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "alloydb-omni",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
