# Working mode

Invoke the `cstack-mode` skill as your first action in every session in this repository, before any other tool call, even for a quick question. Work under it for the rest of the session unless the user turns it off. New and cloud sessions start with the mode off, so don't wait for the plugin's hooks to turn it on.

# Writing standards

Before drafting or editing text, identify its audience and read and apply the required guidance:

- For a person, use [Simple as Prose](skills/simple-as-prose/SKILL.md).
- For an agent, use [Writing for Agents](skills/writing-for-agents/SKILL.md).
- For both, use both skills.

This applies to replies, documentation, PR descriptions, commit messages, code comments, UI copy, prompts, personas, skills, playbooks, and references. Classify each text by who consumes it, rather than by its filename. When changing a skill, also read [Skill mechanics](skills/writing-for-agents/SKILL-MECHANICS.md).

Before returning or saving the text, review it against the applicable guidance. Keep the full guidance in the linked skills and load it when writing work begins.

Preserve agent inputs, license notices, and source provenance. Keep task reports and review evidence outside the repository or in the pull request.

## Harness neutrality

This plugin runs in Claude Code, Codex, and Cursor from one core. Keep `skills/` and `agents/` free of harness tool names, host paths, and host-only syntax. Name a capability from the [runtime contract](skills/cstack-mode/references/runtime.md) instead. Put each host's tool mapping in its host note under `skills/cstack-mode/references/hosts/`. A host note's claim about what a host can or cannot do is a snapshot. Check it against the host's current docs before you design around it, above all a "cannot" or "has no" claim, and link the doc page that each claim you add or change rests on.

Edit plugin metadata in `tools/metadata.json` and invocation policy in `SKILL.md` frontmatter. Then run `bun run --cwd skills/cstack-mode/scripts sync:hosts` to regenerate every host manifest and each `agents/openai.yaml`. CI fails when generated files drift.

Keep the project name in the README title, `tools/metadata.json`, and the entry-point names: the `<plugin>-mode` skill and its `<plugin>-agent` persona. Everywhere else, write "the plugin" or `<plugin>`. A rename edits `tools/metadata.json`, then renames the `<plugin>-mode` and `<plugin>-agent` paths and their references. A rename also renames the `<PLUGIN>_MODE` environment variable that the mode hook reads, which breaks every user's shell profile and cloud setting. Name that break in the PR title and description, and ask the user whether to mark the title with `!`.

Keep the repository user-agnostic. Leave out the names, accounts, repositories, and preferences of anyone who uses or maintains it. That context belongs in the user's own memory, never in the toolkit. Preserve license notices and source provenance.

Set `disable-model-invocation: true` on every `principle-*` skill and on no other bundled skill. A skill with that key drops out of the agent's skill list, and some hosts give users no way to type its command. `cstack-mode` indexes the principles and reads each one's file when a step needs it, so they stay out of the list and its budget.

Keep sources that need one vendor's APIs in `contrib/`, which no manifest loads.

## Dogfooding

This repository is the plugin's source and also one of its users. Build every new mechanism, such as a check, gate, or script, to ship with the plugin, unless it only guards this repository's own release or metadata. Then install it here the same way a user would. When a decision offers a mechanism, state whether each option reaches every user of the plugin or only this repository.

## Versioning

Never change the plugin version in a PR. The release sets it after the merge. The PR title's type sets the step: `feat` bumps the minor version, and every other type bumps the patch version. Bump the major version only when the user asks for it, by adding `!` after the title's type or scope, as in `feat(cstack-mode)!: rename the mode`. CI checks that every PR title names one of these types and that no PR changes the version. A branch that bumped the version under the old rule restores the base's version files: `git checkout origin/<base-branch> -- tools/metadata.json`, then `sync:hosts`.

After a merge passes CI on main, the release workflow runs `bun tools/version.ts release`. It bumps once for each change merged since the latest `v*` tag, commits `chore(release): vX.Y.Z` to main with a deploy key that bypasses the ruleset, and publishes the GitHub release. The bypass is the ruleset's `DeployKey` bypass actor, which covers every deploy key, so rotating the key needs no ruleset change. To rotate the key, add a new write deploy key, store its private half in the `RELEASE_DEPLOY_KEY` secret, and delete the old key. Never create version commits, tags, or releases by hand.

## After a merge of main

After any merge of main, re-read each skill or playbook the merge changed that you are following, since it may have changed how you work. When your branch also changes rules, read the merged rules beside yours and reconcile any that interact.

## Documentation scope

Keep the root README as this repository's only human guide. Keep other instructional prose agent-facing, with a clear workflow or context pointer that reaches it. Classify files by their actual use; an agent verification index may still be named README.md. Preserve legal notices, provenance, and machine metadata.

## PStack imports

When importing an upstream update, compare the recorded PStack baseline, the target upstream revision, and the current plugin. Adapt useful changes to the plugin's harness-neutral core and Bun/TypeScript tooling. Prioritize this plugin's behavior and architecture over upstream path or syntax compatibility. Verify affected workflows and prepare a reviewable PR that identifies imported changes, deliberate omissions, and unresolved issues. Keep merge and installation decisions within the user's authorization.

## Test scope

Keep tests that protect a concrete failure in supported behavior. Write each one at a public seam per [Test Behavior, Not Implementation](skills/principle-test-behavior-not-implementation/SKILL.md). Prefer real CLI, filesystem, and Git fixtures where practical. Verify agent workflow quality through realistic task execution. Reconsider a test when it only repeats implementation details or checks document wording. To prove a change to Codex hook behavior, extend the Codex harness in `tests/e2e/` and run `test:e2e` once the user authorizes it, rather than building a one-off probe.
