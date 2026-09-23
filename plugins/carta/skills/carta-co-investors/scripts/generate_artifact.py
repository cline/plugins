# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
generate_artifact.py -- combine a JSON data file with an HTML template.

Usage:
    uv run generate_artifact.py --data "$WORKSPACE/carta-co-investors-data.json" \
                                --title "Acme Ventures -- Co-Investor Analysis" \
                                --out "$WORKSPACE/carta-co-investors.html" \
                                [--template co-investors|doc-intelligence]
"""

import argparse
import json
import sys
from pathlib import Path

TEMPLATES = {
    "co-investors": "artifact-template.html",
    "doc-intelligence": "doc-intelligence-template.html",
}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a Carta HTML artifact from a JSON data file."
    )
    parser.add_argument("--data", required=True, help="Path to the JSON data file")
    parser.add_argument("--title", required=True, help="Page title")
    parser.add_argument("--out", required=True, help="Output HTML file path")
    parser.add_argument(
        "--template",
        default="co-investors",
        choices=list(TEMPLATES.keys()),
        help="Which HTML template to use (default: co-investors)",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).parent

    # Resolve template file
    template_file = TEMPLATES[args.template]
    template_path = script_dir / template_file
    if not template_path.exists():
        print(f"ERROR: Template not found at {template_path}", file=sys.stderr)
        sys.exit(1)
    template = template_path.read_text(encoding="utf-8")

    # Read JSON data
    data_path = Path(args.data)
    if not data_path.exists():
        print(f"ERROR: Data file not found at {data_path}", file=sys.stderr)
        sys.exit(1)
    data = json.loads(data_path.read_text(encoding="utf-8"))

    # Serialize data compact (no indent) for embedding.
    # Escape </ to prevent </script> in data values from breaking out of the script block.
    data_json = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")

    # Substitute placeholders
    html = template.replace("{{TITLE}}", args.title).replace("{{DATA}}", data_json)

    # Write output
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    print(f"Artifact written to {out_path}")


if __name__ == "__main__":
    main()
