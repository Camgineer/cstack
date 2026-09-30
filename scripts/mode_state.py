#!/usr/bin/env python3
"""Minimal mode-state prototype. Real hook trust/dispatch validation is a release gate."""

import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
ON = {"$cstack:poteto-mode", "$cstack:poteto-mode on"}
OFF = {"$cstack:poteto-mode off"}


def response(event, status, key=None):
    result = {"continue": True, "systemMessage": "CStack mode: " + status}
    if status == "active":
        result["hookSpecificOutput"] = {
            "hookEventName": event,
            "additionalContext": (
                "CStack activation receipt " + key + ". Apply Poteto Mode for work requiring rigor; "
                "casual turns remain ordinary conversation. Read "
                + str(ROOT / "skills/poteto-mode/SKILL.md")
                + " in full, including its Principles index. User instructions and opt-out take precedence. "
                "Do not infer additional authority from this receipt."
            ),
        }
    return result


def handle(payload, data_root):
    event = payload.get("hook_event_name")
    if event not in {"SessionStart", "UserPromptSubmit"}:
        return {"continue": True}
    if payload.get("agent_id") or payload.get("agent_type"):
        return response(event, "child event ignored")
    session, cwd, transcript = (payload.get(k) for k in ("session_id", "cwd", "transcript_path"))
    if not all(isinstance(x, str) and x for x in (session, cwd, transcript)):
        return response(event, "unavailable: missing host identity")
    if not Path(cwd).is_absolute() or not Path(transcript).is_absolute():
        return response(event, "unavailable: non-absolute host identity")
    if not data_root or not Path(data_root).is_absolute():
        return response(event, "unavailable: missing plugin data directory")
    data = Path(data_root)
    if data.is_symlink():
        return response(event, "unavailable: symlinked plugin data")
    state_dir = data / "mode-v1"
    if state_dir.is_symlink():
        return response(event, "unavailable: symlinked state directory")
    key = hashlib.sha256(json.dumps([session, str(Path(cwd).resolve()), transcript]).encode()).hexdigest()
    state_path = state_dir / (key + ".json")
    if state_path.is_symlink():
        return response(event, "unavailable: symlinked state")
    # Include referenced instructions, not just the top-level mode wrapper.
    policy_hash = hashlib.sha256(Path(__file__).read_bytes())
    for folder in (ROOT / "skills", ROOT / "agents"):
        for path in sorted(folder.rglob("*")):
            if path.is_file() and path.suffix in {".md", ".yaml"}:
                policy_hash.update(str(path.relative_to(ROOT)).encode() + b"\0" + path.read_bytes())
    version = policy_hash.hexdigest()
    active = False
    if state_path.exists():
        state = json.loads(state_path.read_text())
        if not isinstance(state, dict) or state.get("schema") != 1 or not isinstance(state.get("active"), bool):
            raise ValueError("invalid persisted mode state")
        active = state.get("version") == version and state["active"]
    prompt = payload.get("prompt")
    command = prompt.strip() if isinstance(prompt, str) else None
    change = command in ON | OFF if event == "UserPromptSubmit" else payload.get("source") == "clear"
    if change:
        active = event == "UserPromptSubmit" and command in ON
        state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=".mode-", dir=state_dir)
        try:
            with os.fdopen(fd, "w") as stream:
                json.dump({"schema": 1, "active": active, "version": version}, stream)
            os.replace(temporary, state_path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    return response(event, "active" if active else "inactive", key)


def main():
    try:
        raw = sys.stdin.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise ValueError("oversized hook payload")
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            raise ValueError("hook payload must be an object")
        result = handle(payload, os.environ.get("PLUGIN_DATA"))
    except (ValueError, OSError, TypeError) as error:
        result = {"continue": True, "systemMessage": "CStack mode persistence unavailable: " + str(error)}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
