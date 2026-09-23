import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "workos",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
