---
name: autopilot
description: Use before a coding task when no task guide is named. Pick one task guide and follow it.
---

# Autopilot

This is the default mode. It selects one task guide. The surrounding environment chooses the model and owns the branch.

## Select

When the person already named a task guide, read that file and follow it. Otherwise walk the table from the top and stop at the first row that fits. Read that file and follow it through its Done section.

| Condition | Task guide |
| --- | --- |
| A captured profile, trace, or heap snapshot is the input | [trace-forensics](../trace-forensics/SKILL.md) |
| A live leak, spin, or glitch needs a capture | [runtime-forensics](../runtime-forensics/SKILL.md) |
| Two implementations must match on screen | [visual-parity](../visual-parity/SKILL.md) |
| One metric should improve by repeated measurement | [hillclimb](../hillclimb/SKILL.md) |
| Measured slowness needs a fix | [perf-issue](../perf-issue/SKILL.md) |
| A defect, regression, or wrong result needs a fix | [bug-fix](../bug-fix/SKILL.md) |
| Structure should change and behavior should stay | [refactoring](../refactoring/SKILL.md) |
| A throwaway sketch should settle one design decision | [prototype](../prototype/SKILL.md) |
| Skill or prompt variants need a blinded comparison | [eval](../eval/SKILL.md) |
| A skill file is the thing being written or changed | [authoring-a-skill](../authoring-a-skill/SKILL.md) |
| The request is a read-only question about how or why code works | [investigation](../investigation/SKILL.md) |
| The request asks for new or changed behavior | [feature](../feature/SKILL.md) |

When no row fits, ask the person which task guide to follow and wait for the answer.

## Done

The chosen task guide has reached its Done section, or you are waiting on which guide to follow. Name the guide you selected. Leave model choice, hooks, and the branch to the surrounding environment.
