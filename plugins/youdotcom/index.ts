import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "youdotcom",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
