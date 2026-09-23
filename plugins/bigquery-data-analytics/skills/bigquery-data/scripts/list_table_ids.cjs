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

const toolName = "list_table_ids";
const configArgs = ["--prebuilt", "bigquery"];

const OPTIONAL_VARS_TO_OMIT_IF_EMPTY = [
    'BIGQUERY_LOCATION',
    'BIGQUERY_USE_CLIENT_OAUTH',
    'BIGQUERY_SCOPES',
    'BIGQUERY_MAX_QUERY_RESULT_ROWS',
    'BIGQUERY_IMPERSONATE_SERVICE_ACCOUNT',
];


function prepareEnvironment() {
	const env = { ...process.env };
	const userAgent = "skills-cline";

	OPTIONAL_VARS_TO_OMIT_IF_EMPTY.forEach(varName => {
		if (env[varName] === "") {
			delete env[varName];
		}
	});

	return { env, userAgent };
}

function main() {
    const { env, userAgent } = prepareEnvironment();
    const args = process.argv.slice(2);
		
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
