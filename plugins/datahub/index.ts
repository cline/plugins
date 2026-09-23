import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "datahub",
	manifest: {
		capabilities: ["skills"],
	},
	setup() {},
}

export default plugin
