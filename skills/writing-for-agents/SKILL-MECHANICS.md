# Skill mechanics for OpenMausBot

Apply [writing-for-agents](SKILL.md) to the instruction body. This reference covers the CStack file-preset pilot.

## Discovery and activation

Keep `name` and `description` as single-line strings in `SKILL.md` frontmatter. State the task and the distinct conditions that should trigger the skill. Keep required instructions in the body.

A repository file is source material. Install the generated skill through OpenMausBot's native skill controls before treating it as available to a bot. File-preset skills arrive disabled and need review and enablement. Inspect the current bot's skill list and verify a full read in a fresh conversation.

The CStack standing instruction names each skill and its trigger. Its writing rules apply to every relevant output, including conversation, without a slash command. The skill description aids selection; it does not prove that a model loaded or followed the body. Test activation with ordinary requests and observed reads.

## Packaging references

The file-preset format transports only `SKILL.md`. CStack's builder embeds each required reference and license into that file and rewrites local links to anchors. Source files can stay separate in the repository. Every required target must be available in the installed text; an external source credit is evidence, not a runtime dependency.

Keep distinct steps and completion criteria together. Put branch-specific reference below a named heading and point to it from the branch. A router names each destination and when to read it. For each branch, verify access to its complete instructions before claiming coverage.

## Lifecycle

Changing a preset file does not update existing bots. Apply a reviewed skill update and activation-block diff through native controls. Preserve the bot's role and local edits. For removal, remove the CStack activation block and disable or remove only its installed skills, then test in a fresh conversation. Shared-library assignments need a per-bot removal path; disabling a shared skill can affect other bots.

The platform behavior above was inspected at OpenMausBot commit `033fd71fdc1b61a094c77942abd6f8efc93b52c0` in `shared/package-format.ts`, `shared/skill-md.ts`, `server/presets.ts`, and `docs/presets.md`. Check the deployed version during installation.
