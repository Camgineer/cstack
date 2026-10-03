---
name: principle-show-dont-tell
description: "Apply when explaining, proposing, reporting, or asking the user to decide. Show the thing itself at the highest fidelity available (output, code, diff, diagram) instead of prose about it."
disable-model-invocation: true
---

Read [the runtime contract](../poteto-mode/references/runtime.md) before executing this workflow.


# Show, Don't Tell

Show the artifact itself. Use the highest-fidelity view that makes the point, and keep prose to the line that frames it.

**Why:** A reader judges code faster and more accurately from the code than from a paragraph about it. A summary hides the detail that decides the question, and the reader ends up agreeing with a description instead of the thing.

Climb the fidelity ladder and stop at the highest rung you can reach:

1. The real thing running: command output, the observed value, a screenshot of the live page.
2. The code itself: the signature, the block, the diff.
3. A structural view: call tree, file tree, component tree, Mermaid diagram, a focused HTML page.
4. Prose, only for what no view carries: the why, a constraint, a tradeoff.

Where it bites:

- Asking for an opinion → show each option as code or a diagram, side by side, with your pick marked.
- Explaining a change → show the diff or the before and after shape.
- Reporting a result → show the output you observed (**principle-prove-it-works**).
- Grilling a plan → every question carries its view (the **grill-with-docs** skill).

The **show-me** skill picks the view and its format.
