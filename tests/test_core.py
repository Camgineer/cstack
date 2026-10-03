"""Check the core bundle and execute its planning/resource regressions without installation."""

import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "skills/poteto-mode/scripts/check-plan.mjs"


class Package(unittest.TestCase):
    def test_complete_catalog_and_invocation_policy(self):
        manifest = json.loads((ROOT / ".codex-plugin/plugin.json").read_text())
        skills = ROOT / manifest["skills"]
        names = []
        implicit = []
        for source in sorted(skills.glob("*/SKILL.md")):
            frontmatter = source.read_text().split("---", 2)[1]
            name = re.search(r"^name: (.+)$", frontmatter, re.M).group(1)
            self.assertEqual(name, source.parent.name)
            names.append(name)
            self.assertRegex(frontmatter, r"(?m)^description: .+")
            policy = (source.parent / "agents/openai.yaml").read_text()
            self.assertRegex(policy, r"(?m)^  allow_implicit_invocation: (true|false)$")
            if "allow_implicit_invocation: true" in policy:
                implicit.append(name)
        self.assertEqual(len(names), 49)
        self.assertEqual(len(set(names)), 49)
        self.assertEqual(implicit, ["setup-pstack", "simple-as-prose", "writing-for-agents"])
        marketplace = json.loads((ROOT / ".agents/plugins/marketplace.json").read_text())
        self.assertEqual(marketplace["plugins"][0]["name"], manifest["name"])
        self.assertFalse((ROOT / "hooks/hooks.json").exists())

    def test_skill_and_reference_links_resolve(self):
        for source in (ROOT / "skills").rglob("*.md"):
            for target in re.findall(r"\]\(([^)]+)\)", source.read_text()):
                if "://" in target or target.startswith("#") or target == "url":
                    continue
                path = target.split("#")[0]
                if path:
                    self.assertTrue((source.parent / path).exists(), f"{source}: {target}")

    def test_discovery_guard_runs_before_any_install(self):
        result = subprocess.run(
            [os.sys.executable, str(ROOT / "tests/discovery.py"), "--codex", "nonexistent-codex"],
            text=True, capture_output=True, timeout=10,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("explicit user authorization", result.stderr)
        self.assertNotIn("FileNotFoundError", result.stderr)


@unittest.skipUnless(shutil.which("node"), "Node is required for plan validation")
class Plans(unittest.TestCase):
    def setUp(self):
        template = (ROOT / "skills/poteto-mode/playbooks/multi-phase-plan.md").read_text()
        self.plan = template.split("````markdown\n", 1)[1].split("````", 1)[0]
        self.plan = re.sub(r"<[^>\n]+>", "fixture", self.plan)

    def run_plan(self, text):
        with tempfile.TemporaryDirectory(prefix="consumer project ") as temporary:
            consumer = Path(temporary)
            path = consumer / "reviewable plan.md"
            path.write_text(text)
            return subprocess.run([shutil.which("node"), str(CHECKER), str(path)],
                                  cwd=consumer, text=True, capture_output=True, timeout=10)

    def test_resolved_plan_runs_from_unrelated_consumer_directory(self):
        result = self.run_plan(self.plan)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("1 PR sections, 0 problems", result.stdout)

    def test_both_autopilot_audits_read_installed_resources_from_a_consumer_repo(self):
        with tempfile.TemporaryDirectory(prefix="autopilot resources ") as temporary:
            folder = Path(temporary)
            consumer = folder / "unrelated consumer"
            consumer.mkdir()
            plugin = folder / "loaded plugin"
            for name in ("autopilot-full", "autopilot-stack"):
                with self.subTest(playbook=name):
                    relative = Path(f"skills/poteto-mode/playbooks/{name}.md")
                    installed = plugin / relative
                    installed.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(ROOT / relative, installed)
                    text = installed.read_text()
                    command = re.search(r'`(cat "<resolved-plugin-root>/[^"\n]+")`', text)
                    self.assertIsNotNone(command, "audit must read its resolved installed resource")
                    arguments = shlex.split(command.group(1).replace("<resolved-plugin-root>", str(plugin)))
                    result = subprocess.run(arguments, cwd=consumer, capture_output=True,
                                            text=True, check=True, timeout=10)
                    self.assertEqual(result.stdout, text)
                    self.assertNotIn("git show origin/main:skills/", text)

    def test_legitimate_goal_and_absolute_plugin_paths_are_accepted(self):
        result = self.run_plan(self.plan + '\nRead `src/goals.ts` and `/opt/pstack/skills/how/SKILL.md`.\n')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_runtime_isolation_decision_is_required(self):
        result = self.run_plan(self.plan.replace("Runtime isolation.", "Isolation omitted."))
        self.assertEqual(result.returncode, 1)
        self.assertIn('lacks "Runtime isolation."', result.stderr)

    def test_missing_objective_is_rejected(self):
        result = self.run_plan(self.plan.replace("Program objective.", "Objective omitted."))
        self.assertEqual(result.returncode, 1)
        self.assertIn('lacks "Program objective."', result.stderr)

    def test_unsupported_commands_and_wrong_plugin_path_are_rejected(self):
        for marker in ("`/goal`", "`/loop`", "pstack/skills/swarm/SKILL.md", "./pstack/skills/swarm/SKILL.md"):
            with self.subTest(marker=marker):
                result = self.run_plan(self.plan + "\n" + marker + "\n")
                self.assertEqual(result.returncode, 1)
                self.assertIn("unresolved host command or bundled resource path", result.stderr)

    def test_missing_live_lane_is_rejected(self):
        text = re.sub(r"^- \[ \] Lane 10\..*\n", "", self.plan, flags=re.M)
        result = self.run_plan(text)
        self.assertEqual(result.returncode, 1)
        self.assertIn("expected 1 to 10", result.stderr)

    def test_missing_perf_rule_is_rejected(self):
        text = re.sub(r"^- \[ \] Rule\..*\n", "", self.plan, flags=re.M)
        result = self.run_plan(text)
        self.assertEqual(result.returncode, 1)
        self.assertIn("expected [Metric., Probe., Baseline., Rule.]", result.stderr)

    def test_review_gate_requires_real_media(self):
        result = self.run_plan(self.plan.replace("video", "recording"))
        self.assertEqual(result.returncode, 1)
        self.assertIn('Review gate lacks "video"', result.stderr)


if __name__ == "__main__":
    unittest.main()
