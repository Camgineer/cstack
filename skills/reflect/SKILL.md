---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
---

Read [the Codex runtime contract](../poteto-mode/references/codex-runtime.md) before executing this workflow.


# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "$cstack:reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

Use the host's supported thread/history tools to identify the active conversation and export only the in-scope evidence. Do not scan host databases or guess a transcript schema. If no supported history surface is exposed, prepare a digest from the active context, label it as a digest, and disclose any missing tool-call evidence. Give all three reviewers the same evidence artifact.

### 2. Spawn three reviewers in parallel

One message, three native subagent calls, using the generic native agent persona, with `model` set as below, read-only investigation scope. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Use available read-only MCP operations; filesystem sandboxing does not determine connector-write authority.

Use each named role as the assignment label. Resolve model and effort through the runtime contract, inheriting for ordinary work unless the user chose a supported override. Report unavailable model requirements without inventing a replacement.

| Lens | Role | Prompt template |
|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the native subagent response body.

### 3. Synthesize

One native subagent call, using the generic native agent persona, with `model` from the `reflect judgment, divergent, synthesizer` line, read-only investigation scope. The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Use available read-only MCP operations; filesystem sandboxing does not determine connector-write authority. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File backlog items only when the user authorized that tracker and external write; otherwise return draft items. Accepted skill edits require the approval described above.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the available `skill-creator` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `skill-creator` and run its description-optimization loop.
- `new skill via create-skill: <kebab-name>`: hand creation to `skill-creator`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
