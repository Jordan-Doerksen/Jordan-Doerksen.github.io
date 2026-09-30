"""Extract the guard/sabotage pairs for tier 2 (DECISIONS.md D-A19/D-A21/D-A22).

Stdlib only. Parses the trading desk's adversarial harness, `tests/sabotage.ps1`,
into `data/guards.json`: for each guard, the test that must break, the file it
protects, and the exact mutation used to prove the guard bites.

This is CONTENT, not decoration, and it is generated for the same reason the
figures are (D-A21): a hand-copied guard list rots the moment a test is renamed,
and a rotted list is worse than none because it looks authoritative.

The staleness check is the point. For every case, the named test is searched for
in the suite. A case whose test no longer exists is marked `stale` and is NOT
published. That is this repo's own recorded failure (AI-Brain lessons.md,
2026-09-04): a renamed test made `pytest -k` select nothing, exit 5, and be
scored as a working guard - "52/52 guards proven to bite" while the real number
was 49.

Usage:
    python scripts/build_guards.py
    python scripts/build_guards.py --check    # exit 1 if output missing/unparsable
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
OUT_PATH = REPO_ROOT / "data" / "guards.json"

# A case is one PowerShell hashtable literal on one line:
#   @{ Test='...'; File='...'; Find='...'; Replace='...' }
# Values are single-quoted (PowerShell escapes an inner ' by doubling it) or
# double-quoted (which may carry backtick escapes such as `r`n).
CASE_LINE = re.compile(r"@\{\s*Test\s*=")


def ps_value(line, key):
    """Pull one key's value out of a PowerShell hashtable literal line."""
    single = re.search(r"%s\s*=\s*'((?:[^']|'')*)'" % key, line)
    if single:
        return single.group(1).replace("''", "'")
    double = re.search(r'%s\s*=\s*"((?:[^"])*)"' % key, line)
    if double:
        return double.group(1)
    return None


def git(repo, *args):
    try:
        out = subprocess.run(["git", "-C", str(repo)] + list(args),
                             capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return out.stdout.strip() if out.returncode == 0 else None


# One sentence per harness Mode. The mode token itself never prints: it is the
# harness's internal name, not plain words (owner review 2026-09-29, a published
# "(ToLF)" reached the page). A mode missing here gets the generic sentence.
MODE_WORDS = {
    "ToLF": "Converts the file's Windows line endings to Unix ones, which the guard exists to reject.",
    "StripBom": "Removes the byte-order mark the file needs, which the guard exists to reject.",
}
GENERIC = "Mutates the file in the way this guard exists to catch."
NUMBER = re.compile(r"\d+(?:\.\d+)?")
COMMENT_MARKS = ("#", "//", "::", "rem", "REM", "Rem", "<!--", "--", ";")
TRUE_WORDS = ("True", "true", "$true")


def switched_off(find, rep):
    """True when the replacement is the protected line itself behind a comment marker
    (`rem x`, `# x`, `pass  # x`): one line, kept whole, with only a marker before it."""
    if "\n" in find or not rep.endswith(find):
        return False
    lead = rep[:-len(find)].strip()
    return any(lead == m or lead.endswith(" " + m) or (m in ("#", "//") and lead.endswith(m))
               for m in COMMENT_MARKS)


def changed_stretch(f, r):
    """The one stretch that differs between f and r, after their common ends: (old, new)."""
    i = 0
    while i < min(len(f), len(r)) and f[i] == r[i]:
        i += 1
    j = 0
    while j < min(len(f), len(r)) - i and f[-1 - j] == r[-1 - j]:
        j += 1
    return f[i:len(f) - j], r[i:len(r) - j]


def describe_find_replace(find, rep):
    """What a find/replace case breaks, in plain words. Each class is decided from the
    exact shape of the two strings; anything that fits no class exactly keeps the
    general sentence, so no case is ever told more than its shape proves."""
    if rep.strip() == "":
        return "Deletes the protected text entirely."
    f, r = find.strip(), rep.strip()
    if switched_off(f, r):
        return "Switches off the protected line by commenting it out."
    if NUMBER.search(f) and NUMBER.sub("N", f) == NUMBER.sub("N", r) and NUMBER.findall(f) != NUMBER.findall(r):
        return "Changes a number in the protected text."
    old, new = changed_stretch(f, r)
    if new.strip() in TRUE_WORDS and old.strip() not in TRUE_WORDS + ("",):
        return "Forces a condition to always be true."
    if r in f:
        return "Removes part of the protected text."
    if f in r:
        return "Keeps the protected text and adds to it."
    return "Replaces the protected text with something plausible but wrong."


def describe_mutation(case):
    """Plain-language sentence for what the sabotage actually does."""
    if case.get("mode"):
        return MODE_WORDS.get(case["mode"], GENERIC)
    if case.get("append") is not None:
        return "Appends a line the guard must refuse to accept."
    if case.get("find") is not None and case.get("replace") is not None:
        return describe_find_replace(case["find"], case["replace"])
    return GENERIC


def main():
    if "--check" in sys.argv[1:]:
        if not OUT_PATH.exists():
            print("stale: %s does not exist" % OUT_PATH)
            return 1
        try:
            json.loads(OUT_PATH.read_text(encoding="utf-8"))
        except ValueError as exc:
            print("stale: %s does not parse (%s)" % (OUT_PATH, exc))
            return 1
        print("ok: %s exists and parses" % OUT_PATH)
        return 0

    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    projects_root = Path(config["projectsRoot"])
    desk = next(s for s in config["sources"] if s["id"] == "trading-desk")
    repo = (projects_root / desk["path"]).resolve()
    # The case list moved out of the runner into tests/sabotage.cases.ps1 (data only,
    # dot-sourced by the runner); at a commit before that split the runner holds it.
    # Read the cases file when it exists, else the runner - never both, or a case
    # would count twice. Run against the split tree as-is, the old path published
    # 0 guards: a false zero.
    cases = repo / "tests" / "sabotage.cases.ps1"
    harness = cases if cases.is_file() else repo / "tests" / "sabotage.ps1"

    if not harness.is_file():
        print("ERROR: harness not found at %s - nothing written" % harness)
        return 1

    # The suite text, once, so each case's test name can be looked up in it.
    suite_text = ""
    for path in (repo / "tests").rglob("*.py"):
        try:
            suite_text += path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

    guards, stale = [], []
    for line in harness.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not CASE_LINE.search(line):
            continue
        test = ps_value(line, "Test")
        if not test:
            continue
        case = {
            "test": test,
            "file": ps_value(line, "File"),
            "find": ps_value(line, "Find"),
            "replace": ps_value(line, "Replace"),
            "append": ps_value(line, "Append"),
            "mode": ps_value(line, "Mode"),
        }
        # Strict: the test must be DEFINED, not merely mentioned. A looser
        # substring match would let a name that survives only in a comment or a
        # docstring count as a live guard - which is the stale-guard bug wearing
        # a different hat. Verified 2026-09-07: all 90 published cases match this
        # strict form, so the loose fallback was doing no work and was removed.
        case["exists"] = ("def %s(" % test) in suite_text
        case["mutation"] = describe_mutation(case)
        # The mutation inputs feed describe_mutation() and are then dropped: no live
        # page reads them, and the raw find/replace text carries strings the public
        # site must not (a machine name, the variable that names it, a decision-record
        # prefix, a webhook path segment). A published case is test, file, exists,
        # mutation - nothing else.
        for k in ("find", "replace", "append", "mode"):
            del case[k]
        if not case["exists"]:
            stale.append(test)
            continue
        guards.append(case)

    payload = {
        "schema": SCHEMA,
        "_": "GENERATED - do not hand-edit. Rebuild with scripts/build_guards.py. "
             "A guard whose test no longer exists is EXCLUDED, never shown, and counted in `stale`.",
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": {
            "repo": "trading-desk",
            "file": harness.relative_to(repo).as_posix(),
            "commit": git(repo, "rev-parse", "--short", "HEAD"),
        },
        "premise": "A test that has never failed is not a guard - it is a green light of "
                   "unknown wiring. Each case below is driven into the failure it exists to "
                   "catch, then the tree is restored and the restore is proven by SHA256.",
        "counts": {
            "published": len(guards),
            "staleExcluded": len(stale),
            "staleTests": stale,
        },
        "guards": guards,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n",
                        encoding="utf-8", newline="\n")

    print("guards published: %d" % len(guards))
    if stale:
        print("STALE (excluded, test not found in suite): %d" % len(stale))
        for t in stale:
            print("  - %s" % t)
    else:
        print("no stale guards")
    print("wrote %s" % OUT_PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
