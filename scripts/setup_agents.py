#!/usr/bin/env python3
"""Install only owned, project-scoped native persona profiles after explicit setup."""

import argparse
import hashlib
import json
from pathlib import Path
import os
import tempfile
import sys
if sys.version_info < (3, 11):
    raise SystemExit("Native persona setup requires Python 3.11 or newer; use an existing compatible interpreter.")
import tomllib


PLUGIN = Path(__file__).resolve().parents[1]
PERSONAS = {"cstack-poteto": "poteto-agent.md", "cstack-comment-sicko": "comment-sicko.md"}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".cstack-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def _setup(project, apply=False):
    project = Path(project).resolve(strict=True)
    if not project.is_dir():
        raise ValueError("project must be an existing directory")
    config = project / ".codex"
    for path in (config, config / "agents", config / "cstack"):
        if path.is_symlink():
            raise ValueError(f"refusing symlinked setup directory: {path.name}")
    receipt_path = config / "cstack" / "personas.json"
    if receipt_path.is_symlink():
        raise ValueError("refusing symlinked setup receipt")
    prior = json.loads(receipt_path.read_text()) if receipt_path.exists() else {"files": {}}
    if not isinstance(prior, dict) or not isinstance(prior.get("files"), dict):
        raise ValueError("invalid ownership receipt")
    generated = {}
    if (config / "agents").exists():
        for existing in (config / "agents").rglob("*"):
            if existing.is_symlink():
                raise ValueError("refusing symlinked profile while checking name collisions")
            if not existing.is_file() or existing.suffix != ".toml":
                continue
            name = tomllib.loads(existing.read_text()).get("name")
            if name in PERSONAS and existing != config / "agents" / (name + ".toml"):
                raise ValueError(f"duplicate native agent name: {name}")
    for name, filename in PERSONAS.items():
        persona = (PLUGIN / "agents" / filename).read_text().split("---", 2)[-1].strip()
        instruction = (f"Read {PLUGIN / 'skills/poteto-mode/references/codex-runtime.md'} before work.\n"
                       + persona)
        if name == "cstack-poteto":
            instruction += f"\nThe installed Poteto skill is {PLUGIN / 'skills/poteto-mode/SKILL.md'}."
        text = (f"name = {json.dumps(name)}\n"
                f"description = {json.dumps('CStack: ' + name.removeprefix('cstack-') + ' persona')}\n"
                f"developer_instructions = {json.dumps(instruction)}\n")
        generated[name + ".toml"] = text.encode()
    # Validate the entire write set before changing anything.
    for filename, data in generated.items():
        target = config / "agents" / filename
        if target.is_symlink():
            raise ValueError(f"refusing symlinked profile: {filename}")
        if target.exists() and prior["files"].get(filename) != digest(target.read_bytes()):
            raise ValueError(f"profile is unowned or edited: {filename}")
    receipt = {"schema": 1, "plugin_root": str(PLUGIN),
               "files": {name: digest(data) for name, data in generated.items()}}
    if apply:
        for filename, data in generated.items():
            atomic_write(config / "agents" / filename, data)
        atomic_write(receipt_path, (json.dumps(receipt, indent=2) + "\n").encode())
    return {"applied": apply, "scope": "project", "profiles": list(PERSONAS),
            "changes_global_config": False, "receipt": receipt}


def setup(project, apply=False):
    if not apply:
        return _setup(project)
    config = Path(project).resolve(strict=True) / ".codex"
    if config.is_symlink() or (config / "cstack").is_symlink():
        raise ValueError("refusing symlinked setup directory")
    state = config / "cstack"
    state.mkdir(parents=True, exist_ok=True)
    lock = state / ".setup-lock"
    try:
        lock.mkdir()
    except FileExistsError:
        raise ValueError("another setup owns the lock; inspect before retrying")
    try:
        return _setup(project, apply=True)
    finally:
        lock.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--apply", action="store_true", help="Write the reviewed project profiles")
    args = parser.parse_args()
    try:
        print(json.dumps(setup(args.project, args.apply), indent=2))
    except (ValueError, OSError, json.JSONDecodeError) as error:
        parser.exit(1, f"Setup refused: {error}\n")


if __name__ == "__main__":
    main()
