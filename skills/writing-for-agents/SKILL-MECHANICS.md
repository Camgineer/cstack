# Skill mechanics for Codex

Apply [writing-for-agents](SKILL.md) to the instruction body. This reference covers discovery and invocation in Codex.

## Discovery

Keep `name` and `description` in `SKILL.md` frontmatter. The description names the task and the conditions for using the skill. Keep required instructions in the body; link branch-specific references where the agent needs them.

Codex allows implicit invocation by default. Set `policy.allow_implicit_invocation: false` in `agents/openai.yaml` when the skill must be explicit-only. Keep its description for the selector; that policy excludes the skill from default model context. Use `true` or omit the policy when the model should select the skill by task.

An explicit-only skill remains available through its registered identity, such as `$cstack:poteto-mode`. Another workflow can still read its installed file when instructed. Discovery policy is not a file-access restriction. Confirm actual visibility with the host's skill list and prompt inspection.

## Splitting and routing

Give a skill its own entry point when users or workflows need to select it independently. Put shared instructions in one referenced file when they have no independent trigger. A router names each destination and when to read it; load the selected workflow and its prerequisites.

Keep names and descriptions concise because discovery metadata consumes context before the full skill is loaded. Check references and invocation behavior after changing a router.
