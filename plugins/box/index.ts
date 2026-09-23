import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "box",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
