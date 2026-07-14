"""Build data/cabinet.json for The Cabinet (SPEC.md section 1, schema 1).

Stdlib only. Selects registry projects with category=="games" and a non-null
url, walks games/<slug>/ recursively, and emits a deterministic manifest:
sorted keys, games sorted by slug, files sorted by path, LF, UTF-8 (no BOM).

Usage:
    python scripts/build_cabinet_manifest.py           # write data/cabinet.json
    python scripts/build_cabinet_manifest.py --check   # exit 0 current / 1 stale
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
MANIFEST_PATH = REPO_ROOT / "data" / "cabinet.json"
GAMES_DIR = REPO_ROOT / "games"

# Case-insensitive: Windows filesystems are, so "README.MD" is a .md file.
SKIP_SUFFIX = ".md"
SKIP_NAME = "thumbs.db"


def fail(msg):
    # ASCII-only output: Windows consoles may be cp1252.
    print("ERROR: " + msg.encode("ascii", "replace").decode("ascii"))
    sys.exit(2)


def is_skipped(name):
    n = name.lower()
    return name.startswith(".") or n.endswith(SKIP_SUFFIX) or n == SKIP_NAME


def hash_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
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


def build_manifest():
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

    return {
        "schema": SCHEMA,
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": SOURCE,
        "baseUrl": BASE_URL,
        "games": [build_game(p) for p in selected],
    }


def dumps(manifest):
    return json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def strip_generated(manifest):
    return {k: v for k, v in manifest.items() if k != "generated"}


def check(manifest):
    if not MANIFEST_PATH.is_file():
        print("STALE: data/cabinet.json does not exist")
        return 1
    try:
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            existing = json.load(f)
    except ValueError as e:
        print("STALE: data/cabinet.json is not valid JSON (%s)" % e)
        return 1

    if strip_generated(existing) == strip_generated(manifest):
        print("current: data/cabinet.json matches disk (%d games)"
              % len(manifest["games"]))
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
    print("STALE: regenerate with scripts/build_cabinet_manifest.py")
    return 1


def main(argv):
    manifest = build_manifest()
    if "--check" in argv:
        return check(manifest)
    with open(MANIFEST_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(dumps(manifest))
    print("wrote data/cabinet.json: %d games, %d files, %d bytes total"
          % (len(manifest["games"]),
             sum(len(g["files"]) for g in manifest["games"]),
             sum(g["totalBytes"] for g in manifest["games"])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
