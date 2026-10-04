---
name: principle-encode-lessons-in-structure
description: "Apply when designing a module or abstraction, when you catch yourself writing the same instruction a second time, or when you notice a recurring correction. Make bad code unrepresentable by encoding the rule as architecture, a type, a lint, a runtime check, or a script instead of more text."
disable-model-invocation: true
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Encode Lessons in Structure

Make bad code unrepresentable. The codebase is the environment every agent's code evolves in, so design its selection pressure: a wrong variant should die at the first gate it reaches. Apply this while designing, before the first mistake, and again whenever a mistake repeats.

Encode recurring fixes in mechanisms (tools, code, metadata, automation) instead of textual instructions. Every error, human correction, and unexpected outcome is a learning signal. Capture it, route it, and close the loop.

**Why:** Textual instructions are easy to miss. They require the reader to notice, remember, and comply. Structural mechanisms (lint rules, metadata flags, runtime checks, automation scripts) enforce the rule without cooperation.

**Pattern:**
When you catch yourself writing the same instruction a second time:
1. Ask: can this be a lint rule, a metadata flag, a runtime check, or a script?
2. If yes, encode it. Delete the instruction
3. If no (requires judgment), make the instruction more prominent and add an example of the failure mode

**Pick the strongest mechanism.** When more than one mechanism would work, choose the strongest the situation allows (an architecture where the mistake has nowhere to happen, such as one owner per piece of state or one way to do a task, then an unrepresentable state that cannot compile, then a lint or banned API that fails CI, then a canonical helper, then a runtime check), because agents copy whatever the surrounding code already does and a weaker guard becomes the next template. Stronger also means earlier. A variant the type checker rejects dies in the author's loop, while one only review catches has already been written, copied, and paid for. Text instructions come next, and human review comes last. When a mistake already repeats across a repo's history, run the **correct** skill.

**Corollary:** If the fix is structural, only use the structural fix. The instruction is the symptom.

**Feedback loop:**
- **Capture every correction.** When the human intervenes or tests fail, decide if it's a one-off or a pattern.
- **Route to the right layer.** One-off -> brain note. Recurring fix -> skill or lint rule. Systemic issue -> principle.
- **Close the loop.** Don't just record. Apply now or create a concrete todo.

**Anti-patterns:**
- Acknowledging without recording ("I'll keep that in mind" does not persist)
- Recording without routing (a brain note about a lint rule that should exist is wasted unless the lint rule gets implemented)
- Fixing without generalizing (fixing one instance while leaving the recurring pattern intact)
