---
name: runtime-forensics
description: Use when the user asks for runtime forensics. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Runtime forensics

1. Capture the live signal on the matching surface via the control skill: a CPU profile for a spinning process, a heap snapshot for a leak, a CDP trace for a visual glitch. A real artifact, not a guess.
2. Reduce the artifact to the smoking gun: the function on the hot path, the retainer chain from the leaked object to a GC root, the loop firing without input. Reduce large artifacts into a cited digest yourself. Apply the [guard-the-context-window](../principles/guard-the-context-window.md) reference and keep the reduced finding in the main thread.
3. Prove the mechanism before believing it. Inject instrumentation via CDP eval on the running process, or hotfix the live code without reloading, to confirm the hypothesis cheaply.
4. Map the finding back to source: file, symbol, the line that allocates or schedules.

**Reply:** the signal captured, the reduced finding, how you proved the mechanism, the source location, artifact paths. No fix unless asked. Name the next diagnostic or fix needed.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
