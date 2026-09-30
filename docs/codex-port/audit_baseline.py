#!/usr/bin/env python3
"""Verify the pinned import and report committed changes; never run plugin code."""

import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
BASELINE = "c31f7ace991843f5576398ad025969465251192c"
TREE = "975600f2f90dc6f755d58cccdccee27f950edcd2"


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def entries(revision):
    result = {}
    for record in git("ls-tree", "-rz", revision).split(b"\0"):
        if record:
            metadata, path = record.split(b"\t", 1)
            mode, kind, blob = metadata.decode().split()
            result[path.decode()] = {"mode": mode, "type": kind, "blob": blob}
    return result


def main():
    initial = git("rev-list", "--max-parents=0", "HEAD").decode().split()
    if initial != [BASELINE]:
        raise SystemExit("FAIL: history must start at the single pinned import")
    if git("rev-parse", f"{BASELINE}^{{tree}}").decode().strip() != TREE:
        raise SystemExit("FAIL: baseline tree differs from the upstream PStack tree")
    baseline, current = entries(BASELINE), entries("HEAD")
    inventory = json.loads((ROOT / "docs/codex-port/inventory.json").read_text())
    locked = {row["path"]: {key: row[key] for key in ("mode", "type", "blob")}
              for row in inventory["files"]}
    if locked != baseline or len(baseline) != 158:
        raise SystemExit("FAIL: inventory does not exactly cover the source import")
    if baseline["LICENSE"] != current.get("LICENSE"):
        raise SystemExit("FAIL: original MIT license changed")
    changed = [p for p in sorted(baseline) if p in current and baseline[p] != current[p]]
    omitted = sorted(set(baseline) - set(current))
    added = sorted(set(current) - set(baseline))
    print(json.dumps({"baseline_commit": BASELINE, "baseline_tree": TREE,
                      "source_files": len(baseline), "changed": changed,
                      "omitted": omitted, "added": added,
                      "working_tree_clean": not bool(git("status", "--porcelain"))}, indent=2))


if __name__ == "__main__":
    main()
