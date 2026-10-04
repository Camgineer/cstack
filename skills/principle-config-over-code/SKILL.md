---
name: principle-config-over-code
description: "Apply when writing logic with tunable values, reviewing code with magic numbers, or designing how a team iterates on behavior. Every value that shapes behavior lives in typed, validated, hot-swappable config beside the code that reads it."
disable-model-invocation: true
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Config Over Code

Every value that shapes behavior lives in configuration next to the code that reads it. That covers numbers, timings, thresholds, lists, tables, costs, and copy. A literal in code is a defect unless it is a true constant, such as a math constant, a protocol value, or a unit conversion.

**Why:** Good behavior comes from trying many variants. A value buried in code costs an edit, a rebuild, and a restart per try, so people try few. A value in config costs one save, so people try many and the result gets better. Config also shows in one place what the program can be tuned to do.

**The pattern:**
- **Config sits beside its reader.** Put a module's values in a file next to that module, not in one global file far from the code.
- **Config is typed.** Each value has a declared type and unit. Parse it into that typed model once, at the boundary where it loads, per the **boundary-discipline** principle skill. Reject bad values there with a clear error. Code past the boundary trusts the types and never re-checks.
- **Config is read through the seam the code already uses.** The code asks for a typed value the way it already asks for its inputs. Add no lookup layer, registry, or string-keyed bag between the code and the value.
- **Config is hot-swappable in development.** A changed value takes effect in the running program with no restart or rebuild. Watch the file, re-parse it, and swap the typed value in. On a parse error, keep the last good value and report the error.
- **Production may freeze config.** Load it once at start and skip the watcher. Later, remote feature flags can override values through the same seam, so the code that reads a value does not change.
- **Config is plain.** Give each value one typed field. Compute a value that follows from other values, rather than storing it twice. Add no wrapper, defaults layer, or schema framework the code does not need.

**The tests:**
- "Is this literal a math, protocol, or unit constant?" If not, it belongs in config.
- "Can I change this value and see the effect without a restart?" If not in development, the seam is missing hot reload.
- "Does reading this value take a string key or a cast?" If yes, the config is untyped. Parse it into a typed model at load.
- "Did the config add a layer the code did not have before?" If yes, remove the layer and read the value through the existing seam.
