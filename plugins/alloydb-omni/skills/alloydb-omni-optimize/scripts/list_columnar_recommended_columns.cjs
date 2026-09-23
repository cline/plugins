#!/usr/bin/env node

// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { spawn } = require('child_process');
const os = require('os');

const toolName = "list_columnar_recommended_columns";
const configArgs = ["--prebuilt", "alloydb-omni"];

const OPTIONAL_VARS_TO_OMIT_IF_EMPTY = [
    'ALLOYDB_OMNI_HOST',
    'ALLOYDB_OMNI_PORT',
    'ALLOYDB_OMNI_PASSWORD',
    'ALLOYDB_OMNI_QUERY_PARAMS',
];

const ENV_ALLOWLIST = [
    'PATH',
    'Path',
    'HOME',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'TEMP',
    'TMP',
    'TMPDIR',
    'SystemRoot',
    'windir',
    'ComSpec',
    'PATHEXT',
    'npm_config_cache',
    'npm_config_prefix',
    'npm_config_userconfig',
    'NPM_CONFIG_CACHE',
    'NPM_CONFIG_PREFIX',
    'NPM_CONFIG_USERCONFIG',
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'no_proxy',
    'NODE_EXTRA_CA_CERTS',
];

function prepareEnvironment() {
	const env = {};
	for (const name of ENV_ALLOWLIST) {
		if (process.env[name] !== undefined) {
			env[name] = process.env[name];
		}
	}
	for (const [name, value] of Object.entries(process.env)) {
		if (name.startsWith('ALLOYDB_OMNI_')) {
			env[name] = value;
		}
	}
	let userAgent = "skills-cline";

	OPTIONAL_VARS_TO_OMIT_IF_EMPTY.forEach(varName => {
		if (env[varName] === '') {
			delete env[varName];
		}
	});

	return { env, userAgent };
}

function assertAllowedSql(args) {
	if (toolName !== "execute_sql") {
		return;
	}
	let sql = "";
	for (const arg of args) {
		try {
			const parsed = JSON.parse(arg);
			if (parsed && typeof parsed.sql === "string") {
				sql = parsed.sql;
				break;
			}
		} catch {
			// Ignore non-JSON arguments; Toolbox will validate them.
		}
	}
	if (!sql.trim()) {
		return;
	}
	const readOnlyPattern = /^\s*(select|with|show|explain)\b/i;
	if (readOnlyPattern.test(sql)) {
		return;
	}
	if (process.env.CLINE_ALLOW_ALLOYDB_OMNI_MUTATING_SQL === "1") {
		return;
	}
	console.error("Refusing to execute non-read-only SQL without CLINE_ALLOW_ALLOYDB_OMNI_MUTATING_SQL=1 for this command.");
	process.exit(2);
}

function main() {
    const { env, userAgent } = prepareEnvironment();
    const args = process.argv.slice(2);
    assertAllowedSql(args);
		
		const command = os.platform() === 'win32' ? 'npx.cmd' : 'npx';
		const processedArgs = os.platform() === 'win32' ? args.map(arg => arg.includes('"') ? '"' + arg.replace(/"/g, '""') + '"' : arg) : args;
		const npxArgs = ["--yes", "@toolbox-sdk/server@1.1.0", "--log-level", "error", ...configArgs, "invoke", toolName, "--user-agent-metadata", userAgent, ...processedArgs];

		const child = spawn(command, npxArgs, { shell: os.platform() === 'win32', stdio: 'inherit', env });
		

    child.on('close', (code) => {
        process.exit(code);
    });

    child.on('error', (err) => {
        console.error("Error executing toolbox:", err);
        process.exit(1);
    });
}

main();
