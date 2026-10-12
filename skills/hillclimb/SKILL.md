---
name: hillclimb
description: Use when the user asks for hillclimb. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Hillclimb

Core discipline: one change, one measurement, keep or revert. Never stack untested changes, and never claim a win from code inspection (the [prove-it-works](../principles/prove-it-works.md) reference).

1. Ground the workload and architecture before choosing the metric. Invoke `how` over the target, name the realistic workload dimensions that can move the result (data size, history, state, concurrency), and select a case that reproduces the user's complaint. If no case reproduces it, fix the repro instead of hillclimbing. Then fix one metric, the direction that counts as better, and a checkable stop predicate that pairs a target with a floor on attempts so a lucky early win can't end the run (the example "at least 50% better than baseline and at least 10 iterations" is this shape). Use the user's numbers when given, otherwise agree them.
2. Build the measurement harness, prove its sensitivity, then freeze it (the [build-the-lever](../principles/build-the-lever.md) reference). Run contrasting realistic workloads and confirm the target case reproduces the symptom while easier cases separate as expected. If the harness cannot distinguish them, revise the workload or metric. Invoke `benchmark-checklist` and vet the harness with it before you freeze it, and make it print its error count and a count of the work done. Once frozen, one repeatable command emits the metric, sampled enough to clear the noise (median of N, not a single run). Record the baseline metric and a green run of the regression gate (the tests that must keep passing) before any change.
3. Invoke `show-me-your-work` and use its canonical log. Record the hypothesis, change, before and after measurements, tests, and kept or reverted verdict for each attempt. Read it before the next attempt.
4. Ground each hypothesis in the architecture model from step 1, so it names a specific mechanism ("defer X off the boot path because it blocks first paint"), not "try memoizing something".
5. Loop, one hypothesis per iteration:
   - Implement one tightly scoped change yourself.
   - Measure before and after with the frozen harness, and run the regression gate.
   - Accept only when the metric moves past noise and the gate stays green. Otherwise revert the change in full. A tweak that "might help" is not kept.
   - One commit per accepted fix, staging only the files you changed (`git add <files>`, never `-A`). Log the row either way, kept or reverted.
   Each iteration ends in a check before the next begins (the [sequence-verifiable-units](../principles/sequence-verifiable-units.md) reference).
6. Push past the first plateau. On a stall, several rejects in a row, pivot category, combine near-misses, re-read the source, or try something more radical before concluding the hill is climbed. Correctness and simplicity outrank the number. Revert a win that breaks behavior, and keep a simplification that holds the number (the [laziness-protocol](../principles/laziness-protocol.md) reference).
7. Stop when the predicate is met, or when the remaining ideas are marginal and not worth their cost. Don't relax the predicate to meet it, and don't quit while cheap untried hypotheses remain. If you are stuck, surface it instead of spinning.

**Reply:** the metric and target, baseline to final with the percent delta, iterations run (kept vs reverted), each accepted fix on one line, the decision log path, and the best idea you would try next if pushed further.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
