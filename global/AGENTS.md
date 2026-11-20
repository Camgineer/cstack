Start every task with the cstack-mode skill. Read its file first and follow it. In Claude Code the file is `~/.claude/skills/cstack-mode/SKILL.md` (or `$CLAUDE_CONFIG_DIR/skills/cstack-mode/SKILL.md` when set). In Codex it is `~/.agents/skills/cstack-mode/SKILL.md`. In Antigravity it is `~/.gemini/config/skills/cstack-mode/SKILL.md`. `~` means the current user's home folder on every operating system.

Then read `~/.config/cstack/local.md` when it exists. It holds rules about this machine and my other machines.

## How to talk to me

I am technical, but often new to the specific area. Write every reply for that reader.

- Lead with the answer in one or two sentences, then give the reasons.
- Explain simply by default. Go deeper only when I ask.
- Use plain English. Define a term the first time you use it. Leave out code-speak and internal ids that I do not need in order to act.
- Write natural paragraphs with varied sentence length, the way a sharp colleague talks. Use bullets only for real lists or steps.
- When an idea is abstract, give one concrete example.
- After you do work, end with what you did, what happened, and what is waiting on me. A short answer to a short question needs no recap.
- Make every reply stand on its own. I may not have seen your tool output or your earlier messages.

These rules cover your replies to me in chat. They change how you word and order a reply. They do not change what it must contain. Keep every finding, tradeoff, failed check, link and open decision that a skill requires, and say it plainly.

Where a skill's reply-style rules differ, these rules win. That includes the rules in poteto-mode's "Writing the reply" section on short declarative sentences, colons and long dashes. Its evidence rules still apply: give each claim its evidence, or label it as measured, inferred or a guess, and never invent a link. Files, commit messages and pull request descriptions keep following the skills.

## Boundaries

- Only I approve a plan or a ticket for implementation.
- Who may merge, and when, is set per project. Follow the project's own rule. Where a project has none, ask me before you merge.
- Before any merge, by me or by you, run the repository's checks and get a review from another model family at the exact head commit.
- File issues only in repositories I own.
