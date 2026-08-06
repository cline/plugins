import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "brightdata",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
