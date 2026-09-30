#!/usr/bin/env python3
"""Exercise packaging in a disposable, credential-free Codex home."""

import argparse
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import tempfile
import threading


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--codex", default="codex")
    args = parser.parse_args()
    source = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="cstack-discovery-") as temporary:
        scratch = Path(temporary)
        home = scratch / "codex-home"
        home.mkdir()
        project = scratch / "project"
        project.mkdir()
        package = scratch / "cstack"
        shutil.copytree(source, package, ignore=shutil.ignore_patterns(".git", "__pycache__", "node_modules"))
        # No user's config, credentials, installed plugins, or hook trust are copied.
        environment = {key: value for key, value in os.environ.items()
                       if key in {"PATH", "HOME", "TMPDIR", "LANG", "SYSTEMROOT"}}
        environment["CODEX_HOME"] = str(home)

        def cli(*command):
            result = subprocess.run([args.codex, *command], cwd=project, env=environment,
                                    text=True, capture_output=True, timeout=30)
            if result.returncode:
                raise RuntimeError(result.stderr or result.stdout)
            return result.stdout

        cli("plugin", "marketplace", "add", str(package), "--json")
        installed = json.loads(cli("plugin", "add", "cstack@cstack", "--json"))
        process = subprocess.Popen([args.codex, "app-server"], cwd=project, env=environment,
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.DEVNULL, text=True, bufsize=1)
        messages = queue.Queue()

        def collect():
            for line in process.stdout:
                messages.put(json.loads(line))

        threading.Thread(target=collect, daemon=True).start()

        def send(payload):
            process.stdin.write(json.dumps(payload) + "\n")
            process.stdin.flush()

        def request(identifier, method, params):
            send({"id": identifier, "method": method, "params": params})
            while True:
                message = messages.get(timeout=30)
                if message.get("id") == identifier:
                    if "error" in message:
                        raise RuntimeError(message["error"])
                    return message["result"]

        try:
            request(1, "initialize", {"clientInfo": {"name": "cstack-discovery", "version": "1"},
                                      "capabilities": {"experimentalApi": True}})
            send({"method": "initialized"})
            result = request(2, "skills/list", {"cwds": [str(project)], "forceReload": True})
            data = result["data"][0]
            assert not data.get("errors"), data.get("errors")
            actual = [s for s in data["skills"] if s.get("pluginId") == "cstack@cstack"]
            expected = {"cstack:" + p.parent.name for p in (source / "skills").glob("*/SKILL.md")}
            assert len(expected) == 47
            assert {s["name"] for s in actual} == expected
            assert len(actual) == 47 and all(s["enabled"] for s in actual)
            assert all(str(home) in s["path"] for s in actual)
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        print(json.dumps({"discovered_skills": len(actual), "errors": [],
                          "isolated_home": True, "production_install": False,
                          "runtime": cli("--version").strip()}, indent=2))


if __name__ == "__main__":
    main()
