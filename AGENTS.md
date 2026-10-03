# Writing standards

Before drafting or editing text, identify its audience and read and apply the required guidance:

- For a person, use [Simple as Prose](skills/simple-as-prose/SKILL.md).
- For an agent, use [Writing for Agents](skills/writing-for-agents/SKILL.md).
- For both, use both skills.

This applies to replies, documentation, PR descriptions, commit messages, code comments, UI copy, prompts, personas, skills, playbooks, and references. Classify each text by who consumes it, rather than by its filename. When changing a skill, also read [Skill mechanics for Codex](skills/writing-for-agents/SKILL-MECHANICS.md).

Before returning or saving the text, review it against the applicable guidance. Keep the full guidance in the linked skills and load it when writing work begins.

Preserve agent inputs, license notices, and source provenance. Keep task reports and review evidence outside the repository or in the pull request.

## Documentation scope

Keep the root README as this repository's only human guide. Keep other instructional prose agent-facing, with a clear workflow or context pointer that reaches it. Classify files by their actual use; an agent verification index may still be named README.md. Preserve legal notices, provenance, and machine metadata.

## PStack imports

When importing an upstream update, compare the recorded PStack baseline, the target upstream revision, and current CStack. Adapt useful changes to CStack's native Codex workflows and Bun/TypeScript tooling. Prioritize CStack's behavior and architecture over upstream path or syntax compatibility. Verify affected workflows and prepare a reviewable PR that identifies imported changes, deliberate omissions, and unresolved issues. Keep merge and installation decisions within the user's authorization.
