---
name: prioritize
description: "Rank work with one priority formula. Use this skill for /prioritize, backlog triage, picking what to build next, or scoping the first pull request of a multi-part request."
disable-model-invocation: true
---

# Prioritize

Use one formula for every queue, whether it holds tickets, a backlog, a roadmap, or the units of one request.

## Split before scoring

Split a multi-part request into independent shippable units first. Score each unit on its own.

## Formula

`Priority = (Value + Urgency + InactionRisk) / (1 + Effort)`

The formula result is the item's base priority. Score each input as a whole number on its scale.

| Input | Range | Anchors |
| --- | --- | --- |
| `Value` | 0 to 5 | 0 none, 1 minor polish, 3 meaningful improvement, 5 major milestone or a prerequisite for several planned items |
| `Urgency` | 0 to 5 | 0 anytime, 1 this month, 3 this week, 5 blocks active work today |
| `InactionRisk` | 0 to 5 | 0 nothing breaks, 1 minor friction, 3 recurring rework or drift, 5 data loss, security hole, or broken build |
| `Effort` | 1 to 5 | 1 a tiny isolated change that takes minutes, 2 small focused pull request, 3 single-capability pull request, 4 multi-component change, 5 heavy project across several pull requests |

`Value` measures the useful outcome and the work the item lets other items start. `Urgency` measures the cost of waiting right now. `InactionRisk` measures what degrades or causes repeated rework when nobody does the item, such as an open branch that collects merge conflicts or a manual step that someone repeats every release. It does not measure how hard the item is to build. `Effort` measures the work to implement and verify the item.

Adding 1 gives an effort divisor from 2 to 6.

## Guardrails

Apply both guardrails to the base priorities before you order the queue. Each item's effective priority starts at its base priority.

1. Finish or unblock in-flight work near completion before you start a new item, so open pull requests do not accumulate merge conflicts and rework. Place any uncompleted prerequisite of a near-complete item ahead of it.
2. Item A is a prerequisite of item B when A must finish before B can start. Propagate the highest dependent priority through the whole prerequisite chain, not in a single pass. Repeat until every prerequisite has an effective priority at least as high as the highest effective priority of its dependents. Always place prerequisites before their dependents, even when both share the same effective priority.

## Selection

Order the queue with near-complete work first, then by effective priority from highest to lowest. Prerequisites stay ahead of their dependents. Break ties among independent units by keeping their original input order.

Select the first eligible unit after applying both guardrails. A unit is eligible when it has no uncompleted prerequisite. Build only that selected unit in the first pull request. Park every other unit as a planned follow-up.

## Calibration

| Item | Value | Urgency | InactionRisk | Effort | Base priority |
| --- | --- | --- | --- | --- | --- |
| Unused doc formatting cleanup | 0 | 0 | 0 | 1 | 0/2 = 0.0 |
| Minor log wording tweak | 1 | 1 | 1 | 2 | 3/3 = 1.0 |
| Core storage migration | 5 | 5 | 5 | 5 | 15/6 = 2.5 |
| One-line fix unblocking active release | 5 | 3 | 2 | 1 | 10/2 = 5.0 |

## Output

Show one table in the queue order from the selection step, with these columns:

| Item | Value | Urgency | InactionRisk | Effort | Effective priority | Action |
| --- | --- | --- | --- | --- | --- | --- |

Fill `Action` with `Next` for the selected unit and `Park` for every other unit. Below the table, name the single selected unit to build next and list every parked follow-up.
