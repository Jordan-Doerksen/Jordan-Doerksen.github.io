"""Static checks for the front page (D-A27). Stdlib only. Run: python scripts/front_check.py

Reads the generated pages, the generator's inputs and the front stylesheets and scripts, and
reports PASS / FAIL / UNKNOWN per check. Exit 0 = every check passed. Exit 1 = at least one FAIL.
Exit 2 = something could not be looked at (a missing input) and nothing failed. Exit 2 is NOT a pass.

Flags:
  --dir <path>      the pages to check (default docs/front-page)
  --require-all     all five screens must exist (the default allows a screen the builder skipped)
  --only <name>     run one check (names are printed in the report)

The browser checks (overflow, contrast, focus, JavaScript off, reduced motion) live in
scripts/front_probe.mjs. This file checks what can be known without rendering.
Each check is here because of a rule in docs/front-page-design/ARCHITECTURE.md; the rule is quoted
in the check's docstring so a failure says which promise broke.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
REPO = SCRIPTS.parent
sys.path.insert(0, str(SCRIPTS))
import front_log  # noqa: E402

PASS, FAIL, UNKNOWN = "PASS", "FAIL", "UNKNOWN"
STATUSES = ["live", "built", "active", "frozen", "superseded", "retired", "shelved", "private"]
CHROME = {"identity_navigation", "orientation_progress", "find"}


# -- reading ---------------------------------------------------------------------------------------


class Page(HTMLParser):
    """Collects what the checks need from one page: ids, classes, links, chrome, visible text."""

    def __init__(self, text: str):
        super().__init__(convert_charrefs=True)
        self.ids, self.classes, self.links, self.chrome = [], set(), [], []
        self.current = []                 # hrefs marked aria-current
        self.nav_hrefs = []               # hrefs inside <nav id="fp-nav">
        self.hidden_ids, self.tags = {}, []
        self.text, self._skip, self._in_nav, self.scripts = [], 0, 0, []
        self.rows = {"fp-proj-rows": 0}
        self._row_host = None
        self.row_status, self.has_comment_mark = [], "GENERATED" in text[:400]
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append(tag)
        if a.get("id"):
            self.ids.append(a["id"])
            if "hidden" in a:
                self.hidden_ids[a["id"]] = True
        for c in (a.get("class") or "").split():
            self.classes.add(c)
        if "data-chrome" in a:
            self.chrome.append(a["data-chrome"])
        if tag == "form" and "fp-find" in (a.get("class") or "").split():
            self.hidden_ids["form.fp-find"] = "hidden" in a
        if tag == "div" and a.get("id") == "fp-toolbar":
            self.hidden_ids["fp-toolbar"] = "hidden" in a
        if tag == "nav" and a.get("id") == "fp-nav":
            self._in_nav = 1
        if tag == "a" and a.get("href") is not None:
            self.links.append(("href", a["href"]))
            if self._in_nav:
                self.nav_hrefs.append(a["href"])
                if a.get("aria-current") == "page":
                    self.current.append(a["href"])
        for k in ("src", "href"):
            if tag in ("script", "link", "img", "iframe") and a.get(k):
                self.links.append((k, a[k]))
        if tag == "script":
            self.scripts.append(a)
            self._skip += 1
        if tag in ("style",):
            self._skip += 1
        if tag == "tbody" and a.get("id") == "fp-proj-rows":
            self._row_host = 0
        if tag == "tr" and self._row_host is not None:
            self._row_host += 1
            self.row_status.append(a.get("data-s"))

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1
        if tag == "nav":
            self._in_nav = 0
        if tag == "tbody" and self._row_host is not None:
            self.rows["fp-proj-rows"] = self._row_host
            self._row_host = None

    def handle_data(self, data):
        if not self._skip and data.strip():
            self.text.append(data.strip())


def read(path: Path):
    return path.read_text(encoding="utf-8", errors="replace").replace("\r\n", "\n")


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


# -- a small CSS reader: just enough to list selectors and declarations ----------------------------


def css_rules(css: str):
    """Yield (selector_text, body, at_rule_stack). Descends into @media/@container/@supports.
    @keyframes and @font-face bodies are skipped. Not a full parser; it is enough for this site's CSS."""
    css = strip_comments(css)
    out, i, n = [], 0, len(css)

    def block(start, stack):
        j = start
        while j < n:
            k = css.find("{", j)
            if k < 0:
                return n
            head = css[j:k].strip()
            depth, m = 1, k + 1
            while m < n and depth:
                depth += (css[m] == "{") - (css[m] == "}")
                m += 1
            body = css[k + 1:m - 1]
            if head.startswith("@"):
                name = head.split()[0].lower()
                if name in ("@media", "@container", "@supports", "@layer"):
                    inner = css_rules(body)
                    for sel, b, st in inner:
                        out.append((sel, b, [head] + st))
                # keyframes / font-face skipped on purpose
            elif head:
                out.append((head, body, list(stack)))
            j = m
        return n

    block(0, [])
    return out


# -- the checks ------------------------------------------------------------------------------------


class Ctx:
    def __init__(self, a):
        self.repo = Path(a.repo).resolve() if getattr(a, "repo", None) else REPO
        # A selftest copy holds only part of the tree; links out of it are looked up in the real one.
        self.fallback = REPO if self.repo != REPO else None
        self.dir = (self.repo / a.dir).resolve()
        self.require_all = a.require_all
        self.cfg = json.loads(read(self.repo / "scripts" / "front_page.config.json"))
        self.pages = {}
        for s in self.cfg["screens"]:
            p = self.dir / s["out"]
            if p.is_file():
                self.pages[s["id"]] = (p, Page(read(p)), read(p))
        self.css = {p.name: read(p) for p in sorted((self.repo / "styles/front").glob("*.css"))}
        self.js = {p.name: read(p) for p in sorted((self.repo / "js/front").glob("*.js"))}


def c_config_schema(x: Ctx):
    """Screens have id/url/out/title/group; ids are unique; every nav item names a screen."""
    ids = [s.get("id") for s in x.cfg["screens"]]
    bad = [s for s in x.cfg["screens"] if not all(k in s for k in ("id", "url", "out", "title"))]
    if bad or len(ids) != len(set(ids)):
        return FAIL, "screens missing a key or ids repeated: %s" % [b.get("id") for b in bad]
    groups = [g.get("id") for g in x.cfg.get("nav", {}).get("groups", [])]
    orphan = [s["id"] for s in x.cfg["screens"] if s.get("group") not in groups]
    if orphan or len(groups) != len(set(groups)):
        return FAIL, "screens in no nav group: %s (groups: %s)" % (orphan, groups)
    return PASS, "%d screens in %d nav groups" % (len(ids), len(groups))


def c_fresh_build(x: Ctx):
    """The pages on disk equal a fresh build (the generator's own --check)."""
    # Checking the repo root (--dir .) means checking the promoted build, so compare against --root.
    root_mode = x.dir == x.repo
    cmd = [sys.executable, str(SCRIPTS / "build_front_page.py")] + (["--root"] if root_mode else []) + ["--check"]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=REPO)
    if r.returncode == 0:
        return PASS, "build_front_page.py %s--check exits 0" % ("--root " if root_mode else "")
    if r.returncode == 1:
        return FAIL, "a page differs from a fresh build; run build_front_page.py (see scripts/logs)"
    return UNKNOWN, "build_front_page.py --check exited %d: an input is missing" % r.returncode


def c_pages_exist(x: Ctx):
    """Every screen has a page. Without --require-all a screen the builder skipped may be absent."""
    missing = [s["id"] for s in x.cfg["screens"] if s["id"] not in x.pages]
    if not x.pages:
        return UNKNOWN, "no pages found under %s" % x.dir
    if missing and x.require_all:
        return FAIL, "missing pages: %s" % missing
    return PASS, "built %d of %d%s" % (len(x.pages), len(x.cfg["screens"]), (" (skipped: %s)" % missing) if missing else "")


def _resolve(page_path: Path, href: str):
    h = href.split("#")[0].split("?")[0]
    if not h or re.match(r"^(https?:|mailto:|data:|javascript:)", href):
        return None
    t = (page_path.parent / h).resolve()
    if t.is_dir():
        t = t / "index.html"
    return t


def c_nav_identical(x: Ctx):
    """The nav lists the same destinations on every page, and exactly one is aria-current (the page itself)."""
    sets, problems = {}, []
    for sid, (p, pg, _) in x.pages.items():
        sets[sid] = sorted(str(_resolve(p, h)) for h in pg.nav_hrefs)
        if len(pg.current) != 1:
            problems.append("%s has %d aria-current" % (sid, len(pg.current)))
        elif _resolve(p, pg.current[0]) != p.resolve():
            problems.append("%s marks %s as current" % (sid, pg.current[0]))
    vals = list(sets.values())
    if any(v != vals[0] for v in vals):
        problems.append("nav destinations differ between pages")
    return (FAIL, "; ".join(problems)) if problems else (PASS, "%d pages, %d nav links each" % (len(vals), len(vals[0]) if vals else 0))


def c_links_resolve(x: Ctx):
    """Every relative href and src on a generated page points at a file that exists."""
    bad = []
    for sid, (p, pg, _) in x.pages.items():
        for kind, h in pg.links:
            t = _resolve(p, h)
            if t is not None and not t.exists():
                real = x.fallback / t.relative_to(x.repo) if x.fallback and x.repo in t.parents else None
                if not (real and real.exists()):
                    bad.append("%s: %s" % (sid, h))
            m = re.search(r"atlas/\?p=([\w-]+)", h)
            if m and not (x.repo / "data/projects" / (m.group(1) + ".json")).is_file():
                bad.append("%s: atlas entry %s has no data file" % (sid, m.group(1)))
    return (FAIL, "%d broken, first: %s" % (len(bad), bad[:4])) if bad else (PASS, "all relative links resolve")


def c_ids_unique(x: Ctx):
    """An id appears once per page (a carried piece must not collide with the shell's fp- ids)."""
    bad = []
    for sid, (_, pg, _) in x.pages.items():
        d = {i for i in pg.ids if pg.ids.count(i) > 1}
        if d:
            bad.append("%s: %s" % (sid, sorted(d)[:4]))
    return (FAIL, "; ".join(bad)) if bad else (PASS, "ids unique on every page")


def c_classes_defined(x: Ctx):
    """Every fp- class a page uses is styled somewhere. An fp- class styled but used nowhere is a warning in the detail."""
    defined = set()
    for name, css in x.css.items():
        defined |= set(re.findall(r"\.(fp-[a-z0-9-]+)", strip_comments(css)))
    used = set()
    for _, pg, _ in x.pages.values():
        used |= {c for c in pg.classes if c.startswith("fp-")}
    for js in x.js.values():
        # Only real class uses: selectors (".fp-x"), class="..." strings, className and classList calls.
        # A bare "fp-x" string is usually an element id (getElementById) and is not a class.
        used |= set(re.findall(r"\.(fp-[a-z0-9-]+)", js))
        for attr in re.findall(r"class(?:Name)?\s*=\s*[\"']([^\"']*)[\"']", js):
            used |= {c for c in attr.split() if c.startswith("fp-")}
        for call in re.findall(r"classList\.\w+\(([^)]*)\)", js):
            used |= set(re.findall(r"[\"'](fp-[a-z0-9-]+)[\"']", call))
    carry = {c for c in used if c.startswith("fp-carry")}
    undefined = sorted(used - defined - carry)
    unused = sorted(defined - used)
    if undefined:
        return FAIL, "used but not styled: %s" % undefined
    return PASS, "all used classes styled%s" % (("; styled but unused: %s" % unused) if unused else "")


def c_no_raw_values(x: Ctx):
    """Raw colour, radius, shadow and duration live in front.tokens.css only; no pill shape anywhere."""
    bad = []
    colour = re.compile(r"#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\boklab\(")
    pill = re.compile(r"border-radius\s*:[^;}]*(999|9999)px|border-radius\s*:\s*(50|100)%")
    for name, css in x.css.items():
        body = strip_comments(css)
        if name != "front.tokens.css":
            for m in colour.finditer(body):
                bad.append("%s: colour %s" % (name, m.group(0)))
            for m in re.finditer(r"(transition|animation)[^;{}]*\b\d*\.?\d+m?s\b", body):
                if not name.startswith("carry-"):
                    bad.append("%s: raw duration in %s" % (name, m.group(0)[:40]))
        for m in pill.finditer(body):
            bad.append("%s: pill radius %s" % (name, m.group(0)[:40]))
        if re.search(r"overflow-x\s*:\s*(auto|scroll)", body):
            bad.append("%s: overflow-x auto/scroll" % name)
    return (FAIL, "%d found, first: %s" % (len(bad), bad[:4])) if bad else (PASS, "tokens only; no pills; no sideways scroll rule")


def c_selectors_scoped(x: Ctx):
    """Every selector holds an fp- class (outside the RESET block); carried CSS sits under .fp-carry-<screen>."""
    bad = []
    for name, css in x.css.items():
        if name == "front.tokens.css":
            continue
        raw = css
        m = re.search(r"RESET BEGIN.*?RESET END", raw, flags=re.S)
        if m:
            raw = raw.replace(m.group(0), "")
        for sel, _, _ in css_rules(raw):
            for part in [s.strip() for s in sel.split(",") if s.strip()]:
                ok = part.startswith(".fp-carry-") if name.startswith("carry-") else ".fp-" in part
                if name == "front.bridge.css":
                    ok = ".fp-carry" in part
                if not ok:
                    bad.append("%s: %s" % (name, part[:60]))
    return (FAIL, "%d unscoped, first: %s" % (len(bad), bad[:4])) if bad else (PASS, "every selector is scoped")


def c_breakpoint_pair(x: Ctx):
    """768 is a literal in the shell CSS and in shell.js, and they agree (a media query cannot read a token)."""
    css, js = x.css.get("front.shell.css", ""), x.js.get("shell.js", "")
    a = set(re.findall(r"max-width:\s*(\d+)px", css))
    b = set(re.findall(r"max-width:\s*(\d+)px", js))
    mn = set(re.findall(r"min-width:\s*(\d+)px", css))
    if not a or not b:
        return UNKNOWN, "could not find the literal in %s" % ("CSS" if not a else "shell.js")
    if a != b or mn != {str(int(next(iter(a))) + 1)}:
        return FAIL, "CSS max-width %s, shell.js %s, CSS min-width %s" % (sorted(a), sorted(b), sorted(mn))
    return PASS, "max-width %spx in both, min-width %spx" % (next(iter(a)), next(iter(mn)))


def _num(s):
    return int(re.sub(r"[^\d]", "", s))


def c_home_figures(x: Ctx):
    """The figures on Home equal data/evidence.json. Absent is not zero."""
    if "home" not in x.pages:
        return UNKNOWN, "no home page"
    ev_path = x.repo / "data/evidence.json"
    if not ev_path.is_file():
        return UNKNOWN, "data/evidence.json is missing"
    ev = json.loads(read(ev_path))
    html = x.pages["home"][2]
    want = {"commits": ev["commitActivity"]["commits"], "repos": ev["commitActivity"]["repos"], "tests": ev["totals"]["ownTestFiles"]}
    got = [_num(v) for v in re.findall(r'class="fp-fig"[^>]*><b>([\d,]+)</b>', html)]
    desk = next((s for s in ev["sources"] if s["id"] == "trading-desk"), {})
    if desk.get("suite", {}).get("method") == "executed":
        want["passed"] = desk["suite"]["passed"]
    if got[:len(want)] != list(want.values()):
        return FAIL, "page shows %s, evidence.json says %s" % (got, list(want.values()))
    return PASS, "figures equal evidence.json: %s" % list(want.values())


def c_desk_rows(x: Ctx):
    """One static row per registry project plus desk.json extra; every status is a known one and has a marker rule."""
    if "desk" not in x.pages:
        return UNKNOWN, "no desk page"
    reg = json.loads(read(x.repo / "data/registry.json"))["projects"]
    extra = json.loads(read(x.repo / "data/desk.json")).get("extra", [])
    pg = x.pages["desk"][1]
    want = len(reg) + len(extra)
    got = pg.rows["fp-proj-rows"]
    unknown = sorted({s for s in pg.row_status if s not in STATUSES})
    parts = x.css.get("front.parts.css", "")
    nomark = [s for s in set(pg.row_status) if s and 'data-s="%s"]::before' % s not in parts]
    if got != want:
        return FAIL, "page has %d project rows, data has %d" % (got, want)
    if unknown or nomark:
        return FAIL, "unknown statuses %s; statuses with no marker rule %s" % (unknown, nomark)
    return PASS, "%d rows = %d registry + %d extra; every status has a marker" % (got, len(reg), len(extra))


def c_no_local_data(x: Ctx):
    """desk.json ports, paths and notes are not written to any page (desk.show_local is false)."""
    d = json.loads(read(x.repo / "data/desk.json"))
    needles = set()
    for v in d.get("mine", {}).values():
        if v.get("path"):
            needles.add(v["path"])
        if v.get("port"):
            needles.add("localhost:%s" % v["port"])
    hits = []
    for sid, (_, _, html) in x.pages.items():
        for n in needles:
            if n in html or n.replace("\\", "\\\\") in html:
                hits.append("%s: %s" % (sid, n))
        if re.search(r"[A-Za-z]:\\\\?projects", html):
            hits.append("%s: a local C:\\projects path" % sid)
    return (FAIL, "local data on the page: %s" % hits[:4]) if hits else (PASS, "no local ports or paths on any page (%d checked)" % len(needles))


def c_voice(x: Ctx):
    """The owner's voice: no exclamation mark and no 'maker' in visible text (SAFE-07, voice law)."""
    bad = []
    for sid, (_, pg, _) in x.pages.items():
        t = " ".join(pg.text)
        if "!" in t:
            bad.append("%s has an exclamation mark" % sid)
        if re.search(r"\bmakers?\b", t, flags=re.I):
            bad.append("%s says maker" % sid)
    return (FAIL, "; ".join(bad)) if bad else (PASS, "no exclamation marks, no 'maker'")


def c_js_rules(x: Ctx):
    """Classic scripts only on the front page: no import, no fetch, no module (it must work from file://)."""
    bad = []
    for name, js in x.js.items():
        for pat, why in ((r"^\s*import\s", "import"), (r"\bfetch\s*\(", "fetch"), (r"XMLHttpRequest", "XHR"), (r"\beval\s*\(", "eval"), (r"new\s+Function\s*\(", "new Function")):
            if re.search(pat, js, flags=re.M):
                bad.append("%s uses %s" % (name, why))
    for sid, (_, pg, _) in x.pages.items():
        if any(s.get("type") == "module" for s in pg.scripts):
            bad.append("%s loads a module script" % sid)
    return (FAIL, "; ".join(bad)) if bad else (PASS, "classic scripts, no fetch, no modules")


def c_hidden_until_script(x: Ctx):
    """Anything that needs a script ships hidden, so a failed script leaves no dead control."""
    bad = []
    for sid, (_, pg, _) in x.pages.items():
        for key in ("fp-menu-btn", "fp-theme", "form.fp-find"):
            if not pg.hidden_ids.get(key):
                bad.append("%s: %s is not hidden" % (sid, key))
        if sid == "desk" and not pg.hidden_ids.get("fp-toolbar"):
            bad.append("desk: the toolbar is not hidden")
    return (FAIL, "; ".join(bad)) if bad else (PASS, "script-only controls ship hidden")


def c_chrome_budget(x: Ctx):
    """Exactly the three chrome clusters on every page (D-019 budget of three)."""
    bad = ["%s: %s" % (sid, sorted(pg.chrome)) for sid, (_, pg, _) in x.pages.items() if sorted(pg.chrome) != sorted(CHROME)]
    return (FAIL, "; ".join(bad)) if bad else (PASS, "three clusters on every page")


def c_generated_mark(x: Ctx):
    """Generated pages say so, so nobody edits them by hand."""
    bad = [sid for sid, (_, pg, _) in x.pages.items() if not pg.has_comment_mark]
    return (FAIL, "no GENERATED header on: %s" % bad) if bad else (PASS, "all pages carry the header")


def c_line_endings(x: Ctx):
    """LF on disk for the generated pages and the new sources."""
    files = [p for p, _, _ in x.pages.values()] + list((x.repo / "styles/front").glob("*")) + list((x.repo / "js/front").glob("*")) + list((x.repo / "scripts").glob("front_*")) + [x.repo / "scripts" / "build_front_page.py"]
    bad = [f.name for f in files if f.is_file() and b"\r\n" in f.read_bytes()]
    return (FAIL, "CRLF in %s" % bad[:5]) if bad else (PASS, "%d files, all LF" % len(files))


CHECKS = [c_config_schema, c_fresh_build, c_pages_exist, c_nav_identical, c_links_resolve, c_ids_unique, c_classes_defined,
          c_no_raw_values, c_selectors_scoped, c_breakpoint_pair, c_home_figures, c_desk_rows, c_no_local_data, c_voice,
          c_js_rules, c_hidden_until_script, c_chrome_budget, c_generated_mark, c_line_endings]


# -- the selftest: every check is shown to fail when its rule is broken -------------------------------
# A check that has never failed is a green light of unknown wiring. Each mutation breaks ONE rule in a
# scratch copy of the tree and names the check that must then FAIL. The unbroken copy must pass first,
# or the test says UNKNOWN (exit 2) instead of pretending.

H = "docs/front-page/index.html"
D = "docs/front-page/desk/index.html"
P = "styles/front/front.parts.css"
MUTATIONS = [
    # (what is broken, check that must fail, file, operation, args)
    ("a raw colour in a part", "no_raw_values", P, "append", ".fp-x { color: #fff; }"),
    ("a pill radius", "no_raw_values", P, "append", ".fp-x { border-radius: 999px; }"),
    ("a sideways scroll rule", "no_raw_values", P, "append", ".fp-x { overflow-x: auto; }"),
    ("a bare element selector", "selectors_scoped", P, "append", "p { margin: 0; }"),
    ("a class that is not styled", "classes_defined", H, "replace", ('class="fp-kicker"', 'class="fp-nope"')),
    ("a repeated id", "ids_unique", H, "replace", ('<h1 class="fp-title">', '<h1 class="fp-title" id="fp-main">')),
    ("a link to nothing", "links_resolve", H, "replace", ('href="work/rail-software/index.html">Rail software', 'href="nope/index.html">Rail software')),
    ("no aria-current", "nav_identical", H, "replace", (' aria-current="page"', "")),
    ("a wrong figure", "home_figures", H, "replace", ("<b>2,204</b>", "<b>9,999</b>")),
    ("a local path on the page", "no_local_data", D, "append", "<p>C:\\projects\\CN Conductor Trainer</p>"),
    ("an exclamation mark", "voice", H, "replace", ('<p class="fp-stamp">', '<p class="fp-stamp">Hello! ')),
    ("a module script", "js_rules", H, "replace", ('<script src="../../js/front/shell.js">', '<script type="module" src="../../js/front/shell.js">')),
    ("a visible script-only control", "hidden_until_script", H, "replace", ('title="Dark theme" hidden>', 'title="Dark theme">')),
    ("a fourth chrome cluster", "chrome_budget", H, "replace", ('<div class="fp-track">', '<div data-chrome="extra" class="fp-track">')),
    ("the breakpoints disagree", "breakpoint_pair", "js/front/shell.js", "replace", ("768px", "760px")),
    ("a missing project row", "desk_rows", D, "regex", (r'(<tbody[^>]*id="fp-proj-rows"[^>]*>)\s*<tr.*?</tr>', r"\1")),
    ("a page that is not marked generated", "generated_mark", H, "replace", ("GENERATED", "WRITTEN")),
    ("CRLF line endings", "line_endings", P, "crlf", None),
    ("a screen in no nav group", "config_schema", "scripts/front_page.config.json", "replace", ('"group": "start"', '"group": "nowhere"')),
    ("a missing page with --require-all", "pages_exist", H, "delete", None),
]


def selftest() -> int:
    import shutil
    import tempfile
    log = front_log.get_logger("front_check_selftest")
    tmp = Path(tempfile.mkdtemp(prefix="front_check_"))
    pristine = tmp / "pristine"
    try:
        for rel in ("styles/front", "js/front", "docs/front-page", "data/projects"):
            shutil.copytree(REPO / rel, pristine / rel)
        for rel in ("scripts/front_page.config.json", "data/registry.json", "data/desk.json", "data/evidence.json"):
            (pristine / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(REPO / rel, pristine / rel)
    except OSError as err:
        log.error("could_not_look", error=str(err))
        print("UNKNOWN  the selftest could not copy the tree: %s" % err)
        log.finish("unknown")
        return 2

    def run(work: Path, name: str, require_all=False):
        a = argparse.Namespace(dir="docs/front-page", require_all=require_all, repo=str(work))
        fn = next(f for f in CHECKS if f.__name__ == "c_" + name)
        return fn(Ctx(a))[0]

    # 1. the unbroken copy passes every check that can run on a copy (the build check needs the real tree)
    names = [f.__name__[2:] for f in CHECKS if f.__name__ != "c_fresh_build"]
    bad = [n for n in names if run(pristine, n) != PASS]
    if bad:
        print("UNKNOWN  the unbroken copy does not pass %s, so the selftest proves nothing" % bad)
        log.error("baseline_not_clean", failing=bad)
        log.finish("unknown")
        return 2
    print("PASS     baseline: %d checks pass on the unbroken copy" % len(names))
    missed = 0
    for what, check, rel, op, arg in MUTATIONS:
        work = tmp / "work"
        shutil.rmtree(work, ignore_errors=True)
        shutil.copytree(pristine, work)
        f = work / rel
        text = f.read_bytes().decode("utf-8") if f.is_file() else ""
        if op == "append":
            f.write_bytes((text + "\n" + arg + "\n").encode("utf-8"))
        elif op == "replace":
            if arg[0] not in text:
                print("UNKNOWN  mutation '%s' does not apply: %r is not in %s" % (what, arg[0][:50], rel))
                missed += 1
                continue
            f.write_bytes(text.replace(arg[0], arg[1]).encode("utf-8"))
        elif op == "regex":
            new, n = re.subn(arg[0], arg[1], text, count=1, flags=re.S)
            if not n:
                print("UNKNOWN  mutation '%s' does not apply: pattern not found in %s" % (what, rel))
                missed += 1
                continue
            f.write_bytes(new.encode("utf-8"))
        elif op == "crlf":
            f.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))
        elif op == "delete":
            f.unlink()
        got = run(work, check, require_all=(op == "delete"))
        ok = got == FAIL
        missed += 0 if ok else 1
        print("%-8s %-20s %s" % ("PASS" if ok else "MISSED", check, "caught: " + what if ok else "NOT caught: %s (check said %s)" % (what, got)))
        (log.info if ok else log.error)("mutation", check=check, broken=what, caught=ok)
    shutil.rmtree(tmp, ignore_errors=True)
    print("\n%d of %d breakages caught" % (len(MUTATIONS) - missed, len(MUTATIONS)))
    log.finish("fail" if missed else "pass")
    return 1 if missed else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dir", default="docs/front-page")
    ap.add_argument("--require-all", action="store_true")
    ap.add_argument("--only")
    ap.add_argument("--repo", help="check another tree (the selftest uses this)")
    ap.add_argument("--selftest", action="store_true", help="prove each check fails when its rule is broken")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    log = front_log.get_logger("front_check")
    try:
        x = Ctx(a)
    except (OSError, ValueError, KeyError) as err:
        log.error("could_not_look", error="%s: %s" % (type(err).__name__, err))
        print("UNKNOWN  could not read the inputs: %s" % err)
        log.finish("unknown")
        return 2
    results = []
    for fn in CHECKS:
        name = fn.__name__[2:]
        if a.only and a.only != name:
            continue
        try:
            status, detail = fn(x)
        except Exception as err:  # noqa: BLE001 - a crashed check is UNKNOWN, never a pass; the cause is logged
            status, detail = UNKNOWN, "%s: %s" % (type(err).__name__, err)
            log.error("check_crashed", check=name, error=detail)
        results.append((name, status, detail))
        (log.info if status == PASS else log.error)("check", check=name, status=status, detail=detail)
        print("%-8s %-20s %s" % (status, name, detail))
    fails = sum(1 for _, s, _ in results if s == FAIL)
    unk = sum(1 for _, s, _ in results if s == UNKNOWN)
    print("\n%d passed, %d failed, %d could not be checked" % (len(results) - fails - unk, fails, unk))
    log.finish("fail" if fails else "unknown" if unk else "pass")
    return 1 if fails else 2 if unk else 0


if __name__ == "__main__":
    sys.exit(main())
