"""The tier-2 desk toy, "Absent is not zero" (DECISIONS.md CR-19).

Stdlib only. Imported by build_tier2_case.py, which calls build() and drops the
result into the tier-2 page between the mesh and the bench. Config:
scripts/tier2_desk_toy.config.json.

WHAT IT IS. A synthetic ES feed with three switches (order book, trade prints,
options chain) and a button that renders the reversal alert the desk would post
at that moment, beside what a desk that filled gaps with zero would have posted.
The behaviour is docs/tier-2-case/desk-toy.js. This module owns the markup, the
CSS and the check.

THE CHECK (display-case law, section 8). The toy makes claims about another
program: "the alert says OBI n/a", "skew goes stale past 30 s". Every desk string
it prints, every number format it copies and every limit it draws with is READ
from the desk's code here, at build time, and the same values are what the page
receives - as data attributes the script reads, and as the written-out cases.
Nothing is copied by hand, so the drawing and the check cannot drift. A value
that cannot be found raises DeskFactsError and the tier-2 page is not written:
a stale claim fails the build instead of shipping.

WHY NOT data/evidence.json (D-A21). D-A21 routes every figure through
build_evidence_snapshot.py. That route does not fit these values, for three
reasons recorded in CR-19: the snapshot is a point-in-time measurement, and this
claim has to be re-verified on every page build or it can go stale between the
two; running the snapshot rewrites every other figure on the front page (commit
and test counts, and without --run it drops the executed-suite figure), so two
constants would drag an unrelated refresh along with them; and these are not
measurements at all - they are constants and strings read from source, which the
snapshot's executed / counted / unavailable vocabulary has no word for.

ABSENT IS NOT ZERO, here too. A desk repo that is missing is not a pass. If the
check cannot look, the build fails and says so.
"""

import ast
import html
import json
import re
import subprocess
from pathlib import Path

CONFIG = Path(__file__).resolve().parent / "tier2_desk_toy.config.json"

# A field in one of the desk's own f-strings: {name}, {name:+.3f}, {block.attr}.
FIELD = re.compile(r"\{([\w.]+)(?::([^}]*))?\}")
# The only specs the toy's formatter implements. Anything else fails the build,
# rather than letting the browser format a number differently from the desk.
SPEC = re.compile(r"^\+?\.\d+f$")

# Synthetic values for the written-out cases. Not market data, and labelled so.
# CVD is a whole number because the desk's CVD is an int (TapeBlock.cvd).
EXAMPLE = {"obi": 0.214, "px": 5412.25, "vwap": 5410.75, "cvd": 312, "skew": 0.103}


class DeskFactsError(Exception):
    """The desk no longer says what the toy claims, or could not be read."""

    def __init__(self, misses):
        super().__init__("; ".join(misses))
        self.misses = misses


def fill(lit, vals):
    """Fill one of the desk's format strings the way Python formats it.

    The desk's literal is used as the template, so the written-out cases are
    formatted by the desk's own format spec. desk-toy.js implements the same
    two cases (a +.Nf / .Nf spec, or a bare float) for the live toy.
    """
    def one(m):
        v = vals[m.group(1)]
        return format(v, m.group(2)) if m.group(2) else str(v)
    return FIELD.sub(one, lit)


def _n(v):
    """A limit as the page prints it: 30.0 -> "30", 12.5 -> "12.5"."""
    return str(int(v)) if float(v).is_integer() else str(v)


def _git(root, *args):
    try:
        out = subprocess.run(["git", "-C", str(root)] + list(args),
                             capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return out.stdout.strip() if out.returncode == 0 else None


def _ast_field(src, cls, field):
    """The default of `field` in class `cls`, read from the source tree, never run."""
    for node in ast.walk(ast.parse(src)):
        if isinstance(node, ast.ClassDef) and node.name == cls:
            for st in node.body:
                target = getattr(st, "target", None)
                if (isinstance(st, ast.AnnAssign) and isinstance(target, ast.Name)
                        and target.id == field and isinstance(st.value, ast.Constant)
                        and isinstance(st.value.value, (int, float))
                        and not isinstance(st.value.value, bool)):
                    return float(st.value.value)
    return None


def read_desk():
    """Read and check every desk fact the toy uses. Raises DeskFactsError."""
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    root = Path(cfg["deskRoot"])
    if not root.is_dir():
        raise DeskFactsError(["desk repo not found at %s - nothing could be checked" % root])

    sources, misses = {}, []

    def src(rel):
        if rel not in sources:
            p = root / rel
            sources[rel] = p.read_text(encoding="utf-8") if p.is_file() else None
            if sources[rel] is None:
                misses.append("%s: file not found" % rel)
        return sources[rel]

    def entries(group):
        return [(k, v) for k, v in cfg[group].items() if not k.startswith("_")]

    limits = {}
    for key, spec in entries("limits"):
        text = src(spec["file"])
        if text is None:
            continue
        if "ast" in spec:
            value = _ast_field(text, *spec["ast"])
            where = "%s.%s" % tuple(spec["ast"])
        else:
            m = re.search(spec["regex"], text)
            value = float(m.group(1)) if m else None
            where = "/%s/" % spec["regex"]
        if value is None or value <= 0:
            misses.append("limits.%s: %s not found in %s" % (key, where, spec["file"]))
        else:
            limits[key] = value

    text_out, found = {}, {"text": 0, "formats": 0, "rules": 0}
    for key, spec in entries("text"):
        body = src(spec["file"])
        if body is None:
            continue
        if spec["show"] not in spec["find"]:
            misses.append("text.%s: config error - show %r is not part of find" % (key, spec["show"]))
        elif spec["find"] not in body:
            misses.append("text.%s: %s no longer contains %r" % (key, spec["file"], spec["find"]))
        else:
            text_out[key] = spec["show"]
            found["text"] += 1

    fmt_out = {}
    for key, spec in entries("formats"):
        body = src(spec["file"])
        if body is None:
            continue
        bad = [m.group(2) for m in FIELD.finditer(spec["find"])
               if m.group(2) and not SPEC.match(m.group(2))]
        if bad:
            misses.append("formats.%s: spec %s is not one the toy can format" % (key, bad))
        elif spec["find"] not in body:
            misses.append("formats.%s: %s no longer contains %r" % (key, spec["file"], spec["find"]))
        else:
            fmt_out[key] = spec["find"]
            found["formats"] += 1

    for key, spec in entries("rules"):
        body = src(spec["file"])
        if body is None:
            continue
        if spec["find"] not in body:
            misses.append("rules.%s: %s no longer contains %r (%s)"
                          % (key, spec["file"], spec["find"], spec["claim"]))
        else:
            found["rules"] += 1

    # Case 4 below says the first compute after the chain empties is still inside
    # the hold. That is only true while a refresh comes before the stale limit.
    if not misses and limits["refresh"] > limits["stale"]:
        misses.append("limits: refresh %s s is past the stale limit %s s - the 'holding "
                      "last' case can no longer happen as written" % (limits["refresh"], limits["stale"]))

    if misses:
        raise DeskFactsError(misses)

    read = sorted(sources)
    commit = _git(root, "rev-parse", "--short", "HEAD")
    dirty = _git(root, "status", "--porcelain", "--", *read) if commit else None
    return {
        "root": str(root).replace("\\", "/"),
        "commit": commit,
        "dirty": bool(dirty),
        "files": read,
        "limits": limits,
        "text": text_out,
        "formats": fmt_out,
        "found": found,
        "total": {g: len(entries(g)) for g in ("text", "formats", "rules")},
    }


def report(facts):
    """The lines the build prints. Same dict the page is built from."""
    L = facts["limits"]
    stamp = facts["commit"] or "commit unknown"
    if facts["dirty"]:
        stamp += ", with uncommitted changes to the files read"
    return [
        "  desk toy (CR-19): read from %s @ %s" % (facts["root"], stamp),
        "    skew limits %s s / %s s (refresh / stale, SkewConfig); CVD window %s s"
        % (_n(L["refresh"]), _n(L["stale"]), _n(L["cvdWindow"])),
        "    desk strings: %d/%d found" % (facts["found"]["text"], facts["total"]["text"]),
        "    desk formats: %d/%d found" % (facts["found"]["formats"], facts["total"]["formats"]),
        "    desk rules: %d/%d found" % (facts["found"]["rules"], facts["total"]["rules"]),
    ]


def _line(parts, T, cls="az-line"):
    """One alert line: parts joined by the desk's separator. A part is (text, kind)
    with kind "" (a value), "na" (a named gap) or "z" (a fabricated zero)."""
    out = []
    for txt, kind in parts:
        e = html.escape(txt, quote=False)
        out.append('<span class="az-%s">%s</span>' % (kind, e) if kind else e)
    return '<div class="%s">%s</div>' % (cls, html.escape(T["sep"], quote=False).join(out))


def markup(facts):
    """The toy's figure: the live toy (revealed by the script) and the record."""
    T, F, L = facts["text"], facts["formats"], facts["limits"]
    E = EXAMPLE
    stale, refresh = L["stale"], L["refresh"]
    obi = (fill(F["obi"], E), "")
    px = (fill(F["px"], E), "")
    cvd = (fill(F["cvd"], E), "")
    skew = (fill(F["skew"], E) + " " + T["regime"], "")
    old = int(stale) + 4                      # always past the limit, whatever it is
    held = fill(F["hold"], {"age": float(refresh),
                            "block.suspect_reason": T["noChain"]})

    cases = [
        (_line([obi, px, cvd, skew], T),
         "Every input present. No iceberg line: on a reversal, that means the desk "
         "looked and found none."),
        (_line([(T["obiNa"], "na"), px, cvd, (fill(F["stale"], {"age_s": old}), "na")], T),
         "Top of book only, so no imbalance. The options chain stopped updating, and "
         "its last skew is %d s old, past the %s s limit." % (old, _n(stale))),
        (_line([obi, (T["vwapNa"], "na"), (T["cvdNa"], "na"), skew], T)
         + _line([(fill(F["ice"], {"why": T["noPrints"]}), "na")], T),
         "No trade prints on this feed. VWAP, CVD and the iceberg check are all built "
         "from prints. The alert still fires: a reversal needs only the book."),
        (_line([obi, px, cvd, (T["skewNa"] + " (" + held + ")", "na")], T),
         "The chain came back with no usable quotes. For up to %s s after the last good "
         "skew the desk says it is holding that reading, and prints no number. After "
         "that the part reads %s (%s)." % (_n(stale), T["skewNa"], T["noChain"])),
        ("",
         "No order book, so no mid price. The desk's detector stops before it checks "
         "for any signal, and nothing is posted."),
        (_line([obi, (fill(F["px"], {"px": E["px"], "vwap": 0}), "z"),
                (fill(F["cvd"], {"cvd": 0}), "z"), skew], T, "az-line az-ghostline"),
         "Case 3 with its gaps filled with zero. Nothing in the line says the prints "
         "were missing, and with no iceberg line it reads as looked, found none."),
    ]
    record = "".join("<li>%s<p>%s</p></li>" % (ln, html.escape(cap, quote=False))
                     for ln, cap in cases)

    desk = json.dumps({"text": T, "fmt": F}, ensure_ascii=False, separators=(",", ":"))
    stamp = ""
    if facts["commit"]:
        stamp = " (desk commit %s%s)" % (facts["commit"],
                                         ", uncommitted changes" if facts["dirty"] else "")

    return TOY.format(
        refresh=_n(refresh), stale=_n(stale), cvdwin=_n(L["cvdWindow"]),
        desk=html.escape(desk, quote=True), record=record, stamp=stamp)


def build():
    """Read the desk, check it, and return (markup, css, report lines)."""
    facts = read_desk()
    return markup(facts), CSS, report(facts)


# Plain str.format template: literal braces are doubled. The JS-only part is
# hidden by CSS until desk-toy.js sets data-js="on"; the record is never hidden.
TOY = """
  <!-- CR-19. The desk toy. Every desk string, format and limit in it was read
       from the desk's code by scripts/tier2_desk_toy.py when this page was built.
       The live part needs desk-toy.js; the written-out cases below it do not. -->
  <figure class="az" id="az" aria-labelledby="az-title" data-refresh="{refresh}" data-stale="{stale}" data-cvdwin="{cvdwin}" data-desk="{desk}">
    <div class="az-head">
      <h2 id="az-title">Absent is not zero</h2>
      <span class="az-tag">Synthetic feed · not market data</span>
    </div>
    <p class="az-lede">The desk posts reversal alerts to Discord. Below, a synthetic feed has
    its inputs taken away. In every case shown, the alert names the gap or is not sent at
    all; none prints a zero in its place.</p>

    <div class="az-live">
      <p class="az-howto">Switch a feed off, then fire an alert.</p>
      <div class="az-grid">
        <div class="az-col">
          <h3>Feeds</h3>
          <fieldset>
            <legend>Order book</legend>
            <div class="az-seg">
              <label><input type="radio" name="az-book" value="full" checked><span>full depth</span></label>
              <label><input type="radio" name="az-book" value="top"><span>top of book</span></label>
              <label><input type="radio" name="az-book" value="off"><span>off</span></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Trade prints</legend>
            <div class="az-seg">
              <label><input type="radio" name="az-prints" value="on" checked><span>on</span></label>
              <label><input type="radio" name="az-prints" value="none"><span>none on this feed</span></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Options chain (skew)</legend>
            <div class="az-seg">
              <label><input type="radio" name="az-chain" value="live" checked><span>live</span></label>
              <label><input type="radio" name="az-chain" value="frozen"><span>frozen</span></label>
              <label><input type="radio" name="az-chain" value="none"><span>no 0DTE chain</span></label>
            </div>
          </fieldset>

          <table class="az-inputs">
            <tbody>
              <tr><th scope="row">clock</th><td id="az-clock">—</td></tr>
              <tr><th scope="row">mid</th><td id="az-mid">—</td></tr>
              <tr><th scope="row">OBI</th><td id="az-obi">—</td></tr>
              <tr><th scope="row">VWAP</th><td id="az-vwap">—</td></tr>
              <tr><th scope="row">CVD, {cvdwin} s</th><td id="az-cvd">—</td></tr>
              <tr><th scope="row">skew</th><td id="az-skew"><span id="az-skewv">—</span><div class="az-age" id="az-agebar" hidden><i></i></div></td></tr>
            </tbody>
          </table>

          <svg class="az-spark" id="az-spark" viewBox="0 0 60 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"></svg>
          <p class="az-sparkcap">Mid, last 60 s. A missing book draws a gap, not a line at zero.</p>

          <div class="az-ctl">
            <button class="az-btn az-fire" id="az-fire" type="button">Fire a reversal alert</button>
            <button class="az-btn" id="az-step" type="button">Advance 10 s</button>
            <button class="az-btn" id="az-pause" type="button" hidden>Pause demo</button>
          </div>
          <p class="az-said" id="az-said" role="status"></p>
        </div>

        <div class="az-col">
          <h3>What the desk posts</h3>
          <div class="az-card az-none" id="az-card" aria-live="polite">
            <p class="az-empty">No alert yet. Fire one.</p>
          </div>
          <ul class="az-notes" id="az-notes"></ul>
          <div class="az-ghost">
            <h4>If gaps were filled with zero</h4>
            <div id="az-ghostbody"><p class="az-empty">Fire an alert to compare.</p></div>
          </div>
        </div>
      </div>
    </div>

    <div class="az-record">
      <h3>Every case, written out</h3>
      <ol class="az-cases">{record}</ol>
    </div>

    <p class="az-foot">Alert wording and number formats are read from the desk's own code
    when this page is built, and the build fails if any of them has changed{stamp}. Skew
    refreshes every {refresh} s and goes stale past {stale} s, both from the skew engine.
    The button fires on demand; the desk fires a reversal only when price turns far enough
    off a leg's extreme. Every market number on this panel is synthetic.</p>
  </figure>
"""


# No keyframes and no transitions anywhere in the toy: values change only when
# the demo clock moves, and under reduced motion only on a button press. No
# braces inside these comments - the site composer's CSS scoper counts them.
CSS = """
/* ---- the desk toy: absent is not zero (CR-19) --------------------------- */
.az{margin:26px 0 0;padding:clamp(16px,2.4vw,24px);border:1px solid var(--hair);background:var(--sheet)}
.az-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 16px;margin:0 0 8px}
.az h2{margin:0;font:800 clamp(20px,2.4vw,28px)/1.15 var(--display);letter-spacing:-.03em}
.az-tag{padding:1px 8px;border:1px solid var(--warn);font:500 10.5px/1.7 var(--mono);
  letter-spacing:.08em;text-transform:uppercase;color:var(--warn)}
.az-lede{margin:0 0 18px;max-width:64ch;color:var(--ink-2);font-size:15px}
.az h3{margin:0 0 12px;font:500 11px/1.6 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
/* Scripting off: the live toy stays out of the way and the record is the content.
   The script only ever reveals; it never hides the record. */
.az-live{display:none}
.az[data-js="on"] .az-live{display:block}
.az-howto{margin:0 0 12px;color:var(--ink-2);font-size:14.5px}
.az-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:clamp(14px,2vw,20px)}
@media (max-width:760px){.az-grid{grid-template-columns:minmax(0,1fr)}}
.az-col{min-width:0;padding:16px;border:1px solid var(--hair);background:var(--deep)}
/* Feed switches are native radios, so arrow keys come from the platform. The input
   is clipped rather than faded: nothing in this toy is carried by opacity. */
.az fieldset{margin:0 0 14px;padding:0;border:0;min-width:0}
.az legend{margin:0 0 6px;padding:0;font:600 14px/1.4 var(--sans);color:var(--ink)}
.az-seg{display:flex;flex-wrap:wrap;gap:6px}
.az-seg label{position:relative}
.az-seg input{position:absolute;width:1px;height:1px;margin:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.az-seg span{display:inline-block;padding:6px 10px;border:1px solid var(--wire);
  font:500 12.5px/1.4 var(--mono);color:var(--ink-2);cursor:pointer;user-select:none}
.az-seg span:hover{border-color:var(--ink-2)}
.az-seg input:checked + span{border-color:var(--live);color:var(--ink);background:#132836}
.az-seg input:focus-visible + span{outline:2px solid var(--live);outline-offset:2px}
.az-inputs{width:100%;margin:4px 0 0;border-collapse:collapse;font:400 13.5px/1.5 var(--mono)}
.az-inputs th,.az-inputs td{padding:5px 0;border-top:1px solid var(--hair);vertical-align:top;font-weight:400}
.az-inputs th{width:38%;padding-right:8px;text-align:left;color:var(--ink-2)}
.az-inputs td{text-align:right;overflow-wrap:anywhere;color:var(--ink)}
.az-inputs td.az-v-live{color:var(--live)}
.az-inputs td.az-v-na{color:var(--ink-2)}
.az-inputs td.az-v-stale{color:var(--warn)}
.az-age{position:relative;height:6px;margin:6px 0 0;overflow:hidden;background:var(--hair)}
.az-age i{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--live)}
.az-age.az-over i{background:var(--warn)}
.az-spark{display:block;width:100%;height:64px;margin:12px 0 0}
.az-spark path{fill:none;stroke:var(--live);stroke-width:1.5;vector-effect:non-scaling-stroke}
.az-spark rect{fill:rgba(242,153,74,.14)}
.az-sparkcap{margin:4px 0 0;font:400 12px/1.5 var(--mono);color:var(--ink-2)}
.az-ctl{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}
.az-btn{cursor:pointer;padding:8px 14px;border:1px solid var(--hair);background:var(--sheet);color:var(--ink);
  font:500 12px/1.4 var(--mono);letter-spacing:.06em;text-transform:uppercase}
.az-btn:hover{border-color:var(--live);color:var(--live)}
.az-btn:focus-visible{outline:2px solid var(--live);outline-offset:2px}
.az-btn.az-fire{border-color:var(--live);background:var(--live);color:#04060B}
.az-btn.az-fire:hover{border-color:var(--ink);background:var(--ink);color:#04060B}
.az-said{min-height:1.5em;margin:8px 0 0;font:400 12px/1.5 var(--mono);color:var(--ink-2)}
/* The alert card, shaped like the desk's Discord embed: a title, the read, then one
   code line per part. Lines wrap; nothing here scrolls sideways. */
.az-card{min-height:150px;padding:12px 14px;border:1px solid var(--hair);border-left:4px solid var(--live);background:var(--sheet)}
.az-card.az-none{border-left-color:var(--muted)}
.az-cardhead{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 10px;margin:0 0 6px;
  font:600 15px/1.35 var(--sans);color:var(--ink)}
.az-cardhead small{font:400 12px/1.6 var(--mono);color:var(--ink-2)}
.az-read{margin:0 0 4px;color:var(--ink-2);font-size:14px}
.az-line{margin:6px 0 0;padding:6px 8px;border:1px solid var(--hair);background:var(--paper);
  font:400 13px/1.6 var(--mono);color:var(--ink);white-space:pre-wrap;overflow-wrap:anywhere}
.az-line .az-na{color:var(--ink-2);text-decoration:underline dotted var(--warn);text-underline-offset:3px}
.az-line .az-z{color:var(--warn)}
.az-empty{margin:0;color:var(--ink-2)}
.az-notes{margin:14px 0 0;padding:0;list-style:none;font-size:14px;color:var(--ink-2)}
.az-notes li{position:relative;padding:6px 0 6px 18px;border-top:1px solid var(--hair)}
.az-notes li::before{content:"";position:absolute;left:2px;top:13px;width:7px;height:7px;
  border:1px solid var(--warn);transform:rotate(45deg)}
.az-notes li.az-ok::before{border-color:var(--ok)}
/* The zero-filled comparison. De-emphasised by colour and a dashed edge, never by
   group opacity. Its text keeps the readable ink-2 token (display-case law 7). */
.az-ghost{margin:16px 0 0;padding:12px 14px;border:1px dashed var(--wire);background:var(--deep)}
.az-ghost h4{margin:0 0 4px;font:500 11px/1.6 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--warn)}
.az-ghost p{margin:6px 0 0;color:var(--ink-2);font-size:14px}
.az-line.az-ghostline,.az-ghost .az-line{border-style:dashed;color:var(--ink-2)}
/* The record: every case the toy can produce, as plain markup, always visible. */
.az-record{margin:22px 0 0;padding:18px 0 0;border-top:1px solid var(--hair)}
.az-cases{display:grid;gap:14px;margin:0;padding:0;list-style:none}
.az-cases .az-line:first-child{margin-top:0}
.az-cases p{margin:6px 0 0;max-width:72ch;color:var(--ink-2);font-size:14px}
.az-cases p:first-child{margin-top:0}
.az-foot{margin:18px 0 0;max-width:78ch;font:400 11.5px/1.75 var(--mono);color:var(--ink-2)}
"""
