"""Exercise the updater against local Git repos; no network or production state."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/update_pstack.py'


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        self.source, self.repo = self.root / 'source', self.root / 'cstack'
        for path in (self.source, self.repo):
            path.mkdir()
            self.git(path, 'init', '-q')
            self.git(path, 'config', 'user.name', 'Updater test')
            self.git(path, 'config', 'user.email', 'updater@example.invalid')
        self.write(self.source, 'pstack/LICENSE', 'MIT fixture\n')
        self.write(self.source, 'pstack/skill.md', 'upstream one\n')
        self.write(self.source, 'pstack/docs/guide.md', 'human one\n')
        self.write(self.source, 'pstack/removed.md', 'old input\n')
        self.old = self.commit(self.source)
        self.write(self.repo, 'LICENSE', 'MIT fixture\n')
        self.write(self.repo, 'skill.md', 'upstream one\n')
        self.write(self.repo, 'codex-only.txt', 'overlay\n')
        self.write(self.repo, 'scripts/update_pstack.py', SCRIPT.read_text())
        self.lock = {'repository': str(self.source), 'commit': self.old, 'path': 'pstack',
                     'tree': self.git(self.source, 'rev-parse', self.old + ':pstack').stdout.strip(),
                     'excluded_prefixes': ['docs/'], 'excluded_paths': []}
        self.write(self.repo, 'upstream/pstack.json', json.dumps(self.lock))
        self.initial = self.commit(self.repo)

    def git(self, path, *args, check=True):
        return subprocess.run(['git', '-C', str(path), *args], text=True, capture_output=True, check=check)

    def write(self, root, name, contents):
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents)

    def commit(self, root):
        self.git(root, 'add', '.')
        self.git(root, 'commit', '-qm', 'fixture')
        return self.git(root, 'rev-parse', 'HEAD').stdout.strip()

    def run_update(self, action, target, *args):
        return subprocess.run([sys.executable, str(self.repo / 'scripts/update_pstack.py'), action, target, *args],
                              text=True, capture_output=True)

    def pin(self):
        return json.loads((self.repo / 'upstream/pstack.json').read_text())

    def test_diff_then_prepare_preserves_overlay_and_exclusions(self):
        self.write(self.source, 'pstack/new.md', 'new agent input\n')
        self.write(self.source, 'pstack/skill.md', 'upstream two\n')
        self.write(self.source, 'pstack/docs/guide.md', 'human two\n')
        self.write(self.source, 'pstack/removed.md', 'changed old input\n')
        target = self.commit(self.source)
        preview = self.run_update('diff', target)
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertIn('+upstream two', preview.stdout)
        self.assertIn('docs/guide.md', preview.stderr)
        self.assertIn('removed.md', preview.stderr)
        self.assertEqual(self.git(self.repo, 'status', '--porcelain').stdout, '')
        result = self.run_update('prepare', target)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.repo / 'skill.md').read_text(), 'upstream two\n')
        self.assertEqual((self.repo / 'codex-only.txt').read_text(), 'overlay\n')
        self.assertFalse((self.repo / 'docs').exists())
        self.assertFalse((self.repo / 'removed.md').exists())
        self.assertEqual(self.pin()['commit'], target)
        self.assertEqual(self.git(self.repo, 'rev-parse', 'HEAD').stdout.strip(), self.initial)
        self.assertIn('upstream/pstack-', self.git(self.repo, 'branch', '--show-current').stdout)
        self.commit(self.repo)
        repeated = self.run_update('prepare', target)
        self.assertEqual(repeated.returncode, 0, repeated.stderr)
        self.assertEqual(self.git(self.repo, 'status', '--porcelain').stdout, '')

    def test_conflict_keeps_pin_and_both_versions(self):
        self.write(self.repo, 'skill.md', 'Codex edit\n'); self.commit(self.repo)
        self.write(self.source, 'pstack/skill.md', 'upstream edit\n'); target = self.commit(self.source)
        result = self.run_update('prepare', target)
        self.assertEqual(result.returncode, 1, result.stderr)
        text = (self.repo / 'skill.md').read_text()
        self.assertIn('Codex edit', text); self.assertIn('upstream edit', text)
        self.assertTrue(self.git(self.repo, 'ls-files', '-u').stdout)
        self.assertEqual(self.pin()['commit'], self.old)

    def test_nonoverlapping_codex_edit_survives(self):
        original = ''.join(f'line {i}\n' for i in range(30))
        self.write(self.source, 'pstack/skill.md', original); old = self.commit(self.source)
        self.lock['commit'] = old
        self.lock['tree'] = self.git(self.source, 'rev-parse', old + ':pstack').stdout.strip()
        self.write(self.repo, 'upstream/pstack.json', json.dumps(self.lock))
        self.write(self.repo, 'skill.md', original.replace('line 0\n', 'Codex first\n')); self.commit(self.repo)
        self.write(self.source, 'pstack/skill.md', original.replace('line 29\n', 'upstream last\n'))
        target = self.commit(self.source)
        result = self.run_update('prepare', target)
        self.assertEqual(result.returncode, 0, result.stderr)
        text = (self.repo / 'skill.md').read_text()
        self.assertIn('Codex first', text); self.assertIn('upstream last', text)

    def test_dirty_tree_rejected_before_branch_or_pin_change(self):
        self.write(self.repo, 'untracked.txt', 'user work')
        before = self.git(self.repo, 'branch', '--show-current').stdout
        result = self.run_update('prepare', self.old)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.git(self.repo, 'branch', '--show-current').stdout, before)
        self.assertEqual(self.pin()['commit'], self.old)

    def test_clean_paused_operation_detected_from_outside_checkout(self):
        marker = self.repo / self.git(self.repo, 'rev-parse', '--git-path', 'CHERRY_PICK_HEAD').stdout.strip()
        marker.write_text(self.initial + '\n')
        self.assertEqual(self.git(self.repo, 'status', '--porcelain').stdout, '')
        result = self.run_update('prepare', self.old)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('existing Git operation', result.stderr)
        self.assertTrue(marker.exists())
        self.assertEqual(self.git(self.repo, 'rev-parse', 'HEAD').stdout.strip(), self.initial)

    def test_bad_pin_and_symbolic_ref_rejected(self):
        self.assertEqual(self.run_update('diff', 'main').returncode, 2)
        self.lock['tree'] = '0' * 40
        self.write(self.repo, 'upstream/pstack.json', json.dumps(self.lock))
        self.assertEqual(self.run_update('diff', self.old).returncode, 2)

    def test_symlink_rejected_before_apply(self):
        (self.source / 'pstack/link').symlink_to('/tmp')
        target = self.commit(self.source)
        self.assertEqual(self.run_update('prepare', target).returncode, 2)
        self.assertEqual(self.git(self.repo, 'status', '--porcelain').stdout, '')

    def test_existing_branch_not_overwritten(self):
        self.git(self.repo, 'branch', 'keep')
        self.write(self.source, 'pstack/new.md', 'new input')
        target = self.commit(self.source)
        self.assertEqual(self.run_update('prepare', target, '--branch', 'keep').returncode, 2)
        self.assertEqual(self.git(self.repo, 'rev-parse', 'keep').stdout.strip(), self.initial)

    def test_upstream_deletion_and_executable_mode(self):
        (self.source / 'pstack/skill.md').unlink()
        self.write(self.source, 'pstack/helper.sh', '#!/bin/sh\nexit 0\n')
        (self.source / 'pstack/helper.sh').chmod(0o755)
        target = self.commit(self.source)
        result = self.run_update('prepare', target)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.repo / 'skill.md').exists())
        self.assertTrue((self.repo / 'helper.sh').stat().st_mode & 0o111)


if __name__ == '__main__':
    unittest.main()
