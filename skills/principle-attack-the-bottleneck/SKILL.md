---
name: principle-attack-the-bottleneck
description: "Apply before you optimize a workflow, system, pipeline, or parallel fan-out and fan-in, and before you choose which improvement to do next. Name the end-to-end outcome, find the one constraint that bounds it, and attack that constraint first."
disable-model-invocation: true
---

# Attack the Bottleneck

Attack the constraint that most limits the end-to-end outcome. Improving a non-limiting stage leaves throughput and parallel fan-in unchanged. For steps in series, attack the step that takes the largest share of total time first.

- **Name the outcome.** Pick the end-to-end result that matters, such as verified completion time, a quality bar, throughput, or latency. A local sub-metric is not the outcome.
- **Find the one constraint with evidence.** Name what bounds the outcome now, from a trace, a measurement, or an observed failure loop. A guess from reading the code is not a constraint. For a number, apply the [principle-explain-the-number](../principle-explain-the-number/SKILL.md) skill.
- **Attack it first.** Decline work outside the constraint that cannot move the outcome. Speeding up a fast branch of a parallel fan-in does nothing while a slower branch gates completion. Raising local throughput does nothing while rework loops dominate.
- **Re-measure after it moves.** The bottleneck shifts. Find the new one before the next change.
