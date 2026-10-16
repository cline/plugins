import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "duende",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
