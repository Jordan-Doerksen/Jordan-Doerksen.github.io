"""Compose the hidden showcase page, After Hours (docs/after-hours/DESIGN.md).

Stdlib only. Composes trading/after-hours/index.html from parts/NN-<key>.html in
the config's compose order, injects the desk's own strings, formats and limits as
data attributes on each piece, inlines the generated numbers from data/evidence.json
and data/guards.json with their stamps, and refuses the build when anything is
wrong. Nothing is written until every check has passed.

THE CHECKS, in the order they run (design contract 2.3 step 5):
  * the desk facts: tier2_desk_toy.read_desk() with this page's config, so every
    `find` literal must still exist at deskRoot and a miss fails the build; every
    `limits` regex must match exactly once in its file;
  * the optional second root: a missing root removes every data-ah-if="monad"
    region and the report says so; a present root with a missing literal fails;
  * the three commits agree: evidence sources[trading-desk].commit,
    guards.source.commit and read_desk().commit are one hash;
  * guards.json publishes more than zero guards and no case still carries a
    mutation input (find, replace, append, mode): the page reads none of them; no
    mutation sentence carries a bracketed harness token such as a mode name;
  * 08's families: every role word the roles map produces sits in exactly one
    family and no family names a word the map does not produce; the live card's
    cadence (the config's `cases`) is ordered reveal < stamp < seconds; every
    `cases.skip` pattern compiles, no staged case matches one, and neither the
    composed page nor any file in the page folder does; 08's tally prints the
    staged count as its one number, never the published total;
  * no path part of deskRoot is in evidence_sources.json's scanExclude;
  * every %AH_ token is filled or removed, no `{` survives a filled format, exactly
    one "order authority", ten piece script tags after the core tag, every piece
    root present;
  * the alert case: the ✓/✗ marks and the conviction words on the two cards are
    derived from the example values under the desk's own vote thresholds, read as
    limits (obiVote, vwapTicks, tick) from the desk's indicators module; the config's
    conviction word is a tripwire that must equal the derived break word, so a desk
    threshold change refuses the build instead of silently regrading the card;
  * the suite figures print whenever the suite was executed, whatever its result,
    with the result word from the exit code; a category the runner did not print
    (the snapshot's default 0) is omitted, never printed as 0;
  * no piece script calls AH.rng(: a piece that draws between tape steps uses its
    own seeded generator, or the shared tape would depend on which pieces are live
    (design contract section 3);
  * the forbidden list (scripts/after_hours.forbidden.json) over the composed page,
    every file under trading/after-hours, the design contract and the two data
    files (its page-scoped `pageRegex` group over the page and its folder only):
    a hit prints file:line:entry and exits 1.

Usage:
    python scripts/build_after_hours.py             # check, then write index.html
    python scripts/build_after_hours.py --dry-run   # run every check, write nothing
    python scripts/build_after_hours.py --selftest  # stub site in a temp dir; a planted
                                                    # forbidden string must fail the build
"""

import argparse
import html
import json
import re
import shutil
import sys
import tempfile
from collections import Counter
from datetime import date
from pathlib import Path

# Importing a sibling module creates scripts/__pycache__/ in the working tree;
# this repo keeps no bytecode, so none is written.
sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import tier2_desk_toy  # noqa: E402

REPO_ROOT = HERE.parent
CONFIG_PATH = HERE / "after_hours.config.json"
FORBIDDEN_PATH = HERE / "after_hours.forbidden.json"
PAGE_REL = Path("trading") / "after-hours"
DESIGN_REL = Path("docs") / "after-hours" / "DESIGN.md"
SOURCES_REL = Path("scripts") / "evidence_sources.json"
EVIDENCE_REL = Path("data") / "evidence.json"
GUARDS_REL = Path("data") / "guards.json"

MARK_STYLES, MARK_PIECES, MARK_SCRIPTS = "<!-- AH:STYLES -->", "<!-- AH:PIECES -->", "<!-- AH:SCRIPTS -->"
CORE_TAG = '<script src="js/core.js">'
TOKEN = re.compile(r"%AH_([A-Z_]+?)(?::([^%\s]+))?%")
TAG = re.compile(r"<(/?)([A-Za-z][\w-]*)([^<>]*)>")
# A part may carry hand-typed stand-in markup between these comments so it reads
# complete on its own; the generator strips every such region before it fills the
# tokens, so nothing typed by hand reaches the page (08 uses it).
FALLBACK = re.compile(r"<!-- AH:FALLBACK -->.*?<!-- /AH:FALLBACK -->\s*", re.S)
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "param", "source", "track", "wbr"}
CFG_KEYS = ("max", "seed", "timings")
NUM_KEYS = ("desk.tests.files", "desk.suite.passed", "desk.suite.failed", "desk.suite.skipped",
            "desk.suite.result", "guards.published", "guards.stale", "guards.cases", "evidence.generated",
            "guards.generated", "desk.commit")
# The core contract (design contract section 3): the shared rng is the tape's. A piece
# that calls it between two tape steps shifts the tape for everything else, by whatever
# happens to be live, so no piece script may contain this call; core.js is the one definer.
RNG_CALL = "AH.rng("
# Fields a published guard must NOT carry any more (design contract 2.5, last sentence).
MUTATION_INPUTS = ("find", "replace", "append", "mode")
# A harness token in brackets inside a mutation sentence, e.g. a mode name: not plain words.
MUTATION_TOKEN = re.compile(r"\([A-Z][A-Za-z]+\)")
# 08's tally line and the stamped numbers inside it (the caught counter carries a data
# attribute, so this pattern passes over it): its one printed number is the denominator.
TALLY = re.compile(r'<p class="ah-g-tally\b[^"]*"[^>]*>(.*?)</p>', re.S)
TALLY_N = re.compile(r'<b class="ah-g-n">([^<]*)</b>')
PIECES_EXPECTED = 10


class BuildError(Exception):
    """One reason the page must not be written."""


# ---- small helpers ---------------------------------------------------------------

def esc(s):
    return html.escape(str(s), quote=False)


def attr(s):
    return html.escape(str(s), quote=True)


def num_str(v):
    """A limit as the page prints it: 30.0 -> "30", 12.5 -> "12.5"."""
    f = float(v)
    return str(int(f)) if f.is_integer() else str(f)


def num_val(v):
    f = float(v)
    return int(f) if f.is_integer() else f


def strip_private(obj):
    """Drop `_` comment keys, recursively (the grading rules' own convention)."""
    if isinstance(obj, dict):
        return {k: strip_private(v) for k, v in obj.items() if not str(k).startswith("_")}
    if isinstance(obj, list):
        return [strip_private(v) for v in obj]
    return obj


def entries(cfg, group):
    return [(k, v) for k, v in (cfg.get(group) or {}).items() if not k.startswith("_")]


def load_json(path, sig=False):
    return json.loads(Path(path).read_text(encoding="utf-8-sig" if sig else "utf-8"))


# ---- the desk facts --------------------------------------------------------------

def read_facts(cfg_path, cfg, fails):
    """tier2_desk_toy.read_desk() against this page's config, plus the two added rules."""
    # The toy compares refresh with stale after its own reads; a config without them
    # would raise inside it, so that is checked here first, with a plain message.
    missing = [k for k in ("refresh", "stale") if k not in (cfg.get("limits") or {})]
    if missing:
        fails.append("config.limits must hold refresh and stale (the toy compares them); missing: %s"
                     % ", ".join(missing))
        return None
    tier2_desk_toy.CONFIG = Path(cfg_path)
    try:
        facts = tier2_desk_toy.read_desk()
    except tier2_desk_toy.DeskFactsError as e:
        for miss in e.misses:
            fails.append("desk: %s" % miss)
        return None
    root = Path(cfg["deskRoot"])
    for key, spec in entries(cfg, "limits"):
        if "regex" not in spec:
            continue
        text = (root / spec["file"]).read_text(encoding="utf-8")
        n = len(re.findall(spec["regex"], text))
        if n != 1:
            fails.append("limits.%s: /%s/ matches %d times in %s; it must match exactly once"
                         % (key, spec["regex"], n, spec["file"]))
    facts["html"] = {k for k, spec in entries(cfg, "text") if spec.get("html")}
    return facts


def read_literals(root, lits, fails):
    """The optional second root: show-in-find rule, no limits, no commit.
    Returns None when the root is missing, else {key: show}."""
    if not root:
        return None
    root = Path(root)
    if not root.is_dir():
        return None
    out = {}
    for key, spec in lits:
        p = root / spec["file"]
        if not p.is_file():
            fails.append("monad.%s: %s not found under the second root" % (key, spec["file"]))
            continue
        body = p.read_text(encoding="utf-8")
        if spec["show"] not in spec["find"]:
            fails.append("monad.%s: config error - show %r is not part of find" % (key, spec["show"]))
        elif spec["find"] not in body:
            fails.append("monad.%s: %s no longer contains %r" % (key, spec["file"], spec["find"]))
        else:
            out[key] = spec["show"]
    return out


def read_bands(cfg, fails):
    p = Path(cfg["deskRoot"]) / cfg["bands"]["file"]
    if not p.is_file():
        fails.append("bands: %s not found" % cfg["bands"]["file"])
        return None
    rules = strip_private(load_json(p, sig=True))
    for k in ("grade_bands", "regime_bands", "label_precedence"):
        if not isinstance(rules.get(k), list) or not rules[k]:
            fails.append("bands: %s has no %s list" % (cfg["bands"]["file"], k))
            return None
    return {"bands": {"grade_bands": rules["grade_bands"], "regime_bands": rules["regime_bands"]},
            "precedence": rules["label_precedence"]}


# ---- markup the generator writes -------------------------------------------------

def text_json(key, show, html_keys):
    return html.unescape(show) if key in html_keys else show


def text_markup(key, show, html_keys):
    return show if key in html_keys else esc(show)


def bands_markup(b):
    ol = "".join('<li data-grade="%s" data-min="%s">%s · %s</li>'
                 % (attr(g["grade"]), num_str(g["min"]), esc(g["grade"]), num_str(g["min"]))
                 for g in b["bands"]["grade_bands"])
    ul = "".join('<li data-label="%s" data-min="%s">%s · %s</li>'
                 % (attr(r["label"]), num_str(r["min"]), esc(r["label"]), num_str(r["min"]))
                 for r in b["bands"]["regime_bands"])
    return '<ol class="ah-bands">%s</ol><ul class="ah-regimes">%s</ul>' % (ol, ul)


def role_for(path, mapping):
    """Longest matching prefix wins; a root-level file is its own entry."""
    best = None
    for prefix, word in mapping.items():
        if path == prefix or path.startswith(prefix):
            if best is None or len(prefix) > len(best[0]):
                best = (prefix, word)
    return best[1] if best else None


def guard_kept(guards, roles, fails):
    """Every published guard less `omit`, with its role word, in file order."""
    omit = tuple(roles.get("omit") or [])
    mapping = roles.get("map") or {}
    kept = []
    for g in guards.get("guards") or []:
        f = (g.get("file") or "").replace("\\", "/")
        if not f:
            fails.append("guards: case %r names no file" % g.get("test"))
            continue
        if f.startswith(omit):
            continue
        role = role_for(f, mapping)
        if role is None:
            fails.append("roles: no role word maps %s (test %s)" % (f, g.get("test")))
            continue
        kept.append((g, role))
    return kept


FAMILY_KEY = re.compile(r"^[a-z][a-z0-9-]*$")


def guard_families(cfg, kept, fails):
    """08's category wall. Every role word the roles map produces sits in exactly one
    family, and a family names no word the map does not produce, or the build refuses.
    Returns one dict per family, in config order: key, label, words (as configured),
    roles [(word, count)] most guarded first with the unguarded words left out, and
    count (the sum of its role words over the kept guards)."""
    spec = cfg.get("families")
    words = set((((cfg.get("roles") or {}).get("map")) or {}).values())
    if not isinstance(spec, list) or not spec:
        fails.append("families: the config has no families list; 08's wall needs one")
        return []
    home, keys, out = {}, set(), []
    for i, fam in enumerate(spec):
        key = fam.get("key") if isinstance(fam, dict) else None
        label = fam.get("label") if isinstance(fam, dict) else None
        roles = fam.get("roles") if isinstance(fam, dict) else None
        if not isinstance(key, str) or not FAMILY_KEY.match(key):
            fails.append("families[%d]: key %r is not a lower-case word" % (i, key))
            continue
        if key in keys:
            fails.append("families: key %r appears twice" % key)
            continue
        keys.add(key)
        if not isinstance(label, str) or not label.strip():
            fails.append("families.%s: no label" % key)
            label = ""
        if not isinstance(roles, list) or not roles:
            fails.append("families.%s: no role words" % key)
            roles = []
        for w in roles:
            if w not in words:
                fails.append("families.%s names role word %r, which the roles map does not produce" % (key, w))
            if key not in home.setdefault(w, []):
                home[w].append(key)
        out.append({"key": key, "label": label, "words": list(roles)})
    for w in sorted(words):
        where = home.get(w, [])
        if not where:
            fails.append("families: role word %r is in no family" % w)
        elif len(where) > 1:
            fails.append("families: role word %r is in %d families (%s)" % (w, len(where), ", ".join(where)))
    counts = Counter(role for _, role in kept)
    for fam in out:
        order = {w: j for j, w in enumerate(fam["words"])}
        fam["roles"] = sorted(((w, counts[w]) for w in order if counts[w] > 0),
                              key=lambda wc: (-wc[1], order[wc[0]]))
        fam["count"] = sum(n for _, n in fam["roles"])
    return out


# The two catch-all sentences scripts/build_guards.py gives a case whose shape proves
# no narrower class. They say least about what broke, so the staged pass shows every
# case with its own sentence first (owner review 2026-09-29: 22 of 36 staged cases
# read the same sentence, four in a row at the end of each pass).
GENERIC_MUTATIONS = frozenset((
    "Replaces the protected text with something plausible but wrong.",
    "Mutates the file in the way this guard exists to catch.",
))


def guard_cases(families, kept, n_max, skip=()):
    """Up to n_max example cases, round-robin across the families in config order;
    inside each, a case with a specific sentence before one with a GENERIC_MUTATIONS
    sentence, file order inside each group, and a test name staged once. A family's
    next case is the first in its current group whose sentence differs from the card
    staged just before it (the head of the queue when none does), so one sentence
    does not play twice in a row. A case carries the test name, the family key, the
    role word and the harness's plain-words mutation: never a path, never
    find/replace text (the guards.json gate refuses a file that still holds either
    input). A case whose test name or mutation matches a `cases.skip` pattern is never
    staged; it, and a repeated test name, still count in the family's tile, which
    guard_families() counted before this."""
    fam_of = {}
    for fam in families:
        for w in fam["words"]:
            fam_of.setdefault(w, fam["key"])
    queues = {fam["key"]: [] for fam in families}
    for g, role in kept:
        key = fam_of.get(role)
        if key is None or g.get("exists") is False or not g.get("test") or not g.get("mutation"):
            continue
        if any(rx.search(str(g["test"])) or rx.search(str(g["mutation"])) for rx in skip):
            continue
        queues[key].append({"f": key, "w": role, "t": str(g["test"]), "m": str(g["mutation"])})
    for q in queues.values():
        q.sort(key=lambda c: c["m"] in GENERIC_MUTATIONS)  # stable: file order stays inside each group
    # A repeated test name is dropped when it is picked, not when it is queued, so a
    # name whose first published case is generic and a later one specific is staged
    # with the specific sentence.
    out, staged = [], set()
    while len(out) < n_max and any(queues.values()):
        for fam in families:
            if len(out) >= n_max:
                break
            q = queues[fam["key"]]
            q[:] = [c for c in q if c["t"] not in staged]
            if not q:
                continue
            group = q[0]["m"] in GENERIC_MUTATIONS
            prev = out[-1]["m"] if out else None
            i = next((j for j, c in enumerate(q) if (c["m"] in GENERIC_MUTATIONS) == group and c["m"] != prev), 0)
            case = q.pop(i)
            staged.add(case["t"])
            out.append(case)
    return out


def guard_cases_cfg(cfg, fails):
    """The live card's cadence, from the config's `cases` group, checked."""
    c = cfg.get("cases") or {}
    try:
        v = {"max": int(c.get("max", 36)), "examples": int(c.get("examples", 3)),
             "sec": float(c.get("seconds", 4.8)), "reveal": float(c.get("reveal", 1.0)),
             "stamp": float(c.get("stamp", 1.8)), "hold": float(c.get("hold", 6))}
    except (TypeError, ValueError):
        fails.append("cases: max, examples, seconds, reveal, stamp and hold must be numbers")
        return None
    # skip: case-insensitive patterns a staged case must not match, and the composed
    # page must not carry (the broker platform's acronyms sit in two test names).
    skip = c.get("skip", [])
    v["skip"] = []
    if not isinstance(skip, list) or not all(isinstance(p, str) and p for p in skip):
        fails.append("cases: skip must be a list of pattern strings")
    else:
        for p in skip:
            try:
                v["skip"].append(re.compile(p, re.IGNORECASE))
            except re.error as e:
                fails.append("cases: skip pattern %r does not compile (%s)" % (p, e))
    if not 1 <= v["examples"] <= v["max"]:
        fails.append("cases: examples (%d) must be between 1 and max (%d)" % (v["examples"], v["max"]))
    if not 0 < v["reveal"] < v["stamp"] < v["sec"]:
        fails.append("cases: need 0 < reveal < stamp < seconds (got %s, %s, %s)" % (v["reveal"], v["stamp"], v["sec"]))
    if not v["hold"] > 0:
        fails.append("cases: hold must be more than 0 seconds")
    return v


def guard_families_markup(families, generated):
    """One tile per family: its label, its generated count, its role words most guarded
    first, and the live card's per-pass tally (script only). Each tile is stamped."""
    out = []
    for fam in families:
        n = fam["count"]
        words = '<span class="ah-g-dot"> · </span>'.join(esc(w) for w, _ in fam["roles"])
        out.append(
            '<li class="ah-g-fam" data-family="%s" data-count="%d" data-generated="%s">'
            '<p class="ah-g-fam-label">%s</p>'
            '<p class="ah-g-fam-n"><b class="ah-g-n">%d</b> %s</p>'
            '<p class="ah-g-fam-roles">%s</p>'
            '<p class="ah-g-fam-pass ah-live-only"><span class="ah-g-ok" aria-hidden="true">✓</span> '
            '<b data-ah-g-pass>0</b> shown this pass</p></li>'
            % (attr(fam["key"]), n, attr(generated), esc(fam["label"]), n, "guard" if n == 1 else "guards",
               words or "—"))
    return "\n        ".join(out)


def guard_case_markup(case, label):
    """One case as the card shows it: the family, what got broken in plain words (the
    role word, then the harness's mutation sentence), the test that caught it, the stamp."""
    return ('<article class="ah-g-case" data-family="%s">'
            '<p class="ah-g-case-fam">%s</p>'
            '<p class="ah-g-row ah-g-broke"><span class="ah-g-k"><span class="ah-g-x" aria-hidden="true">✗</span> broken</span>'
            '<span class="ah-g-v"><b class="ah-g-where">%s</b> <span class="ah-g-mut">%s</span></span></p>'
            '<p class="ah-g-row ah-g-by"><span class="ah-g-k">caught by</span><code class="ah-g-v ah-g-test">%s</code></p>'
            '<p class="ah-g-row ah-g-verdict"><span class="ah-g-k"></span><span class="ah-g-v">'
            '<span class="ah-g-stamp" data-state="caught"><span class="ah-g-ok" aria-hidden="true">✓</span> CAUGHT</span></span></p>'
            '</article>'
            % (attr(case["f"]), esc(label), esc(case["w"]), esc(case["m"]), test_breaks(case["t"])))


def test_breaks(name):
    """A test name with a break chance after each underscore, so a long name wraps between its
    words and never mid-word; the text is unchanged (08's script builds the same shape)."""
    return esc(name).replace("_", "_<wbr>")


def guard_examples_markup(cases, families, n):
    """The still's example cases: the first n of the round-robin, as static text."""
    labels = {fam["key"]: fam["label"] for fam in families}
    return "\n          ".join(guard_case_markup(c, labels.get(c["f"], "")) for c in cases[:n])


def guard_pass_attr(cases, cc):
    """The staged pass for 08's script: html-escaped JSON for one attribute."""
    d = {"sec": cc["sec"], "reveal": cc["reveal"], "stamp": cc["stamp"], "hold": cc["hold"], "cases": cases}
    return attr(json.dumps(d, ensure_ascii=False, separators=(",", ":")))


def page_pass(page):
    """08's staged pass as the composed page carries it (one html-escaped attribute)."""
    m = re.search(r'data-ah-pass="([^"]*)"', page or "")
    try:
        return json.loads(html.unescape(m.group(1))) if m else {}
    except ValueError:
        return {}


class _Zero(object):
    """A fabricated zero. Formats as 0 under the desk's own spec, fenced by two control
    characters the markup step turns into the `ah-z` span, so only the zero is marked,
    never the words around it (design contract 2.4, the ghost line)."""

    def __format__(self, spec):
        return "\x00" + format(0, spec) + "\x01"

    def __str__(self):
        return "\x000\x01"


# The desk decides a break's conviction word AND the ✓/✗ after each factor from one
# recorded list of fails, so the cards do the same, and that list is DERIVED from the
# case's values under the desk's own vote (indicators.py: obi_vote, vwap_vote,
# cvd_vote, confluence), never typed. The three thresholds the vote needs are read
# from the desk as limits (obiVote, vwapTicks, tick) and handed to 03 in its lim, so
# the still here and the live cards vote from the same numbers. The desk counts a
# factor with no vote as a fail (rules.convFails tripwires the line) and grades
# 0 / 1 / 2+ fails as High / Building / Standard (the ladder is the `find` literal
# behind convHigh). Three cases are voted from the example: the break card (every
# value present), the gap card (the toy's case 3: VWAP and CVD absent, so those two
# cannot vote the break's way), and the ghost line (the absent values filled with 0
# and re-voted, which is the point of that line). The config's conviction word must
# equal the derived break word or the build refuses. The skew part carries no mark.
FACTORS = ("OBI", "VWAP", "CVD")
VOTE_LIMITS = ("obiVote", "vwapTicks", "tick")


def conviction_for(n_fails):
    """The desk's ladder, detectors.py: High if no fail, Building on one, else Standard."""
    return "High" if n_fails == 0 else ("Building" if n_fails == 1 else "Standard")


def votes_for(obi, px, vwap, cvd, lim):
    """The desk's three votes on one reading, indicators.py line for line: an absent
    input votes neutral; OBI bull at or past +obiVote, bear at or past -obiVote; VWAP
    bull when the price is more than vwapTicks ticks above it, bear when as far below;
    CVD bull on a positive value, bear on a negative one (the desk votes cvd_vote(slope)
    and prints that same slope as CVD, so the sign of the printed number is the vote
    input, as 03's live vote reads it). 0 is neutral for OBI and CVD."""
    obi_vote, ticks, tick = float(lim["obiVote"]), float(lim["vwapTicks"]), float(lim["tick"])
    v = {"OBI": "neutral", "VWAP": "neutral", "CVD": "neutral"}
    if obi is not None:
        v["OBI"] = "bull" if obi >= obi_vote else ("bear" if obi <= -obi_vote else "neutral")
    if px is not None and vwap is not None:
        d = px - vwap
        v["VWAP"] = "bull" if d > ticks * tick else ("bear" if d < -ticks * tick else "neutral")
    if cvd is not None:
        v["CVD"] = "bull" if cvd > 0 else ("bear" if cvd < 0 else "neutral")
    return v


def fails_for(votes, want):
    """indicators.confluence: every factor that did not vote the break's way, in factor order."""
    return tuple(k for k in FACTORS if votes[k] != want)


def mark(name, fl):
    """The desk's mark after a factor: a space, then ✗ when the factor is in the recorded
    fails, else ✓; the glyph in the class 03's live cards give theirs (never colour alone)."""
    bad = name in fl
    return ' <span class="ah-aw-%s">%s</span>' % ("bad" if bad else "ok", "✗" if bad else "✓")


def alert_case_markup(cfg, T, F, L, fails):
    """The two written-out alert cards for 03 (design contract 2.4)."""
    ac = cfg["alertCase"]
    # The toy's EXAMPLE is the tier-2 page's and stays as it is; this page's case may
    # override its OBI with a synthetic value of its own (alertCase.obi), so the break
    # card can show a vote the toy's reversal cases never needed.
    E = dict(tier2_desk_toy.EXAMPLE)
    if "obi" in ac:
        E["obi"] = float(ac["obi"])
    missing = [k for k in VOTE_LIMITS if k not in L]
    if missing:
        fails.append("alertCase: the vote needs the limits %s in pieces.alertwire.limits; missing: %s"
                     % (", ".join(VOTE_LIMITS), ", ".join(missing)))
        return ""
    want = "bull" if ac["dir"] == "dirLong" else "bear"
    break_fails = fails_for(votes_for(E["obi"], E["px"], E["vwap"], E["cvd"], L), want)
    gap_fails = fails_for(votes_for(E["obi"], E["px"], None, None, L), want)
    # the ghost: the gap card's absent values filled with 0 and voted again (03's
    # ghostLine does the same); OBI is present, so it keeps its own vote
    ghost_fails = fails_for(votes_for(E["obi"], E["px"], 0, 0, L), want)
    conv, gap_conv = conviction_for(len(break_fails)), conviction_for(len(gap_fails))
    if ac["conviction"] != conv:
        fails.append("alertCase.conviction is %r, but under the desk's vote the break card's values record %d fail(s)"
                     " (%s), which the desk's ladder grades %s; the word is a tripwire and must equal the derived word"
                     % (ac["conviction"], len(break_fails), ", ".join(break_fails) or "none", conv))
        return ""
    try:
        sep = T["sep"]
        conv_word, flow = T["conv" + conv], T["flow" + conv]
        gap_word, gap_flow = T["conv" + gap_conv], T["flow" + gap_conv]
        direction, side = T[ac["dir"]], T[ac["side"]]
        trig, trig_name = T[ac["trig"]], T[ac["trigName"]]
        regime, why, zone = T["regime"], T["noPrints"], T["zone"]
        where_word = {1: T["whereAbove"], -1: T["whereBelow"], 0: T["whereAt"]}
    except KeyError as e:
        fails.append("alertCase: text key %s is not in 03's group" % e)
        return ""
    # The entry line's last part, as the desk derives it: the gap between the price at
    # the break and the level (two decimals and a space, or nothing at the level), then
    # the side word by the gap's sign.
    lvl = float(ac["lvl"])
    gap = E["px"] - lvl
    span = "" if gap == 0 else "%.2f " % abs(gap)
    where = where_word[(gap > 0) - (gap < 0)]
    base = dict(E)
    base.update({"trig_name": trig_name, "side": side, "trig": trig, "lvl": lvl,
                 "a.conviction": conv_word, "conviction": conv_word, "why": why,
                 "span": span, "where": where})

    def f(key, extra=None):
        """Fill one of the desk's formats; a miss or a surviving brace is a build error."""
        if key not in F:
            fails.append("alertCase: format %r is not in 03's group" % key)
            return "?"
        vals = dict(base)
        vals.update(extra or {})
        try:
            out = tier2_desk_toy.fill(F[key], vals)
        except KeyError as e:
            fails.append("formats.%s: field %s has no value to fill" % (key, e))
            return "?"
        if "{" in out:
            fails.append("formats.%s: a brace survived the fill: %r" % (key, out))
        return out

    def na(t):
        return '<span class="ah-na">%s</span>' % esc(t)

    def zeroed(t):
        """Escape, then turn the _Zero fences into the span around the zero alone."""
        return esc(t).replace("\x00", '<span class="ah-z">').replace("\x01", "</span>")

    clock = str(ac["clock"])                       # HH:MM:SS, the shape AH.clock.et() prints
    title = esc(direction.capitalize() + f("title"))
    entry = esc(f("entry"))
    read_break = esc(f("read") + " " + flow)
    read_gap = esc(f("read") + " " + gap_flow)
    # the desk's footer: Conviction · SYMBOL · clock and the zone word
    foot_break = esc(sep.join([f("foot"), str(ac["symbol"]), clock + " " + zone]))
    foot_gap = esc(sep.join([f("foot", {"a.conviction": gap_word, "conviction": gap_word}),
                             str(ac["symbol"]), clock + " " + zone]))
    obi, px, cvd = f("obi"), f("px"), f("cvd")
    skew = f("skew") + " " + regime
    s = esc(sep)

    def part(text, name, fl, gap=False):
        """One factor part as the desk prints it on a break: the text, then its mark."""
        return (na(text) if gap else esc(text)) + mark(name, fl)

    full_line = s.join([part(obi, "OBI", break_fails), part(px, "VWAP", break_fails),
                        part(cvd, "CVD", break_fails), esc(skew)])
    gap_line = s.join([part(obi, "OBI", gap_fails), part(T["vwapNa"], "VWAP", gap_fails, gap=True),
                       part(T["cvdNa"], "CVD", gap_fails, gap=True), esc(skew)])
    ice_line = na(f("ice"))
    # The ghost's marks: OBI is printed, not zeroed, so it keeps its own vote; a
    # zero-filled factor earns the mark its zero would get under the desk's vote, which
    # is the point of the line. A zero VWAP puts the price far above it, a vote the
    # break's way on a long break (a fabricated confirmation) and against it on a short;
    # a zero CVD is a neutral vote, which the desk counts as a fail. 03's live ghost
    # derives its marks from the same votes and limits, so still and live agree.
    ghost_line = s.join([part(obi, "OBI", ghost_fails),
                         zeroed(f("px", {"vwap": _Zero()})) + mark("VWAP", ghost_fails),
                         zeroed(f("cvd", {"cvd": _Zero()})) + mark("CVD", ghost_fails), esc(skew)])

    def head(read):
        return ('<p class="ah-alert-title">%s</p><p class="ah-alert-read">%s</p>'
                '<code class="ah-alert-line">%s</code>' % (title, read, entry))

    def foot_p(foot):
        return '<p class="ah-alert-foot">%s</p>' % foot

    card_break = ('<div class="ah-alert" data-case="break">%s<code class="ah-alert-line">%s</code>%s</div>'
                  % (head(read_break), full_line, foot_p(foot_break)))
    card_gap = ('<div class="ah-alert" data-case="gap">%s<code class="ah-alert-line">%s</code>'
                '<code class="ah-alert-line">%s</code>%s<code class="ah-alert-line ah-ghost">%s</code></div>'
                % (head(read_gap), gap_line, ice_line, foot_p(foot_gap), ghost_line))
    return card_break + card_gap


# ---- element removal (whole, nested) ---------------------------------------------

def element_end(page, m):
    """Index just past the element whose start tag is match m."""
    name = m.group(2).lower()
    if name in VOID or m.group(3).rstrip().endswith("/"):
        return m.end()
    depth = 1
    for t in TAG.finditer(page, m.end()):
        if t.group(2).lower() != name:
            continue
        if t.group(1) == "/":
            depth -= 1
            if depth == 0:
                return t.end()
        elif not t.group(3).rstrip().endswith("/"):
            depth += 1
    raise BuildError("unclosed <%s> near offset %d" % (name, m.start()))


def remove_elements(page, attrs_test, inner_test=None):
    """Remove every element whose start tag passes attrs_test (and whose whole
    markup passes inner_test, when given). Returns (page, removed count)."""
    pos, removed = 0, 0
    while True:
        m = next((t for t in TAG.finditer(page, pos) if t.group(1) == "" and attrs_test(t.group(3))), None)
        if m is None:
            return page, removed
        end = element_end(page, m)
        if inner_test is None or inner_test(page[m.start():end]):
            page = page[:m.start()] + page[end:]
            pos = m.start()
            removed += 1
        else:
            pos = m.end()


IS_MONAD = re.compile(r"""\bdata-ah-if\s*=\s*["']monad["']""")
IS_NUM = re.compile(r"\bdata-ah-num\b")
CLOSING = re.compile(r"</[A-Za-z][\w-]*\s*>$")


def resolve_num_elements(page, numbers):
    """Every [data-ah-num] element, innermost first: one that still carries an
    ungenerated %AH_NUM token is removed whole; the rest stay, tokens filled later.
    Returns (page, removed count)."""
    out, pos, removed = [], 0, 0
    while True:
        m = next((t for t in TAG.finditer(page, pos) if t.group(1) == "" and IS_NUM.search(t.group(3))), None)
        if m is None:
            out.append(page[pos:])
            return "".join(out), removed
        end = element_end(page, m)
        body = page[m.end():end]
        close = CLOSING.search(body) if end > m.end() else None
        inner, closing = (body[:close.start()], body[close.start():]) if close else (body, "")
        inner, n = resolve_num_elements(inner, numbers)
        removed += n
        keys = [k for kind, k in TOKEN.findall(page[m.start():m.end()] + inner) if kind == "NUM"]
        out.append(page[pos:m.start()])
        if any(k not in numbers for k in keys):
            removed += 1
        else:
            out.append(page[m.start():m.end()] + inner + closing)
        pos = end


# ---- numbers (Q5) ----------------------------------------------------------------

def resolve_numbers(evidence, guards, facts, cases_staged):
    """%AH_NUM keys -> printed string. A key that is not generated is absent, never 0."""
    N = {}
    desk = next((s for s in evidence.get("sources") or [] if s.get("id") == "trading-desk"), None)
    if desk:
        t = desk.get("tests") or {}
        if t.get("method") == "counted" and isinstance(t.get("files"), int):
            N["desk.tests.files"] = str(t["files"])
        s = desk.get("suite") or {}
        # The last full run prints as generated, whatever its result (Q5: generated is
        # printed, ungenerated is omitted; unfavourable is not ungenerated).
        if s.get("method") == "executed" and isinstance(s.get("passed"), int):
            N["desk.suite.passed"] = str(s["passed"])
            for k in ("failed", "skipped"):
                # The runner prints only the non-zero categories and the snapshot defaults
                # the rest to 0, so a 0 here is a default, not a parsed figure: omitted.
                if isinstance(s.get(k), int) and s[k] > 0:
                    N["desk.suite." + k] = str(s[k])
            if isinstance(s.get("green"), bool):
                # from the exit code, so a run red on errors alone still reads failed
                N["desk.suite.result"] = "passed" if s["green"] else "failed"
    c = guards.get("counts") or {}
    if isinstance(c.get("published"), int) and c["published"] > 0:
        N["guards.published"] = str(c["published"])
    if isinstance(c.get("staleExcluded"), int):
        N["guards.stale"] = str(c["staleExcluded"])
    if isinstance(evidence.get("generated"), str) and len(evidence["generated"]) >= 10:
        N["evidence.generated"] = evidence["generated"][:10]
    if isinstance(guards.get("generated"), str) and len(guards["generated"]) >= 10:
        N["guards.generated"] = guards["generated"][:10]
    if facts and facts.get("commit"):
        N["desk.commit"] = facts["commit"]
    if cases_staged:                  # 08's example cases, embedded for its staged pass
        N["guards.cases"] = str(cases_staged)
    return N


# ---- the forbidden list ----------------------------------------------------------

def load_forbidden(path):
    raw = load_json(path)
    return {
        "substrings": [s for s in raw.get("substrings", [])],
        "caseSensitive": [s for s in raw.get("caseSensitive", [])],
        "regex": [re.compile(p) for p in raw.get("regex", [])],
        "words": [re.compile(r"\b%s\b" % re.escape(w), re.IGNORECASE) for w in raw.get("words", [])],
        "allow": [a for a in raw.get("allow", [])],
        # Case-insensitive patterns for the page alone: the composed page and the page
        # folder, never the contract or the data files, which may hold the desk's own
        # words for them (a test name, a module path) that never reach the page.
        "pageRegex": [re.compile(p, re.IGNORECASE) for p in raw.get("pageRegex", [])],
    }


def scan_text(label, text, rules, page=False):
    hits = []
    for i, line in enumerate(text.splitlines(), 1):
        t = line
        for a in rules["allow"]:
            t = t.replace(a, "")
        low = t.lower()
        for s in rules["substrings"]:
            if s.lower() in low:
                hits.append((label, i, s))
        for s in rules["caseSensitive"]:
            if s in t:
                hits.append((label, i, s))
        for rx in rules["regex"] + (rules.get("pageRegex", []) if page else []):
            if rx.search(t):
                hits.append((label, i, "/%s/" % rx.pattern))
        for w in rules["words"]:
            if w.search(t):
                hits.append((label, i, w.pattern[2:-2]))
    return hits


def page_targets(site, page_dir, composed):
    """The composed page (in memory) and every file under the page folder except the
    page it replaces: everything that is, or becomes, the page."""
    targets = [("%s/index.html (composed)" % PAGE_REL.as_posix(), composed)]
    if page_dir.is_dir():
        for p in sorted(page_dir.rglob("*")):
            if p.is_file() and p != page_dir / "index.html":
                targets.append((p.relative_to(site).as_posix(), p.read_text(encoding="utf-8", errors="replace")))
    return targets


def scan_files(site, page_dir, composed, rules):
    """The page targets (with the page-scoped patterns), the design contract and the
    two data files (without them)."""
    targets = [(label, text, True) for label, text in page_targets(site, page_dir, composed)]
    for rel in (DESIGN_REL, GUARDS_REL, EVIDENCE_REL):
        p = site / rel
        if p.is_file():
            targets.append((rel.as_posix(), p.read_text(encoding="utf-8", errors="replace"), False))
    hits = []
    for label, text, page in targets:
        hits.extend(scan_text(label, text, rules, page))
    return hits, len(targets)


# ---- the build -------------------------------------------------------------------

def build(site, cfg_path, forbidden_path, write):
    """Compose, check, and write only when clean. Returns (ok, report lines)."""
    site = Path(site)
    rep, fails = [], []
    cfg = load_json(cfg_path)
    page_dir = site / PAGE_REL
    parts_dir = page_dir / "parts"
    order = list(cfg["compose"]["order"])
    if len(order) != len(set(order)):
        fails.append("compose.order repeats a key")

    # 1. the desk facts, checked first
    facts = read_facts(cfg_path, cfg, fails)
    if facts:
        rep.extend(tier2_desk_toy.report(facts))
    monad = read_literals(cfg.get("monadRoot"), entries(cfg, "monad"), fails)
    if monad is None:
        rep.append("  second root not read: every data-ah-if=\"monad\" region will be removed")
    else:
        rep.append("  second root: %d/%d literals found" % (len(monad), len(entries(cfg, "monad"))))
    bands = read_bands(cfg, fails) if any((cfg["pieces"].get(k) or {}).get("bands") for k in order) else None

    # 2. the generated data and the consistency gate
    evidence = load_json(site / EVIDENCE_REL) if (site / EVIDENCE_REL).is_file() else None
    guards = load_json(site / GUARDS_REL) if (site / GUARDS_REL).is_file() else None
    if evidence is None:
        fails.append("%s is missing" % EVIDENCE_REL.as_posix())
        evidence = {}
    if guards is None:
        fails.append("%s is missing" % GUARDS_REL.as_posix())
        guards = {}
    counts = guards.get("counts") or {}
    if counts.get("published") == 0:
        fails.append("guards.json publishes 0 guards: a false zero (the harness the generator reads is "
                     "empty); regenerate after the generator fix, never ship it")
    # The page reads none of the mutation inputs, and after the guards generator fix
    # the file holds none of them at all: a case still carrying one was generated
    # before that fix and is not shipped (design contract 2.5, section 10 step 1).
    carrying = [str(g.get("test")) for g in guards.get("guards") or []
                if any(k in g for k in MUTATION_INPUTS)]
    if carrying:
        fails.append("guards.json still carries mutation inputs (%s) on %d case(s), the first being %s: "
                     "it was generated before the guards generator fix; regenerate, never ship it"
                     % ("/".join(MUTATION_INPUTS), len(carrying), carrying[0]))
    # The mutation is plain words. A harness token in brackets, such as a line-ending
    # mode's name, is the harness's word, not the reader's (owner review 2026-09-29).
    tokened = [str(g.get("test")) for g in guards.get("guards") or []
               if MUTATION_TOKEN.search(str(g.get("mutation") or ""))]
    if tokened:
        fails.append("guards.json: %d mutation sentence(s) carry a bracketed harness token, the first on %s: "
                     "give that mode its own sentence in build_guards.py and regenerate" % (len(tokened), tokened[0]))
    ev_desk = next((s for s in evidence.get("sources") or [] if s.get("id") == "trading-desk"), {})
    commits = {"evidence sources[trading-desk].commit": ev_desk.get("commit"),
               "guards.source.commit": (guards.get("source") or {}).get("commit"),
               "read_desk().commit": facts.get("commit") if facts else None}
    if len(set(commits.values())) != 1 or None in commits.values():
        fails.append("the three commits do not agree: " + ", ".join("%s=%s" % kv for kv in commits.items()))
    sources_path = site / SOURCES_REL
    if sources_path.is_file():
        src = load_json(sources_path)
        desk_parts = set(Path(cfg["deskRoot"]).parts)
        clash = desk_parts & set(src.get("scanExclude") or [])
        if clash:
            fails.append("scanExclude names a path part of deskRoot (%s): the desk's own tests would count zero"
                         % ", ".join(sorted(clash)))
        ev_src = next((s for s in src.get("sources") or [] if s.get("id") == "trading-desk"), None)
        if ev_src:
            pointed = (Path(src.get("projectsRoot", "")) / ev_src.get("path", "")).resolve()
            if pointed != Path(cfg["deskRoot"]).resolve():
                rep.append("  note: evidence_sources.json points trading-desk at %s, not deskRoot" % pointed)
        # 2.5: every other worktree folder belongs in scanExclude, or the commit scan
        # counts the desk history once per worktree. A read-only listing; a note, not
        # a gate, because that figure is the front page's, not this page's.
        listing = tier2_desk_toy._git(Path(cfg["deskRoot"]), "worktree", "list", "--porcelain") or ""
        names = [Path(ln[len("worktree "):].strip()).name for ln in listing.splitlines()
                 if ln.startswith("worktree ")]
        loose = [n for n in names if n != Path(cfg["deskRoot"]).name and n not in set(src.get("scanExclude") or [])]
        if loose:
            rep.append("  note: worktree folder(s) not in scanExclude, so a commit scan would count the desk "
                       "history once per worktree: %s" % ", ".join(loose))
    else:
        fails.append("%s is missing" % SOURCES_REL.as_posix())

    # 3. the guards: families (08's wall) and the example cases (its live card)
    kept = guard_kept(guards, cfg.get("roles") or {}, fails)
    families = guard_families(cfg, kept, fails)
    cc = guard_cases_cfg(cfg, fails)
    cases = guard_cases(families, kept, cc["max"], cc["skip"]) if cc else []
    if families:
        rep.append("  guard families: %s; %d example case(s) staged"
                   % (", ".join("%s %d" % (f["key"], f["count"]) for f in families), len(cases)))
        empty = [f["key"] for f in families if f["count"] == 0]
        if empty:
            rep.append("  note: famil%s with no guard at this commit: %s" % ("y" if len(empty) == 1 else "ies",
                                                                            ", ".join(empty)))
    if cc and families and not cases and "guards" in order:
        fails.append("guards: no example case to stage (every family is empty, or no case names a test)")
    numbers = resolve_numbers(evidence, guards, facts, len(cases))
    gd = {"families": families, "cases": cases, "cc": cc}

    # 4. the shell
    shell_path = parts_dir / "00-shell.html"
    if not shell_path.is_file():
        fails.append("parts/00-shell.html is missing")
        return finish(fails, rep, None, None, write)
    shell = shell_path.read_text(encoding="utf-8")
    for mark in (MARK_STYLES, MARK_PIECES, MARK_SCRIPTS, "%AH_STAMP%"):
        if shell.count(mark) != 1:
            fails.append("00-shell.html must carry %s exactly once (found %d)" % (mark, shell.count(mark)))
    if CORE_TAG not in shell:
        fails.append("00-shell.html has no %s" % CORE_TAG)
    elif shell.find(CORE_TAG) > shell.find(MARK_SCRIPTS):
        fails.append("the scripts marker must come directly after the core script tag")
    if not re.search(re.escape(MARK_SCRIPTS) + r"\s*</body>", shell):
        fails.append("the scripts marker must be the last thing inside <body>")
    if re.search(r"<head>.*?<script", shell, re.S) and shell.find("<script") < shell.find("</head>"):
        fails.append("no script may sit in the head")

    # 5. the pieces, in order
    html_keys = facts["html"] if facts else set()
    premise = guards.get("premise") if isinstance(guards.get("premise"), str) else None
    filled, styles, scripts, fallbacks = [], [], [], 0
    for key in order:
        matches = sorted(parts_dir.glob("[0-9][0-9]-%s.html" % key)) if parts_dir.is_dir() else []
        if len(matches) != 1:
            fails.append("parts/NN-%s.html: %d files match, need exactly one" % (key, len(matches)))
            continue
        for rel in ("styles/%s.css" % key, "js/%s.js" % key):
            if not (page_dir / rel).is_file():
                fails.append("%s is missing" % rel)
        part = matches[0].read_text(encoding="utf-8")
        if 'id="ah-%s"' % key not in part:
            fails.append("%s: no root with id=\"ah-%s\"" % (matches[0].name, key))
        part, n = FALLBACK.subn("", part)
        fallbacks += n
        filled.append(fill_piece(key, part, cfg, facts, monad, bands, gd, numbers,
                                 premise, html_keys, fails))
        styles.append('<link rel="stylesheet" href="styles/%s.css">' % key)
        scripts.append('<script src="js/%s.js"></script>' % key)
    if fallbacks:
        rep.append("  hand-typed stand-in regions stripped: %d" % fallbacks)

    page = (shell.replace(MARK_STYLES, "\n  ".join(styles))
                 .replace(MARK_PIECES, "\n".join(filled))
                 .replace(MARK_SCRIPTS, "\n  ".join(scripts)))

    # 6. page-wide tokens: limits, config, numbers, conditional regions, stamp
    lim = facts["limits"] if facts else {}
    cfg_vals = {"max": str(int(cfg["budget"]["max"])), "seed": str(int(cfg["seed"])),
                "timings": attr(json.dumps(cfg["timings"], separators=(",", ":")))}

    def sub_page(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "LIM":
            if arg in lim:
                return num_str(lim[arg])
            if facts:      # with no desk read at all, the misses above already say why
                fails.append("%%AH_LIM:%s%% names a limit the desk read did not produce" % arg)
        if kind == "CFG":
            if arg in cfg_vals:
                return cfg_vals[arg]
            fails.append("%%AH_CFG:%s%% is not one of %s" % (arg, ", ".join(CFG_KEYS)))
        return m.group(0)
    page = TOKEN.sub(sub_page, page)

    try:
        page, dropped = resolve_num_elements(page, numbers)
        if dropped:
            rep.append("  numbers: %d element(s) with an ungenerated figure removed, not zeroed" % dropped)
        page = TOKEN.sub(lambda m: numbers[m.group(2)] if m.group(1) == "NUM" and m.group(2) in numbers
                         else m.group(0), page)
        if monad is None:
            page, dropped = remove_elements(page, IS_MONAD.search)
            rep.append("  conditional regions removed: %d" % dropped)
    except BuildError as e:
        fails.append(str(e))

    if facts and facts.get("commit"):
        stamp = "desk commit %s, read %s" % (facts["commit"], date.today().isoformat())
        if facts.get("dirty"):
            stamp += ", with uncommitted changes to the files read"
        page = page.replace("%AH_STAMP%", esc(stamp))

    # 7. the composed-page checks
    left = sorted(set(m.group(0) for m in TOKEN.finditer(page)))
    if left:
        fails.append("tokens left unfilled: %s" % ", ".join(left))
    n_auth = len(re.findall(r"order authority", page, re.IGNORECASE))
    if n_auth != 1:
        fails.append('"order authority" appears %d times; exactly one line is allowed' % n_auth)
    tail = page[page.find(CORE_TAG):] if CORE_TAG in page else ""
    n_scripts = len(re.findall(r'<script src="js/(?!core\.js)[\w-]+\.js"></script>', tail))
    if n_scripts != len(order) or len(order) != PIECES_EXPECTED:
        fails.append("piece script tags after the core tag: %d (order names %d, the contract says %d)"
                     % (n_scripts, len(order), PIECES_EXPECTED))
    js_dir = page_dir / "js"
    for p in (sorted(js_dir.glob("*.js")) if js_dir.is_dir() else []):
        if p.name == "core.js":
            continue
        for i, line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if RNG_CALL in line:
                fails.append("%s:%d calls %s: a piece draws from its own seeded generator, never the "
                             "core's, or the shared tape depends on which pieces are live"
                             % (p.relative_to(site).as_posix(), i, RNG_CALL))
    # 08's tally counts the cases the pass shows, so its one printed number is the staged
    # count, the same number the status's "case N of M" reads from the pass. A published
    # total there read as hundreds missed when the pass ended (owner review 2026-09-29).
    staged = len(page_pass(page).get("cases") or [])
    for m in TALLY.finditer(page):
        shown = TALLY_N.findall(m.group(1))
        if shown != [str(staged)]:
            fails.append("08's tally prints %s as its number(s); it must print the staged count alone (%d, "
                         "the cases in data-ah-pass): use %%AH_NUM:guards.cases%%" % (shown or "nothing", staged))
    # cases.skip names words that must never print: they are left out of the pass above,
    # and nothing that is or becomes the page may carry them.
    for label, text in (page_targets(site, page_dir, page) if cc else []):
        for i, line in enumerate(text.splitlines(), 1):
            for rx in cc["skip"]:
                if rx.search(line):
                    fails.append("cases.skip: %s:%d matches /%s/, a word the page never prints" % (label, i, rx.pattern))

    # 8. the forbidden list, last, over everything
    rules = load_forbidden(forbidden_path)
    hits, scanned = scan_files(site, page_dir, page, rules)
    for label, line, entry in hits:
        fails.append("forbidden: %s:%d:%s" % (label, line, entry))
    rep.append("  forbidden strings: %d hit(s) over %d file(s)" % (len(hits), scanned))
    rep.append("  pieces composed: %d of %d" % (len(filled), len(order)))
    rep.append("  numbers available: %d of %d (%s)" % (len(numbers), len(NUM_KEYS),
                                                        ", ".join(k for k in NUM_KEYS if k in numbers) or "none"))
    return finish(fails, rep, page, page_dir / "index.html", write)


def fill_piece(key, part, cfg, facts, monad, bands, gd, numbers, premise, html_keys, fails):
    """One piece: its data-ah-desk JSON, its text placeholders, the generated markup."""
    grp = cfg["pieces"].get(key) or {}
    T, F, L = {}, {}, {}
    if facts:
        for k in grp.get("text") or []:
            if k in facts["text"]:
                T[k] = facts["text"][k]
            else:
                fails.append("pieces.%s lists text key %r, which the desk read did not produce" % (key, k))
        for k in grp.get("formats") or []:
            if k in facts["formats"]:
                F[k] = facts["formats"][k]
            else:
                fails.append("pieces.%s lists format key %r, which the desk read did not produce" % (key, k))
        for k in grp.get("limits") or []:
            if k in facts["limits"]:
                L[k] = num_val(facts["limits"][k])
            else:
                fails.append("pieces.%s lists limit %r, which the desk read did not produce" % (key, k))
    if monad:
        for k in grp.get("monad") or []:
            if k in monad:
                T[k] = monad[k]
    desk = {"text": {k: text_json(k, v, html_keys) for k, v in T.items()}, "fmt": F, "lim": L}
    if grp.get("bands") and bands:
        desk.update(bands)
    part = part.replace("%AH_DESK%", attr(json.dumps(desk, ensure_ascii=False, separators=(",", ":"))))

    def sub(m):
        kind, arg = m.group(1), m.group(2)
        if kind == "TEXT":
            return text_markup(arg, T[arg], html_keys) if arg in T else m.group(0)
        # 08: the family tiles, the still's example cases, the staged pass (one attribute).
        # An empty result leaves the token, so the unfilled-token check refuses the build.
        if kind == "GUARD_FAMILIES":
            return guard_families_markup(gd["families"], numbers.get("guards.generated", "")) \
                if gd["families"] else m.group(0)
        if kind == "GUARD_EXAMPLES":
            return guard_examples_markup(gd["cases"], gd["families"], gd["cc"]["examples"]) \
                if gd["cases"] and gd["cc"] else m.group(0)
        if kind == "GUARD_PASS":
            return guard_pass_attr(gd["cases"], gd["cc"]) if gd["cases"] and gd["cc"] else m.group(0)
        if kind == "GUARD_PREMISE":       # the generated premise sentence, verbatim
            return esc(premise) if premise else m.group(0)
        if kind == "ALERT_CASE":
            return alert_case_markup(cfg, T, F, L, fails) if facts else m.group(0)
        if kind == "BANDS":
            return bands_markup(bands) if bands else m.group(0)
        return m.group(0)          # LIM, CFG, NUM, STAMP are page-wide
    return TOKEN.sub(sub, part)


def finish(fails, rep, page, out_path, write):
    if fails:
        rep.append("  RESULT: %d problem(s); nothing written" % len(fails))
        return False, rep, fails
    if write and page is not None:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(page, encoding="utf-8", newline="\n")
        rep.append("  RESULT: clean; wrote %s (%d bytes)" % (out_path, len(page.encode("utf-8"))))
    else:
        rep.append("  RESULT: clean; dry run, nothing written")
    return True, rep, []


# ---- the self-test ---------------------------------------------------------------

STUB_SHELL = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>After Hours</title>
<link rel="stylesheet" href="styles/core.css">
<!-- AH:STYLES -->
</head>
<body data-ah-refresh="%AH_LIM:refresh%" data-ah-stale="%AH_LIM:stale%" data-ah-max="%AH_CFG:max%" data-ah-seed="%AH_CFG:seed%">
<h1>After Hours</h1>
<!-- AH:PIECES -->
<footer>
<p data-ah-num>tests counted: %AH_NUM:desk.tests.files% (counted %AH_NUM:evidence.generated% at desk commit %AH_NUM:desk.commit%)<span data-ah-num>, %AH_NUM:desk.suite.skipped% skipped</span></p>
<p data-ah-num="desk.suite.passed" data-result="%AH_NUM:desk.suite.result%">suite: %AH_NUM:desk.suite.passed% passed<span data-ah-num="desk.suite.failed">, %AH_NUM:desk.suite.failed% failed</span><span data-ah-num="desk.suite.skipped">, %AH_NUM:desk.suite.skipped% skipped</span> in the last full run, which %AH_NUM:desk.suite.result%</p>
<p>%AH_STAMP%</p>
</footer>
<script src="js/core.js"></script>
<!-- AH:SCRIPTS -->
</body></html>
"""

STUB_PIECE = '<section class="ah-piece" id="ah-{key}" data-ah-desk="%AH_DESK%"><h2>{key}</h2>{body}</section>\n'

STUB_BODIES = {
    "board": "<p>%AH_TEXT:mixed%</p><p>%AH_TEXT:ro%</p>",
    "alertwire": "%AH_ALERT_CASE%",
    "mesh": '<svg xmlns="http://www.w3.org/2000/svg" data-ah-timings="%AH_CFG:timings%"></svg>'
            "<p>A separate program has order authority on sim/eval accounts only.</p>",
    "regime": "%AH_BANDS%<p>%AH_TEXT:gradeNow%</p>",
    "heartbeat": '<ul><li>%AH_TEXT:vOk%</li><li data-ah-if="monad">%AH_TEXT:upToDate%</li></ul>',
    "guards": "<p>%AH_GUARD_PREMISE%</p><!-- AH:FALLBACK --><p>typed stand-in</p><!-- /AH:FALLBACK -->"
              '<ol>%AH_GUARD_FAMILIES%</ol><div data-ah-pass="%AH_GUARD_PASS%">%AH_GUARD_EXAMPLES%</div>'
              '<p class="ah-g-tally ah-live-only" data-ah-num="guards.cases">caught <b class="ah-g-n" data-ah-g-caught>0</b>'
              ' of <b class="ah-g-n">%AH_NUM:guards.cases%</b> staged cases this pass</p>'
              "<p>%AH_NUM:guards.published% guards, %AH_NUM:guards.cases% staged</p>",
}

STUB_DESK = {
    "server/sentinel/skew/engine.py":
        "class SkewConfig:\n    refresh_secs: float = 15.0\n    stale_after_s: float = 30.0\n\n"
        "regime = \"fear\" if self._sign > 0 else \"inverted\"\n",
    "server/sentinel/alerting/discord.py":
        "return \"`\" + \"  ·  \".join(parts) + \"`\"\n"
        "f\"OBI {obi:+.3f}\" f\"px {px:.2f} vs VWAP {vwap:.2f}\" f\"CVD {cvd:+.2f}\" f\"skew {skew:+.3f}\"\n"
        "f\"VWAP n/a{mark('VWAP')}\" f\"CVD n/a{mark('CVD')}\" f\"iceberg: not checked ({why})\"\n"
        "foot.append(f\"Conviction: {a.conviction}\")\n"
        "foot.append(f\"{et} ET\")\n"
        "where = \"above\" if gap > 0 else (\"below\" if gap < 0 else \"at\")\n"
        "return f\"`entry {px:.2f}  ·  broke {trig} {lvl:.2f}  ·  {span}{where}`\"\n",
    "server/sentinel/core/indicators.py":
        "# shared constants\nTICK = 0.25\nOBI_DEPTH = 10\nOBI_VOTE = 0.30         # |OBI| >= this votes\n"
        "VWAP_TICKS = 1          # neutral band, in ticks, around VWAP\n",
    "server/sentinel/alerting/detectors.py":
        "_TRIG_NAME = {\"HOD\": \"high-of-day\"}\n_FLOW = {\"High\": \"with the whole tape behind them.\", "
        "\"Building\": \"and order flow is starting to line up.\", "
        "\"Standard\": \"but order flow isn't behind it yet.\"}\n"
        "        while self.cvd_hist and self.cvd_hist[0][0] < t - 60:\n"
        "conviction = \"High\" if not fails else (\"Building\" if len(fails) == 1 else \"Standard\")\n"
        "side = \"Buyers\" if direction == \"long\" else \"Sellers\"\n"
        "read = f\"{side} broke the {trig_name} {_FLOW[conviction]}\"\n"
        "title = f\"{direction.capitalize()} setup — {trig_name} break\"\n",
    "server/sentinel/alerting/iceberg_watch.py": "return \"no trade prints on this feed\"\n",
    "web/live/app.js": "vtxt = \"MIXED\";\n",
    "web/index.html": "<span class=\"ro\">READ-ONLY</span>\n",
    "web/regime.html": ">Grade now</button>\n",
    "probe/doctor.ps1": "$report.verdict = switch ($exit) { 0 { 'OK' } 1 { 'DEGRADED' } 2 { 'DOWN' } }\n",
    "bellwether/config/grading_rules.json": json.dumps({
        "_note": "stub", "version": "REGIME_GRADE_V1",
        "grade_bands": [{"grade": "A", "min": 80.0}, {"grade": "F", "min": 0.0}],
        "regime_bands": [{"label": "STRONG_RISK_ON", "min": 85.0}, {"label": "RISK_OFF_STRESS", "min": 0.0}],
        "label_precedence": ["INSUFFICIENT_DATA", "BAND"]}),
}


def stub_config(desk_root, order):
    D, A, W, E, I = ("server/sentinel/alerting/discord.py", "server/sentinel/alerting/detectors.py",
                     "web/live/app.js", "server/sentinel/skew/engine.py", "server/sentinel/core/indicators.py")
    return {
        "deskRoot": desk_root, "monadRoot": desk_root + "-no-such-root",
        "limits": {
            "refresh": {"file": E, "ast": ["SkewConfig", "refresh_secs"]},
            "stale": {"file": E, "ast": ["SkewConfig", "stale_after_s"]},
            "cvdWindow": {"file": A, "regex": r"self\.cvd_hist\[0\]\[0\] < t - (\d+):"},
            "obiVote": {"file": I, "regex": r"OBI_VOTE = ([\d.]+)"},
            "vwapTicks": {"file": I, "regex": r"VWAP_TICKS = (\d+)"},
            "tick": {"file": I, "regex": r"\nTICK = ([\d.]+)"}},
        "text": {
            "sep": {"file": D, "find": "return \"`\" + \"  ·  \".join(parts) + \"`\"", "show": "  ·  "},
            "mixed": {"file": W, "find": "vtxt = \"MIXED\"", "show": "MIXED"},
            "ro": {"file": "web/index.html", "find": "<span class=\"ro\">READ-ONLY</span>", "show": "READ-ONLY"},
            "convHigh": {"file": A, "find": "conviction = \"High\" if not fails", "show": "High"},
            "convBuilding": {"file": A, "find": "(\"Building\" if len(fails) == 1 else \"Standard\")", "show": "Building"},
            "convStandard": {"file": A, "find": "(\"Building\" if len(fails) == 1 else \"Standard\")", "show": "Standard"},
            "flowHigh": {"file": A, "find": "\"High\": \"with the whole tape behind them.\"", "show": "with the whole tape behind them."},
            "flowBuilding": {"file": A, "find": "\"Building\": \"and order flow is starting to line up.\"", "show": "and order flow is starting to line up."},
            "flowStandard": {"file": A, "find": "\"Standard\": \"but order flow isn't behind it yet.\"", "show": "but order flow isn't behind it yet."},
            "trigHod": {"file": A, "find": "\"HOD\": \"high-of-day\"", "show": "high-of-day"},
            "trigCodeHod": {"file": A, "find": "\"HOD\": \"high-of-day\"", "show": "HOD"},
            "sideBuy": {"file": A, "find": "side = \"Buyers\" if direction == \"long\"", "show": "Buyers"},
            "dirLong": {"file": A, "find": "if direction == \"long\" else \"Sellers\"", "show": "long"},
            "regime": {"file": E, "find": "regime = \"fear\" if self._sign > 0", "show": "fear"},
            "noPrints": {"file": "server/sentinel/alerting/iceberg_watch.py", "find": "return \"no trade prints on this feed\"", "show": "no trade prints on this feed"},
            "vwapNa": {"file": D, "find": "f\"VWAP n/a{mark('VWAP')}\"", "show": "VWAP n/a"},
            "cvdNa": {"file": D, "find": "f\"CVD n/a{mark('CVD')}\"", "show": "CVD n/a"},
            "zone": {"file": D, "find": "foot.append(f\"{et} ET\")", "show": "ET"},
            "whereAbove": {"file": D, "find": "where = \"above\" if gap > 0", "show": "above"},
            "whereBelow": {"file": D, "find": "(\"below\" if gap < 0 else \"at\")", "show": "below"},
            "whereAt": {"file": D, "find": "(\"below\" if gap < 0 else \"at\")", "show": "at"},
            "gradeNow": {"file": "web/regime.html", "find": ">Grade now</button>", "show": "Grade now"},
            "vOk": {"file": "probe/doctor.ps1", "find": "0 { 'OK' }", "show": "OK"},
            "regimeVersion": {"file": "bellwether/config/grading_rules.json", "find": "\"version\": \"REGIME_GRADE_V1\"", "show": "REGIME_GRADE_V1"}},
        "formats": {
            "obi": {"file": D, "find": "OBI {obi:+.3f}"}, "px": {"file": D, "find": "px {px:.2f} vs VWAP {vwap:.2f}"},
            "cvd": {"file": D, "find": "CVD {cvd:+.2f}"}, "skew": {"file": D, "find": "skew {skew:+.3f}"},
            "ice": {"file": D, "find": "iceberg: not checked ({why})"},
            "title": {"file": A, "find": " setup — {trig_name} break"},
            "read": {"file": A, "find": "{side} broke the {trig_name}"},
            "foot": {"file": D, "find": "Conviction: {a.conviction}"},
            "entry": {"file": D, "find": "entry {px:.2f}  ·  broke {trig} {lvl:.2f}  ·  {span}{where}"}},
        "rules": {},
        "monad": {"upToDate": {"file": "DECISIONS.md", "find": "UP_TO_DATE", "show": "UP_TO_DATE"}},
        "compose": {"order": order},
        "pieces": {
            "board": {"text": ["mixed", "ro", "sep"], "limits": ["obiVote", "vwapTicks"]},
            "alertwire": {"text": ["sep", "convHigh", "convBuilding", "convStandard", "flowHigh", "flowBuilding",
                                   "flowStandard", "trigHod", "trigCodeHod", "sideBuy", "dirLong", "regime", "noPrints",
                                   "vwapNa", "cvdNa", "zone", "whereAbove", "whereBelow", "whereAt"],
                          "formats": ["obi", "px", "cvd", "skew", "ice", "title", "read", "foot", "entry"],
                          "limits": ["refresh", "stale", "cvdWindow", "obiVote", "vwapTicks", "tick"]},
            "regime": {"text": ["gradeNow"], "bands": True},
            "heartbeat": {"text": ["vOk"], "monad": ["upToDate"]}},
        "bands": {"file": "bellwether/config/grading_rules.json"},
        "alertCase": {"trig": "trigCodeHod", "trigName": "trigHod", "dir": "dirLong", "side": "sideBuy",
                      "conviction": "High", "obi": 0.34, "lvl": 5410.0, "clock": "09:47:12", "symbol": "ES"},
        "roles": {"omit": ["bot/"], "map": {"server/": "the desk server", "stop-desk.bat": "the stop button"}},
        "families": [{"key": "server", "label": "the server", "roles": ["the desk server"]},
                     {"key": "running", "label": "keeping it running", "roles": ["the stop button"]}],
        "cases": {"max": 36, "examples": 2, "seconds": 2.6, "reveal": 0.8, "stamp": 1.5, "hold": 6,
                  "skip": ["(?<![a-z])(tws|ibkr)(?![a-z])"]},
        "budget": {"max": 3}, "seed": 7,
        "timings": {"enter": 620, "wire": 480, "hold": 2200, "fileDown": 700},
    }


def selftest(forbidden_path):
    """A stub site in a temp dir. A clean build must write; a planted forbidden
    string, a stray token and a second bot line must each refuse to."""
    order = ["ambient", "board", "iceberg", "alertwire", "mesh", "regime", "skew", "heartbeat", "guards", "scanner"]
    tmp = Path(tempfile.mkdtemp(prefix="after-hours-selftest-"))
    results = []
    real_git = tier2_desk_toy._git
    try:
        site, desk = tmp / "site", tmp / "desk"
        page_dir = site / PAGE_REL

        def w(rel, text, root=site):
            p = root / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")

        for rel, text in STUB_DESK.items():
            w(rel, text, desk)
        w("parts/00-shell.html", STUB_SHELL, page_dir)
        for i, key in enumerate(order, 1):
            w("parts/%02d-%s.html" % (i, key), STUB_PIECE.format(key=key, body=STUB_BODIES.get(key, "<p>still</p>")), page_dir)
            w("styles/%s.css" % key, "/* %s */\n" % key, page_dir)
            w("js/%s.js" % key, "/* %s */\n" % key, page_dir)
        w("styles/core.css", "/* core */\n", page_dir)
        w("js/core.js", "/* core */\n", page_dir)
        w(DESIGN_REL.as_posix(), "# stub contract\n")
        w(SOURCES_REL.as_posix(), json.dumps({"projectsRoot": str(tmp).replace("\\", "/"), "scanExclude": ["_archive"],
                                              "sources": [{"id": "trading-desk", "path": "desk"}]}))
        w(EVIDENCE_REL.as_posix(), json.dumps({"generated": "2026-09-28T00:00:00+00:00", "sources": [
            {"id": "trading-desk", "commit": "abc1234", "tests": {"method": "counted", "files": 300},
             "suite": {"method": "unavailable", "reason": "not run"}}]}))
        w(GUARDS_REL.as_posix(), json.dumps({"generated": "2026-09-28T00:00:00+00:00", "source": {"commit": "abc1234"},
                                             "premise": "A test that has never failed is not a guard.",
                                             "counts": {"published": 4, "staleExcluded": 1},
                                             "guards": [{"test": "test_a", "file": "server/x.py", "mutation": "Deletes the protected text entirely."},
                                                        {"test": "test_b", "file": "stop-desk.bat", "mutation": "Appends a line."},
                                                        {"test": "test_c", "file": "bot/y.py", "mutation": "omitted"},
                                                        {"test": "test_d", "file": "server/z.py", "mutation": "Replaces the protected text."}]}))
        cfg_path = tmp / "config.json"
        cfg_path.write_text(json.dumps(stub_config(str(desk).replace("\\", "/"), order)), encoding="utf-8")
        tier2_desk_toy._git = lambda root, *args: "abc1234" if args and args[0] == "rev-parse" else ""

        out = page_dir / "index.html"

        def run(name, expect_ok, must_mention=None, forbidden=None, must_not_mention=None):
            if out.exists():
                out.unlink()
            ok, rep, fails = build(site, cfg_path, forbidden or forbidden_path, write=True)
            good = (ok == expect_ok) and (out.exists() == expect_ok)
            if must_mention and not any(must_mention in f for f in fails):
                good = False
            if must_not_mention and any(must_not_mention in f for f in fails):
                good = False
            results.append((good, name, fails))

        run("clean stub build writes the page", True)
        if not out.exists():
            good, name, fails = results[-1]
            print("  FAIL  %s" % name)
            for f in fails:
                print("          %s" % f)
            print("selftest: the clean stub build did not write; nothing further can be checked")
            return 1
        page = out.read_text(encoding="utf-8")
        checks = [
            ("title filled", "Long setup — high-of-day break" in page),
            ("read filled", "Buyers broke the high-of-day with the whole tape behind them." in page),
            ("entry filled with the gap and its side", "entry 5412.25  ·  broke HOD 5410.00  ·  2.25 above</code>" in page),
            ("break card foot ends with the zone word", "Conviction: High  ·  ES  ·  09:47:12 ET</p>" in page),
            ("gap card", 'class="ah-na">VWAP n/a' in page and "iceberg: not checked (no trade prints on this feed)" in page),
            ("gap card graded by the desk's ladder, two fails",
             "Buyers broke the high-of-day but order flow isn't behind it yet." in page
             and "Conviction: Standard  ·  ES  ·  09:47:12 ET</p>" in page),
            ("break card marks every factor from the desk's vote, never the skew",
             'OBI +0.340 <span class="ah-aw-ok">✓</span>' in page and "0.214" not in page
             and 'px 5412.25 vs VWAP 5410.75 <span class="ah-aw-ok">✓</span>' in page
             and 'CVD +312.00 <span class="ah-aw-ok">✓</span>' in page
             and 'skew +0.103 fear <span' not in page),
            ("gap card marks its two gaps as fails",
             '<span class="ah-na">VWAP n/a</span> <span class="ah-aw-bad">✗</span>' in page
             and '<span class="ah-na">CVD n/a</span> <span class="ah-aw-bad">✗</span>' in page),
            ("the vote thresholds reach 01 as limits",
             '&quot;lim&quot;:{&quot;obiVote&quot;:0.3,&quot;vwapTicks&quot;:1}}' in page),
            ("the vote thresholds reach 03 as limits",
             '&quot;obiVote&quot;:0.3,&quot;vwapTicks&quot;:1,&quot;tick&quot;:0.25}' in page),
            ("ghost card marks the zero alone, and the zero earns its own mark",
             'px 5412.25 vs VWAP <span class="ah-z">0.00</span> <span class="ah-aw-ok">✓</span>' in page
             and 'CVD <span class="ah-z">+0.00</span> <span class="ah-aw-bad">✗</span>' in page and "\x00" not in page),
            ("bands", 'data-grade="A" data-min="80">A · 80<' in page and "STRONG_RISK_ON" in page),
            ("limits on body", 'data-ah-refresh="15" data-ah-stale="30"' in page),
            ("desk json", 'data-ah-desk="{&quot;text&quot;:{&quot;mixed&quot;:&quot;MIXED&quot;' in page),
            ("guard families: one tile per family, generated count, config order",
             'data-family="server" data-count="2"' in page and 'data-family="running" data-count="1"' in page
             and page.find('data-family="server" data-count') < page.find('data-family="running" data-count')
             and '<b class="ah-g-n">1</b> guard<' in page and '<b class="ah-g-n">2</b> guards<' in page
             and 'data-generated="2026-09-28"' in page),
            ("guard families: the role words sit inside each tile",
             '<p class="ah-g-fam-roles">the desk server</p>' in page
             and '<p class="ah-g-fam-roles">the stop button</p>' in page),
            ("staged pass: round-robin across families, specific sentence first, then file order inside each; "
             "a test name staged once; the omitted folder left out",
             [(c.get("t"), c.get("f"), c.get("w")) for c in page_pass(page).get("cases", [])]
             == [("test_a", "server", "the desk server"), ("test_b", "running", "the stop button"),
                 ("test_d", "server", "the desk server")]
             and page_pass(page).get("sec") == 2.6 and page_pass(page).get("stamp") == 1.5),
            ("staged pass carries the plain-words mutation, never a path",
             page_pass(page).get("cases", [{}])[0].get("m") == "Deletes the protected text entirely."
             and "server/x.py" not in page and "stop-desk.bat" not in page and "bot/y.py" not in page),
            ("the still prints the configured number of example cases",
             page.count('<article class="ah-g-case"') == 2 and '<code class="ah-g-v ah-g-test">test_<wbr>a</code>' in page
             and '<code class="ah-g-v ah-g-test">test_<wbr>b</code>' in page and "test_<wbr>d" not in page),
            ("no list: no guard row, no role chip, the old tokens gone",
             "data-test=" not in page and "data-role=" not in page and "4 guards, 3 staged" in page),
            ("premise filled, stand-in stripped", "A test that has never failed is not a guard." in page
             and "typed stand-in" not in page and "AH:FALLBACK" not in page),
            ("nested unavailable span removed, its parent kept",
             "at desk commit abc1234)</p>" in page and "skipped" not in page),
            ("available number kept", "tests counted: 300 (counted 2026-09-28 at desk commit abc1234)" in page),
            ("unavailable number removed, not zeroed", "suite:" not in page and " 0 passed" not in page),
            ("monad region removed", "upToDate" not in page and "%AH_TEXT" not in page),
            ("timings", 'data-ah-timings="{&quot;enter&quot;:620' in page),
            ("stamp", "desk commit abc1234, read " in page),
            ("no token left", "%AH_" not in page),
            ("ten scripts after core", page.count("<script src=") == 11),
        ]
        for name, good in checks:
            results.append((good, "composed page: " + name, [] if good else ["see index.html in %s" % tmp]))

        # Staging order, on a fixture: family a holds a generic case before two specific
        # ones; t_twice is published twice, generic first (in b) and specific later (in
        # a); t_num_a and t_num_b share a sentence. Expected: specific before generic,
        # t_twice once and with its specific sentence, never one sentence twice in a row.
        gen = sorted(GENERIC_MUTATIONS)[0]
        num, keep, part = ("Changes a number in the protected text.", "Keeps the protected text and adds to it.",
                           "Removes part of the protected text.")
        fx = guard_cases([{"key": "a", "words": ["wa"]}, {"key": "b", "words": ["wb"]}],
                         [({"test": "t_gen", "mutation": gen}, "wa"), ({"test": "t_num_a", "mutation": num}, "wa"),
                          ({"test": "t_twice", "mutation": gen}, "wb"), ({"test": "t_num_b", "mutation": num}, "wb"),
                          ({"test": "t_keep_b", "mutation": keep}, "wb"), ({"test": "t_twice", "mutation": part}, "wa")],
                         36)
        got = [(c["t"], c["m"]) for c in fx]
        results.append((got == [("t_num_a", num), ("t_keep_b", keep), ("t_twice", part), ("t_num_b", num), ("t_gen", gen)],
                        "staging: a specific sentence before a generic one, a repeated test name staged once "
                        "(its specific case), no sentence twice in a row",
                        ["staged %s" % ", ".join(t for t, _ in got)]))

        board = page_dir / "parts" / "02-board.html"
        clean = board.read_text(encoding="utf-8")
        board.write_text(clean.replace("<h2>board</h2>", "<h2>board DESKTOP-SK93P40</h2>"), encoding="utf-8")
        run("planted forbidden string refuses the build", False, "parts/02-board.html:1:DESKTOP-")
        board.write_text(clean.replace("<h2>board</h2>", "<h2>board %AH_TEXT:nope%</h2>"), encoding="utf-8")
        run("stray token refuses the build", False, "%AH_TEXT:nope%")
        board.write_text(clean.replace("<h2>board</h2>", "<h2>order authority</h2>"), encoding="utf-8")
        run("a second bot line refuses the build", False, "order authority")
        board.write_text(clean, encoding="utf-8")
        run("restored stub builds again", True)

        # The vote is the desk's, not a typed tuple: the toy's own OBI (0.214) is neutral
        # under the threshold, which is one fail, which the ladder grades Building.
        clean_cfg = cfg_path.read_text(encoding="utf-8")

        def with_case(**changes):
            d = json.loads(clean_cfg)
            d["alertCase"].update(changes)
            cfg_path.write_text(json.dumps(d), encoding="utf-8")

        with_case(obi=0.214, conviction="High")
        run("a conviction word the desk's vote does not grade refuses the build", False, "grades Building")
        with_case(obi=0.214, conviction="Building")
        run("a neutral OBI builds as one fail", True)
        neutral = out.read_text(encoding="utf-8") if out.exists() else ""
        results.append((neutral.count('OBI +0.214 <span class="ah-aw-bad">✗</span>') == 3
                        and "Buyers broke the high-of-day and order flow is starting to line up." in neutral
                        and "Conviction: Building  ·  ES  ·  09:47:12 ET</p>" in neutral
                        and "Conviction: Standard  ·  ES  ·  09:47:12 ET</p>" in neutral
                        and "Conviction: High" not in neutral,
                        "composed page: a neutral OBI marks ✗ on all three lines, Building on the break, Standard on the gap",
                        []))
        cfg_path.write_text(clean_cfg, encoding="utf-8")
        run("restored config builds again", True)

        board_js = page_dir / "js" / "board.js"
        clean_js = board_js.read_text(encoding="utf-8")
        board_js.write_text(clean_js + "var r = AH.rng();\n", encoding="utf-8")
        run("a piece script calling AH.rng( refuses the build", False, "js/board.js:2 calls AH.rng(")
        board_js.write_text(clean_js, encoding="utf-8")
        run("restored piece script builds again", True)

        ev_path = site / EVIDENCE_REL
        clean_ev = ev_path.read_text(encoding="utf-8")

        def with_suite(suite):
            d = json.loads(clean_ev)
            d["sources"][0]["suite"] = suite
            ev_path.write_text(json.dumps(d), encoding="utf-8")

        with_suite({"method": "executed", "exit_code": 1, "green": False, "passed": 1234, "failed": 10, "skipped": 5})
        run("a red suite result builds", True)
        red = out.read_text(encoding="utf-8") if out.exists() else ""
        results.append(('data-result="failed">suite: 1234 passed<span data-ah-num="desk.suite.failed">, 10 failed</span>'
                        '<span data-ah-num="desk.suite.skipped">, 5 skipped</span> in the last full run, which failed</p>' in red,
                        "composed page: a red run prints as generated, with its result word", []))
        with_suite({"method": "executed", "exit_code": 0, "green": True, "passed": 3, "failed": 0, "skipped": 0})
        run("a green suite result builds", True)
        green = out.read_text(encoding="utf-8") if out.exists() else ""
        results.append(("suite: 3 passed in the last full run, which passed</p>" in green
                        and "0 failed" not in green and "0 skipped" not in green,
                        "composed page: a green run omits the runner's unprinted categories, never 0", []))
        ev_path.write_text(clean_ev, encoding="utf-8")
        run("restored evidence builds again", True)

        guards_path = site / GUARDS_REL
        clean_guards = guards_path.read_text(encoding="utf-8")
        stale_shape = json.loads(clean_guards)
        stale_shape["guards"][0]["find"] = "protected text"
        stale_shape["guards"][0]["replace"] = ""
        guards_path.write_text(json.dumps(stale_shape), encoding="utf-8")
        run("guards.json still carrying mutation inputs refuses the build", False, "mutation inputs")
        guards_path.write_text(clean_guards, encoding="utf-8")
        run("restored guards.json builds again", True)

        # 08's families: every role word the roles map produces sits in exactly one family.
        def with_cfg(change):
            d = json.loads(clean_cfg)
            change(d)
            cfg_path.write_text(json.dumps(d), encoding="utf-8")

        with_cfg(lambda d: d["roles"]["map"].update({"web/": "the web layer"}))
        run("a role word the map produces but no family holds refuses the build", False,
            "role word 'the web layer' is in no family")
        with_cfg(lambda d: d["families"][1]["roles"].append("the desk server"))
        run("a role word in two families refuses the build", False,
            "role word 'the desk server' is in 2 families (server, running)")
        with_cfg(lambda d: d["families"][0]["roles"].append("the moon"))
        run("a family naming a word the map does not produce refuses the build", False,
            "which the roles map does not produce")
        with_cfg(lambda d: d.pop("families"))
        run("no families list refuses the build", False, "no families list")
        with_cfg(lambda d: d["cases"].update({"reveal": 2.0}))
        run("a live-card cadence out of order refuses the build", False, "reveal < stamp < seconds")
        with_cfg(lambda d: d["cases"].update({"skip": ["(tws"]}))
        run("a skip pattern that does not compile refuses the build", False, "does not compile")
        cfg_path.write_text(clean_cfg, encoding="utf-8")
        guards_part = page_dir / "parts" / ("%02d-guards.html" % (order.index("guards") + 1))
        clean_part = guards_part.read_text(encoding="utf-8")
        guards_part.write_text(clean_part.replace("<ol>", "<ol>%AH_GUARD_ROWS%"), encoding="utf-8")
        run("a part still carrying the retired row token refuses the build", False, "%AH_GUARD_ROWS%")
        guards_part.write_text(clean_part, encoding="utf-8")
        run("restored families build again", True)

        # 08's tally: its one printed number is the staged count, never the published total.
        guards_part.write_text(clean_part.replace("of <b class=\"ah-g-n\">%AH_NUM:guards.cases%",
                                                  "of <b class=\"ah-g-n\">%AH_NUM:guards.published%"), encoding="utf-8")
        run("a tally printing the published total, not the staged count, refuses the build", False,
            "08's tally prints ['4']")
        guards_part.write_text(clean_part, encoding="utf-8")
        run("restored tally builds again", True)
        results.append(('of <b class="ah-g-n">3</b> staged cases this pass' in out.read_text(encoding="utf-8")
                        if out.exists() else False, "composed page: the tally reads of 3 staged cases", []))

        # cases.skip: a test named after the broker platform is never staged, still counts in
        # its family, and the page refuses the word; a mutation sentence carries no mode token.
        broker = json.loads(clean_guards)
        broker["guards"].insert(0, {"test": "test_the_tws_chip_reads_the_engine", "file": "server/w.py",
                                    "mutation": "Replaces the protected text."})
        guards_path.write_text(json.dumps(broker), encoding="utf-8")
        run("a guard named after the broker platform builds, left out of the pass", True)
        skipped = out.read_text(encoding="utf-8") if out.exists() else ""
        results.append(([c.get("t") for c in page_pass(skipped).get("cases", [])] == ["test_a", "test_b", "test_d"]
                        and 'data-family="server" data-count="3"' in skipped and "tws" not in skipped.lower(),
                        "composed page: the skipped case is not staged and still counts in its family", []))
        board.write_text(clean.replace("<h2>board</h2>", "<h2>board: the TWS chip</h2>"), encoding="utf-8")
        run("the broker platform's word planted in a part refuses the build", False,
            "cases.skip: trading/after-hours/parts/02-board.html:1")
        board.write_text(clean, encoding="utf-8")
        paged = load_json(forbidden_path)
        paged["pageRegex"] = ["(?<![a-z])(tws|ibkr)(?![a-z])"]
        paged_path = tmp / "forbidden-paged.json"
        paged_path.write_text(json.dumps(paged), encoding="utf-8")
        run("a page-scoped forbidden pattern passes over the data files", True, forbidden=paged_path)
        with_cfg(lambda d: d["cases"].pop("skip"))
        run("with no skip, the page-scoped forbidden pattern refuses the staged name on the page", False,
            "forbidden: trading/after-hours/index.html (composed)", forbidden=paged_path,
            must_not_mention="forbidden: data/guards.json")
        cfg_path.write_text(clean_cfg, encoding="utf-8")
        tokened = json.loads(clean_guards)
        tokened["guards"][0]["mutation"] = "Rewrites the file's line endings (ToLF)."
        guards_path.write_text(json.dumps(tokened), encoding="utf-8")
        run("a mutation sentence carrying a bracketed harness token refuses the build", False, "bracketed harness token")
        guards_path.write_text(clean_guards, encoding="utf-8")
        run("restored guards and skip build again", True)

        # The real list must keep every class section 7 names; a trimmed list is a
        # leak waiting to happen. Names and handles are not repeated here: this file
        # is not scanned, but the design says they are spelled out in one place only.
        raw = load_json(forbidden_path)
        wanted = {
            "substrings": ["C:\\", "C:/", "http", "webhooks/", "COMPUTERNAME", ".jsonl.gz", "%USERPROFILE%"],
            "caseSensitive": ["DESKTOP-", "CR-", "SAFE-0", "WEB-", "DISP-", "SKIN-", "GATE-"],
            "words": ["law", "maker"],
            "allow": ["https://fonts.googleapis.com", "https://fonts.gstatic.com", "http://www.w3.org/2000/svg"],
        }
        for group, need in wanted.items():
            have = set(raw.get(group) or [])
            lost = [s for s in need if s not in have]
            results.append((not lost, "forbidden list keeps its %s" % group,
                            ["missing: %s" % ", ".join(lost)] if lost else []))
        results.append((bool(raw.get("regex")), "forbidden list keeps a tape-stem regex", []))
        results.append((len(raw.get("substrings") or []) >= 10 + 12, "forbidden list is the ten seed entries plus the additions", []))
    finally:
        tier2_desk_toy._git = real_git
        shutil.rmtree(tmp, ignore_errors=True)

    bad = [r for r in results if not r[0]]
    for good, name, fails in results:
        print("  %s  %s" % ("PASS" if good else "FAIL", name))
        if not good:
            for f in fails[:8]:
                print("          %s" % f)
    print("selftest: %d checks, %d failed" % (len(results), len(bad)))
    return 1 if bad else 0


# ---- entry -----------------------------------------------------------------------

def main(argv=None):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dry-run", action="store_true", help="run every check, write nothing")
    ap.add_argument("--selftest", action="store_true", help="stub site in a temp dir; planted leaks must fail")
    ap.add_argument("--site", default=str(REPO_ROOT), help=argparse.SUPPRESS)
    ap.add_argument("--config", default=str(CONFIG_PATH), help=argparse.SUPPRESS)
    ap.add_argument("--forbidden", default=str(FORBIDDEN_PATH), help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest(a.forbidden)
    ok, rep, fails = build(a.site, a.config, a.forbidden, write=not a.dry_run)
    print("after hours%s:" % (" (dry run)" if a.dry_run else ""))
    for line in rep:
        print(line)
    if fails:
        print("  PROBLEMS (%d):" % len(fails))
        for f in fails:
            print("    " + f)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
