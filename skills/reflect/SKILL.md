---
name: reflect
description: Run three parallel reviewers and a synthesizer over a session to find durable lessons, and route each to an edit on a skill, a principle, or the repo's agent guidance. Use for reflect, retro, or just before you mark your own PR ready.
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

In Session scope, skip when the session is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not lessons. In PR retro, the signal check at the end of step 1 decides instead.

## Process

### 1. Gather the evidence

Use the host's supported thread/history tools to identify the active conversation and export only the in-scope evidence. Do not scan host databases or guess a transcript schema. If no supported history surface is exposed, prepare a digest from the active context, label it as a digest, and disclose any missing tool-call evidence. Give all three reviewers the same evidence artifact.

In PR retro, read the building session through the **History** capability when it is not the active one. Then add the PR's record to the artifact. Read it through the forge: each review thread and how it ended, each red check and the commit that fixed it, and each reverted or abandoned commit. Wait for every review agent still running on the PR and fold in its findings, or list it as pending in the artifact. With no building session, label the artifact as PR record only and name the missing history.

Then, in PR retro, check the evidence for a signal. A signal is a human correction, a red check, a proven review finding, an abandoned approach, or information the session searched for more than once. With no signal, comment `Retro: no lessons` on the PR, report the same line, and stop. That comment, or the `Retro: lessons in <lessons PR link>` comment from step 5, is the PR's retro record, and the retro gate below reads it.

### 2. Spawn three reviewers in parallel

One message, three native subagent calls, using the generic native agent persona, with `model` set as below, read-only investigation scope. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Use available read-only MCP operations; filesystem sandboxing does not determine connector-write authority.

Use each named role as the assignment label. Resolve model and effort through the runtime contract, inheriting for ordinary work unless the user chose a supported override. Report unavailable model requirements without inventing a replacement.

| Lens | Role | Prompt template |
|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the native subagent response body. When the **Delegate** capability is missing, as in a delegated agent that cannot delegate again, stop, write the step 1 evidence artifact to a file if it is not one, and return its path to your caller. The caller spawns the reviewers and the synthesizer from that artifact and finishes the run. With no caller that can delegate, report the run as blocked. Either way, post no `Retro: no lessons` comment.

### 3. Synthesize

One native subagent call, using the generic native agent persona, with `model` from the `reflect judgment, divergent, synthesizer` line, read-only investigation scope. The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Use available read-only MCP operations; filesystem sandboxing does not determine connector-write authority. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill. When a Backlog item is a mistake agents have now made twice, name the **correct** skill as the way to fix it.

### 5. Apply

Skill and guidance changes affect every future agent that loads them. In Session scope the operator approves each edit. In PR retro the lessons PR's review and Readiness gate them.

- **Session.** Present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings.
- **PR retro.** With no Accepted row left after step 4, open no PR and handle it as no signal, with any draft backlog items listed under the comment's first line. Otherwise apply every Accepted row in one lessons PR, whose one purpose is this retro's lessons, with one commit per row. Before you commit a row that adds or changes a rule, run the rule sweep in step 2 of `../cstack-mode/playbooks/authoring-a-skill.md`, and put the rewrites and exceptions it finds in the same commit. Branch it from trunk. Its description is the `Lessons from <PR link>` line, then the synthesizer's full output and any draft plugin edits. Open it, then comment `Retro: lessons in <lessons PR link>` on the PR under retro. Drive it through **Readiness** and **Merging** in `../cstack-mode/playbooks/opening-a-pr.md` like any other PR, including its fresh-context review.

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

## Retro gate

On a GitHub repository, the retro gate makes the retro record a merge requirement. Its `Retro` status stays pending until the PR has a retro record, and a lessons PR passes on its own. Install it only when the user asks, because it changes the repository's CI:

1. In its own PR, copy `gate/retro.yml` to `.github/workflows/retro.yml` and `gate/retro-gate.jq` to `.github/retro-gate.jq`.
2. After that PR merges, ask a repository admin to add `Retro` to the default branch's required status checks. Only an admin can change that setting.

The gate is the `Retro` commit status, not the `retro` workflow job. The job passes once it has posted the status, while the status stays pending until the record exists. Until `Retro` is a required check, a PR armed for auto-merge at ready can merge before its retro runs.

The gate needs `gh` and `jq`, which GitHub-hosted runners include. On another forge, the retro record stays a comment with no gate.

