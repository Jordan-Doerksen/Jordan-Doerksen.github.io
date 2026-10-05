"""Figures for the Home screen, read from data/evidence.json the way scripts/site_compose.py does.

site_compose.figures() is the reference and the reads are the same:

    commits  commitActivity.commits       repos  commitActivity.repos
    since    commitActivity.earliest      tests  totals.ownTestFiles
    guards   the trading-desk source's suite.passed, only when suite.method == "executed"
    asof     generated[:10]

ABSENT IS NOT ZERO (SAFE-04). A field that is missing, not a count, or from a section whose method
is not "counted" comes back as None, and the caller leaves that figure off the page and logs
figure_unavailable. Nothing here ever turns an unknown into 0. "guards" keeps its old key, but the
page labels it "tests passing in the trading desk suite" (DECISIONS.md, open question under D-A27).

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


def figures(path: Path, log) -> dict:
    """The six figures, each an int/str or None. Logs figure_unavailable for every None."""
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
        out["guards"] = _count(suite.get("passed"))

    reasons = {
        "commits": "commitActivity is missing, not counted, or has no commit count",
        "repos": "commitActivity is missing, not counted, or has no repository count",
        "since": "commitActivity.earliest is missing or not a date",
        "tests": "totals is missing, not counted, or has no ownTestFiles",
        "guards": "the trading-desk suite was not executed" if not isinstance(suite, dict) or suite.get("method") != "executed"
        else "the executed suite has no passed count",
        "asof": "generated is missing or not a date",
    }
    for name, value in out.items():
        if value is None:
            log.warn("figure_unavailable", figure=name, reason=reasons[name], source=str(path))
    log.info("figures_read", **{k: v for k, v in out.items() if v is not None})
    return out
