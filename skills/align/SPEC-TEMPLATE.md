# Spec template

Fill the sections the tier names, in this order. Each line under a heading says what belongs there. Replace it with the agreed content. The spec is done when a fresh implementer could build it without asking a single question.

```markdown
# Spec: <name from the glossary>

## Problem

The problem from the user's side, and the signal that prompted it: the complaint, metric, incident, or request.

## Definition of done

One falsifiable predicate the autonomous loop drives to.

## Acceptance criteria

- [ ] AC-1: <behavior an observer can check on its own>
- [ ] AC-2: ...

## Product changes

What the user sees before and after, shown per the show-me skill.

## High-level design

Modules, their boundaries, and the data flow between them, as a diagram. The chosen shape and why it beat the alternatives.

## Low-level design

The architect sketch: types, signatures, the file tree, and the patterns each module uses. Inline a prototype snippet when it states a decision more precisely than prose.

## Verification plan

| AC | Always holds | Seam | Test | Eval | Live check | Evidence in the PR |
| --- | --- | --- | --- | --- | --- | --- |
| AC-1 | yes or no | the confirmed seam | layer and fixtures, or n/a | the eval and its pass bar, or n/a | surface and control skill | screenshot, output, numbers, transcript |

## Slices

1. <slice name>. Delivers <end-to-end behavior>. Proves AC-n. Blocked by <slice or nothing>.

Each slice is one atomic PR in the stack.

## Autonomy envelope

Decided alone: <the low-level calls the loop makes, logs, and reports>.

Tripwires, each stopping the affected slice for a Grill round:
- A change to an acceptance criterion or the definition of done.
- A change to user-visible behavior beyond Product changes.
- A change to a public interface or the high-level design.
- Work listed under Out of scope.
- A new one-way door.

## Out of scope

What will not be built, so nothing is gold-plated.

## Decisions

- <decision>: <one-line why>. ADR <link> when it qualifies.
```
