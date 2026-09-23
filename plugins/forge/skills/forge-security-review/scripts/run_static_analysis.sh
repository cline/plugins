#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FSRT_BIN="${SCRIPT_DIR}/fsrt"
ARTIFACT_BASE_URL='https://github.com/atlassian-labs/FSRT/releases/download/forge-security-review-test'
ARTIFACT_URL=''
IS_WINDOWS=0

set_artifact_url_for_platform() {
	local os arch target
	os="$(uname -s 2>/dev/null || echo unknown)"
	arch="$(uname -m 2>/dev/null || echo unknown)"

	case "${os}" in
	Darwin)
		case "${arch}" in
		arm64|aarch64)
			target='aarch64-apple-darwin'
			;;
		*)
			echo "Error: unsupported macOS architecture '${arch}'. Supported: arm64/aarch64." >&2
			exit 1
			;;
		esac
		;;
	Linux)
		case "${arch}" in
		aarch64|arm64)
			target='aarch64-unknown-linux-gnu'
			;;
		x86_64|amd64)
			target='x86_64-unknown-linux-gnu'
			;;
		*)
			echo "Error: unsupported Linux architecture '${arch}'. Supported: x86_64/amd64, arm64/aarch64." >&2
			exit 1
			;;
		esac
		;;
	MINGW*|MSYS*|CYGWIN*|Windows_NT)
		case "${arch}" in
		x86_64|amd64)
			target='x86_64-pc-windows-msvc'
			IS_WINDOWS=1
			FSRT_BIN="${SCRIPT_DIR}/fsrt.exe"
			;;
		*)
			echo "Error: unsupported Windows architecture '${arch}'. Supported: x86_64/amd64." >&2
			exit 1
			;;
		esac
		;;
	*)
		echo "Error: unsupported OS '${os}'. Supported OSes: macOS (arm64), Linux (x86_64/arm64), Windows (x86_64)." >&2
		exit 1
		;;
	esac

	ARTIFACT_URL="${ARTIFACT_BASE_URL}/fsrt-tkallady-release-workflow-${target}.zip"
}

usage() {
	echo "Usage: $0 <forge-project-root-directory>" >&2
}

require_cmd() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Error: required command '$1' is not installed." >&2
		exit 1
	fi
}

download_fsrt() {
	require_cmd curl
	require_cmd unzip
	require_cmd tar

	local tmp_dir
	tmp_dir="$(mktemp -d)"
	trap 'rm -rf "${tmp_dir}"' RETURN

	local zip_path
	zip_path="${tmp_dir}/fsrt-artifact.zip"

	echo "fsrt not found in scripts directory. Downloading artifact for this platform..."
	echo "Artifact URL: ${ARTIFACT_URL}"
	curl -fL "${ARTIFACT_URL}" -o "${zip_path}"

	unzip -q "${zip_path}" -d "${tmp_dir}/unzipped"

	local search_root
	search_root="${tmp_dir}/unzipped"

	# Some artifacts unpack into a single top-level directory.
	# Traverse into it first to locate the fsrt binary reliably.
	local top_level_dir
	top_level_dir="$(find "${tmp_dir}/unzipped" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
	if [[ -n "${top_level_dir}" ]]; then
		search_root="${top_level_dir}"
	fi

	echo "Contents of ${tmp_dir}/unzipped:"
	ls -la "${tmp_dir}/unzipped"
	echo "Searching for fsrt under: ${search_root}"
	ls -la "${search_root}"

	local extracted_fsrt
	extracted_fsrt="$(find "${search_root}" -type f \( -name fsrt -o -name fsrt.exe \) | head -n 1)"

	# Some artifacts are packaged as zip -> tar.gz -> fsrt.
	if [[ -z "${extracted_fsrt}" ]]; then
		local nested_tar
		nested_tar="$(find "${search_root}" -type f \( -name '*.tar.gz' -o -name '*.tgz' \) | head -n 1)"

		if [[ -n "${nested_tar}" ]]; then
			local tar_extract_dir
			tar_extract_dir="${tmp_dir}/tar-extracted"
			mkdir -p "${tar_extract_dir}"
			echo "Found nested archive: ${nested_tar}"
			tar -xzf "${nested_tar}" -C "${tar_extract_dir}"
			echo "Contents of ${tar_extract_dir}:"
			ls -la "${tar_extract_dir}"
			extracted_fsrt="$(find "${tar_extract_dir}" -type f \( -name fsrt -o -name fsrt.exe \) | head -n 1)"
		fi
	fi

	if [[ -z "${extracted_fsrt}" ]]; then
		echo "Error: could not find 'fsrt' or 'fsrt.exe' in downloaded artifact." >&2
		exit 1
	fi

	cp "${extracted_fsrt}" "${FSRT_BIN}"
	chmod +x "${FSRT_BIN}"
	echo "Installed fsrt to ${FSRT_BIN}"
}

is_fsrt_installed() {
	if [[ "${IS_WINDOWS}" -eq 1 ]]; then
		[[ -f "${FSRT_BIN}" ]]
	else
		[[ -x "${FSRT_BIN}" ]]
	fi
}

if [[ "$#" -ne 1 ]]; then
	usage
	exit 1
fi

TARGET_DIR="$1"

set_artifact_url_for_platform

if [[ ! -d "${TARGET_DIR}" ]]; then
	echo "Error: target directory does not exist: ${TARGET_DIR}" >&2
	usage
	exit 1
fi

if [[ ! -f "${TARGET_DIR}/manifest.yml" ]]; then
	echo "Error: no manifest.yml found in target directory: ${TARGET_DIR}" >&2
	echo "Hint: pass the Forge project root directory (the directory containing manifest.yml)." >&2
	exit 1
fi

if ! is_fsrt_installed; then
	download_fsrt
fi

echo "Running fsrt against ${TARGET_DIR}"
"${FSRT_BIN}" "${TARGET_DIR}"
