---
name: visual-parity
description: Use when the user asks for visual parity. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Visual parity


1. Establish the baseline first, before any migration: a visual regression harness that screenshots the current component across its states, plus the target when matching two implementations. No baseline, no parity claim. A blocking prerequisite, not a follow-up.
2. Anti-shortcut clauses, stated and held: no harness modifications, no baseline tampering, no component restructuring to make a diff pass. If the baseline looks wrong, stop and ask, don't edit it.
3. Migrate one component at a time yourself. Shared primitives migrate first as a blocking phase.
4. Verify each component against its baseline via image diff on the matching surface via the control skill. A nonzero diff is a fail. Investigate the pixel delta. Iterate per component in the active task until the diff is zero.

**Reply:** components migrated, the diff result for each, the baseline harness location, what's left.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
