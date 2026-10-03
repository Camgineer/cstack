# Skill mechanics

Apply [writing-for-agents](SKILL.md) to the instruction body. This reference covers discovery and invocation. These skills follow the shared `SKILL.md` format, so one skill works in Claude Code, Codex, and Cursor.

## Discovery

Keep `name` and `description` in `SKILL.md` frontmatter. The description names the task and the conditions for using the skill. Keep required instructions in the body; link branch-specific references where the agent needs them. Keep the body free of harness tool names. Name a capability from the runtime contract instead, and let the host notes map it.

Hosts select a skill by its description by default. Set `disable-model-invocation: true` in the frontmatter when the skill must be explicit-only. Keep its description for the selector. Omit the key when the model should select the skill by task.

In this plugin, the frontmatter is the single source for invocation policy. Codex reads `agents/openai.yaml` instead, and `bun run sync:hosts` generates that file from the frontmatter. Edit the frontmatter and regenerate. Never edit the YAML by hand.

An explicit-only skill stays available to users through its host command; each host note under `skills/poteto-mode/references/hosts/` names the syntax. Another workflow can still read its installed file when instructed. Discovery policy is not a file-access restriction. Confirm actual visibility with the host's skill list.

## Splitting and routing

Give a skill its own entry point when users or workflows need to select it independently. Put shared instructions in one referenced file when they have no independent trigger. A router names each destination and when to read it; load the selected workflow and its prerequisites.

Keep names and descriptions concise because discovery metadata consumes context before the full skill is loaded. Check references and invocation behavior after changing a router.
