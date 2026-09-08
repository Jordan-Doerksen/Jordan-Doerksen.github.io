"""Build the tier-2 evidence snapshot (DECISIONS.md D-A18/D-A19/D-A20).

Stdlib only. Reads scripts/evidence_sources.json, measures the real repos on
this machine, and writes a STAMPED snapshot to data/evidence.json for the tier-2
page to consume. The page is static, so the snapshot is the only honest way to
put a real number on it.

The honesty rules this file enforces, all from the contract:

  * Every figure carries its own `method`: "executed" (a suite actually ran and
    this is its reported result), "counted" (files or commits were counted), or
    "unavailable" (we could not look).
  * ABSENT IS NOT ZERO. A repo that is missing, or is not a git repo, is
    recorded as unavailable WITH A REASON. It never silently becomes a 0 that
    then gets summed into a total.
  * Inherited work is never claimed. Sources with "own": false are measured and
    reported, but excluded from every total, so the exclusion is visible.
  * Nothing is presented as live. The snapshot stamps when it ran and against
    which commit.

Usage:
    python scripts/build_evidence_snapshot.py            # count only (fast)
    python scripts/build_evidence_snapshot.py --run      # also execute configured suites (slow)
    python scripts/build_evidence_snapshot.py --check    # exit 0 if snapshot exists and parses, 1 otherwise

Logs to scripts/logs/evidence-<timestamp>.log. The log records what did NOT
happen as well as what did - a skipped source is a log line, not a silence
(the observability law).
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
LOG_DIR = REPO_ROOT / "scripts" / "logs"

# pytest reports "616 passed, 2 skipped in 44.45s". Each count is optional and
# the order varies, so each is matched on its own rather than as one line shape.
PYTEST_COUNT = re.compile(r"(\d+)\s+(passed|failed|skipped|error|errors|xfailed|xpassed)")

# pytest exit 5 means "no tests were collected" - a suite that selected nothing.
# Scoring that as success is the exact trap recorded in AI-Brain lessons.md
# (2026-09-04): score on the specific code, never on "not zero".
PYTEST_EXIT_OK = 0
PYTEST_EXIT_NO_TESTS = 5

SUITE_TIMEOUT_SEC = 900


class Log:
    """Timestamped log to both a file and the console."""

    def __init__(self, path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self.fh = path.open("w", encoding="utf-8", newline="\n")

    def __call__(self, level, msg):
        line = "%s  %-5s %s" % (datetime.now().isoformat(timespec="seconds"), level, msg)
        self.fh.write(line + "\n")
        self.fh.flush()
        print(line)

    def close(self):
        self.fh.close()


def git(repo, *args):
    """Run a git command in repo. Returns stripped stdout, or None if it fails."""
    try:
        out = subprocess.run(
            ["git", "-C", str(repo)] + list(args),
            capture_output=True, text=True, timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if out.returncode != 0:
        return None
    return out.stdout.strip()


def count_test_files(root, patterns, exclude):
    """Count files matching any pattern, skipping excluded directory names."""
    total = 0
    for pattern in patterns:
        for path in root.rglob(pattern):
            if any(part in exclude for part in path.parts):
                continue
            if path.is_file():
                total += 1
    return total


def run_suite(repo, suite, log):
    """Execute a configured suite and return its real reported result."""
    cmd = suite["cmd"]
    log("INFO", "  executing: %s" % " ".join(cmd))
    try:
        proc = subprocess.run(
            cmd, cwd=str(repo), capture_output=True, text=True, timeout=SUITE_TIMEOUT_SEC
        )
    except subprocess.TimeoutExpired:
        log("ERROR", "  suite TIMED OUT after %ds - recorded as unavailable" % SUITE_TIMEOUT_SEC)
        return {"method": "unavailable", "reason": "suite timed out"}
    except OSError as exc:
        log("ERROR", "  suite could not start (%s) - recorded as unavailable" % exc)
        return {"method": "unavailable", "reason": "suite could not start: %s" % exc}

    tail = (proc.stdout or "").strip().splitlines()
    tail = tail[-1] if tail else ""

    if suite.get("parser") != "pytest":
        log("WARN", "  no parser for this suite - recorded as unavailable")
        return {"method": "unavailable", "reason": "no parser configured"}

    counts = {}
    for number, word in PYTEST_COUNT.findall(proc.stdout or ""):
        counts[word] = int(number)

    if proc.returncode == PYTEST_EXIT_NO_TESTS or not counts:
        log("ERROR", "  suite COLLECTED NOTHING (exit %d) - not a pass" % proc.returncode)
        return {"method": "unavailable", "reason": "suite collected no tests (exit %d)" % proc.returncode}

    result = {
        "method": "executed",
        "exit_code": proc.returncode,
        "green": proc.returncode == PYTEST_EXIT_OK,
        "passed": counts.get("passed", 0),
        "failed": counts.get("failed", 0),
        "skipped": counts.get("skipped", 0),
        "summary_line": tail,
    }
    log("INFO", "  %s (exit %d)" % (tail or "no summary line", proc.returncode))
    return result


def measure_source(src, projects_root, exclude, run_suites, log):
    """Measure one configured source. Never returns a fabricated zero."""
    repo = (projects_root / src["path"]).resolve()
    entry = {
        "id": src["id"],
        "label": src["label"],
        "own": bool(src.get("own", True)),
        "path": src["path"],
    }
    if src.get("note"):
        entry["note"] = src["note"]

    if not repo.is_dir():
        log("WARN", "%s: NOT FOUND at %s - recorded unavailable, NOT zero" % (src["id"], repo))
        entry["tests"] = {"method": "unavailable", "reason": "path not found"}
        entry["commit"] = None
        return entry

    commit = git(repo, "rev-parse", "--short", "HEAD")
    entry["commit"] = commit
    if commit is None:
        log("WARN", "%s: not a git repo - commit not stamped" % src["id"])

    patterns = src.get("testPatterns", [])
    count = count_test_files(repo, patterns, exclude)
    entry["tests"] = {"method": "counted", "files": count}

    # A zero here is ambiguous: it means EITHER the repo genuinely has no tests
    # OR the configured patterns are wrong for this repo's naming. The count
    # cannot tell those apart, so it must not be reported with the same
    # confidence as a real number. (map-reading-trainer hit this on the first
    # run: it has 24 *.test.ts files and the config only listed *.test.js.)
    if count == 0 and patterns:
        entry["tests"]["suspect"] = True
        entry["tests"]["reason"] = "no file matched the configured patterns - verify the patterns before trusting this zero"
        log("ERROR", "%s: 0 test files matched %s - SUSPECT, not a confident zero" % (
            src["id"], patterns))
    else:
        log("INFO", "%s: %d test files counted%s" % (
            src["id"], count, "" if entry["own"] else "  [INHERITED - excluded from totals]"))

    suite = src.get("suite")
    if suite and run_suites:
        entry["suite"] = run_suite(repo, suite, log)
    elif suite:
        log("INFO", "%s: suite configured but NOT RUN (no --run)" % src["id"])
        entry["suite"] = {"method": "unavailable", "reason": "not run: --run was not passed"}
    else:
        log("INFO", "%s: no suite configured - nothing executed" % src["id"])

    return entry


def scan_commits(projects_root, since, exclude, log):
    """Count commits since `since` across every git repo under projects_root."""
    repos = 0
    commits = 0
    earliest = None
    # Depth 1 and 2 only: projects sit at <root>/<project> or <root>/<category>/<project>.
    for gitdir in list(projects_root.glob("*/.git")) + list(projects_root.glob("*/*/.git")):
        repo = gitdir.parent
        if any(part in exclude for part in repo.parts):
            continue
        count = git(repo, "rev-list", "--count", "--since=%s" % since, "HEAD")
        if count is None or not count.isdigit() or int(count) == 0:
            continue
        repos += 1
        commits += int(count)
        first = git(repo, "log", "--reverse", "--format=%ad", "--date=short", "--since=%s" % since)
        if first:
            first = first.splitlines()[0]
            if earliest is None or first < earliest:
                earliest = first
    log("INFO", "commits: %d across %d repos since %s (earliest %s)" % (
        commits, repos, since, earliest or "n/a"))
    return {"method": "counted", "since": since, "repos": repos,
            "commits": commits, "earliest": earliest}


def main():
    args = set(sys.argv[1:])
    stamp = datetime.now(timezone.utc)

    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    out_path = REPO_ROOT / config["output"]

    if "--check" in args:
        if not out_path.exists():
            print("stale: %s does not exist" % out_path)
            return 1
        try:
            json.loads(out_path.read_text(encoding="utf-8"))
        except ValueError as exc:
            print("stale: %s does not parse (%s)" % (out_path, exc))
            return 1
        print("ok: %s exists and parses" % out_path)
        return 0

    log = Log(LOG_DIR / ("evidence-%s.log" % stamp.strftime("%Y%m%d-%H%M%S")))
    run_suites = "--run" in args
    log("INFO", "evidence snapshot starting (suites %s)" % ("ENABLED" if run_suites else "SKIPPED"))
    if not run_suites:
        log("WARN", "NOT running any suite. Every 'suite' figure will be unavailable, not zero.")

    projects_root = Path(config["projectsRoot"])
    exclude = set(config.get("scanExclude", []))

    if not projects_root.is_dir():
        log("ERROR", "projectsRoot %s does not exist - nothing can be measured" % projects_root)
        log.close()
        return 1

    sources = [measure_source(s, projects_root, exclude, run_suites, log)
               for s in config["sources"]]

    own = [s for s in sources if s["own"] and s["tests"]["method"] == "counted"]
    unavailable = [s["id"] for s in sources if s["tests"]["method"] == "unavailable"]
    excluded = [s["id"] for s in sources if not s["own"]]
    suspect = [s["id"] for s in sources if s["tests"].get("suspect")]

    snapshot = {
        "schema": SCHEMA,
        "_": "GENERATED - do not hand-edit. Rebuild with scripts/build_evidence_snapshot.py. "
             "Every figure carries a `method`; 'unavailable' means we could not look, never zero.",
        "generated": stamp.isoformat(timespec="seconds"),
        "generatedBy": "scripts/build_evidence_snapshot.py",
        "siteCommit": git(REPO_ROOT, "rev-parse", "--short", "HEAD"),
        "suitesExecuted": run_suites,
        "commitActivity": scan_commits(projects_root, config["commitWindow"]["since"], exclude, log),
        "totals": {
            "method": "counted",
            "ownTestFiles": sum(s["tests"]["files"] for s in own),
            "ownSourcesCounted": len(own),
            "excludedAsInherited": excluded,
            "unavailable": unavailable,
            "suspectZeros": suspect,
        },
        "sources": sources,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(snapshot, indent=2, sort_keys=False) + "\n",
        encoding="utf-8", newline="\n",
    )

    log("INFO", "own test files: %d across %d sources" % (
        snapshot["totals"]["ownTestFiles"], len(own)))
    if excluded:
        log("INFO", "excluded as inherited: %s" % ", ".join(excluded))
    if unavailable:
        log("WARN", "unavailable (recorded as such, NOT counted): %s" % ", ".join(unavailable))
    else:
        log("INFO", "no source was unavailable")
    if suspect:
        log("ERROR", "SUSPECT ZEROS - fix the patterns before publishing: %s" % ", ".join(suspect))
    else:
        log("INFO", "no suspect zeros")
    log("INFO", "wrote %s" % out_path)
    log.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
