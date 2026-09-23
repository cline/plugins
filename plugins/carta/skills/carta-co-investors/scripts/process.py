# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
process.py -- assemble co-investor JSON from the two server-aggregated DWH responses.

Reads the NDJSON responses written by the skill's two DWH MCP calls (both
issued with ``format="ndjson"``) and produces the JSON data file consumed
by generate_artifact.py.

Why two queries (not four):
- Query S returns the purchaser->companies summary with SPA coverage counts
  embedded, so coverage no longer needs its own round-trip.
- Query R returns one row per portfolio company with all rounds + top-N
  investors per round nested as a compact JSON string (short keys n/t/p/a/f),
  produced via Snowflake's TO_JSON(ARRAY_AGG(OBJECT_CONSTRUCT(...))). The
  per-round investor cap (RN<=15 baseline, lower for firms whose payload
  exceeds the MCP response cap) is documented in SKILL.md.

NDJSON wire shape (carta-mcp >= PR #367, after #366 paginated cap):

    total_rows: 33 | offset: 0 | limit: 1000 | format: ndjson
    <blank line>
    {"COL1": val, "COL2": val, ...}
    {"COL1": val, "COL2": val, ...}
    ...

Types are preserved: integers stay integers, NULL is JSON ``null`` (not
the string ``"NULL"``), booleans round-trip, decimal.Decimal lands as a
JSON number, and Snowflake ARRAYs land as JSON arrays. This eliminates
the bracket-depth markdown parser and the JSON-string ARRAY_AGG decode
that the previous markdown-based version needed.

Usage:
    uv run process.py \\
        --summary "$QUERY_S_BLOB" [--summary "$QUERY_S_BLOB_2" ...] \\
        --rounds  "$QUERY_R_BLOB" [--rounds  "$QUERY_R_BLOB_2" ...] \\
        --firm-name "Acme Ventures" \\
        --firm-carta-id 12345 \\
        --canonical /path/to/canonical-investors.json \\
        --out "$WORK/carta-co-investors-data.json"

Both --summary and --rounds accept multiple values -- one per page when a
query paginates (large firms exceed the single-response row cap). Rows are
concatenated across all pages. The inputs are the ndjson blob files the MCP
client auto-persisted, resolved to a readable path by the skill (see SKILL.md
Step A1 `resolve_blob`); they are NOT files the skill wrote.

The script is stdlib-only by design -- no PyPI fetches happen at runtime,
so it works inside network-isolated sandboxes (e.g. Cowork) where uv
cannot reach github.com or PyPI. The canonical-investor groupings ship
as JSON next to the script; see canonical-investors.json.
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# NDJSON parser -- the ONLY response format this skill consumes.
#
# carta-mcp's dwh:execute:query is always called with format="ndjson". The
# server returns the body as a BlobResourceContents that the MCP client
# auto-persists to disk; the skill resolves that path (directly in Claude
# Code CLI, or via the bind-mounted sandbox path in Cowork -- see SKILL.md
# Step A1 `resolve_blob`) and hands the file to this script.
#
# Wire shape:
#     total_rows: 33 | offset: 0 | limit: 1000 | format: ndjson
#     <blank line>
#     {"COL1": val, "COL2": val, ...}
#     {"COL1": val, "COL2": val, ...}
#
# NDJSON preserves native types: integers stay integers, NULL is JSON
# ``null`` (not the string ``"NULL"``), booleans round-trip, and Snowflake
# ARRAYs land as JSON arrays. The markdown table parser the earlier version
# carried (a bracket-depth char-walker that repeatedly broke on wrapped
# JSON cells, trailing pipes, and the pagination header) is gone -- there is
# one format and one code path.
# ---------------------------------------------------------------------------

_METADATA_HEADER_PREFIX = "total_rows:"


def parse_ndjson(text: str) -> list[dict[str, Any]]:
    """Parse a carta-mcp NDJSON response into a list of row dicts.

    Format:
      Line 1:  ``total_rows: N | offset: O | limit: L | format: ndjson``
               (with an optional ``next_offset`` token when more pages
               remain).
      Line 2:  blank.
      Line 3+: one compact JSON object per row.

    The metadata header is recognised by its prefix and split off via the
    first blank-line separator. A trailing ``(Result truncated...)`` line
    (legacy producers, pre-#366) is ignored.

    A single malformed line is logged and skipped rather than aborting
    the whole pipeline -- earlier well-formed rows are still useful when
    a transport-layer mid-line truncation strikes.
    """
    rows: list[dict[str, Any]] = []
    if not text:
        return rows

    body = text
    stripped = text.lstrip()
    if stripped:
        first_line = stripped.splitlines()[0]
        if first_line.startswith(_METADATA_HEADER_PREFIX) and "\n\n" in text:
            _header, body = text.split("\n\n", 1)

    for line in body.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("(Result truncated"):
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as e:
            print(f"WARN: skipping malformed NDJSON line: {e}", file=sys.stderr)
            continue
        if isinstance(obj, dict):
            rows.append(obj)
    return rows


# ---------------------------------------------------------------------------
# Value coercion
# ---------------------------------------------------------------------------

_NULL_STRS = {"", "null", "NULL", "Null", "--", "-"}


def _val(v: str) -> str | None:
    v = v.strip()
    return None if v in _NULL_STRS else v


def _to_int(v: Any) -> int | None:
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    if s in _NULL_STRS:
        return None
    try:
        return int(float(s))
    except (TypeError, ValueError):
        return None


def _to_float(v: Any) -> float | None:
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    if s in _NULL_STRS:
        return None
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def _to_bool(v: Any) -> bool:
    if isinstance(v, bool):
        return v
    if v is None:
        return False
    return str(v).strip().lower() in {"true", "1", "yes", "t"}


def _coerce_array(cell: Any) -> list[str]:
    """Decode a Snowflake ARRAY_AGG value from an NDJSON row.

    With NDJSON, the value typically arrives already as a Python ``list``
    via the snowflake connector -> ``json.dumps`` round-trip. Some
    connector configurations still hand back the array as a JSON-encoded
    string (Snowflake VARIANT/ARRAY representation varies by driver),
    so we accept both shapes.

    Returns an empty list if the value isn't a parseable JSON array or
    list. We intentionally do NOT fall back to comma-splitting on
    strings: company names routinely contain commas (e.g. "Sequoia
    Capital, LP") and a fallback split would silently corrupt counts.
    """
    if cell is None:
        return []
    if isinstance(cell, list):
        return [str(x) for x in cell]
    if isinstance(cell, str):
        s = cell.strip()
        if not (s.startswith("[") and s.endswith("]")):
            return []
        try:
            decoded = json.loads(s)
        except json.JSONDecodeError:
            return []
        if isinstance(decoded, list):
            return [str(x) for x in decoded]
    return []


# ---------------------------------------------------------------------------
# Canonical grouping (Python equivalent of the SQL CASE expression)
# ---------------------------------------------------------------------------

def _sql_ilike(text: str, pattern: str) -> bool:
    parts = []
    for char in pattern:
        if char == "%":
            parts.append(".*")
        elif char == "_":
            parts.append(".")
        else:
            parts.append(re.escape(char))
    return bool(re.fullmatch("".join(parts), text, re.IGNORECASE))


_SUFFIX_RE = re.compile(
    r",\s*(L\.P\.|LP|LLC|Inc\.|Ltd\.|L\.L\.C\.|Corp\.|Corporation)\.?\s*$",
    re.IGNORECASE,
)
_ROMAN_RE = re.compile(
    r"\s+(VIII|VII|XII|XI|XIII|IX|IV|VI|V|III|II|I|X)$",
    re.IGNORECASE,
)
_DIGITS_RE = re.compile(r"\s+[0-9]+$")


def _apply_canonical(name: str, groupings: list[dict]) -> str:
    for group in groupings:
        if any(_sql_ilike(name, p) for p in group["patterns"]):
            return group["canonical"]
    cleaned = _SUFFIX_RE.sub("", name)
    cleaned = _ROMAN_RE.sub("", cleaned)
    cleaned = _DIGITS_RE.sub("", cleaned)
    return cleaned.strip() or name


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------

def build_co_investors(summary_rows: list[dict], canonical_path: Path) -> list[dict]:
    """Load canonical groupings from JSON (or legacy YAML if the file
    extension is .yaml/.yml -- supported for one release while callers
    migrate to the JSON file)."""
    suffix = canonical_path.suffix.lower()
    if suffix in {".yaml", ".yml"}:
        # Legacy path -- try pyyaml only if it happens to be available.
        # The new SKILL.md no longer passes YAML, so this branch is just
        # backwards-compat for in-flight invocations during the migration.
        try:
            import yaml  # type: ignore
        except ImportError:
            raise SystemExit(
                f"ERROR: canonical file '{canonical_path}' is YAML but pyyaml "
                "is not installed. Pass canonical-investors.json instead "
                "(stdlib-only path) or run via `uv run --with pyyaml`."
            )
        with open(canonical_path, encoding="utf-8") as f:
            groupings = yaml.safe_load(f)["groupings"]
    else:
        with open(canonical_path, encoding="utf-8") as f:
            groupings = json.load(f)["groupings"]

    by_canonical: dict[str, dict] = {}
    for row in summary_rows:
        purchaser = (row.get("PURCHASER_NAME") or "").strip()
        if not purchaser:
            continue
        canonical = _apply_canonical(purchaser, groupings)
        entry = by_canonical.setdefault(canonical, {
            "name": canonical,
            "rawNames": [],
            "entityType": row.get("ENTITY_TYPE") or "--",
            "companies": set(),
        })
        if purchaser not in entry["rawNames"]:
            entry["rawNames"].append(purchaser)
        entry["companies"].update(_coerce_array(row.get("COMPANIES")))

    result = []
    for entry in by_canonical.values():
        companies = sorted(entry["companies"])
        result.append({
            "name": entry["name"],
            "rawNames": sorted(entry["rawNames"]),
            "companyCount": len(companies),
            "entityType": entry["entityType"] or "--",
            "companies": companies,
        })
    return sorted(result, key=lambda x: x["companyCount"], reverse=True)[:50]


def _normalize_closing_date(val: Any) -> str:
    if val is None:
        return "--"
    s = str(val).strip()
    if not s or s in _NULL_STRS:
        return "--"
    return s[:10]


def _share_class_rank(share_class: str) -> int:
    """Rank share classes by typical funding-stage progression.

    Lower rank = earlier stage. Used to order rounds when closing dates are
    missing -- preseed -> seed -> series A -> A-1 -> B -> ... -> common/unknown last.
    """
    if not share_class:
        return 9999
    sc = share_class.lower()
    if "pre-seed" in sc or "preseed" in sc or "pre seed" in sc:
        return 0
    if "seed" in sc:
        return 100
    m = re.search(r"series\s+([a-z])(?:[\-\s]?(\d+))?", sc)
    if m:
        letter = m.group(1).upper()
        sub = int(m.group(2) or 0)
        return 1000 + (ord(letter) - ord("A")) * 10 + sub
    if "common" in sc:
        return 9000
    return 9999


def build_company_rounds(rounds_rows: list[dict]) -> dict[str, list]:
    """Decode Query R: each row has ISSUER_NAME and ROUNDS_JSON (a JSON string).

    The JSON uses short keys to minimise payload:
      Round: sc=shareClass, cd=closingDate, inv=investors
      Investor: n=name, t=entityType, p=pctOfRound, a=amountPaid, f=isFirm
    """
    out: dict[str, list] = {}
    for row in rounds_rows:
        company = (row.get("ISSUER_NAME") or "").strip()
        if not company:
            continue
        rounds_raw = row.get("ROUNDS_JSON") or ""
        if not rounds_raw or rounds_raw.strip() in _NULL_STRS:
            continue
        try:
            rounds_data = json.loads(rounds_raw)
        except json.JSONDecodeError as e:
            print(f"WARN: could not parse ROUNDS_JSON for {company}: {e}", file=sys.stderr)
            continue

        rounds_list = []
        for r in rounds_data:
            investors = []
            for inv in r.get("inv") or []:
                investors.append({
                    "name": inv.get("n") or "",
                    "entityType": inv.get("t") or "--",
                    "amountPaid": _to_float(inv.get("a")),
                    "pctOfRound": _to_float(inv.get("p")),
                    "isFirm": _to_bool(inv.get("f")),
                })
            rounds_list.append({
                "shareClass": r.get("sc") or "--",
                "closingDate": _normalize_closing_date(r.get("cd")),
                "investors": investors,
            })

        dated = [r for r in rounds_list if r["closingDate"] != "--"]
        undated = [r for r in rounds_list if r["closingDate"] == "--"]
        dated.sort(key=lambda r: r["closingDate"], reverse=True)
        undated.sort(key=lambda r: _share_class_rank(r["shareClass"]))
        out[company] = dated + undated
    return out


def _coverage_from_summary(summary_rows: list[dict]) -> tuple[int, int]:
    """Pull the SPA/total company coverage counts off the summary rows.

    The coverage CTE emits identical SPA_COMPANIES / TOTAL_COMPANIES on
    *every* row (they're scalar subqueries). We scan for the first row
    that carries a non-null value rather than blindly trusting row[0] --
    so concatenated pagination pages, or a page whose values came back
    null, can't zero out the headline coverage number.
    """
    spa = total = 0
    for row in summary_rows:
        if not spa:
            spa = _to_int(row.get("SPA_COMPANIES")) or 0
        if not total:
            total = _to_int(row.get("TOTAL_COMPANIES")) or 0
        if spa and total:
            break
    return spa, total


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Assemble co-investor JSON from the two DWH NDJSON responses."
    )
    parser.add_argument(
        "--summary", required=True, action="append",
        help="NDJSON blob file from Query S (resolved readable path). May be "
             "repeated, one per page, when Query S is paginated for a large "
             "firm (parser concatenates rows across all files).",
    )
    parser.add_argument(
        "--rounds", required=True, action="append",
        help="NDJSON blob file from Query R (resolved readable path). May be "
             "repeated, one per page, when Query R is paginated "
             "(parser concatenates rows across all files).",
    )
    parser.add_argument("--firm-name", required=True)
    parser.add_argument("--firm-carta-id", required=True)
    # --canonical accepts a JSON file (preferred -- stdlib-only, no
    # PyPI fetch). --canonical-yaml is kept as a deprecated alias for
    # one release so a Mode A run launched by the previous SKILL.md
    # version doesn't crash mid-flight.
    parser.add_argument(
        "--canonical",
        help="Path to canonical-investors.json (stdlib-only path).",
    )
    parser.add_argument(
        "--canonical-yaml",
        dest="canonical_legacy",
        help="DEPRECATED. Path to canonical-investors.yaml. Kept for "
             "backwards compat during the JSON migration.",
    )
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    print("Parsing NDJSON responses...", flush=True)
    summary_rows: list[dict[str, Any]] = []
    for path in args.summary:
        summary_rows.extend(parse_ndjson(Path(path).read_text(encoding="utf-8")))
    rounds_rows: list[dict[str, Any]] = []
    for path in args.rounds:
        rounds_rows.extend(parse_ndjson(Path(path).read_text(encoding="utf-8")))
    print(
        f"  Query S: {len(summary_rows)} purchaser rows "
        f"across {len(args.summary)} page(s)",
        flush=True,
    )
    print(
        f"  Query R: {len(rounds_rows)} company rows "
        f"across {len(args.rounds)} page(s)",
        flush=True,
    )

    if not summary_rows:
        print("ERROR: Query S returned no rows.", file=sys.stderr)
        sys.exit(1)

    spa_coverage, total_companies = _coverage_from_summary(summary_rows)

    print("Applying canonical groupings...", flush=True)
    canonical_path = args.canonical or args.canonical_legacy
    if not canonical_path:
        print(
            "ERROR: must pass --canonical <canonical-investors.json>.",
            file=sys.stderr,
        )
        sys.exit(2)
    co_investors = build_co_investors(summary_rows, Path(canonical_path))
    print(f"  {len(co_investors)} canonical co-investors", flush=True)

    print("Decoding per-company rounds...", flush=True)
    company_rounds = build_company_rounds(rounds_rows)
    print(f"  {len(company_rounds)} companies with round data", flush=True)

    groupings = [
        {"canonical": inv["name"], "merged": inv["rawNames"]}
        for inv in co_investors
        if len(inv["rawNames"]) > 1
    ]

    now = datetime.now(timezone.utc)
    generated_at = f"{now.strftime('%b')} {now.day}, {now.year}"

    data = {
        "meta": {
            "firmName": args.firm_name,
            "firmCartaId": args.firm_carta_id,
            "spaCoverage": spa_coverage,
            "totalCompanies": total_companies,
            "groupings": groupings,
            "generatedAt": generated_at,
        },
        "coInvestors": co_investors,
        "companyRounds": company_rounds,
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"Done -- {out_path} ({size_kb:.1f} KB)", flush=True)


if __name__ == "__main__":
    main()
