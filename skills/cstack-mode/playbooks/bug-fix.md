### Bug fix

**You own this task. Plan, review, verify.** Stay in the lead.

Be scientific. Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix. It does not ship. When evidence refutes a hypothesis, revert what it motivated. The smallest change the evidence justifies ships, nothing more.

1. Reproduce it yourself on the matching surface via the control skill (Non-negotiables), even when a debug or instrumentation protocol says to ask the user to reproduce. Ask the user only with a stated, specific reason the control surface cannot reach the target, and only after driving it as far as it goes. If it won't reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
2. Binary-search the cause. Form the candidate hypotheses, then rule them out until one survives. Seed them by invoking `how` over the affected subsystem and `why` for regression history. When a working case exists (an earlier commit, a passing sibling input, a similar code path), diff it against the failing case and seed a hypothesis from each difference. When a test fails only in the full suite, bisect the suite to find the earlier test that leaves shared state behind. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate. When program state is unclear, add instrumentation or logging and read it as the code runs. Don't guess. Drive a long or stubborn hunt with the host's supported continuation capability. Confirm the surviving *mechanism* with runtime evidence before step 3.
3. Plan the fix. If it adds a module, reshapes a public interface, or has more than one viable shape, invoke `architect` first. Write a small fix yourself. Delegate a large one to a subagent on the host model (or the user's chosen model) with a specific scope, and review its diff.
4. Verify on the same surface. The original repro now passes. "Inconclusive" or wrong-surface is not a pass. Flag it. Unit tests show branch behavior, not bug absence. When a test is flaky on timing, replace its sleep with polling for the awaited condition under a timeout; keep a fixed delay only when the test measures timing itself.
5. Stage the commits so the failing repro lands before the fix in git history. Invoke `tdd` for the failing-test-first cadence when the bug has a cheap local test path. Skip it when the test would be expensive, integration-heavy, or unclear.
   This is the canonical **sequence-verifiable-units** principle skill, the failing test first and the fix on top.
6. Run **Opening a PR**.

**Reply:** what was broken, root cause, fix, how you verified. Paste failing-then-passing repro output verbatim.
