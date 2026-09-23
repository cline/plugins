import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "cloud-sql-mysql",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
