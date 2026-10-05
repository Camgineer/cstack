---
name: align
description: Reach full agreement with the operator on a change before autonomous work starts, ending in a signed spec with definition of done, acceptance criteria, design, and verification plan. Use for align, 'plan this with me', or before a feature, migration, or autonomous run the operator wants to trust unattended.
license: MIT
metadata:
  source: "Adapts to-spec, to-tickets, and wayfinder from mattpocock/skills, https://github.com/mattpocock/skills"
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Align

Cut through the fog of war before the build. The operator does the critical thinking once, at the start. You do every lookup, draft, and sketch so their time goes only to decisions. The phase ends in a **signed spec**: the contract an autonomous loop then runs to the end without the operator.

Open a todolist with one entry per step: Ground, Tier, Grill, Draft, Advise, Sign, Hand off.

## 1. Ground

Run the **how** skill over every subsystem the change touches. Read `GLOSSARY.md` and the ADRs in that area. Done when you can name each module the change touches and the tests that already cover it.

## 2. Tier

State a tier with a one-line reason drawn from blast radius and reversibility, at the top of the first Grill round. It is a default the operator overrides with one word, not a question.

| Tier | When | Spec sections |
| --- | --- | --- |
| Inline | A typo, a one-line fix with an obvious check | None. State the definition of done in one line and proceed on the operator's yes. |
| Light | Small, reversible, one surface | Problem, Definition of done, Acceptance criteria, Verification plan, Out of scope |
| Full | A new module, a public interface, a one-way door, or work the operator steps away from | Every section of [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) |
| Map | Too big or too foggy for one session | [MAP.md](MAP.md), which ends in a Full spec |

## 3. Grill

Run the **grill-with-docs** skill with the tier's spec sections as the design tree, in template order. Problem and definition of done are the root. Every later section hangs off them.

- **Designs.** In the Full tier, run the **architect** skill with checkpoint, and stop at its checkpoint: no implementation and no commit. Its synthesized design and the runner-up shapes become the options for the high- and low-level design questions.
- **Acceptance criteria.** Each one is behavioral, observable, and checkable on its own: "running `export --tag work` writes only rows tagged work", never "export works". Name interfaces and types, not file paths. Give each an ID: `AC-1`, `AC-2`.
- **Verification.** Testing is a product decision, so put it to the operator. For each criterion agree the public seam (per the **test-behavior-not-implementation** principle skill), the test, any eval, the live check on the real surface, and the evidence it leaves in the PR. Prefer existing seams and the highest one available; the ideal is one. Write no test at a seam the operator has not confirmed. Mark the criteria that must always hold; they become regression tests.
- **Slices.** Cut the work into vertical tracer bullets: each a narrow, complete path through every layer, demoable alone, sized for one fresh context, with prefactoring first. Each slice is one atomic PR in a stack. Sequence a wide mechanical refactor as expand, migrate in batches, contract. Ask whether the granularity is right, whether each blocking edge truly gates, and what to merge or split.
- **Autonomy envelope.** State the template's tripwires and the low-level calls the loop will make alone as a default in the last round, with a one-word override. When a decision covers a class, such as a port's types and error classes, authorize the class and list the known instances as examples.

## 4. Draft

Fill [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) for the tier, using the glossary's terms. Keep the draft as an untracked working file. When the change adds a setting that names a command to run, add one line naming where that setting may come from, and allow only the operator's own config. An operator's waiver of a safeguard covers their own tools, not content a repository ships.

Then run the **cold-implementer check**. Use the **Delegate** capability to give a fresh-context reader the spec and the repository, and nothing from this conversation. Ask it for every question it would need answered before building. Route each one back: a fact you fill in; a decision, including any edge case the user would see, goes to a Grill round. Repeat until the reader returns no questions.

## 5. Advise

Get a second opinion on the spec before the operator leaves the loop. Skip this step in the Inline tier, which has no spec. Run the advisor on the `advisor` role per **Model roles** in the runtime contract, in a fresh context. Give it the drafted spec, the repository, and this brief: find what would make the autonomous run build the wrong thing or fail to prove it, such as a criterion that can't be checked, a criterion with no evidence in the verification plan, an open fork, or a design the code contradicts. Tag each note `blocker`, `concern`, or `nit`, and name the spec section it touches.

Route each note. A `blocker` or `concern` becomes a question in a Grill round. Fix a `nit` yourself and log it via the **show-me-your-work** skill. After the round, run the advisor again on the whole spec, with the changed sections as its focus. Done when the advisor returns no `blocker` or `concern`, or the operator has answered each one.

## 6. Sign

Show the whole spec, with each advisor note and how it was settled, and ask for sign-off. An open `blocker` keeps the spec unsigned until the operator overrules it in words, which the spec records. Sign-off is the operator's explicit word, such as "aligned". It holds under a full-autonomy grant, because it is a gate the operator named. Silence and partial answers keep the spec unsigned.

## 7. Hand off

1. Open the bottom PR of the stack as a draft right at sign-off, with the signed spec as its description, per `../cstack-mode/playbooks/opening-a-pr.md`. Push the first slice's first commit to make that possible. Each PR above it names the criteria it proves and links the spec. Every PR stays a draft until it is merge-ready.
2. Run the slices through the **Autonomous run** playbook (`../cstack-mode/playbooks/autonomous-run.md`). Its exit condition is every acceptance criterion VERIFIED with its agreed evidence in the PR. Each iteration runs the **Feature** playbook for one slice, with `how` and `architect` marked `skip: settled in spec`.
3. Inside the envelope, decide, log the decision via the **show-me-your-work** skill, and report it in the PR.
4. When a tripwire fires, stop the affected slice, run a Grill round on that branch only, run step 5 on the changed section, and get it signed. Then resume. Unaffected slices keep running.
