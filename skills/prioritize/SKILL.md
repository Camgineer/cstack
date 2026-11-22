---
name: prioritize
description: "Rank work with one priority formula. Use for /prioritize, backlog triage, picking what to build next, or scoping PR 1 of a multi-part request."
disable-model-invocation: true
---

# Prioritize

Use one formula for every queue, whether it holds bot items, a backlog, a roadmap, or the units of one request.

## Formula

`Priority = (Value + Urgency + InactionRisk) / (1 + Effort)`

Score each input as a whole number on its scale.

| Input | Range | Anchors |
| --- | --- | --- |
| `Value` | 0 to 5 | 0 none, 1 minor polish, 3 meaningful improvement, 5 major milestone or unlock |
| `Urgency` | 0 to 5 | 0 anytime, 1 this month, 3 this week, 5 blocks active work today |
| `InactionRisk` | 0 to 5 | 0 nothing breaks, 1 minor friction, 3 recurring rework or drift, 5 data loss, security hole, or broken build |
| `Effort` | 1 to 5 | 1 trivial quick win, 2 small focused PR, 3 single-capability PR, 4 multi-component change, 5 heavy multi-PR project |

`Value` measures the useful outcome or unlock. `Urgency` measures the cost of waiting right now. `InactionRisk` measures what breaks, rots, or compounds if nobody does the item. It does not measure how hard the item is to build. `Effort` holds that cost and combines engineering time, complexity, verification, and coordination.

The `+ 1` keeps the denominator between 2 and 6, so a trivial chore never outscores critical work.

## Guardrails

Apply both guardrails before you sort by score.

1. Finish or unblock in-flight work near completion before you start new work, so open PRs and branches do not rot.
2. When item A blocks item B, A inherits `max(Priority(A), Priority(B))`.

## Decompose before scoring

Split a multi-part request into independent shippable units first. Score each unit on its own. Build only the top unit in PR 1, and park the lower-scoring units as planned follow-ups. Never bundle a low-scoring infrastructure task into a high-priority PR.

## Calibration

| Item | Value | Urgency | InactionRisk | Effort | Score |
| --- | --- | --- | --- | --- | --- |
| Trivial chore | 0 | 0 | 0 | 1 | 0.0 |
| Minor tweak | 1 | 1 | 1 | 2 | 1.0 |
| Critical big build | 5 | 5 | 5 | 5 | 2.5 |
| High-leverage quick win | 5 | 3 | 2 | 1 | 5.0 |

## Output

Show one table in guardrail order, then score order, with these columns:

| Item | Value | Urgency | InactionRisk | Effort | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |

Fill `Action` with `Next`, `Finish first`, `Unblocks <item>`, or `Park`. Below the table, name the single top unit to execute next and list the parked follow-ups.
