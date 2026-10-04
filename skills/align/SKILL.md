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

Open a todolist with one entry per step: Ground, Tier, Grill, Draft, Sign, Hand off.

## 1. Ground

Run the **how** skill over every subsystem the change touches. Read `GLOSSARY.md` and the ADRs in that area. Done when you can name each module the change touches and the tests that already cover it.

## 2. Tier

Propose a tier with a one-line reason drawn from blast radius and reversibility. The operator overrides it with one word.

| Tier | When | Spec sections |
| --- | --- | --- |
| Inline | A typo, a one-line fix with an obvious check | None. State the definition of done in one line and proceed. |
| Light | Small, reversible, one surface | Problem, Definition of done, Acceptance criteria, Verification plan, Out of scope |
| Full | A new module, a public interface, a one-way door, or work the operator steps away from | Every section of [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) |
| Map | Too big or too foggy for one session | [MAP.md](MAP.md), which ends in a Full spec |

## 3. Grill

Run the **grill-with-docs** skill with the tier's spec sections as the design tree, in template order. Problem and definition of done are the root. Every later section hangs off them.

- **Designs.** In the Full tier, run the **architect** skill with checkpoint. Its synthesized design and the runner-up shapes become the options for the high- and low-level design questions.
- **Acceptance criteria.** Each one is behavioral, observable, and checkable on its own: "running `export --tag work` writes only rows tagged work", never "export works". Name interfaces and types, not file paths. Give each an ID: `AC-1`, `AC-2`.
- **Verification.** Testing is a product decision, so put it to the operator. For each criterion agree the seam, the test, any eval, the live check on the real surface, and the evidence it leaves in the PR. Prefer existing seams and the highest one available; the ideal is one. Write no test at a seam the operator has not confirmed. Mark the criteria that must always hold; they become regression tests.
- **Slices.** Cut the work into vertical tracer bullets: each a narrow, complete path through every layer, demoable alone, sized for one fresh context, with prefactoring first. Each slice is one atomic PR in a stack. Sequence a wide mechanical refactor as expand, migrate in batches, contract. Ask whether the granularity is right, whether each blocking edge truly gates, and what to merge or split.
- **Autonomy envelope.** Agree what the loop decides alone and confirm the tripwires in the template.

## 4. Draft

Fill [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) for the tier, using the glossary's terms. Keep the draft as an untracked working file.

Then run the **cold-implementer check**. Use the **Delegate** capability to give a fresh-context reader the spec and the repository, and nothing from this conversation. Ask it for every question it would need answered before building. Route each one back: a fact you fill in, a decision goes to a Grill round. Repeat until the reader returns no questions.

## 5. Sign

Show the whole spec and ask for sign-off. Sign-off is the operator's explicit word, such as "aligned". It holds under a full-autonomy grant, because it is a gate the operator named. Silence and partial answers keep the spec unsigned.

## 6. Hand off

1. Open the bottom PR of the stack as a draft right at sign-off, with the signed spec as its description, per `../cstack-mode/playbooks/opening-a-pr.md`. Push the first slice's first commit to make that possible. Each PR above it names the criteria it proves and links the spec. Every PR stays a draft until it is merge-ready.
2. Run the slices through the **Autonomous run** playbook (`../cstack-mode/playbooks/autonomous-run.md`). Its exit condition is every acceptance criterion VERIFIED with its agreed evidence in the PR. In the **Feature** playbook, mark `how` and `architect` `skip: settled in spec`.
3. Inside the envelope, decide, log the decision via the **show-me-your-work** skill, and report it in the PR.
4. When a tripwire fires, stop the affected slice, run a Grill round on that branch only, and get the changed section signed. Then resume. Unaffected slices keep running.
