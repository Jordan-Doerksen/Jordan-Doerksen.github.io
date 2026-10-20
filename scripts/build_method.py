"""Stamp the method page (item 24, CR-28). Stdlib only.

The page, method/index.html, holds its words. Three kinds of content are generated into it between
marker comments, so no fact about the kit is typed (PRIN-03):

    <!-- md:stamp NAME --> ... <!-- /md:stamp NAME -->

  * from method/data/kit.json (written by the kit's docs/publish.mjs, never edited here):
    adopt-count, adopt-questions, transcript-adopt|doctor|doctor_kit|guard, transcript-meta, install,
    rulegrade-01..06 (ids from method/sources.json), grades-drawer, kit-line
  * from method/diagram.json: diagram-0 .. diagram-9, the one diagram at the end of each chapter
  * from method/motion.json: the inline <script id="md-motion"> block, so the page never fetches

    python scripts/build_method.py            stamp the page in place
    python scripts/build_method.py --check    compare the page with a fresh stamp; write nothing

Exit codes are the Doctor's: 0 the page equals a fresh stamp, 1 it differs or breaks a rule,
2 could not look (an input is missing or invalid), which is never a pass. If kit.json is absent the
kit-free stamps still run, the kit stamps are left as they are, and the run exits 2.
Options: --root DIR (a site root other than this checkout), --kit FILE (a kit.json elsewhere).
Every run logs to scripts/logs/ through front_log.py, like the front build.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from front_log import EXIT_COULD_NOT_LOOK, EXIT_OK, EXIT_RED, CouldNotLook, Refused, get_logger   # noqa: E402

KIT_STAMPS = ("adopt-count", "adopt-questions", "transcript-adopt", "transcript-doctor", "transcript-doctor_kit",
              "transcript-guard", "transcript-meta", "install", "grades-drawer", "kit-line") + tuple("rulegrade-0%d" % i for i in range(1, 7))
NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]
# Chapters whose arrivals come from kit.json: their markup count cannot be checked without it.
KIT_CHAPTERS = ("md-interview", "adopt")


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").replace("\r\n", "\n")
    except OSError as err:
        raise CouldNotLook("cannot read %s: %s" % (path, err))


def read_json(path: Path):
    try:
        return json.loads(read_text(path))
    except json.JSONDecodeError as err:
        raise CouldNotLook("%s is not valid JSON: %s" % (path, err))


def esc(value) -> str:
    return html.escape(str(value), quote=True)


def stamp_re(name: str) -> re.Pattern:
    return re.compile(r"(<!-- md:stamp %s -->)(.*?)(<!-- /md:stamp %s -->)" % (re.escape(name), re.escape(name)), re.S)


def put(page: str, name: str, inner: str) -> str:
    pattern = stamp_re(name)
    if not pattern.search(page):
        raise CouldNotLook("the page has no stamp markers named %s" % name)
    return pattern.sub(lambda m: m.group(1) + inner + m.group(3), page, count=1)


def count_word(n: int) -> str:
    return NUMBER_WORDS[n] if n < len(NUMBER_WORDS) else str(n)


# ---- the stamps ------------------------------------------------------------------------------------------

def stamp_motion(page: str, motion: dict) -> str:
    body = {k: v for k, v in motion.items() if k != "source"}
    text = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
    if "</" in text or "<!--" in text:
        raise Refused("motion.json holds a sequence that would end the script block")
    pattern = re.compile(r'(<script type="application/json" id="md-motion">)(.*?)(</script>)', re.S)
    if not pattern.search(page):
        raise CouldNotLook("the page has no <script id=\"md-motion\"> block")
    return pattern.sub(lambda m: m.group(1) + "\n" + text + "\n" + m.group(3), page, count=1)


def diagram_html(spec: dict, n: int) -> str:
    out = ['<div class="md-dg" role="group" aria-label="%s">' % ("The outline of the method, still empty" if n == 0 else "The method so far, up to chapter %d" % n)]
    for zone in spec["zones"]:
        out.append('<div class="md-dgz"><span class="md-n">%s</span><ul class="md-dgp">' % esc(zone["label"]))
        for part in zone["parts"]:
            if part["ch"] > n:
                out.append('<li class="md-dp md-slot" aria-hidden="true"></li>')
            else:
                new = " md-new" if part["ch"] == n else ""
                out.append('<li class="md-dp%s" data-kind="%s">%s</li>' % (new, esc(part["kind"]), esc(part["label"])))
        out.append("</ul></div>")
    out.append("</div>")
    return "\n" + "\n".join(out) + "\n"


def stamp_questions(kit: dict) -> str:
    out = []
    for q in kit["adopt_questions"]:
        out.append('<li class="md-arr"><span class="md-n">Question %s</span><h3 class="md-h3">%s</h3><p class="md-p">%s</p>'
                   '<div class="md-p md-rec"><span class="md-recl">Recommended</span>%s</div></li>'
                   % (esc(q["n"]), esc(q["label"]), esc(q["question"]), esc(q["recommended"])))
    return "\n" + "\n".join(out) + "\n"


def stamp_install(kit: dict) -> str:
    out = []
    for i, cmd in enumerate(kit["install"], 1):
        out.append('<li class="md-arr md-cmd"><span class="md-n">Command %d</span><code>%s</code></li>' % (i, esc(cmd)))
    return "\n" + "\n".join(out) + "\n"


def stamp_rulegrade(kit: dict, sources: dict, key: str) -> str:
    ids = sources["rules"].get(key, [])
    if not ids:
        return "No kit grade shown"
    by_id = {c["id"]: c for c in kit["clauses"]}
    parts = []
    for cid in ids:
        c = by_id.get(cid)
        parts.append("%s · %s" % (esc(cid), esc(c["grade"]) if c else "not in the kit's public law"))
    return "Kit rule " + ", ".join(parts)


def stamp_drawer(kit: dict) -> str:
    counts = kit["grade_counts"]
    recount: dict = {}
    for c in kit["clauses"]:
        recount[c["grade"]] = recount.get(c["grade"], 0) + 1
    if {k: v for k, v in counts.items() if v} != recount:
        raise Refused("kit.json grade_counts %s do not match its clauses %s" % (counts, recount))
    out = ['<ul class="md-counts" aria-label="Rules by grade">']
    for grade, n in counts.items():
        out.append("<li>%s %s</li>" % (esc(grade), esc(n)))
    out.append("</ul>")
    out.append('<ol class="md-clauses">')
    for c in kit["clauses"]:
        out.append('<li class="md-clause" id="%s"><b>%s</b><i>%s</i><span>%s</span></li>' % (esc(c["id"]), esc(c["id"]), esc(c["grade"]), esc(c["rule"])))
    out.append("</ol>")
    return "\n" + "\n".join(out) + "\n"


def stamp_all(page: str, motion: dict, diagram: dict, sources: dict, kit: dict | None, log) -> tuple[str, list]:
    skipped = []
    page = stamp_motion(page, motion)
    for n, _ in enumerate(diagram["chapters"]):
        name = "diagram-%d" % n
        if stamp_re(name).search(page):
            page = put(page, name, diagram_html(diagram, n))
    if kit is None:
        skipped = list(KIT_STAMPS)
        return page, skipped
    page = put(page, "adopt-count", count_word(len(kit["adopt_questions"])))
    page = put(page, "adopt-questions", stamp_questions(kit))
    for key in ("adopt", "doctor", "doctor_kit", "guard"):
        page = put(page, "transcript-" + key, esc("\n".join(kit["transcripts"][key])))
    meta = kit["transcript_meta"]
    page = put(page, "transcript-meta", "Recorded %s on design-first %s. %s." % (esc(meta["recorded"]), esc(meta["kit_version"]), esc(str(meta["machine"]).rstrip("."))))
    page = put(page, "install", stamp_install(kit))
    for i in range(1, 7):
        page = put(page, "rulegrade-0%d" % i, stamp_rulegrade(kit, sources, "0%d" % i))
    page = put(page, "grades-drawer", stamp_drawer(kit))
    page = put(page, "kit-line", "Generated from %s %s, built %s. The page lists %d rules, each graded by what enforces it." % (
        esc(kit["kit"]), esc(kit["version"]), esc(kit["built"]), len(kit["clauses"])))
    return page, skipped


# ---- the integrity rules ---------------------------------------------------------------------------------

def check_motion(page: str, motion: dict, diagram: dict, kit_present: bool, log) -> list:
    """Return a list of broken rules. The markup and motion.json must agree, and every gap must be readable."""
    bad = []
    min_gap = motion["min_gap"]
    sections = {m.group(1): m.group(0) for m in re.finditer(r'<section id="([\w-]+)"[^>]*data-ch=.*?</section>', page, re.S)}
    ids = [i for i in diagram["chapters"] if i in sections or i in motion["chapters"]]
    for cid, c in motion["chapters"].items():
        if cid not in sections:
            bad.append("motion.json has chapter %s and the page has no section with that id" % cid)
            continue
        text = sections[cid]
        arrs = len(re.findall(r'<li class="md-arr[ "]', text))
        marks = len(re.findall(r'<li class="md-mark[ "]', text))
        at = c["arrive_at"]
        if cid in KIT_CHAPTERS and not kit_present:
            log.warn("chapter_count_unchecked", chapter=cid, reason="kit.json is absent, its arrivals are not stamped")
        elif len(at) != arrs:
            bad.append("%s: motion.json has %d arrivals, the page has %d" % (cid, len(at), arrs))
        if at != sorted(at):
            bad.append("%s: arrive_at is not ascending" % cid)
        for a, b in zip(at, at[1:]):
            if b - a < min_gap - 1e-9:
                bad.append("%s: arrivals at %s and %s are less than %s apart" % (cid, a, b, min_gap))
        last = c["file_at"] + max(marks - 1, 0) * c["file_stagger"] + c["file_span"]
        if at and c["file_at"] < at[-1] + min_gap - 1e-9:
            bad.append("%s: file_at %s leaves the last arrival less than %s to be read" % (cid, c["file_at"], min_gap))
        if last > 1.0 + 1e-9:
            bad.append("%s: the file-down ends at %.3f, past the end of the track" % (cid, last))
        for m in re.finditer(r'data-after="(\d+)"', text):
            if int(m.group(1)) >= len(at) - 1:
                bad.append("%s: a connector after arrival %s has no arrival after it" % (cid, m.group(1)))
    for n, cid in enumerate(diagram["chapters"]):
        if cid not in sections and cid != "md-top" and stamp_re("diagram-%d" % n).search(page):
            bad.append("diagram.json names chapter %s and the page has no section with that id" % cid)
    for m in re.finditer(r'<section id="([\w-]+)"[^>]*data-ch=', page):
        if m.group(1) not in diagram["chapters"]:
            bad.append("the page has section %s and diagram.json does not list it" % m.group(1))
    log.info("motion_checked", chapters=len(motion["chapters"]), broken=len(bad), ids=len(ids))
    return bad


# ---- the run ---------------------------------------------------------------------------------------------

def run(args, log) -> int:
    root = Path(args.root).resolve() if args.root else HERE.parent
    mdir = root / "method"
    page_path = mdir / "index.html"
    kit_path = Path(args.kit).resolve() if args.kit else mdir / "data" / "kit.json"
    page = read_text(page_path)
    motion = read_json(mdir / "motion.json")
    diagram = read_json(mdir / "diagram.json")
    sources = read_json(mdir / "sources.json")
    kit = None
    if kit_path.exists():
        kit = read_json(kit_path)
        for key in ("kit", "version", "built", "adopt_questions", "transcripts", "transcript_meta", "clauses", "grade_counts", "install"):
            if key not in kit:
                raise CouldNotLook("%s has no key %s" % (kit_path, key))
    else:
        log.warn("kit_absent", path=str(kit_path), reason="the kit stamps are left as they are")
    fresh, skipped = stamp_all(page, motion, diagram, sources, kit, log)
    broken = check_motion(fresh, motion, diagram, kit is not None, log)
    for line in broken:
        log.error("rule_broken", detail=line)
        print("BROKEN  " + line)
    if broken:
        raise Refused("%d rule(s) broken, nothing written" % len(broken))
    if args.check:
        if fresh != page:
            a, b = page.splitlines(), fresh.splitlines()
            at = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
            log.error("page_differs", first_difference_line=at + 1)
            print("DIFFERS  the page is not equal to a fresh stamp; first difference at line %d" % (at + 1))
            print("  page : %s" % (a[at][:140] if at < len(a) else "(ends)"))
            print("  fresh: %s" % (b[at][:140] if at < len(b) else "(ends)"))
            return EXIT_RED
        if skipped:
            print("UNCHECKED  %d kit stamps, because %s is absent. The rest equals a fresh stamp." % (len(skipped), kit_path))
            return EXIT_COULD_NOT_LOOK
        print("OK  the page equals a fresh stamp (%d chapters, kit %s)" % (len(motion["chapters"]), kit["version"]))
        return EXIT_OK
    if fresh != page:
        page_path.write_text(fresh, encoding="utf-8", newline="\n")
        log.info("page_written", path=str(page_path), bytes=len(fresh.encode("utf-8")), kit_stamps_skipped=len(skipped))
        print("wrote %s" % page_path)
    else:
        print("no change: %s" % page_path)
    if skipped:
        print("COULD NOT LOOK  %s is absent: %d kit stamps were left as they are." % (kit_path, len(skipped)))
        return EXIT_COULD_NOT_LOOK
    return EXIT_OK


def main() -> int:
    ap = argparse.ArgumentParser(description="Stamp method/index.html from kit.json, diagram.json and motion.json.")
    ap.add_argument("--check", action="store_true", help="compare the page with a fresh stamp; write nothing")
    ap.add_argument("--root", help="a site root other than this checkout")
    ap.add_argument("--kit", help="a kit.json other than <root>/method/data/kit.json")
    args = ap.parse_args()
    try:
        log = get_logger("build_method")
    except OSError as err:
        print("COULD NOT LOOK  cannot write the log: %s" % err)
        return EXIT_COULD_NOT_LOOK
    try:
        code = run(args, log)
    except CouldNotLook as err:
        log.error("could_not_look", reason=str(err))
        print("COULD NOT LOOK  %s" % err)
        code = EXIT_COULD_NOT_LOOK
    except Refused as err:
        log.error("refused", reason=str(err))
        print("RED  %s" % err)
        code = EXIT_RED
    log.finish({EXIT_OK: "ok", EXIT_RED: "red"}.get(code, "could_not_look"))
    return code


if __name__ == "__main__":
    sys.exit(main())
