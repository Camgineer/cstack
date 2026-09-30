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
import sys


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
        cli("plugin", "add", "cstack@cstack", "--json")
        subprocess.run([sys.executable, str(package / "scripts/setup_agents.py"),
                        "--project", str(project), "--apply"], check=True,
                       env=environment, stdout=subprocess.DEVNULL)
        prompt = cli("debug", "prompt-input", "Inspect this project's native agents without doing work.")
        # This diagnostic excludes tool definitions; it cannot prove agent registration.
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
            assert expected, "plugin contains no skills"
            implicit_candidates = sorted(name for name in expected if name in prompt)
            expected_implicit = sorted("cstack:" + p.parent.name
                                       for p in (source / "skills").glob("*/SKILL.md")
                                       if not (p.parent / "agents/openai.yaml").exists()
                                       or "allow_implicit_invocation: false" not in
                                       (p.parent / "agents/openai.yaml").read_text())
            assert implicit_candidates == expected_implicit, implicit_candidates
            assert {s["name"] for s in actual} == expected
            assert len(actual) == len(expected) and all(s["enabled"] for s in actual)
            assert all(str(home) in s["path"] for s in actual)
            hooks_result = request(3, "hooks/list", {"cwds": [str(project)]})["data"][0]
            assert not hooks_result["errors"], hooks_result["errors"]
            hooks = [h for h in hooks_result["hooks"] if h.get("pluginId") == "cstack@cstack"]
            assert len(hooks) == 2, hooks
            assert all(h["trustStatus"] == "untrusted" for h in hooks), hooks
            configuration = request(4, "config/read", {"cwd": str(project), "includeLayers": True})
            disabled = [layer.get("disabledReason") for layer in configuration.get("layers", [])
                        if layer.get("disabledReason")]
            disabled_write = request(5, "config/value/write", {"keyPath": 'plugins."cstack@cstack".enabled', "value": False, "mergeStrategy": "upsert"})
            disabled_skills = request(6, "skills/list", {"cwds": [str(project)], "forceReload": True})["data"][0]
            disabled_actual = [s for s in disabled_skills["skills"] if s.get("pluginId") == "cstack@cstack"]
            assert not any(s["enabled"] for s in disabled_actual), disabled_actual
            request(7, "config/value/write", {"keyPath": 'plugins."cstack@cstack".enabled', "value": True, "mergeStrategy": "upsert"})
            enabled_skills = request(8, "skills/list", {"cwds": [str(project)], "forceReload": True})["data"][0]
            enabled_actual = [s for s in enabled_skills["skills"] if s.get("pluginId") == "cstack@cstack"]
            assert len(enabled_actual) == len(expected) and all(s["enabled"] for s in enabled_actual)
            cli("plugin", "remove", "cstack@cstack")
            removed_skills = request(9, "skills/list", {"cwds": [str(project)], "forceReload": True})["data"][0]
            assert not [s for s in removed_skills["skills"] if s.get("pluginId") == "cstack@cstack"]
            cli("plugin", "add", "cstack@cstack", "--json")
            reinstalled = request(10, "skills/list", {"cwds": [str(project)], "forceReload": True})["data"][0]
            assert len([s for s in reinstalled["skills"] if s.get("pluginId") == "cstack@cstack"]) == len(expected)
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        print(json.dumps({"discovered_skills": len(actual), "errors": [],
                          "discovered_untrusted_hooks": len(hooks),
                          "implicit_candidates": implicit_candidates,
                          "persona_registration": "requires trusted-project live canary",
                          "disabled_config_layers": disabled,
                          "isolated_home": True, "production_install": False,
                          "disable_reenable_uninstall_reinstall": "passed",
                          "runtime": cli("--version").strip()}, indent=2))


if __name__ == "__main__":
    main()
