---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
---

Read [the runtime contract](../poteto-mode/references/runtime.md) before executing this workflow.


# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Use each named role as the assignment label. Resolve model and effort through the runtime contract, inheriting for ordinary work unless the user chose a supported override. Report unavailable model requirements without inventing a replacement.

## Evidence

Every claim about the code rests on source you read. Apply these rules on both paths, and pass this section into each explorer and explainer prompt:

- Pin the commit with `git rev-parse HEAD` and state it in the answer. Note any uncommitted changes in the files you cite.
- Cite `path:line` for each component and each relationship between components.
- Trace a read, write, or call to the call site that performs it. A doc, a name, or a config value is a lead to follow, never the evidence.
- Describe a capability that is exported or configured but never called on the traced path as optional, not as part of the runtime flow.
- Write each unknown next to the claim it affects, such as "`save` calls `writeFile` at `store.ts:88`; durability unknown".

## Step 1. Assess Complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no subagents. Explore and explain it yourself in a single pass. Go to Step 2b.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): spawn parallel explorers first, then hand off to the explainer. Go to Step 2a.

When in doubt, take the simple path.

## Step 2a. Explore (complex questions only)

Decompose the question into 2 to 4 exploration angles, each a distinct slice of the subsystem. Spawn all explorers in a single message:

- Persona: generic native investigator; apply the workflow reference prompt.
- Model role: `how explorer` through the runtime contract.
- Scope: read-only; use the supported sandbox and no connector writes.

Each explorer gets the prompt in `references/explorer-prompt.md` with its angle filled in. Then go to Step 3.

## Step 2b. Direct Explain (simple questions)

Read the code yourself and write the explanation in the Output Format of `references/explainer-prompt.md`. A question this narrow takes a handful of reads, which costs less than briefing a subagent. Go to Step 4.

## Step 3. Synthesize (complex questions only)

Once all explorers have returned, spawn one native subagent to synthesize their findings into one explanation:

- Persona: generic native investigator; apply the workflow reference prompt.
- Model role: `how explainer` through the runtime contract.
- Scope: read-only; use the supported sandbox and no connector writes.

Build its prompt from `references/explainer-prompt.md` with every explorer's findings filled in.

## Step 4. Present

Present the explanation to the user. Light edits to an explainer's output for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output Format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
