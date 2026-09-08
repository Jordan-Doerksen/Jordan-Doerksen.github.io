"""Extract the desk's open/fixed findings for tier 2 (DECISIONS.md D-A24).

Stdlib only. Parses trading-desk/docs/FINDINGS-OPEN.md into data/findings.json.

D-A24 makes the open-findings section load-bearing: the most credible proof that
something holds up is showing precisely where it does not. This produces the
aggregate the page leads with - severity mix, open vs fixed, and how each defect
was discovered - so the page can open with a chart rather than prose.

PRIVACY. The desk is a private repo. This extracts only: title, severity, status,
date, discovery method, and the file:line reference. It deliberately does NOT
extract the "How it fails" or "Suggested fix" prose, or the verifier's reasoning
block, because those carry internal implementation detail. Whether even the
titles may be published is an owner decision, not this script's - it writes a
local data file and nothing more.

Usage:
    python scripts/build_findings.py
    python scripts/build_findings.py --check
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = 1
REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "scripts" / "evidence_sources.json"
OUT_PATH = REPO_ROOT / "data" / "findings.json"

# "## 1. Title of the finding"
NUMBERED = re.compile(r"^##\s+(\d+)\.\s+(.+?)\s*$")
# "## 2026-08-30 — F23 FIXED. Found by asking why ..."
DATED = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})\s*[—-]\s*(.+?)\s*$")

FIELD = {
    "severity": re.compile(r"^-\s+\*\*Severity:\*\*\s*`?([^`\s]+)`?", re.I),
    "where": re.compile(r"^-\s+\*\*Where:\*\*\s*`?([^`]+)`?", re.I),
    "foundBy": re.compile(r"^-\s+\*\*Found by:\*\*\s*`?([^`]+?)`?\s*$", re.I),
}

STATUS_WORDS = re.compile(r"\b(FIXED|CLOSED|OPEN|WONTFIX)\b")


def git(repo, *args):
    try:
        r = subprocess.run(["git", "-C", str(repo)] + list(args),
                           capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def main():
    if "--check" in sys.argv[1:]:
        if not OUT_PATH.exists():
            print("stale: %s missing" % OUT_PATH)
            return 1
        json.loads(OUT_PATH.read_text(encoding="utf-8"))
        print("ok: %s parses" % OUT_PATH)
        return 0

    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    root = Path(cfg["projectsRoot"])
    desk = next(s for s in cfg["sources"] if s["id"] == "trading-desk")
    repo = (root / desk["path"]).resolve()
    src = repo / "docs" / "FINDINGS-OPEN.md"

    if not src.is_file():
        print("ERROR: %s not found - nothing written" % src)
        return 1

    lines = src.read_text(encoding="utf-8", errors="ignore").splitlines()

    findings, cur = [], None
    for line in lines:
        m_num, m_date = NUMBERED.match(line), DATED.match(line)
        if m_num or m_date:
            if cur:
                findings.append(cur)
            if m_num:
                cur = {"id": m_num.group(1), "title": m_num.group(2),
                       "date": None, "status": "open"}
            else:
                title = m_date.group(2)
                st = STATUS_WORDS.search(title)
                cur = {"id": None, "title": title, "date": m_date.group(1),
                       "status": (st.group(1).lower() if st else "open")}
            cur.update({"severity": None, "where": None, "foundBy": None})
            continue
        if not cur:
            continue
        for key, rx in FIELD.items():
            m = rx.match(line)
            if m and not cur.get(key):
                cur[key] = m.group(1).strip().rstrip("`").strip()
    if cur:
        findings.append(cur)

    # A finding whose title announces FIXED is fixed even in the numbered form.
    for f in findings:
        st = STATUS_WORDS.search(f["title"])
        if st and st.group(1).lower() in ("fixed", "closed"):
            f["status"] = "fixed"

    def tally(key):
        out = {}
        for f in findings:
            out[f.get(key) or "unrecorded"] = out.get(f.get(key) or "unrecorded", 0) + 1
        return dict(sorted(out.items(), key=lambda kv: -kv[1]))

    payload = {
        "schema": SCHEMA,
        "_": "GENERATED - do not hand-edit. Rebuild with scripts/build_findings.py. "
             "Titles, severity, status, discovery method and file:line only. The 'how it "
             "fails', 'suggested fix' and verifier prose are deliberately NOT extracted: "
             "the source repo is private (D-A24, and the public-site privacy rules).",
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {"repo": "trading-desk", "file": "docs/FINDINGS-OPEN.md",
                   "commit": git(repo, "rev-parse", "--short", "HEAD")},
        "counts": {
            "total": len(findings),
            "open": sum(1 for f in findings if f["status"] == "open"),
            "fixed": sum(1 for f in findings if f["status"] in ("fixed", "closed")),
            "bySeverity": tally("severity"),
            "byFoundBy": tally("foundBy"),
        },
        "findings": findings,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n",
                        encoding="utf-8", newline="\n")

    c = payload["counts"]
    print("findings: %d total, %d open, %d fixed" % (c["total"], c["open"], c["fixed"]))
    print("severity: %s" % json.dumps(c["bySeverity"]))
    print("found by: %s" % json.dumps(c["byFoundBy"]))
    print("wrote %s" % OUT_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
