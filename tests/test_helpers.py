"""Exercise existing helper behavior in isolated fixtures."""

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


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
