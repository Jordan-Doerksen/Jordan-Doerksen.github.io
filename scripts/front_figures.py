"""Figures for the Home screen, read from data/evidence.json the way scripts/site_compose.py does.

site_compose.figures() is the reference and the reads are the same:

    commits  commitActivity.commits       repos  commitActivity.repos
    since    commitActivity.earliest      tests  totals.ownTestFiles
    suite_passed  the trading-desk source's suite.passed, only when suite.method == "executed"
                  (site_compose.py calls this "guards"; it is a count of passing tests, so it is named so here)
    guards   data/guards.json counts.published, only when it equals the length of the list it counts and
             the file was generated on the same day as evidence.json (one stamp cannot cover two days)
    asof     generated[:10]

ABSENT IS NOT ZERO (SAFE-04). A field that is missing, not a count, or from a section whose method
is not "counted" comes back as None, and the caller leaves that figure off the page and logs
figure_unavailable. Nothing here ever turns an unknown into 0.

Also holds read_json(), which every module that reads data/ uses, so a missing or broken input is
one error type (CouldNotLook, exit 2) with the path in it.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from front_log import CouldNotLook

_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def read_json(path: Path):
    """Parsed JSON, or CouldNotLook naming the file. A missing input is never a pass."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise CouldNotLook("missing input: %s" % path) from None
    except (OSError, ValueError) as err:       # JSONDecodeError and UnicodeDecodeError are ValueErrors
        raise CouldNotLook("cannot read %s: %s" % (path, err)) from err


def _count(value):
    """A count is a non-negative int. A bool, a string or a null is absent."""
    if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
        return value
    return None


def _counted(evidence: dict, key: str):
    """The section `key`, only if it says it was counted. 'unavailable' means we could not look."""
    section = evidence.get(key)
    if isinstance(section, dict) and section.get("method") == "counted":
        return section
    return None


def guard_count(path: Path, asof, log):
    """data/guards.json counts.published, or None. A guard here has been driven into the failure it exists to
    catch (the file's own premise). The count must equal the list it counts, and the file must be from the same
    day as the evidence figures, because the page prints one stamp for all of them."""
    try:
        data = read_json(path)
    except CouldNotLook as err:
        log.warn("figure_unavailable", figure="guards", reason=str(err), source=str(path))
        return None
    counts = data.get("counts") if isinstance(data, dict) else None
    n = _count(counts.get("published")) if isinstance(counts, dict) else None
    listed = data.get("guards") if isinstance(data, dict) else None
    if n is None or not isinstance(listed, list):
        log.warn("figure_unavailable", figure="guards", reason="guards.json has no counts.published number or no guards list", source=str(path))
        return None
    if len(listed) != n:
        log.warn("figure_unavailable", figure="guards", reason="counts.published is %d but the list holds %d" % (n, len(listed)), source=str(path))
        return None
    made = data.get("generated")
    made = made[:10] if isinstance(made, str) else None
    if made is None or not _DATE.match(made) or (asof is not None and made != asof):
        log.warn("figure_unavailable", figure="guards", reason="guards.json was generated on %s and evidence.json on %s, so one stamp cannot cover both" % (made, asof), source=str(path))
        return None
    return n


def figures(path: Path, log, guards_path: Path | None = None) -> dict:
    """The figures, each an int/str or None. Logs figure_unavailable for every None."""
    evidence = read_json(path)
    if not isinstance(evidence, dict):
        raise CouldNotLook("%s is not a JSON object" % path)

    commit_activity = _counted(evidence, "commitActivity")
    totals = _counted(evidence, "totals")
    out = {
        "commits": _count(commit_activity.get("commits")) if commit_activity else None,
        "repos": _count(commit_activity.get("repos")) if commit_activity else None,
        "since": None,
        "tests": _count(totals.get("ownTestFiles")) if totals else None,
        "suite_passed": None,
        "guards": None,
        "asof": None,
    }

    earliest = commit_activity.get("earliest") if commit_activity else None
    if isinstance(earliest, str) and _DATE.match(earliest):
        out["since"] = earliest

    generated = evidence.get("generated")
    if isinstance(generated, str) and _DATE.match(generated[:10]):
        out["asof"] = generated[:10]

    desk = next((s for s in evidence.get("sources") or [] if isinstance(s, dict) and s.get("id") == "trading-desk"), None)
    suite = (desk or {}).get("suite")
    if isinstance(suite, dict) and suite.get("method") == "executed":
        out["suite_passed"] = _count(suite.get("passed"))
    if guards_path is not None:
        out["guards"] = guard_count(guards_path, out["asof"], log)

    reasons = {
        "commits": "commitActivity is missing, not counted, or has no commit count",
        "repos": "commitActivity is missing, not counted, or has no repository count",
        "since": "commitActivity.earliest is missing or not a date",
        "tests": "totals is missing, not counted, or has no ownTestFiles",
        "suite_passed": "the trading-desk suite was not executed" if not isinstance(suite, dict) or suite.get("method") != "executed"
        else "the executed suite has no passed count",
        "guards": "data/guards.json could not be used (see the warning above)",
        "asof": "generated is missing or not a date",
    }
    for name, value in out.items():
        if value is None and name != "guards":
            log.warn("figure_unavailable", figure=name, reason=reasons[name], source=str(path))
    log.info("figures_read", **{k: v for k, v in out.items() if v is not None})
    return out
