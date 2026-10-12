---
name: align
description: Reach full agreement with the operator on a change before autonomous work starts, ending in a signed spec with definition of done, acceptance criteria, design, and verification plan. Use for align, 'plan this with me', or before a feature, migration, or autonomous run the operator wants to trust unattended.
license: MIT
metadata:
  source: "Adapts to-spec, to-tickets, and wayfinder from mattpocock/skills, https://github.com/mattpocock/skills"
---

# Align

Cut through the fog of war before the build. The operator does the critical thinking once, at the start. You do every lookup, draft, and sketch so their time goes only to decisions. The phase ends in a **signed spec**: the contract an autonomous loop then runs to the end without the operator.

Open a todolist with one entry per step: Ground, Tier, Grill, Draft, Sign.

## 1. Ground

Before any design question, check whether the operator can use what exists today. Inspect the existing command, installation, or output that the request builds on. When a read-only check is available, run it within the operator's authorization. In your first reply after align is invoked, report what you checked and what you found.

When the request builds on nothing existing, report that and continue with design. When what exists works, state that nothing blocks the operator today and continue. When it is broken, missing, or not set up, name that as the block and say why. Keep the requested change for the design round. It is never the block, and building it is never the quick path.

For a block, look for an existing command or workflow that restores use. Name the thinnest path and its observable check. When an existing path or a thin slice restores use within the operator's authorization, take it before the map or the first Grill round. Complete a thin slice on the current branch, with its scope and verification agreed first. Before an unsigned slice starts, write a short spec sized by step 2's tier, with every place that performs the behavior it changes and every path that deletes or overwrites. Check that spec against the source before changing it. Run the restoring check. When it fails, report the failure and find another authorized path, or state that no quick path exists. Once use is restored, design and harden behind it. Record the check result, and the PR only when a slice was delivered, in the spec's Verification plan when drafted, or in the reply for Inline. Treat a delivered thin slice as completed work when planning the remaining stack.

When no quick path exists, name the block and say that no quick path exists before design questions, then continue with design. When the path needs a decision or permission, report what you checked and found, name the block and path, and ask the one question that unlocks it. End that reply there, with no tier or design questions. Leave the restoring check pending. After the operator agrees, take the authorized path and report the check's result. When the operator declines, record that in the reply and continue.

Ground's unblock part is done when the first reply reports what you ran or inspected and what you found before any design question. The finding must state that nothing exists to build on, that nothing blocks the operator today, or what blocks existing use. If you found a block, that reply must also name a concrete command or slice and its check, or state that no quick path exists. When a path is available, this part stays pending until a reply reports a successful restoring check, the operator's refusal, or that no quick path remains.

Run the **how** skill over every subsystem the change touches. Read `GLOSSARY.md` and the ADRs in that area. Done when you can name each module the change touches and the tests that already cover it.

## 2. Tier

State a tier with a one-line reason drawn from blast radius and reversibility, at the top of the first Grill round. It is a default the operator overrides with one word, not a question.

| Tier | When | Spec sections |
| --- | --- | --- |
| Inline | A typo, a one-line fix with an obvious check | None, except the short spec in step 1 for an unsigned slice. State the definition of done in one line and proceed on the operator's yes. |
| Light | Small, reversible, one surface | Problem, Definition of done, Acceptance criteria, Verification plan, Out of scope |
| Full | A new module, a public interface, a one-way door, or work the operator steps away from | Every section of [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) |
| Map | Too big or too foggy for one session | [MAP.md](MAP.md), which ends in a Full spec |

## 3. Grill

Run the **grill-with-docs** skill with the tier's spec sections as the design tree, in template order. Problem and definition of done are the root. Every later section hangs off them. Follow its document, reply, and answer-settlement method for every round.

- **Designs.** In the Full tier, run the **architect** skill with checkpoint, and stop at its checkpoint: no implementation and no commit. Its design and the alternative shapes become the options for the high- and low-level design questions.
- **Acceptance criteria.** Each one is behavioral, observable, and checkable on its own: "running `export --tag work` writes only rows tagged work", never "export works". Name interfaces and types, not file paths. Give each an ID: `AC-1`, `AC-2`.
- **Verification.** Testing is a product decision, so put it to the operator. For each criterion agree the public seam (per the [test-behavior-not-implementation](../principles/test-behavior-not-implementation.md) reference), the test, any eval, the live check on the real surface, and the evidence it leaves in the PR. Prefer existing seams and the highest one available; the ideal is one. Write no test at a seam the operator has not confirmed. Mark the criteria that must always hold; they become regression tests.
- **Slices.** Cut the work into vertical tracer bullets, each a narrow, complete path through every layer, demoable alone, sized for one fresh context, with prefactoring first. Order any slices that restore existing use before the feature's slices, with only the prefactoring each restoration path needs. Each slice is one atomic PR in a stack. Atomic means one purpose a reviewer can state in a sentence, not the smallest diff. A new type, field, helper, or endpoint ships in the slice with its first caller, so no slice lands code nothing calls. Split by purpose, never by layer or line count. Each commit inside a slice is one coherent step, and fixup commits are fine. Sequence a wide mechanical refactor as expand with the first migrated caller, migrate the rest in batches, then contract. Ask whether the granularity is right, whether each blocking edge truly gates, and what to merge or split.
- **Autonomy envelope.** State the template's tripwires and the low-level calls the loop will make alone as a default in the last round, with a one-word override. When a decision covers a class, such as un-exporting every symbol only tests import, authorize the class and list the known instances as examples.

## 4. Draft

Fill [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) for the tier, using the glossary's terms. Keep the draft in an available shared document or an untracked working file. When the change adds a setting that names a command to run, add one line naming where that setting may come from, and allow only the operator's own config. An operator's waiver of a safeguard covers their own tools, not content a repository ships.

Check the spec against the current source and every acceptance criterion. List the questions an implementer would need answered. Fill in facts from evidence and put product decisions to a Grill round. Repeat until no question remains.

## 5. Sign

Show the whole spec and ask for sign-off. Sign-off is the operator's explicit word, such as "aligned". Silence and partial answers keep the spec unsigned. Record unresolved concerns and any explicit override in the spec. End with the signed spec; it does not authorize implementation beyond the user's existing grant.
