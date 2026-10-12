---
name: principle-prove-it-works
description: "Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'"
disable-model-invocation: true
license: MIT
metadata:
  source: "Settle a claim adapts verify-this from Cursor Team Kit, https://github.com/cursor/plugins/tree/main/cursor-team-kit/skills/verify-this"
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Prove It Works

Verify every task output by checking the real thing directly. Do not infer from proxies, self-reports, or "it compiles."

**Why:** Unverified work has unknown correctness. Indirect verification (file mtimes, output freshness, agent self-reports, cached screenshots) feels cheaper than direct observation. Acting on a wrong inference costs far more than checking the source.

Check the real thing, not a proxy:
- Check process liveness directly, not indirectly through derived state
- Read the actual value, not a cached or derived representation
- When verification fails, suspect the observation method before suspecting the system

## Settle a claim

When the work makes a claim, such as "the fix stops the crash" or "the page loads faster":

1. Restate the claim so a result could prove it false. Name the condition, the measure, and the threshold.
2. Capture a baseline from the old state and a treatment from the new state on the same surface, with the same command, data, warmup, and environment.
3. Compare the raw outputs and return exactly one verdict:
   - **VERIFIED.** The measure moves in the predicted direction by the threshold, with no confound.
   - **NOT VERIFIED.** The measure is unchanged, moves the wrong way, or misses the threshold. Report it as plainly as a pass.
   - **INCONCLUSIVE.** The baseline is missing, the signal is noisy, or the environments differ. Name the measurement that would settle it.

## Script the check when you can

The strongest proof is a deterministic script that re-runs the same comparison, not a one-time eyeball. Write the script, run it, and keep its output as an artifact a reviewer can re-run instead of trusting your word.

Keep the artifact visible for the human in `tmp/<task>/` inside the project, per [Scratch files](../cstack-mode/SKILL.md#scratch-files). Use **show-me-your-work** when the trail has to be auditable later, like a big port or migration.
