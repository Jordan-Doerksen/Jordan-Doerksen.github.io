"""Build the project size snapshot: one commit count per running project (DECISIONS.md CR-32, Site card item 43).

Stdlib only, plus the front build's own modules, so the set of "running" projects is the set Home's
index uses and not a second definition (front_screens.load_model drops unlisted rows, index_keep
keeps the statuses in home.index.statuses).

"Bigger" means the commit count of the project's repository, the owner's answer "size commits"
(2026-10-21). For every running row that has a repo URL this finds the local repository whose
`origin` is that URL, and records `git rev-list --count HEAD` with the commit it counted.

The honesty rules, from SAFE-04 (absent is not zero):
  * A row with no repo URL, no local repository for its URL, or more than one, is recorded as
    "could not look" with the reason. It never gets a guessed number, and never a 0.
  * A shallow clone is "could not look" too: its count is the depth of the fetch, not the history.
  * Only git's own counts and the origin URL are read. No file inside a repository is opened, and
    nothing is written to any repository.
  * The committed file holds the repository's path relative to the projects root, never an
    absolute path, and never the origin URL (a remote can carry a token).

Usage:
    python scripts/build_project_sizes.py            # measure and write data/project-sizes.json
    python scripts/build_project_sizes.py --check    # measure, compare with the file, write nothing
    python scripts/build_project_sizes.py --projects-root PATH   # default: two levels above the site repo

Exit codes (the Doctor's): 0 written, or --check found no difference.
                           1 --check found a difference, or the config breaks a rule.
                           2 could not look at all (no registry, no git, no projects root, no repository found).

The tier of a project (small, medium, large) is computed by tier_for() below from the thresholds in
scripts/front_page.config.json, home.stage_v2.tiers, and the per-project overrides next to them.
The stage (item 43 chunk 2) imports it, so the table printed here and the page cannot disagree.

Log: scripts/logs/front-page-YYYYMMDD.jsonl, the front build's JSON-line file (gitignored).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from build_front_page import load_config                                                         # noqa: E402
from front_log import EXIT_COULD_NOT_LOOK, EXIT_OK, EXIT_RED, CouldNotLook, Refused, get_logger  # noqa: E402
from front_screens import index_keep, load_model                                                 # noqa: E402

OUT_PATH = REPO / "data" / "project-sizes.json"
SCHEMA = 1
TIERS = ("small", "medium", "large")
METHOD = (
    "counted: `git rev-list --count HEAD` in the local repository whose `origin` equals the registry row's `repo` URL "
    "(compared without .git, trailing slash or case). Only git's own counts are read. A row with no repo URL, no local "
    "match, more than one match or a shallow clone is could_not_look with the reason, never a number."
)
GIT_TIMEOUT = 60


# -- git ---------------------------------------------------------------------------------------------


def git(repo: Path, *args: str):
    """(stdout, None) on success, (None, reason) on failure. Read-only commands only."""
    try:
        out = subprocess.run(["git", "-C", str(repo)] + list(args), capture_output=True, text=True, timeout=GIT_TIMEOUT)
    except FileNotFoundError:
        return None, "git is not installed or not on PATH"
    except (OSError, subprocess.TimeoutExpired) as err:
        return None, "git %s failed: %s" % (args[0], err.__class__.__name__)
    if out.returncode != 0:
        first = (out.stderr or out.stdout or "").strip().splitlines()
        return None, "git %s exited %d%s" % (args[0], out.returncode, (": " + first[0][:120]) if first else "")
    return out.stdout.strip(), None


def norm_url(url: str) -> str:
    """host/owner/repo, lower case, for comparing a registry URL with an origin.

    Handles https://, http://, ssh://git@host/, git@host:owner/repo, a leading user[:token]@, a .git suffix
    and trailing slashes. The result is only compared, never stored (an origin can carry a token)."""
    u = url.strip()
    m = re.match(r"^[\w.-]+@([\w.-]+):(.+)$", u)               # scp-like: git@github.com:owner/repo
    if m:
        u = "%s/%s" % (m.group(1), m.group(2))
    else:
        u = re.sub(r"^[a-z][a-z0-9+.-]*://", "", u, flags=re.I)
        u = re.sub(r"^[^/@]+@", "", u)                          # user or user:token
    u = u.rstrip("/")
    if u.lower().endswith(".git"):
        u = u[:-4]
    return u.rstrip("/").lower()


def find_repos(root: Path, depth: int, skip: set, skip_prefixes: tuple = ()):
    """Primary clones under root: a directory that holds a `.git` DIRECTORY, to `depth` levels below root.

    A `.git` file marks a linked worktree, which shares a clone that is found on its own, so it is not
    listed (it would otherwise make every origin look ambiguous). A repository is not searched inside.
    A folder whose name starts with a skip prefix ("_" holds scratch unzips, backups and the archive) is
    never entered: a scratch copy of a project must not make the real one look ambiguous."""
    found = []
    base = len(root.parts)
    for here, dirs, _files in os.walk(root):
        path = Path(here)
        if (path / ".git").is_dir():
            found.append(path)
            dirs[:] = []
            continue
        if len(path.parts) - base >= depth:
            dirs[:] = []
            continue
        dirs[:] = sorted(d for d in dirs if d not in skip and not d.startswith(".") and not d.startswith(skip_prefixes))
    return found


# -- measuring ---------------------------------------------------------------------------------------


def measure(slug: str, repo_url, index: dict, root: Path, log) -> dict:
    """One project's entry. Every path out of here is a count or a reason."""
    if not isinstance(repo_url, str) or not repo_url.strip():
        return _blind(slug, "the registry row has no repo URL", log)
    if not re.match(r"^(https?|ssh|git)://|^[\w.-]+@[\w.-]+:", repo_url.strip(), re.I):
        return _blind(slug, "the registry row's repo is not a git URL", log)
    hits = index.get(norm_url(repo_url), [])
    if not hits:
        return _blind(slug, "no local repository under the projects root has this origin", log)
    if len(hits) > 1:
        return _blind(slug, "%d local repositories share this origin: %s" % (len(hits), ", ".join(rel(h, root) for h in hits)), log)
    path = hits[0]
    shallow, why = git(path, "rev-parse", "--is-shallow-repository")
    if why:
        return _blind(slug, why, log)
    if shallow == "true":
        return _blind(slug, "the local repository is a shallow clone, so its count is not its history", log)
    count, why = git(path, "rev-list", "--count", "HEAD")
    if why or not (count or "").isdigit():
        return _blind(slug, why or "git rev-list printed %r, not a number" % count, log)
    commit, why = git(path, "rev-parse", "HEAD")
    if why:
        return _blind(slug, why, log)
    branch, _ = git(path, "symbolic-ref", "--short", "-q", "HEAD")
    entry = {"commits": int(count), "repo": rel(path, root), "branch": branch or "(detached)", "commit": commit,
             "could_not_look": False, "reason": None}
    log.info("size_measured", slug=slug, commits=entry["commits"], repo=entry["repo"], branch=entry["branch"], commit=commit[:12])
    return entry


def _blind(slug: str, reason: str, log) -> dict:
    log.warn("size_could_not_look", slug=slug, reason=reason)
    return {"commits": None, "repo": None, "branch": None, "commit": None, "could_not_look": True, "reason": reason}


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def build(cfg: dict, root: Path, log) -> dict:
    """The snapshot as a dict, from the running rows and the local repositories."""
    sizes = cfg["home"]["stage_v2"]["sizes"]
    if not root.is_dir():
        raise CouldNotLook("projects root %s is not a directory" % root)
    model = load_model(REPO, cfg, log)
    running = index_keep(model, cfg)
    registry = {p["slug"]: p for p in json.loads((REPO / "data" / "registry.json").read_text(encoding="utf-8"))["projects"]}

    version, why = git(REPO, "--version")
    if why:
        raise CouldNotLook(why)
    repos = find_repos(root, int(sizes["scan_depth"]), set(sizes["skip_dirs"]), tuple(sizes["skip_prefixes"]))
    index: dict = {}
    for path in repos:
        origin, why = git(path, "remote", "get-url", "origin")
        if why:
            log.info("repo_without_origin", repo=rel(path, root), reason=why)      # a local-only repo can match no row
            continue
        index.setdefault(norm_url(origin), []).append(path)
    if not index:
        raise CouldNotLook("no repository with an origin was found under %s (depth %s)" % (root, sizes["scan_depth"]))
    log.info("repos_scanned", repos=len(repos), origins=len(index), depth=sizes["scan_depth"], git=version)

    projects = {}
    for row in running:
        projects[row.slug] = measure(row.slug, registry.get(row.slug, {}).get("repo"), index, root, log)
    projects = {slug: projects[slug] for slug in sorted(projects)}
    return {
        "schema": SCHEMA,
        "_": "GENERATED by scripts/build_project_sizes.py - do not hand-edit. Rebuild with `python scripts/build_project_sizes.py`. "
             "A project with could_not_look true has no count, which is not zero.",
        "method": METHOD,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generatedBy": "scripts/build_project_sizes.py",
        "projects": projects,
    }


# -- tiers -------------------------------------------------------------------------------------------


def tier_rules(cfg: dict) -> dict:
    """The thresholds and overrides, validated. Refused (exit 1) when they break a rule."""
    stage = cfg["home"]["stage_v2"]
    t = stage["tiers"]
    lo, hi = t.get("small_below"), t.get("large_from")
    if not all(isinstance(v, int) and not isinstance(v, bool) and v > 0 for v in (lo, hi)) or lo >= hi:
        raise Refused("home.stage_v2.tiers needs positive whole numbers with small_below < large_from, got %r and %r" % (lo, hi))
    bad = []
    for slug, o in (stage.get("overrides") or {}).items():
        if not isinstance(o, dict) or o.get("tier") not in TIERS or not isinstance(o.get("reason"), str) or not o["reason"].strip():
            bad.append(slug)
    if bad:
        raise Refused("home.stage_v2.overrides: %s needs a tier of %s and a written reason" % (", ".join(bad), "/".join(TIERS)))
    return {"small_below": lo, "large_from": hi, "overrides": stage.get("overrides") or {}}


def tier_for(slug: str, entry: dict, rules: dict) -> tuple:
    """(tier, why). An override wins and carries its reason. A project the measure could not see is small:
    it shows the small display and is never promoted on a guess (SAFE-04)."""
    o = rules["overrides"].get(slug)
    if o:
        return o["tier"], "override: " + o["reason"]
    if entry["could_not_look"]:
        return "small", "could not look"
    n = entry["commits"]
    if n >= rules["large_from"]:
        return "large", "%d >= %d" % (n, rules["large_from"])
    if n < rules["small_below"]:
        return "small", "%d < %d" % (n, rules["small_below"])
    return "medium", "%d..%d" % (rules["small_below"], rules["large_from"] - 1)


def print_table(snapshot: dict, rules: dict, log) -> None:
    rows = []
    for slug, e in snapshot["projects"].items():
        tier, why = tier_for(slug, e, rules)
        rows.append((e["could_not_look"], -(e["commits"] or 0), slug, e, tier))
    rows.sort(key=lambda r: r[:3])
    width = max(len(r[2]) for r in rows)
    print("")
    print("%-*s  %-12s  %-6s  %s" % (width, "slug", "commits", "tier", "repo / reason"))
    for _blind_flag, _neg, slug, e, tier in rows:
        if e["could_not_look"]:
            print("%-*s  %-12s  %-6s  %s" % (width, slug, "could not look", tier, e["reason"]))
        else:
            print("%-*s  %-12d  %-6s  %s @ %s" % (width, slug, e["commits"], tier, e["repo"], e["branch"]))
    tally = {t: sum(1 for r in rows if r[4] == t) for t in TIERS}
    seen = sum(1 for r in rows if not r[0])
    print("")
    print("running projects %d: measured %d, could not look %d" % (len(rows), seen, len(rows) - seen))
    print("tiers (small_below %d, large_from %d): small %d, medium %d, large %d" % (rules["small_below"], rules["large_from"], tally["small"], tally["medium"], tally["large"]))
    if rules["overrides"]:
        print("overrides: " + ", ".join("%s=%s" % (s, o["tier"]) for s, o in rules["overrides"].items()))
    log.info("tier_tally", measured=seen, could_not_look=len(rows) - seen, **tally)


# -- compare and write -------------------------------------------------------------------------------


def differences(old: dict, new: dict) -> list:
    """What differs, ignoring `generated`. Returns human lines."""
    out = []
    if old.get("method") != new.get("method"):
        out.append("method text differs")
    a, b = old.get("projects") or {}, new.get("projects") or {}
    for slug in sorted(set(a) | set(b)):
        if slug not in a:
            out.append("%s: new row (not in the file)" % slug)
        elif slug not in b:
            out.append("%s: in the file, no longer a running project" % slug)
        elif a[slug] != b[slug]:
            out.append("%s: file %s, now %s" % (slug, _brief(a[slug]), _brief(b[slug])))
    return out


def _brief(e: dict) -> str:
    return "could not look" if e.get("could_not_look") else "%s commits @ %s" % (e.get("commits"), (e.get("commit") or "")[:10])


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Measure each running project's repository by commit count. Exit 0 written or identical, 1 differs or refused, 2 could not look.")
    ap.add_argument("--check", action="store_true", help="measure, compare with data/project-sizes.json, write nothing; exit 1 if it differs")
    ap.add_argument("--projects-root", help="where the local repositories live (default: two levels above this repository)")
    args = ap.parse_args(argv)
    try:
        log = get_logger("build_project_sizes")
    except OSError as err:
        print("could not open the log: %s" % err, file=sys.stderr)
        return EXIT_COULD_NOT_LOOK
    try:
        cfg = load_config()
        rules = tier_rules(cfg)
        root = Path(args.projects_root).resolve() if args.projects_root else REPO.parent.parent
        snapshot = build(cfg, root, log)
        print_table(snapshot, rules, log)
        stray = sorted(set(rules["overrides"]) - set(snapshot["projects"]))
        if stray:
            raise Refused("home.stage_v2.overrides names a slug that is not a running project: %s" % ", ".join(stray))
        text = json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n"
        if args.check:
            if not OUT_PATH.is_file():
                print("\n1 difference: %s does not exist" % OUT_PATH.name)
                log.finish("differs")
                return EXIT_RED
            old = json.loads(OUT_PATH.read_text(encoding="utf-8"))
            diff = differences(old, snapshot)
            if diff:
                print("\n%d difference(s) between %s and a fresh run:" % (len(diff), OUT_PATH.name))
                for line in diff:
                    print("  " + line)
                log.warn("check_differs", differences=len(diff))
                log.finish("differs")
                return EXIT_RED
            print("\n0 differences: %s equals a fresh run" % OUT_PATH.name)
            log.finish("check_clean")
            return EXIT_OK
        OUT_PATH.write_text(text, encoding="utf-8", newline="\n")
        log.info("sizes_written", path="data/project-sizes.json", projects=len(snapshot["projects"]))
        print("\nwrote data/project-sizes.json (%d projects)" % len(snapshot["projects"]))
        log.finish("ok")
        return EXIT_OK
    except CouldNotLook as err:
        log.error("could_not_look", reason=str(err))
        print("could not look: %s" % err, file=sys.stderr)
        log.finish("could_not_look")
        return EXIT_COULD_NOT_LOOK
    except Refused as err:
        log.error("refused", reason=str(err))
        print("refused: %s" % err, file=sys.stderr)
        log.finish("refused")
        return EXIT_RED


if __name__ == "__main__":
    sys.exit(main())
