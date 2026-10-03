# Writing standards

Before drafting or editing text, identify its audience and read and apply the required guidance:

- For a person, use [Simple as Prose](skills/simple-as-prose/SKILL.md).
- For an agent, use [Writing for Agents](skills/writing-for-agents/SKILL.md).
- For both, use both skills.

This applies to replies, documentation, PR descriptions, commit messages, code comments, UI copy, prompts, personas, skills, playbooks, and references. Classify each text by who consumes it, rather than by its filename. When changing a skill, also read [Skill mechanics](skills/writing-for-agents/SKILL-MECHANICS.md).

Before returning or saving the text, review it against the applicable guidance. Keep the full guidance in the linked skills and load it when writing work begins.

Preserve agent inputs, license notices, and source provenance. Keep task reports and review evidence outside the repository or in the pull request.

## Harness neutrality

This plugin runs in Claude Code, Codex, and Cursor from one core. Keep `skills/` and `agents/` free of harness tool names, host paths, and host-only syntax. Name a capability from the [runtime contract](skills/poteto-mode/references/runtime.md) instead. Put each host's tool mapping in its host note under `skills/poteto-mode/references/hosts/`.

Edit plugin metadata in `tools/metadata.json` and invocation policy in `SKILL.md` frontmatter. Then run `bun run --cwd skills/poteto-mode/scripts sync:hosts` to regenerate every host manifest and each `agents/openai.yaml`. CI fails when generated files drift.

Keep the project name in two places only: the README title and `tools/metadata.json`. Everywhere else, write "the plugin" or `<plugin>`, so a rename is a one-file change.

Keep the repository user-agnostic. Leave out the names, accounts, repositories, and preferences of anyone who uses or maintains it. That context belongs in the user's own memory, never in the toolkit. Preserve license notices and source provenance.

Keep every bundled skill model-invocable. Never set `disable-model-invocation` in a bundled skill's frontmatter. The agent then can't see the skill, and some hosts give users no way to type its command.

Keep sources that need one vendor's APIs in `contrib/`, which no manifest loads.

## Documentation scope

Keep the root README as this repository's only human guide. Keep other instructional prose agent-facing, with a clear workflow or context pointer that reaches it. Classify files by their actual use; an agent verification index may still be named README.md. Preserve legal notices, provenance, and machine metadata.

## PStack imports

When importing an upstream update, compare the recorded PStack baseline, the target upstream revision, and the current plugin. Adapt useful changes to the plugin's harness-neutral core and Bun/TypeScript tooling. Prioritize this plugin's behavior and architecture over upstream path or syntax compatibility. Verify affected workflows and prepare a reviewable PR that identifies imported changes, deliberate omissions, and unresolved issues. Keep merge and installation decisions within the user's authorization.

## Test scope

Keep tests that protect a concrete failure in supported behavior, using observable results at the relevant boundary. Prefer real CLI, filesystem, and Git fixtures where practical. Verify agent workflow quality through realistic task execution. Reconsider a test when it only repeats implementation details or checks document wording.
