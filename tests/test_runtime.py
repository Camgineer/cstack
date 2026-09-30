import importlib.util
import json
from pathlib import Path
import tempfile
import tomllib
import unittest
import subprocess
import shutil
import os


ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


agents, models, mode = (load(name) for name in ("setup_agents", "validate_models", "mode_state"))


class Personas(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.project = Path(self.temporary.name)

    def test_preview_does_not_write_and_apply_is_owned_idempotent(self):
        self.assertFalse(agents.setup(self.project)["applied"])
        self.assertEqual(list(self.project.iterdir()), [])
        first = agents.setup(self.project, True)
        self.assertEqual(first, agents.setup(self.project, True))
        profile = tomllib.loads((self.project / ".codex/agents/cstack-poteto.toml").read_text())
        self.assertIn("Principles index", profile["developer_instructions"])
        self.assertIn("poteto-mode/SKILL.md", profile["developer_instructions"])
        self.assertNotIn("model", profile)
        self.assertFalse((self.project / ".codex/config.toml").exists())

    def test_edited_profile_is_preserved(self):
        agents.setup(self.project, True)
        target = self.project / ".codex/agents/cstack-comment-sicko.toml"
        target.write_text('name = "cstack-comment-sicko"\n# user edit\n')
        with self.assertRaisesRegex(ValueError, "unowned or edited"):
            agents.setup(self.project, True)
        self.assertIn("# user edit", target.read_text())

    def test_duplicate_native_name_is_rejected(self):
        folder = self.project / ".codex/agents"
        folder.mkdir(parents=True)
        (folder / "my-persona.toml").write_text('name = "cstack-poteto"\n')
        with self.assertRaisesRegex(ValueError, "duplicate"):
            agents.setup(self.project, True)
        self.assertFalse((folder / "cstack-poteto.toml").exists())

    def test_symlinked_config_is_rejected(self):
        destination = self.project / "elsewhere"
        destination.mkdir()
        (self.project / ".codex").symlink_to(destination)
        with self.assertRaisesRegex(ValueError, "symlink"):
            agents.setup(self.project, True)
        self.assertEqual(list(destination.iterdir()), [])

    def test_nested_duplicate_is_rejected(self):
        folder = self.project / ".codex/agents/nested"
        folder.mkdir(parents=True)
        (folder / "cstack-poteto.toml").write_text('name = "cstack-poteto"\n')
        with self.assertRaisesRegex(ValueError, "duplicate"):
            agents.setup(self.project, True)
        self.assertFalse((folder.parent / "cstack-poteto.toml").exists())


class Models(unittest.TestCase):
    catalog = {"data": [{"model": "test-model", "supportedReasoningEfforts": [{"reasoningEffort": "high"}]}]}

    def test_supported_choice_and_inherited_panel_keep_seats(self):
        roles = {"swarm workers": {"model": "test-model", "reasoning_effort": "high"},
                 "arena runners": [{"model": "inherit-parent"}] * 3}
        result = models.validate({"schema": 1, "roles": roles}, self.catalog)
        self.assertTrue(result["valid"])
        self.assertFalse(result["served_identity_verified"])
        self.assertEqual(len(roles["arena runners"]), 3)

    def test_unknown_model_effort_empty_panel_and_alias_effort_are_rejected(self):
        invalid = [{"swarm workers": {"model": "guessed-model"}},
                   {"swarm workers": {"model": "test-model", "reasoning_effort": "max"}},
                   {"arena runners": []},
                   {"swarm workers": {"model": "inherit-parent", "reasoning_effort": "high"}}]
        for roles in invalid:
            with self.subTest(roles=roles), self.assertRaises(ValueError):
                models.validate({"schema": 1, "roles": roles}, self.catalog)


class ModeState(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.data = self.temporary.name
        self.event = {"hook_event_name": "UserPromptSubmit", "session_id": "parent-test",
                      "cwd": self.data, "transcript_path": self.data + "/parent.jsonl"}

    def call(self, **changes):
        return mode.handle({**self.event, **changes}, self.data)

    def test_exact_activation_resume_compaction_and_opt_out(self):
        self.assertEqual(self.call(prompt="$cstack:poteto-mode")["systemMessage"], "CStack mode: active")
        for source in ("resume", "compact"):
            output = self.call(hook_event_name="SessionStart", source=source)
            self.assertIn("activation receipt", output["hookSpecificOutput"]["additionalContext"])
        self.assertEqual(self.call(prompt="$cstack:poteto-mode off")["systemMessage"], "CStack mode: inactive")
        self.assertNotIn("hookSpecificOutput", self.call(hook_event_name="SessionStart", source="resume"))

    def test_quoted_commands_and_substrings_do_not_activate(self):
        for prompt in ('"$cstack:poteto-mode"', 'Explain $cstack:poteto-mode',
                       '```\n$cstack:poteto-mode\n```', '$cstack:poteto-mode extra text'):
            self.assertEqual(self.call(prompt=prompt)["systemMessage"], "CStack mode: inactive")

    def test_identity_isolation_and_missing_identity(self):
        self.call(prompt="$cstack:poteto-mode")
        for change in ({"session_id": "other"}, {"transcript_path": self.data + "/child.jsonl"},
                       {"cwd": self.data + "/other"}, {"agent_id": "child"}, {"transcript_path": ""}):
            self.assertNotIn("hookSpecificOutput", self.call(**change))

    def test_clear_preserves_tombstone_and_no_compact_output(self):
        self.call(prompt="$cstack:poteto-mode")
        self.assertNotIn("hookSpecificOutput", self.call(hook_event_name="SessionStart", source="clear"))
        self.assertNotIn("hookSpecificOutput", self.call(hook_event_name="SessionStart", source="resume"))
        self.assertEqual(self.call(hook_event_name="PostCompact"), {"continue": True})

    def test_corrupt_state_and_symlink_refuse_restoration(self):
        self.call(prompt="$cstack:poteto-mode")
        state = next((Path(self.data) / "mode-v1").glob("*.json"))
        state.write_text('{"schema": 1, "active": "yes"}')
        with self.assertRaisesRegex(ValueError, "invalid persisted"):
            self.call(hook_event_name="SessionStart", source="resume")
        state.unlink()
        state.symlink_to(Path(self.data) / "elsewhere.json")
        self.assertNotIn("hookSpecificOutput", self.call(prompt="$cstack:poteto-mode"))
        self.assertFalse((Path(self.data) / "elsewhere.json").exists())


class Helpers(unittest.TestCase):
    @unittest.skipUnless(shutil.which("bun"), "Bun is needed for helper startup verification")
    def test_helper_does_not_install_missing_dependencies(self):
        with tempfile.TemporaryDirectory() as temporary:
            copy = Path(temporary) / "scripts"
            shutil.copytree(ROOT / "skills/poteto-mode/scripts", copy)
            before = {str(p.relative_to(copy)) for p in copy.rglob("*")}
            result = subprocess.run([shutil.which("bun"), str(copy / "orch/orch.ts"), "--help"],
                                    capture_output=True, text=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("never install dependencies", result.stderr)
            self.assertEqual(before, {str(p.relative_to(copy)) for p in copy.rglob("*")})

    def test_worktree_audit_keeps_paths_with_spaces_and_does_not_infer_chat_safety(self):
        with tempfile.TemporaryDirectory(prefix="cstack audit ") as temporary:
            folder = Path(temporary)
            repo, worktree = folder / "repo", folder / "second worktree"
            repo.mkdir()
            def git(*args):
                subprocess.run(["git", "-C", str(repo), *args], check=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            git("init", "-b", "main")
            git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid",
                "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "fixture")
            git("update-ref", "refs/remotes/origin/main", "HEAD")
            git("worktree", "add", "-b", "fixture", str(worktree))
            bins = folder / "bin"
            bins.mkdir()
            gh = bins / "gh"
            gh.write_text("#!/bin/sh\nprintf '[]'\n")
            gh.chmod(0o755)
            result = subprocess.run(["bash", str(ROOT / "skills/poteto-mode/scripts/worktree-audit.sh"), str(repo)],
                                    env={**os.environ, "PATH": str(bins) + os.pathsep + os.environ["PATH"]},
                                    capture_output=True, text=True, timeout=10, check=True)
            self.assertIn(str(worktree), result.stdout)
            self.assertIn("unavailable\treview-history", result.stdout)


if __name__ == "__main__":
    unittest.main()
