---
name: principles
description: "Use when designing, implementing, debugging, or verifying a change. Read the reference for the current decision."
---

# Principles

Shorten the time to a mergeable PR now, and keep the code from slowing future PRs. Work within the environment's review and safety gates.

Read the matching reference in full when its condition holds. These files are references, not separate skill invocations.

| Principle | When it applies |
| --- | --- |
| [attack-the-premise](attack-the-premise.md) | Two fixes under one premise failed the same check. |
| [boundary-discipline](boundary-discipline.md) | Wiring validation, error handling, or adapters. |
| [build-the-lever](build-the-lever.md) | Non-trivial edits, migrations, analyses, or checks. |
| [config-over-code](config-over-code.md) | Writing logic with tunable values or reviewing magic numbers. |
| [encode-lessons-in-structure](encode-lessons-in-structure.md) | Designing a module or seeing a recurring correction. |
| [exhaust-the-design-space](exhaust-the-design-space.md) | A novel interaction or design has multiple viable shapes. |
| [experience-first](experience-first.md) | Choosing product scope or user experience tradeoffs. |
| [explain-the-number](explain-the-number.md) | Reporting or acting on a measured number. |
| [feel](feel.md) | Changing a visual or terminal interface. |
| [fix-root-causes](fix-root-causes.md) | Fixing a defect or a failed check. |
| [foundational-thinking](foundational-thinking.md) | Choosing data structures before logic. |
| [guard-the-context-window](guard-the-context-window.md) | Large outputs or repeated reads fill context. |
| [laziness-protocol](laziness-protocol.md) | Refactoring or considering another layer or wrapper. |
| [make-operations-idempotent](make-operations-idempotent.md) | Designing operations that face crashes or retries. |
| [migrate-callers-then-delete-legacy-apis](migrate-callers-then-delete-legacy-apis.md) | Replacing an internal API while old callers remain. |
| [minimize-reader-load](minimize-reader-load.md) | Code is hard to trace or holds hidden state. |
| [model-the-domain](model-the-domain.md) | Writing stateful logic or repeating shape assumptions. |
| [never-block-on-the-human](never-block-on-the-human.md) | Considering permission for reversible authorized work. |
| [outcome-oriented-execution](outcome-oriented-execution.md) | A planned rewrite has explicit verification boundaries. |
| [prove-it-works](prove-it-works.md) | Before reporting a task complete. |
| [redesign-from-first-principles](redesign-from-first-principles.md) | Integrating a new requirement into an existing design. |
| [separate-before-serializing-shared-state](separate-before-serializing-shared-state.md) | Concurrent actors might write the same state. |
| [sequence-verifiable-units](sequence-verifiable-units.md) | Ordering a multi-step change or migration. |
| [show-dont-tell](show-dont-tell.md) | Explaining, proposing, or reporting a result. |
| [subtract-before-you-add](subtract-before-you-add.md) | Sequencing an addition, refactor, or rewrite. |
| [test-behavior-not-implementation](test-behavior-not-implementation.md) | Writing, changing, reviewing, or keeping a test. |
| [type-system-discipline](type-system-discipline.md) | Designing types or signatures. |
