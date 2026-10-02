---
name: cstack-how
description: Explain how code works, trace a subsystem, or answer architecture, placement, ownership, and layering questions. Use automatically for these questions and code walkthroughs before a change.
license: MIT
---

<a id="cstack-part-0"></a>

# How

Explore the codebase to explain its architecture and runtime flow at the depth the reader needs to work in it. Read the source before describing behavior. This workflow answers how the code works; distinguish observed behavior from any inferred reason for its design.

## 1. Establish scope and access

Identify the question, repository, and relevant revision. If scope is ambiguous, state your interpretation and explore. Check that the current tools can read the target before promising an explanation. If access is missing, explain the precise gap and what supplied material still supports.

For a single module or narrow question, explore and explain in one pass. For a subsystem spanning files or services, identify two to four distinct exploration angles. When in doubt, use the simple path.

Completion: the question and source are identified, and available access supports the next step or its limitation is explicit.

## 2. Explore

Read and apply [the exploration reference](#cstack-part-1). For a complex question, cover every identified angle before synthesis. Keep an evidence map of components, flow, files read, boundaries, non-obvious behavior, and open questions. This can remain working notes for a narrow question.

Perform the work yourself by default. When delegation is authorized, available, and useful, assign each explorer one angle, the original question, source revision, and the complete exploration reference. Use the session's supported model selection and tools.

For a named OpenMausBot teammate, use its reachable bot ID with `coordinate_bots`, then end the turn. Resume from the actual returned result. For native subagents, use the available native mechanism only when authorized. Give read-only task scope; a tool that can write does not make writes part of an explanation task. A missing delegation capability leaves the same exploration work with the lead. Record actual participation accurately.

Completion: every angle has traced source evidence or a named gap. Read-only exploration preserves the target files.

## 3. Synthesize and verify

Read and apply [the explanation reference](#cstack-part-2). Combine findings, remove overlap, and resolve contradictions by checking the source. Keep unresolved contradictions visible. A delegated synthesis receives the original question, all findings, and the complete explanation reference; the lead checks its claims before presenting it.

Check each material behavior claim and citation against the inspected revision. Source inspection supports an explanation of code; a claim that behavior ran successfully needs an observed run. Retain uncertainty and gaps through editing.

Completion: the explanation answers the original question, its material claims have source support, and any untraced path is explicit.

## 4. Present

Present the explanation at the requested depth. Use the applicable parts of the reference structure. A narrow answer can be a short paragraph with a source link. Apply Simple as Prose to human-facing output and Writing for Agents to any agent-facing output, as required by the CStack activation block. Preserve the substance of verified findings when editing for clarity.


<a id="cstack-part-1"></a>

# Exploration reference

Gather facts for the original question and the assigned exploration angle. Read implementations, trace code paths, and map components. For a delegated slice, focus on that angle; the lead combines it with the others.

Find relevant files and symbols with the available search and read tools. Read the code rather than guessing from names.

1. Find the entry point. Identify the user action, API call, scheduled job, or other event that triggers the behavior.
2. Trace the flow. Follow the call chain, read each relevant function, and track how data changes.
3. Map the key abstractions. Read the central types, interfaces, services, and classes. Explain what each represents and its role.
4. Find the boundaries. Identify where the subsystem meets others and what crosses each boundary.
5. Look for non-obvious behavior. Note surprising cases, possible historical artifacts, and details a newcomer could misunderstand. Label inferred history as inference.

Continue until each relevant path is traced or its gap is explicit. Name an untraceable connection instead of filling it with a guess.

Record the findings with exact paths, symbols, and line numbers where available:

- Components found, with each name, path, and role.
- Flow, with the functions involved, their calls, and the data passed.
- Files read, so the explanation can cite the actual sources.
- Boundaries, including inputs and outputs.
- Non-obvious behavior and likely misunderstandings.
- Open questions and anything that could not be traced.


<a id="cstack-part-2"></a>

# Explanation reference

Write an explanation that lets a reader unfamiliar with this code understand it well enough to start work. Use the original question and the exploration findings. Reconcile overlaps and check conflicting claims in the source. Fill material gaps where access permits; otherwise name them.

Use the parts of this structure that help answer the question:

- Overview. Explain what the subsystem does and its purpose in one or two paragraphs. Distinguish a known design rationale from an inference.
- Key concepts. Define the types, services, and abstractions the reader needs.
- How it works. Trace the trigger, actions, data movement, and decision points. Use prose and concrete function names. Include a small code excerpt only when it explains something the prose cannot.
- Where things live. Give the file map needed to begin work here.
- Gotchas. Explain surprising behavior, pitfalls, and supported historical context. Omit this part if there is nothing useful to add.

Add a Mermaid diagram when interactions or data transformations are easier to understand visually. Skip it when prose already explains the flow.

Say which function calls which other function. Explain the cause of complexity. Keep simple behavior brief. Use an analogy only when it clarifies the mechanism. Keep all unresolved questions and evidence limits visible in the final explanation.

## Source and adaptation

Source: https://github.com/Camgineer/cstack/blob/c31f7ace991843f5576398ad025969465251192c/skills/how/SKILL.md

Adapted from pstack How and its explorer and explainer prompts. Preserves complexity assessment, trace coverage, synthesis, uncertainty, and output structure. Replaces mandatory Cursor Task/model dispatch with lead execution and authorized optional delegation.

## License notice

MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
