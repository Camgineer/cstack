---
name: refactoring
description: Use when the user asks for refactoring. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Refactoring


If the cleanup reveals a missing feature or a real bug, split it out and ship the structural change first against the pinned contract. A redesign is allowed, but name it and route to Feature. This guide is the focused-to-medium change.

1. Pin the behavior contract first. Invoke `how` over the affected subsystem to learn the contract, then write a characterization test, snapshot, or equivalence harness that captures current behavior before any structure moves. Put it at the public seam the refactor keeps, per the [test-behavior-not-implementation](../principles/test-behavior-not-implementation.md) reference, so the pin survives the moves it guards. If the area has no coverage, write the pin before touching structure. Type check and lint are not a pin. When the refactor replaces tests, plant breaks drawn from the code's rules: one per behavior the new tests claim to cover, plus one for each new test with no old twin. Each break must fail an old test at the base and a new test at the head, on an assertion.
2. Name the structure the code is missing per [model-the-domain](../principles/model-the-domain.md). Boring code stays when the shape is already clear and local. The reshape must delete branches or invalid states, not add indirection.
3. Name the target shape. State what the module layout, types, and call graph should be if built today ([foundational-thinking](../principles/foundational-thinking.md), [redesign-from-first-principles](../principles/redesign-from-first-principles.md)). If the target adds a module, reshapes a public interface, or has more than one viable shape, run the **architect** skill for design exploration of the shape before the move.
4. Subtract before you add. Delete dead code, collapse one-caller wrappers, drop redundant validators, and remove orphan references before introducing the new shape ([subtract-before-you-add](../principles/subtract-before-you-add.md)). The smallest change that reaches the target shape ships ([laziness-protocol](../principles/laziness-protocol.md)). A speculative cleanup that "might help" gets reverted.
5. Move in small behavior-preserving steps, each keeping the pin green. For API reshapes, migrate every caller and delete the old API in the same wave ([migrate-callers-then-delete-legacy-apis](../principles/migrate-callers-then-delete-legacy-apis.md)). No compatibility shims, no parallel old-and-new paths. Spot-check every rename against the actual files. Renames silently miss usages in strings, prose, and back-references. Make mechanical edits with a codemod or script ([build-the-lever](../principles/build-the-lever.md)).
6. Prove behavior is unchanged on the real artifact, not "it compiles" ([prove-it-works](../principles/prove-it-works.md)). For larger reshapes, run an equivalence check: a script that diffs old-vs-new outputs, a recorded baseline replayed against the new code, or a smoke run on the matching surface via the relevant control skill.
7. Confirm the change is worth keeping. The success measure is reduced reader load ([minimize-reader-load](../principles/minimize-reader-load.md)). If the diff does not lower reader load somewhere, revert it.
8. Keep each commit one coherent step. Order them as a subtraction, then the reshape, then any follow-on cleanup. Shape them with the [sequence-verifiable-units](../principles/sequence-verifiable-units.md) reference, so each behavior-preserving slice stays green before the next.

**Reply:** the structure that changed, the pin you held it against, the equivalence proof, the reader-load delta, what shipped and what got reverted. No new behavior.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
