---
name: cstack-how
description: Explain how code works, trace a subsystem, or answer architecture, placement, ownership, and layering questions. Use automatically for these questions and code walkthroughs before a change.
license: MIT
---

# How

Explore the codebase to explain its architecture and runtime flow at the depth the reader needs to work in it. Read the source before describing behavior. This workflow answers how the code works; distinguish observed behavior from any inferred reason for its design.

## 1. Establish scope and access

Identify the question, repository, and relevant revision. If scope is ambiguous, state your interpretation and explore. Check that the current tools can read the target before promising an explanation. If access is missing, explain the precise gap and what supplied material still supports.

For a single module or narrow question, explore and explain in one pass. For a subsystem spanning files or services, identify two to four distinct exploration angles. When in doubt, use the simple path.

Completion: the question and source are identified, and available access supports the next step or its limitation is explicit.

## 2. Explore

Read and apply [the exploration reference](references/explore.md). For a complex question, cover every identified angle before synthesis. Keep an evidence map of components, flow, files read, boundaries, non-obvious behavior, and open questions. This can remain working notes for a narrow question.

Perform the work yourself by default. When delegation is authorized, available, and useful, assign each explorer one angle, the original question, source revision, and the complete exploration reference. Use the session's supported model selection and tools.

For a named OpenMausBot teammate, use its reachable bot ID with `coordinate_bots`, then end the turn. Resume from the actual returned result. For native subagents, use the available native mechanism only when authorized. Give read-only task scope; a tool that can write does not make writes part of an explanation task. A missing delegation capability leaves the same exploration work with the lead. Record actual participation accurately.

Completion: every angle has traced source evidence or a named gap. Read-only exploration preserves the target files.

## 3. Synthesize and verify

Read and apply [the explanation reference](references/explain.md). Combine findings, remove overlap, and resolve contradictions by checking the source. Keep unresolved contradictions visible. A delegated synthesis receives the original question, all findings, and the complete explanation reference; the lead checks its claims before presenting it.

Check each material behavior claim and citation against the inspected revision. Source inspection supports an explanation of code; a claim that behavior ran successfully needs an observed run. Retain uncertainty and gaps through editing.

Completion: the explanation answers the original question, its material claims have source support, and any untraced path is explicit.

## 4. Present

Present the explanation at the requested depth. Use the applicable parts of the reference structure. A narrow answer can be a short paragraph with a source link. Apply Simple as Prose to human-facing output and Writing for Agents to any agent-facing output, as required by the CStack activation block. Preserve the substance of verified findings when editing for clarity.
