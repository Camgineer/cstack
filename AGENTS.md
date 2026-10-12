# Writing standards

Before drafting or editing text, identify its audience and read and apply the required guidance:

- For a person, use [Simple as Prose](skills/simple-as-prose/SKILL.md).
- For an agent, use [Writing for Agents](skills/writing-for-agents/SKILL.md).
- For both, use both skills.

This applies to replies, documentation, PR descriptions, commit messages, code comments, UI copy, prompts, personas, skills, task guides, and references. Classify each text by who consumes it, rather than by its filename. When changing a skill, also read [Skill mechanics](skills/writing-for-agents/SKILL-MECHANICS.md).

Before returning or saving the text, review it against the applicable guidance. Keep the full guidance in the linked skills and load it when writing work begins.

Preserve agent inputs, license notices, and source provenance. Keep task reports and review evidence outside the repository or in the pull request.

## Harness neutrality

This plugin supplies a shared toolkit to Claude Code, Codex, Cursor, and other harnesses that discover its skills. Keep `skills/` free of harness tool names, host paths, and host-only syntax. Name the capability in plain words, such as read a file, run a command, or ask the person. Keep host installation instructions in the root README and verify claims against current official documentation or the host's applying code. Link source claims at the tested release and label them as read from source.

Edit plugin metadata in `tools/metadata.json` and invocation policy in `SKILL.md` frontmatter. Then run `bun run --cwd tools sync:hosts` to regenerate every host manifest and each `agents/openai.yaml`. CI fails when generated files drift.

Keep the project name in the README title and `tools/metadata.json`. Everywhere else, write "the plugin" or `<plugin>`. A rename edits `tools/metadata.json`, then regenerates the host manifests.

Keep the repository user-agnostic. Leave out the names, accounts, repositories, and preferences of anyone who uses or maintains it. That context belongs in the user's own memory, never in the toolkit. Preserve license notices and source provenance.

Set `disable-model-invocation: true` on task guides that only a person invokes. Model-invocable toolkit skills omit the key. A user-invoked skill may invoke only model-invocable skills; reading a reference file is always allowed. The `principles` skill indexes its own reference files.

Keep sources that need one vendor's APIs in `contrib/`, which no manifest loads.

## Dogfooding

This repository is the plugin's source and also one of its users. Build new toolkit mechanisms to ship with the plugin, unless they only guard this repository's release or metadata. Verify a host addition through its native installation path. When a decision offers a mechanism, or offers to drop, close, or defer a change, state whether each option reaches every user of the plugin or only this repository, and name the users who lose a change that an option drops. After invoking a skill, read the same path under this checkout's `skills/` and follow it where the two differ, since an installed copy can lag several releases.

## Versioning

Never change the plugin version in a PR. The release sets it after the merge. The PR title's type sets the step: `feat` bumps the minor version, and every other type bumps the patch version. Bump the major version only when the user asks for it, by adding `!` after the title's type or scope, as in `feat(plugin)!: change the installation contract`. CI checks that every PR title names one of these types and that no PR changes the version. A branch that bumped the version under the old rule restores the base's version files: `git checkout origin/<base-branch> -- tools/metadata.json`, then `sync:hosts`.

After a merge passes CI on main, the release workflow runs `bun tools/version.ts release`. It bumps once for each change merged since the latest `v*` tag, commits `chore(release): vX.Y.Z` to main with a deploy key that bypasses the ruleset, and publishes the GitHub release. The bypass is the ruleset's `DeployKey` bypass actor, which covers every deploy key, so rotating the key needs no ruleset change. To rotate the key, add a new write deploy key, store its private half in the `RELEASE_DEPLOY_KEY` secret, and delete the old key. Never create version commits, tags, or releases by hand. After any merge of main, re-read each skill or task guide the merge changed that you are following, since it may have changed how you work.

## Documentation scope

Architecture decisions live in [docs/adr/](docs/adr/). Read the relevant ADR before changing the plugin's architecture. An ADR is a law that can be changed and is never broken.

Keep the root README as this repository's only human guide. Keep other instructional prose agent-facing, with a clear workflow or context pointer that reaches it. Classify files by their actual use; an agent verification index may still be named README.md. Preserve legal notices, provenance, and machine metadata.

## PStack imports

When importing an upstream update, compare the recorded PStack baseline, the target upstream revision, and the current plugin. Adapt useful changes to the plugin's harness-neutral core and Bun/TypeScript tooling. Prioritize this plugin's behavior and architecture over upstream path or syntax compatibility. Verify affected workflows and prepare a reviewable PR that identifies imported changes, deliberate omissions, and unresolved issues. Keep merge and installation decisions within the user's authorization.

## Test scope

Keep tests that protect a concrete failure in supported behavior. Write each one at a public seam per [Test Behavior, Not Implementation](skills/principles/test-behavior-not-implementation.md). Prefer real CLI, filesystem, and Git fixtures where practical. Verify agent workflow quality through realistic task execution. Reconsider a test when it only repeats implementation details or checks document wording. To prove a change to a shipped script, extend its existing test under `tests/` rather than building a one-off probe. Write each check's full output to a file and search that file. Preserve the first run unfiltered instead of piping it through `tail` or `grep`. A fresh checkout needs `bun install --cwd tools --frozen-lockfile --ignore-scripts` before any check runs. To run one test, run `bun test ../tests/<dir>/<file> -t <pattern>` from `tools/`.
