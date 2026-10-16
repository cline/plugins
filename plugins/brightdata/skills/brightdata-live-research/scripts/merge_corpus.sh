#!/usr/bin/env bash
# live-research -- merge, dedup, and quality-gate Discover angle files into one corpus.
#
# Each input is a `bdata discover -o` file: an object {status, results:[...]}.
# This flattens results across all files, dedups by URL, drops null/short/404/block-page
# content, and sorts by relevance_score -- the Step 4 pipeline, as a single command.
#
# Usage:
#   ./merge_corpus.sh angle_*.json > corpus.json
#   ./merge_corpus.sh -m 300 angle_*.json > corpus.json   # require >=300 chars of content
#   MIN_LEN=300 ./merge_corpus.sh angle_*.json            # same, via env; writes corpus.json
#
# Options:
#   -m <n>   minimum content length to keep (default 200; 0 = keep rows with null content too)
#   -o <f>   write to file instead of stdout
#
# Requires: jq
set -euo pipefail

MIN_LEN="${MIN_LEN:-200}"
OUT=""
while getopts "m:o:" opt; do
  case "$opt" in
    m) MIN_LEN="$OPTARG" ;;
    o) OUT="$OPTARG" ;;
    *) echo "usage: $0 [-m minlen] [-o out.json] <files...>" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

if [ "$#" -eq 0 ]; then
  echo "error: no input files (pass the discover angle JSON files)" >&2
  exit 2
fi
command -v jq >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 1; }

BLOCK='just a moment|captcha|access denied|cf-browser|page not found|post not found|404 not found'

result=$(jq -s --argjson min "$MIN_LEN" --arg block "$BLOCK" '
  [ .[].results[]? ]                                   # flatten results from every file
  | unique_by(.link)                                   # dedup by URL
  | map(select(
      ($min == 0)
      or (.content != null
          and (.content | length) >= $min
          and ((.content | ascii_downcase | test($block)) | not))
    ))
  | sort_by(-(.relevance_score // 0))                  # best first
' "$@")

kept=$(printf '%s' "$result" | jq 'length')
echo "merge_corpus: kept $kept sources (min content length: ${MIN_LEN})" >&2

if [ -n "$OUT" ]; then
  printf '%s\n' "$result" > "$OUT"
  echo "merge_corpus: wrote $OUT" >&2
else
  printf '%s\n' "$result"
fi
