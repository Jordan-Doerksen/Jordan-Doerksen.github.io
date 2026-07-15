"""Build the cabinet manifests for The Cabinet (SPEC.md section 1, schema 1).

Stdlib only. Selects registry projects with category=="games" and a non-null
url, routes each into its assigned cabinet per scripts/cabinet_config.json
(CR-1; unassigned games go to defaultCabinet), walks games/<slug>/
recursively, and emits one deterministic manifest per cabinet:
sorted keys, games sorted by slug, files sorted by path, LF, UTF-8 (no BOM).

Usage:
    python scripts/build_cabinet_manifest.py           # write every cabinet manifest
    python scripts/build_cabinet_manifest.py --check   # exit 0 current / 1 any stale
"""

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Contract constants from SPEC.md section 1 (schema-locked, not tweakables).
SCHEMA = 1
SOURCE = "jordan-doerksen.github.io"
BASE_URL = "https://jordan-doerksen.github.io/games/"
ENTRY = "index.html"
VERSION_HEX_LEN = 12

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = REPO_ROOT / "data" / "registry.json"
CONFIG_PATH = REPO_ROOT / "scripts" / "cabinet_config.json"
GAMES_DIR = REPO_ROOT / "games"

# Case-insensitive: Windows filesystems are, so "README.MD" is a .md file.
SKIP_SUFFIX = ".md"
SKIP_NAME = "thumbs.db"

# Text payloads must be LF on disk: git stores/serves them as LF (see .gitattributes), and this
# script hashes the WORKING TREE — a CRLF working copy produces a manifest hash Pages will never
# serve, and the cabinet's sha256 verify then refuses the file (the echo-bat lesson, 2026-07-14).
TEXT_SUFFIXES = (".html", ".js", ".css", ".json", ".txt", ".svg")


def fail(msg):
    # ASCII-only output: Windows consoles may be cp1252.
    print("ERROR: " + msg.encode("ascii", "replace").decode("ascii"))
    sys.exit(2)


def is_skipped(name):
    n = name.lower()
    return name.startswith(".") or n.endswith(SKIP_SUFFIX) or n == SKIP_NAME


def hash_file(path):
    h = hashlib.sha256()
    crlf = False
    is_text = path.suffix.lower() in TEXT_SUFFIXES
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            if is_text and b"\r\n" in chunk:
                crlf = True
            h.update(chunk)
    if crlf:
        fail("%s has CRLF line endings on disk -- Pages will serve the LF version and the "
             "cabinet's hash verify will refuse it. Normalize the file to LF and re-run."
             % path)
    return h.hexdigest()


def walk_game_files(game_dir):
    """Yield (relative forward-slash path, absolute Path), skipping
    dotfiles/dot-dirs, *.md, and Thumbs.db per SPEC."""
    files = []
    for p in sorted(game_dir.rglob("*")):
        if not p.is_file():
            continue
        rel_parts = p.relative_to(game_dir).parts
        if any(is_skipped(part) for part in rel_parts):
            continue
        files.append(("/".join(rel_parts), p))
    files.sort(key=lambda t: t[0])
    return files


def build_game(project):
    slug = project["slug"]
    game_dir = GAMES_DIR / slug
    if not game_dir.is_dir():
        fail("games/%s/ not found on disk (registry lists it live)" % slug)

    file_entries = []
    total_bytes = 0
    for rel, abs_path in walk_game_files(game_dir):
        size = abs_path.stat().st_size
        file_entries.append(
            {"path": rel, "sha256": hash_file(abs_path), "bytes": size}
        )
        total_bytes += size

    if not any(f["path"] == ENTRY for f in file_entries):
        fail("games/%s/ has no %s entry file" % (slug, ENTRY))

    # version = first 12 hex of sha256 over "path:sha256\n" lines, path-sorted.
    lines = "".join("%s:%s\n" % (f["path"], f["sha256"]) for f in file_entries)
    version = hashlib.sha256(lines.encode("utf-8")).hexdigest()[:VERSION_HEX_LEN]

    return {
        "slug": slug,
        "name": project.get("name", slug),
        "blurb": project.get("blurb", ""),
        "spec": project.get("spec", ""),
        "tags": project.get("tags", []),
        "entry": ENTRY,
        "version": version,
        "totalBytes": total_bytes,
        "files": file_entries,
    }


def load_config():
    """Load scripts/cabinet_config.json (CR-1) and validate its shape."""
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            config = json.load(f)
    except (OSError, ValueError) as e:
        fail("cannot read scripts/cabinet_config.json: %s" % e)

    cabinets = config.get("cabinets")
    if not isinstance(cabinets, dict) or not cabinets:
        fail("scripts/cabinet_config.json needs a non-empty 'cabinets' map")
    default = config.get("defaultCabinet")
    if default not in cabinets:
        fail("defaultCabinet %r is not in cabinets (%s)"
             % (default, ", ".join(sorted(cabinets))))
    assign = config.get("assign", {})
    for slug in sorted(assign):
        if assign[slug] not in cabinets:
            fail("assign: %s -> %r is not a known cabinet (%s)"
                 % (slug, assign[slug], ", ".join(sorted(cabinets))))
    return config


def build_manifests(config):
    """Return {cabinet_name: manifest} for every cabinet in the config."""
    try:
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            registry = json.load(f)
    except (OSError, ValueError) as e:
        fail("cannot read registry: %s" % e)

    selected = [
        p
        for p in registry.get("projects", [])
        if p.get("category") == "games" and p.get("url") is not None
    ]
    selected.sort(key=lambda p: p["slug"])

    live_slugs = {p["slug"] for p in selected}
    assign = config.get("assign", {})
    for slug in sorted(assign):
        if slug not in live_slugs:
            fail("assign lists %r, which is not a live game in the registry"
                 " (category==games with a non-null url)" % slug)

    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    default = config["defaultCabinet"]
    manifests = {}
    for cabinet in config["cabinets"]:
        games = [p for p in selected
                 if assign.get(p["slug"], default) == cabinet]
        manifests[cabinet] = {
            "schema": SCHEMA,
            "generated": generated,
            "source": SOURCE,
            "baseUrl": BASE_URL,
            "games": [build_game(p) for p in games],
        }
    return manifests


def dumps(manifest):
    return json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def strip_generated(manifest):
    return {k: v for k, v in manifest.items() if k != "generated"}


def check_one(rel_path, manifest):
    manifest_path = REPO_ROOT / rel_path
    if not manifest_path.is_file():
        print("STALE: %s does not exist" % rel_path)
        return 1
    try:
        with open(manifest_path, encoding="utf-8") as f:
            existing = json.load(f)
    except ValueError as e:
        print("STALE: %s is not valid JSON (%s)" % (rel_path, e))
        return 1

    if strip_generated(existing) == strip_generated(manifest):
        print("current: %s matches disk (%d games)"
              % (rel_path, len(manifest["games"])))
        return 0

    old = {g.get("slug"): g for g in existing.get("games", [])}
    new = {g["slug"]: g for g in manifest["games"]}
    for slug in sorted(set(old) | set(new)):
        if slug not in old:
            print("  added:   " + slug)
        elif slug not in new:
            print("  removed: " + slug)
        elif old[slug] != new[slug]:
            print("  changed: %s (%s -> %s)" % (
                slug, old[slug].get("version", "?"), new[slug]["version"]))
    if {k: v for k, v in existing.items() if k not in ("generated", "games")} != \
       {k: v for k, v in manifest.items() if k not in ("generated", "games")}:
        print("  changed: top-level manifest fields")
    print("STALE: %s -- regenerate with scripts/build_cabinet_manifest.py"
          % rel_path)
    return 1


def main(argv):
    config = load_config()
    manifests = build_manifests(config)
    if "--check" in argv:
        worst = 0
        for cabinet in sorted(manifests):
            worst = max(worst,
                        check_one(config["cabinets"][cabinet],
                                  manifests[cabinet]))
        return worst
    for cabinet in sorted(manifests):
        rel_path = config["cabinets"][cabinet]
        manifest = manifests[cabinet]
        with open(REPO_ROOT / rel_path, "w", encoding="utf-8",
                  newline="\n") as f:
            f.write(dumps(manifest))
        print("wrote %s (%s): %d games, %d files, %d bytes total"
              % (rel_path, cabinet,
                 len(manifest["games"]),
                 sum(len(g["files"]) for g in manifest["games"]),
                 sum(g["totalBytes"] for g in manifest["games"])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
