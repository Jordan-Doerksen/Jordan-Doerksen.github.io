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
    "counted: `git rev-list --count <default branch>` in the project's local repository. The repository is the folder "
    "named in the private map (config home.stage_v2.repos), else the one whose `origin` equals the registry row's `repo` "
    "URL (compared without .git, trailing slash or case). The default branch is origin/HEAD's target if set, else main, "
    "else master (branch_source says which), so a checkout on another branch does not change the size. Only git's own "
    "counts are read. A row with no map entry and no repo URL, no local match, more than one match, a shallow clone or "
    "no default branch is could_not_look with the reason, never a number."
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


def locate(slug: str, mapped, repo_url, index: dict, root: Path):
    """(path, how, reason). The private map first (owner's master, CR-32), then the registry repo URL against each origin.

    The map is slug -> folder relative to the projects root. It exists because the registry's `repo` becomes a
    public link on the site, and several of these repositories are private. A mapped folder is checked, not trusted:
    it must stay inside the root and hold a .git."""
    if mapped is not None:
        if not isinstance(mapped, str) or not mapped.strip() or Path(mapped).is_absolute() or ".." in Path(mapped).parts:
            return None, None, "home.stage_v2.repos[%s] is not a folder relative to the projects root" % slug
        path = root / mapped
        if not (path / ".git").exists():
            return None, None, "home.stage_v2.repos[%s] = %s holds no git repository" % (slug, mapped)
        return path, "map", None
    if not isinstance(repo_url, str) or not repo_url.strip():
        return None, None, "the registry row has no repo URL and the map has no folder for it"
    if not re.match(r"^(https?|ssh|git)://|^[\w.-]+@[\w.-]+:", repo_url.strip(), re.I):
        return None, None, "the registry row's repo is not a git URL"
    hits = index.get(norm_url(repo_url), [])
    if not hits:
        return None, None, "no local repository under the projects root has this origin"
    if len(hits) > 1:
        return None, None, "%d local repositories share this origin: %s" % (len(hits), ", ".join(rel(h, root) for h in hits))
    return hits[0], "registry repo URL", None


def default_branch(path: Path):
    """(name, source, ref, reason). The default branch, so a checkout on a feature branch does not change the size.

    origin/HEAD's target if the clone has one, else main, else master; `source` records which. The local
    branch of that name is counted when it exists (the owner's own work counts before it is pushed), else
    the remote-tracking one. Nothing is guessed past those three names."""
    target, _ = git(path, "symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD")
    tried = []
    if target and "/" in target:
        tried.append((target.split("/", 1)[1], "origin/HEAD"))
    tried += [("main", "main"), ("master", "master")]
    for name, source in tried:
        for ref in ("refs/heads/" + name, "refs/remotes/origin/" + name):
            out, why = git(path, "rev-parse", "--verify", "-q", ref + "^{commit}")
            if out and not why:
                return name, source, ref, None
    return None, None, None, "no default branch: origin/HEAD is %s and there is no main or master" % ("unset" if not target else "not a branch here")


def measure(slug: str, mapped, repo_url, index: dict, root: Path, log) -> dict:
    """One project's entry. Every path out of here is a count or a reason."""
    path, how, why = locate(slug, mapped, repo_url, index, root)
    if why:
        return _blind(slug, why, log)
    shallow, why = git(path, "rev-parse", "--is-shallow-repository")
    if why:
        return _blind(slug, why, log)
    if shallow == "true":
        return _blind(slug, "the local repository is a shallow clone, so its count is not its history", log)
    name, source, ref, why = default_branch(path)
    if why:
        return _blind(slug, why, log)
    count, why = git(path, "rev-list", "--count", ref)
    if why or not (count or "").isdigit():
        return _blind(slug, why or "git rev-list printed %r, not a number" % count, log)
    commit, why = git(path, "rev-parse", ref)
    if why:
        return _blind(slug, why, log)
    entry = {"commits": int(count), "repo": rel(path, root), "default_branch": name, "branch_source": source,
             "matched_by": how, "commit": commit, "could_not_look": False, "reason": None}
    log.info("size_measured", slug=slug, commits=entry["commits"], repo=entry["repo"], default_branch=name,
             branch_source=source, matched_by=how, commit=commit[:12])
    return entry


def _blind(slug: str, reason: str, log) -> dict:
    log.warn("size_could_not_look", slug=slug, reason=reason)
    return {"commits": None, "repo": None, "default_branch": None, "branch_source": None, "matched_by": None,
            "commit": None, "could_not_look": True, "reason": reason}


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def build(cfg: dict, root: Path, log) -> dict:
    """The snapshot as a dict, from the running rows and the local repositories."""
    sizes = cfg["home"]["stage_v2"]["sizes"]
    repo_map = cfg["home"]["stage_v2"].get("repos") or {}
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
        projects[row.slug] = measure(row.slug, repo_map.get(row.slug), registry.get(row.slug, {}).get("repo"), index, root, log)
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
            print("%-*s  %-12d  %-6s  %s @ %s (%s; by %s)" % (width, slug, e["commits"], tier, e["repo"], e["default_branch"], e["branch_source"], e["matched_by"]))
    tally = {t: sum(1 for r in rows if r[4] == t) for t in TIERS}
    seen = sum(1 for r in rows if not r[0])
    print("")
    print("running projects %d: measured %d, could not look %d" % (len(rows), seen, len(rows) - seen))
    print("tiers (small_below %d, large_from %d): small %d, medium %d, large %d" % (rules["small_below"], rules["large_from"], tally["small"], tally["medium"], tally["large"]))
    if rules["overrides"]:
        print("overrides: " + ", ".join("%s=%s" % (s, o["tier"]) for s, o in rules["overrides"].items()))
    log.info("tier_tally", measured=seen, could_not_look=len(rows) - seen, **tally)


def print_map(cfg: dict, root: Path, snapshot: dict, log) -> None:
    """The private map, one line per slug: the folder and its origin (credentials stripped), for a human to review every match.
    Console only: the origin URL is never written to the committed file."""
    repo_map = cfg["home"]["stage_v2"].get("repos") or {}
    if not repo_map:
        return
    print("")
    print("map home.stage_v2.repos (%d): slug -> folder  [origin]" % len(repo_map))
    for slug in sorted(repo_map):
        origin, why = git(root / repo_map[slug], "remote", "get-url", "origin")
        shown = re.sub(r"//[^/@]+@", "//", origin) if origin else "no origin (%s)" % why
        print("  %-22s -> %s  [%s]" % (slug, repo_map[slug], shown))
        if slug not in snapshot["projects"]:
            log.warn("map_entry_unused", slug=slug, reason="not a running project, so the entry is not read")


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
        print_map(cfg, root, snapshot, log)
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
