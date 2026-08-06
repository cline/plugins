# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""
generate_form_adv_artifact.py -- combine Form ADV JSON data with the HTML template.

Usage:
    uv run generate_form_adv_artifact.py --data /tmp/form_adv_data.json \
                                         --title "Acme Capital -- Form ADV 2024" \
                                         --out /tmp/FormADV_AcmeCapital_2024.html
"""

import argparse
import json
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate Form ADV interactive HTML artifact from a JSON data file."
    )
    parser.add_argument("--data", required=True, help="Path to the JSON data file")
    parser.add_argument("--title", required=True, help="Page title, e.g. 'Acme Capital -- Form ADV 2024'")
    parser.add_argument("--out", required=True, help="Output HTML file path")
    args = parser.parse_args()

    script_dir = Path(__file__).parent

    template_path = script_dir / "artifact-template.html"
    if not template_path.exists():
        print(f"ERROR: Template not found at {template_path}", file=sys.stderr)
        sys.exit(1)
    template = template_path.read_text(encoding="utf-8")

    data_path = Path(args.data)
    if not data_path.exists():
        print(f"ERROR: Data file not found at {data_path}", file=sys.stderr)
        sys.exit(1)
    data = json.loads(data_path.read_text(encoding="utf-8"))

    # Compact JSON; escape </ so </script> in values can't break out of the script block
    data_json = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")

    html = template.replace("{{TITLE}}", args.title).replace("{{DATA}}", data_json)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    print(f"Artifact written to {out_path}")


if __name__ == "__main__":
    main()
