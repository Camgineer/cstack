---
name: verify-plugin
description: Use to verify this repository's plugin commands for installation, Intent delivery, seat setup, persistent mode, and check receipts in disposable fixtures, or to capture evidence for a change to them.
---

# Verify the plugin commands

Read the [feature index](features/README.md), then the files for the commands you need to prove. For full coverage, run every recipe in all five files. These instructions belong to this repository. Use the checkout's scripts and tests, rather than an installed plugin copy.

## Launch

Use Bun at the version in [package.json](../../../skills/cstack-mode/scripts/package.json), Node, Git, npm, and the POSIX utilities used by the existing fixtures. Put that Bun executable first on `PATH`. Install dependencies once. No server, port, account, or signed-in host is needed.

Run this in a shell from the checkout. Keep the shell variables for the drive and cleanup steps. Set `VERIFY_TASK` to your task's folder name before launch, or use the default below. Each launch creates a separate run directory.

```sh
set -e
repoRoot=$(git rev-parse --show-toplevel)
verifyTask=${VERIFY_TASK:-verify-plugin}
case "$verifyTask" in ''|*[!a-zA-Z0-9_-]*) exit 2 ;; esac
cd "$repoRoot"
git check-ignore -q "tmp/$verifyTask/probe" || exit 2
mkdir -p "tmp/$verifyTask"
verifyRun=$(mktemp -d "$repoRoot/tmp/$verifyTask/run.XXXXXX")
mkdir "$verifyRun/fixtures"
verifyReceipts="${verifyRun#"$repoRoot"/}/checks"
export repoRoot verifyRun
export TMPDIR="$verifyRun/fixtures" TMP="$verifyRun/fixtures" TEMP="$verifyRun/fixtures"
cd "$repoRoot/skills/cstack-mode/scripts"
bun check-receipt.ts --receipts "$verifyReceipts" record frozen-install 'bun install --frozen-lockfile --ignore-scripts' > "$verifyRun/frozen-install.log" 2>&1
```

A successful receipt reports `Exit code 0`. Stop on failure and preserve the output. Tests create their own disposable homes and projects under the run's fixture directory. Run recipes serially within a launch. Separate launches can coexist in separate checkouts; do not edit a checkout while another run checks its tree.

## Doctor

Run this before the first drive and after a failure. It reads the current build, tools, fixture paths, and required dependency. It does not contact a daemon or host CLI.

```sh
doctorCommand=$(cat <<'SH'
node <<'JS'
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const assert = require("node:assert/strict");
const root = cp.execFileSync("git", ["rev-parse", "--show-toplevel"], {encoding: "utf8"}).trim();
const expected = JSON.parse(fs.readFileSync("package.json", "utf8")).packageManager.split("@")[1];
assert.equal(cp.execFileSync("bun", ["--version"], {encoding: "utf8"}).trim(), expected);
for (const tool of ["node", "git", "npm", "sh", "sed", "awk", "head", "dirname", "basename", "cp", "mkdir", "rm", "ln", "readlink", "mv", "find", "grep", "which"]) {
  cp.execFileSync("which", [tool]);
}
for (const file of ["tests/integration/intent-install.test.ts", "tests/integration/mode-hooks.test.ts", "tests/integration/helpers.test.ts", "tests/support/file-change-kit.ts"]) {
  assert.ok(fs.existsSync(path.join(root, file)), file);
}
assert.ok(fs.existsSync("node_modules/typescript"));
const fixtures = fs.realpathSync(process.env.TMPDIR);
assert.ok(fixtures.startsWith(fs.realpathSync(path.join(root, "tmp")) + path.sep));
const head = cp.execFileSync("git", ["rev-parse", "HEAD"], {encoding: "utf8"}).trim();
console.log(JSON.stringify({head, bun: expected, node: process.version, fixtures}));
JS
SH
)
bun check-receipt.ts --receipts "$verifyReceipts" record doctor "$doctorCommand" > "$verifyRun/doctor.log" 2>&1
```

Require exit zero. A failed tool lookup, version mismatch, missing dependency, or fixture path outside project scratch makes this launch unsuitable. Fix the launch inputs and retry the doctor before driving.

## Drive

Use the Bun public-command fixtures linked from each feature file. Copy that file's `record` command into the launch shell, still in `skills/cstack-mode/scripts`. The fixture spawns the real script with fixed arguments. Its assertions inspect stdout, exit codes, and resulting filesystem state. External host executables and `intentd` are stand-ins supplied by the fixture. Never invoke the install or setup command directly against your own home.

Run the whole recipe, including every command when a feature has several. Require a nonzero number of passing tests and zero failures. A filter matching nothing proves nothing. Read the linked assertions if a test name or failure is unclear. After a failure, let fixture teardown finish, run Doctor, and rerun only after correcting the verification inputs. Report a product failure without changing the product in a map-maintenance run.

## Evidence

`check-receipt.ts` saves each command, working directory, exit code, timestamps, and Git tree identity under `$verifyRun/checks`. The recipe redirects full stdout and stderr to `$verifyRun/<feature>.log`. Search these saved logs after execution. After a failed attempt, use a fresh launch so its first transcript remains intact. A passing fixture proves only the behavior its assertions observe. The feature files name those observations. It does not prove real host installation, Intent discovery or delegation, browser behavior, or agent compliance.

When reporting a committed head, stage only the intended files and run this from the launch shell:

```sh
bun check-receipt.ts --receipts "$verifyReceipts" check --head HEAD > "$verifyRun/head-gate.log" 2>&1
```

Require the check to pass and record the head SHA. Tree edits invalidate the receipts; rerun affected checks after an edit. See the [receipt feature](features/check-receipts.md) for the helper's limits.

Capture package exclusion when changing this skill's placement. Run from the checkout root with the same `verifyRun` value:

```sh
bun check-receipt.ts --receipts "$verifyReceipts" record package-exclusion 'cd "$repoRoot" && npm --cache "$verifyRun/npm-cache" pack --dry-run --json --ignore-scripts > "$verifyRun/package-inventory.json" && node -e "const fs=require(\"node:fs\"); const assert=require(\"node:assert/strict\"); const files=JSON.parse(fs.readFileSync(process.argv[1],\"utf8\"))[0].files.map(f=>f.path); assert.ok(files.includes(\"skills/cstack-mode/SKILL.md\")); assert.ok(!files.some(f=>f.startsWith(\".agents/skills/\") || f.startsWith(\"tmp/\"))); console.log(\"Repository skill and scratch are absent from the package.\");" "$verifyRun/package-inventory.json"' > "$verifyRun/package-exclusion.log" 2>&1
```

The [host generator](../../../tools/sync-hosts.ts) discovers root `skills/` only. The [delivery copy list](../../../hooks/intent-deliver.mjs) excludes `.agents/skills/`. Keep this skill outside both.

## Cleanup

The existing fixtures remove their disposable homes and join the children they own. They start no persistent service. After any drive, including a failed attempt, wait for its test process to exit before cleanup. Never kill by process name. Inspect `$verifyRun/fixtures` for unexpected leftovers; preserve a failed run's leftovers for diagnosis.

After a successful run, remove only the run's fixture and npm-cache directories. Keep the receipts and package inventory for review.

```sh
rm -rf -- "$verifyRun/fixtures" "$verifyRun/npm-cache"
unset TMPDIR TMP TEMP
test -d "$verifyRun/checks"
find "$verifyRun" -type f -name '*.log' -print
```

Confirm the logs and JSON receipts still exist after teardown. Report the run directory, feature IDs, head, results, skipped entry points, and unmet prerequisites. Keep proof artifacts until the task's owner no longer needs them.

## Helpers

Reuse [check-receipt.ts](../../../skills/cstack-mode/scripts/check-receipt.ts) through the commands above. Reuse [the file-change kit](../../../tests/support/file-change-kit.md) through its existing consumers in the setup and delivery tests. This skill adds no helper or behavior test.

Use [maintain-verification-skill](../../../skills/maintain-verification-skill/SKILL.md) when command behavior changes, to reconcile the map with source and rerun each feature.
