import type { AgentPlugin } from "@cline/sdk"

const ASTRO_AIRFLOW_MCP_PACKAGE = "astro-airflow-mcp==0.8.2"

const AIRFLOW_ENV_KEYS = [
	"AIRFLOW_API_URL",
	"AIRFLOW_USERNAME",
	"AIRFLOW_PASSWORD",
	"AIRFLOW_AUTH_TOKEN",
	"AIRFLOW_VERIFY_SSL",
	"AIRFLOW_CA_CERT",
	"AF_READ_ONLY",
] as const

function resolveAirflowEnv(): Record<string, string> | undefined {
	const env: Record<string, string> = {}
	for (const key of AIRFLOW_ENV_KEYS) {
		const value = process.env[key]
		if (value) {
			env[key] = value
		}
	}
	return Object.keys(env).length > 0 ? env : undefined
}

const plugin: AgentPlugin = {
	name: "astronomer-data",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "airflow",
			transport: {
				type: "stdio",
				command: "uvx",
				args: [ASTRO_AIRFLOW_MCP_PACKAGE, "--transport", "stdio"],
				env: resolveAirflowEnv(),
			},
		})
	},
}

export default plugin
