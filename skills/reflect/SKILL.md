---
name: reflect
description: Run three parallel reviewers and a synthesizer over a session to find durable lessons, and route each to an edit on a skill, a principle, or the repo's agent guidance. Use for reflect, retro, or right after you mark your own PR ready.
metadata:
  source: "The tooling reviewer's environment lens adapts the retro categories from mattpocock/skills, https://github.com/mattpocock/skills"
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Reflect

Mine a session for durable lessons, then route each one into an edit.

## When to invoke

Run in one of two scopes. Both use the same pipeline. They differ in the evidence and in how edits land.

- **Session.** The user says "reflect", or says "retro" while the current branch has no open PR. The evidence is the active transcript.
- **PR retro.** **Retro** in `../cstack-mode/playbooks/opening-a-pr.md` calls for it, or the user asks for a retro on a PR or says "retro" on a branch with an open PR. The evidence is the session that built the PR plus the PR's record.

A **lessons PR** is the PR a retro opens. Its description starts with the line `Lessons from <PR link>`. Run PR retro once per PR. Skip it when the PR is a lessons PR, or when a lessons PR or a `Retro: no lessons` comment already links the PR.

Skip when the session is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not lessons.

In PR retro, check for a signal before step 2. A signal is a human correction, a red check, a proven review finding, an abandoned approach, or information the session searched for more than once. With no signal, comment `Retro: no lessons` on the PR, report the same line, and stop.

## Process

### 1. Gather the evidence

Use the host's supported thread/history tools to identify the active conversation and export only the in-scope evidence. Do not scan host databases or guess a transcript schema. If no supported history surface is exposed, prepare a digest from the active context, label it as a digest, and disclose any missing tool-call evidence. Give all three reviewers the same evidence artifact.

In PR retro, read the building session through the **History** capability when it is not the active one. Then add the PR's record to the artifact. Read it through the forge: each review thread and how it ended, each red check and the commit that fixed it, and each reverted or abandoned commit. With no building session, label the artifact as PR record only and name the missing history.

### 2. Spawn three reviewers in parallel

One message, three native subagent calls, using the generic native agent persona, with `model` set as below, read-only investigation scope. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Use available read-only MCP operations; filesystem sandboxing does not determine connector-write authority.

Use each named role as the assignment label. Resolve model and effort through the runtime contract, inheriting for ordinary work unless the user chose a supported override. Report unavailable model requirements without inventing a replacement.

| Lens | Role | Prompt template |
|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the native subagent response body. When the **Delegate** capability is missing, report the run as blocked and stop.

### 3. Synthesize

One native subagent call, using the generic native agent persona, with `model` from the `reflect judgment, divergent, synthesizer` line, read-only investigation scope. The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Use available read-only MCP operations; filesystem sandboxing does not determine connector-write authority. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Skill and guidance changes affect every future agent that loads them, so the operator approves each Accepted edit before it lands.

- **Session.** Present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings.
- **PR retro.** The lessons PR is the approval surface. With no Accepted row left after step 4, open no PR and handle it as no signal. Otherwise apply every Accepted row in one lessons PR, with one commit per row. Branch it from trunk, or stack it on the PR under retro when a row edits a file that PR changes. Its description is the `Lessons from <PR link>` line, then the synthesizer's full output and any draft plugin edits. Drive it through every **Readiness** item in `../cstack-mode/playbooks/opening-a-pr.md` except the last step. It stays a draft, reported as verified and waiting on the operator, who marks it ready or merges it.

File backlog items only when the user authorized that tracker and external write; otherwise return draft items.

For each Accepted item the user approved (Session), or every Accepted item (PR retro), follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): apply the **writing-for-agents** skill and its `SKILL-MECHANICS.md`, then draft, test, and iterate.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): rewrite the description per the Discovery section of writing-for-agents' `SKILL-MECHANICS.md`.
- `new skill: <kebab-name>`: author it through CStack Mode's `playbooks/authoring-a-skill.md`, which applies **writing-for-agents**.
- `repo guidance: <path>`: a lesson that holds only for this repository. Edit its agent guidance (`AGENTS.md` or a doc it points to) per **writing-for-agents**. Fix or delete a stale doc rather than adding a pointer around it. A person's preference is not repo guidance. Return it as a draft for the user's own memory or the **automate-me** skill.

A routed path can point at an installed plugin copy. When this repository is that plugin's source, edit the source file here. Otherwise leave the installed copy alone and return the row as a draft edit for the plugin's repository.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Lessons PR (PR retro): its link.
- Draft plugin edits: `<skill path>`. One line each.
- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the authorized tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
