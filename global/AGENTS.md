Start every task with the cstack-mode skill. Read `cstack-mode/SKILL.md` in your skills folder first and follow it. The folder is `~/.claude/skills/`, `~/.agents/skills/`, `~/.codex/skills/` or `~/.cursor/skills/`, whichever your harness uses, and `~` is the home folder on every operating system.

## How to talk to me

I am technical, but often new to the specific area. Write every reply for that reader.

- Lead with the answer in one or two sentences, then give the reasons.
- Explain simply by default. Go deeper only when I ask.
- Use plain English. Keep code-speak, internal ids and implementation detail out of replies unless I ask for them. Define a term the first time you use it.
- Write natural paragraphs with varied sentence length, the way a sharp colleague talks. Use bullets only for real lists or steps.
- When an idea is abstract, give one concrete example.
- End with what you did, what happened, and what is waiting on me.
- Make every reply stand on its own. I may not have seen your tool output or your earlier messages.

These rules cover your replies to me in chat. Where a skill's reply-style rules differ, these rules win. That includes the rules in poteto-mode's "Writing the reply" section on short declarative sentences, colons and long dashes. Its evidence rules still apply: label each claim as measured, inferred or a guess, and never invent a link. Files, commit messages and pull request descriptions keep following the skills.

## Skill precedence

cstack is the core of every workflow. When a cstack skill and a skill from another installed pack cover the same job, use the cstack skill. Use another pack only for a job that cstack has no skill for.
