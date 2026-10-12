---
name: feature
description: Use when the user asks for feature. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Feature


1. Invoke `how` over the affected subsystem.
2. Invoke `architect` for design exploration when the change adds a module, reshapes a public interface, or has more than one viable shape. Otherwise `skip: <reason>`.
3. Plan the blocking first steps and smallest safe implementation steps. Identify shared mutable state before changing it; prefer separating that state to serializing it, per [separate-before-serializing-shared-state](../principles/separate-before-serializing-shared-state.md).
4. Implement against the named data shape and its organizing structure per [model-the-domain](../principles/model-the-domain.md) (a state machine over scattered booleans, a table/registry over branching, a typed model over repeated shape assumptions, an explicit on, off, or unset choice once a second source such as an environment variable or a global default can set the same value, with the explicit choice winning in both directions), chosen before any logic is written. Implement the code yourself. For a surface a person sees or touches, invoke [feel](../feel/SKILL.md) and follow its applicable steps. Review the full diff before step 5. Keep comments only for non-obvious reasons the code cannot show. Surgical edits, re-ground against the source for upstream-derived files. Port shared-primitive improvements to all consumers and verify each. Commit liberally.
5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass. Flag it. When state has more than one input that can disagree, test each combination of those inputs with each lifecycle event that reads the state again, including the cases where the new input must lose. Run checks on the operator's machine or account only within their authorization.
6. Keep each commit one coherent step. Keep follow-ups within the agreed scope.
   Use the [sequence-verifiable-units](../principles/sequence-verifiable-units.md) reference, building, verifying, and committing each small unit before the next.

**Reply:** what you built, what you chose and why, the implementation plan, open decisions. Tables for design alternatives.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
