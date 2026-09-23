import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "cloud-sql-sqlserver",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
