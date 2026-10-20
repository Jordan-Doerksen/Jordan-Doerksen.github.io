#!/usr/bin/env python3
"""Fossil inventory: every GitHub Pages site under one account, five facts each.

READ-ONLY. The only gh calls are `gh repo list`, `gh api repos/<o>/<r>/pages`
and `gh api repos/<o>/<r>/commits?per_page=1` (all GET). Nothing is changed.

    python docs/fossils/inventory.py           fetch, write inventory.json + index.html
    python docs/fossils/inventory.py --check   no network: index.html must equal a
                                               fresh render of inventory.json

Account list: the `gh repo list` call is COPIED from
C:/projects/tools/surveyor/scanner/github.py (not imported: that module needs
the surveyor's own slog logger and config).

Exit codes: 0 done, 1 --check differs, 2 could not look (gh missing or not signed in).
"""
import html
import json
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
JSON_PATH = HERE / "inventory.json"
PAGE_PATH = HERE / "index.html"
LOG_LOCK = threading.Lock()
LOG_PATH = None


def log(event, **fields):
    """One JSON line per event (OBS-01). No token or secret is ever logged."""
    rec = {"t": datetime.now(timezone.utc).isoformat(timespec="seconds"), "event": event}
    rec.update(fields)
    with LOG_LOCK:
        if LOG_PATH is not None:
            with open(LOG_PATH, "a", encoding="utf-8", newline="\n") as fh:
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------- gh (GET only)

class GhError(Exception):
    pass


def gh(args, timeout=None):
    """Run gh with a fixed read-only argument list. Returns stdout text."""
    if any(a in ("-X", "--method", "-f", "-F", "--field", "--raw-field", "--input") for a in args):
        raise GhError("refused: write-capable gh flag")
    try:
        p = subprocess.run(["gh"] + args, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout or CONFIG["gh_timeout_s"])
    except FileNotFoundError:
        raise GhError("gh is not on PATH")
    except subprocess.TimeoutExpired:
        raise GhError("gh timed out")
    if p.returncode != 0:
        raise GhError((p.stderr or "").strip() or "gh exit %d" % p.returncode)
    return p.stdout


def list_repos():
    # Copied from surveyor scanner/github.py fetch_account_repos (one call).
    out = gh(["repo", "list", CONFIG["owner"], "--limit", str(CONFIG["repo_list_limit"]),
              "--json", "name,nameWithOwner,url,isPrivate,pushedAt,isArchived"])
    repos = json.loads(out)
    if not isinstance(repos, list):
        raise GhError("gh repo list JSON was not a list")
    return repos


def pages_info(name_with_owner):
    """Return the Pages JSON, None when the repo has no Pages, or raise."""
    try:
        return json.loads(gh(["api", "repos/%s/pages" % name_with_owner]))
    except GhError as exc:
        if "404" in str(exc) or "Not Found" in str(exc):
            return None
        raise


def last_commit(name_with_owner):
    try:
        out = gh(["api", "repos/%s/commits?per_page=1" % name_with_owner,
                  "--jq", ".[0].commit.committer.date"])
        return out.strip() or None
    except GhError as exc:
        log("commit_unknown", repo=name_with_owner, why=str(exc)[:200])
        return None


# ------------------------------------------------------------------- HTTP

def http(url, method="GET", want_body=False):
    """Fetch once. Returns (status|None, final_url, body|None, error|None).
    A failed fetch is status None: 'could not look', never 'dead'."""
    req = urllib.request.Request(url, method=method, headers={"User-Agent": CONFIG["user_agent"]})
    try:
        with urllib.request.urlopen(req, timeout=CONFIG["fetch_timeout_s"]) as r:
            body = None
            if want_body and "html" in (r.headers.get("Content-Type") or ""):
                body = r.read(2_000_000).decode("utf-8", errors="replace")
            return r.status, r.geturl(), body, None
    except urllib.error.HTTPError as exc:
        return exc.code, url, None, None
    except Exception as exc:  # timeout, DNS, TLS: could not look
        return None, url, None, "%s: %s" % (type(exc).__name__, str(exc)[:120])


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for k, v in attrs:
                if k == "href" and v:
                    self.hrefs.append(v.strip())


def extract_links(base_url, body):
    p = Links()
    try:
        p.feed(body)
    except Exception:
        pass
    out = []
    for h in p.hrefs:
        u = urllib.parse.urldefrag(urllib.parse.urljoin(base_url, h))[0]
        if u.startswith(("http://", "https://")):
            out.append(u)
    return out


# ------------------------------------------------------------------- crawl

def site_of(url, site_urls, home_key):
    """Map a URL to a Pages site key (repo name lower) when it is on the account's
    github.io host, else None."""
    u = urllib.parse.urlparse(url)
    if (u.hostname or "").lower() != CONFIG["owner"].lower() + ".github.io":
        return None
    seg = [s for s in u.path.split("/") if s]
    if seg and seg[0].lower() in site_urls and seg[0].lower() != home_key:
        return seg[0].lower()
    return home_key


def looks_html(url):
    last = urllib.parse.urlparse(url).path.rsplit("/", 1)[-1]
    return "." not in last or last.endswith((".html", ".htm"))


def crawl_site(key, root_url, site_urls, home_key):
    """Fetch the root (the one live check) and same-site pages it links to, one level."""
    status, final, body, err = http(root_url, want_body=True)
    log("live", site=key, url=root_url, status=status, error=err)
    pages = {root_url: body}
    if body:
        sub = []
        for link in extract_links(final, body):
            if site_of(link, site_urls, home_key) == key and looks_html(link) \
                    and link != root_url and link not in sub:
                sub.append(link)
        for link in sub[:CONFIG["max_pages_per_site"]]:
            s, _f, b, e = http(link, want_body=True)
            log("page", site=key, url=link, status=s, error=e)
            pages[link] = b
        if len(sub) > CONFIG["max_pages_per_site"]:
            log("page_cap", site=key, found=len(sub), cap=CONFIG["max_pages_per_site"])
    page_links = {}
    for url, b in pages.items():
        if b:
            page_links[url] = sorted(set(extract_links(url, b)))
    return {"status": status, "error": err, "page_links": page_links, "pages_read": len(pages)}


def check_link(url, cache, lock):
    with lock:
        if url in cache:
            return cache[url]
    s, _f, _b, e = http(url, "HEAD")
    if s is None or s in (403, 405, 501) or s >= 500:
        s2, _f, _b, e2 = http(url, "GET")
        if s2 is not None or s is None:
            s, e = s2, e2
    log("link", url=url, status=s, error=e)
    with lock:
        cache[url] = (s, e)
    return s, e


# ------------------------------------------------------------------- ruling

def propose(rec):
    ov = {k.lower(): v for k, v in CONFIG["overrides"].items()}.get(rec["repo"].lower())
    if ov:
        return ov["ruling"], ov["reason"]
    st = rec["live"]["status"]
    if st is not None and st >= 400:
        return "archive", "The Pages URL answers %d." % st
    if st is None:
        return "keep", "Could not look at the URL; a failed fetch is no reason to remove a site."
    age = rec["last_commit_age_days"]
    if rec["inbound_count"] == 0 and age is not None and age > CONFIG["stale_days"]:
        return "archive", "No page links to it and no commit in %d days." % age
    if rec["inbound_count"] == 0:
        return "keep", "No page links to it, but the last commit is recent (%s days)." % age
    return "keep", "Linked from %d page(s) on this account." % rec["inbound_count"]


# ------------------------------------------------------------------- build

def build():
    global LOG_PATH
    now = datetime.now(timezone.utc)
    (HERE / "logs").mkdir(exist_ok=True)
    LOG_PATH = HERE / "logs" / (datetime.now().strftime("%Y-%m-%d") + ".jsonl")
    log("run_start", owner=CONFIG["owner"])
    try:
        repos = list_repos()
    except GhError as exc:
        log("gh_failed", why=str(exc)[:300])
        print("could not look: %s" % exc, file=sys.stderr)
        return 2
    log("repos", count=len(repos))

    sites = {}

    def probe(r):
        try:
            return r, pages_info(r["nameWithOwner"]), None
        except GhError as exc:
            return r, None, str(exc)

    with ThreadPoolExecutor(CONFIG["workers"]) as ex:
        for r, info, err in ex.map(probe, repos):
            if err:
                log("pages_unknown", repo=r["nameWithOwner"], why=err[:200])
                if "rate limit" in err.lower():
                    log("rate_limit", repo=r["nameWithOwner"])
                continue
            if info and info.get("html_url"):
                sites[r["name"].lower()] = {"r": r, "url": info["html_url"]}
        keys = sorted(sites)
        commits = dict(zip(keys, ex.map(lambda k: last_commit(sites[k]["r"]["nameWithOwner"]), keys)))
    log("pages_found", count=len(sites))

    home_key = (CONFIG["owner"] + ".github.io").lower()
    if home_key not in sites:
        home_key = None
    site_urls = set(sites)
    with ThreadPoolExecutor(CONFIG["workers"]) as ex:
        crawls = dict(zip(keys, ex.map(
            lambda k: crawl_site(k, sites[k]["url"], site_urls, home_key), keys)))

    inbound = {k: {} for k in sites}  # key -> {source page url: source site}
    outbound = {k: set() for k in sites}
    for k, c in crawls.items():
        for page, links in c["page_links"].items():
            for link in links:
                t = site_of(link, site_urls, home_key)
                if t and t != k:
                    inbound[t][page] = k
                    outbound[k].add(link)
                elif t is None:
                    outbound[k].add(link)
                elif link not in c["page_links"]:
                    outbound[k].add(link)
    all_out = sorted(set().union(*outbound.values())) if outbound else []
    cache, lock = {}, threading.Lock()
    with ThreadPoolExecutor(CONFIG["workers"]) as ex:
        list(ex.map(lambda u: check_link(u, cache, lock), all_out))

    gen = now.strftime("%Y-%m-%d")
    records = []
    for k in keys:
        s, c = sites[k], crawls[k]
        lc = commits.get(k)
        age = None
        if lc:
            age = (now - datetime.fromisoformat(lc.replace("Z", "+00:00"))).days
        dead, unseen = [], []
        for link in sorted(outbound[k]):
            st, _e = cache.get(link, (None, None))
            if st is None:
                unseen.append(link)
            elif st >= 400:
                dead.append({"url": link, "status": st})
        st = c["status"]
        rec = {
            "key": k, "repo": s["r"]["name"], "pages_url": s["url"],
            "repo_private": s["r"]["isPrivate"], "repo_archived": s["r"]["isArchived"],
            "last_commit": lc, "last_commit_age_days": age,
            "live": {"status": st,
                     "result": "live" if st == 200 else "could not look" if st is None else "answers %d" % st,
                     "error": c["error"]},
            "pages_read": c["pages_read"],
            "inbound_count": len(inbound[k]),
            "inbound": [{"page": p, "from_site": f} for p, f in sorted(inbound[k].items())],
            "outbound_count": len(outbound[k]),
            "dead_links": dead, "dead_link_count": len(dead),
            "unchecked_links": unseen, "unchecked_link_count": len(unseen),
        }
        rec["proposed_ruling"], rec["proposed_reason"] = propose(rec)
        records.append(rec)

    uniq_dead = {d["url"] for r in records for d in r["dead_links"]}
    summary = {
        "pages_sites": len(records),
        "repos_scanned": len(repos),
        "dead_links": sum(r["dead_link_count"] for r in records),
        "dead_links_unique": len(uniq_dead),
        "could_not_look_sites": sum(1 for r in records if r["live"]["status"] is None),
        "could_not_look_links": sum(r["unchecked_link_count"] for r in records),
    }
    data = {"generated": gen, "owner": CONFIG["owner"], "summary": summary, "sites": records}
    JSON_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    PAGE_PATH.write_text(render(data), encoding="utf-8", newline="\n")
    log("run_end", **summary)
    print("Pages sites found: %d (of %d repos)" % (summary["pages_sites"], summary["repos_scanned"]))
    print("dead links: %d (%d unique)" % (summary["dead_links"], summary["dead_links_unique"]))
    print("could not look at: %d sites, %d links" % (summary["could_not_look_sites"], summary["could_not_look_links"]))
    return 0


# ------------------------------------------------------------------- page

CSS = """
:root{--bg:#f6f4ee;--fg:#1d1d1b;--mut:#5c5a52;--line:#cfcbbd;--card:#fffdf7;--bad:#9b2c1d;--ok:#2d6a3e}
@media (prefers-color-scheme:dark){:root{--bg:#161614;--fg:#ecebe4;--mut:#a7a597;--line:#3a3935;--card:#1f1f1c;--bad:#e8806f;--ok:#7cc593}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:1200px;margin:0 auto;padding:16px}
h1{font-size:1.5rem;margin:.5rem 0}
p{max-width:70ch;overflow-wrap:anywhere}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid var(--line);overflow-wrap:anywhere;word-break:break-word}
th{font-size:.8rem;color:var(--mut)}
.bad{color:var(--bad)}.ok{color:var(--ok)}.mut{color:var(--mut)}
.ruling{font-weight:600}
.his{min-width:6rem;border:1px dashed var(--line)}
details{margin-top:4px}
@media (max-width:820px){
 thead{display:none}
 table,tbody,tr,td{display:block;width:100%}
 tr{background:var(--card);border:1px solid var(--line);border-radius:6px;margin:0 0 12px;padding:4px 0}
 td{border:0;padding:4px 12px}
 td::before{content:attr(data-label);display:block;font-size:.75rem;color:var(--mut)}
 .his{min-height:2.5rem;margin:4px 12px;width:auto}
}
"""


def esc(s):
    return html.escape("" if s is None else str(s), quote=True)


def render(d):
    s = d["summary"]
    rows = []
    for r in d["sites"]:
        live_cls = "ok" if r["live"]["status"] == 200 else "bad" if r["live"]["status"] else "mut"
        inb = "%d page(s)" % r["inbound_count"]
        if r["inbound"]:
            inb += "<details><summary>from</summary>%s</details>" % "<br>".join(
                esc("%s (%s)" % (i["page"], i["from_site"])) for i in r["inbound"])
        out = "%d link(s), %d dead" % (r["outbound_count"], r["dead_link_count"])
        if r["unchecked_link_count"]:
            out += ", %d could not look" % r["unchecked_link_count"]
        if r["dead_links"]:
            out += "<details><summary>dead</summary>%s</details>" % "<br>".join(
                esc("%d %s" % (x["status"], x["url"])) for x in r["dead_links"])
        lc = (r["last_commit"] or "unknown")[:10]
        age = "" if r["last_commit_age_days"] is None else " (%d days before the run)" % r["last_commit_age_days"]
        flags = "".join(" [%s]" % f for f, on in (("archived", r["repo_archived"]), ("private", r["repo_private"])) if on)
        rows.append(
            "<tr>"
            '<td data-label="Site"><strong>%s</strong>%s<br><span class="mut">%s</span></td>'
            '<td data-label="Last commit">%s%s</td>'
            '<td data-label="Live" class="%s">%s</td>'
            '<td data-label="Inbound links">%s</td>'
            '<td data-label="Outbound links">%s</td>'
            '<td data-label="Proposed ruling"><span class="ruling">%s</span><br>%s</td>'
            '<td data-label="His ruling" class="his"></td>'
            "</tr>" % (esc(r["repo"]), esc(flags), esc(r["pages_url"]), esc(lc), esc(age),
                       live_cls, esc(r["live"]["result"]), inb, out,
                       esc(r["proposed_ruling"]), esc(r["proposed_reason"])))
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<meta name="robots" content="noindex">\n<title>Fossil inventory</title>\n'
        "<style>%s</style>\n</head>\n<body>\n<main>\n<h1>Fossil inventory</h1>\n"
        "<p>Generated %s from the GitHub account %s. Read-only: nothing was changed. "
        "%d Pages sites in %d repositories; %d dead outbound links (%d unique); "
        "%d sites and %d links could not be looked at.</p>\n"
        "<p>Rule each row: keep, unlist or archive. Column meanings: docs/fossils/README.md.</p>\n"
        "<table>\n<thead><tr><th>Site</th><th>Last commit</th><th>Live</th><th>Inbound links</th>"
        "<th>Outbound links</th><th>Proposed ruling</th><th>His ruling</th></tr></thead>\n<tbody>\n%s\n</tbody>\n</table>\n"
        "</main>\n</body>\n</html>\n" % (CSS, esc(d["generated"]), esc(d["owner"]), s["pages_sites"],
                                          s["repos_scanned"], s["dead_links"], s["dead_links_unique"],
                                          s["could_not_look_sites"], s["could_not_look_links"], "\n".join(rows)))


def check():
    if not JSON_PATH.exists() or not PAGE_PATH.exists():
        print("CHECK FAIL: inventory.json or index.html is missing")
        return 1
    fresh = render(json.loads(JSON_PATH.read_text(encoding="utf-8")))
    on_disk = PAGE_PATH.read_bytes().decode("utf-8")
    if fresh == on_disk:
        print("CHECK PASS: index.html equals a fresh render of inventory.json")
        return 0
    print("CHECK FAIL: index.html differs from a fresh render of inventory.json")
    return 1


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else build())
