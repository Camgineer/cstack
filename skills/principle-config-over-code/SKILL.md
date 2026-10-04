---
name: principle-config-over-code
description: "Apply when writing logic with tunable values, reviewing code with magic numbers, or deciding whether a value belongs in code or config. Every value someone could tune lives in typed, validated config, hot-swappable in long-running programs."
disable-model-invocation: true
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Config Over Code

A value belongs in config when someone could want to change it to change behavior without changing the logic. That covers thresholds, timings, limits, speeds, costs, weights, lists, tables, and user-facing text. Put as many values there as realistically fit. Literals that fix the code's own structure stay in code, such as indices, internal buffer sizes, exit codes, format strings, and protocol and math constants.

**Why:** Good behavior comes from trying many variants. A value buried in code costs an edit, a rebuild, and a restart per try, so people try few. A value in config costs one save, so people try many. Config also shows in one place what the program can be tuned to do.

**The pattern:**
- **Config sits beside its reader.** Put a module's values in a file next to that module, unless the project already keeps config in one place. Then follow the project.
- **Config is typed.** Each value has a declared type and unit. Parse it into a typed object once, where it loads, per the **boundary-discipline** principle skill.
- **One reference is the seam.** The code holds one reference to the typed config object and reads fields from it each time it needs a value. The loader replaces that object on reload. Add no string-keyed bag or lookup layer between the code and the value.
- **A long-running program hot-reloads config.** A program is long-running when it keeps running until someone stops it, such as a loop, a server, a UI, an editor, or a daemon. A program that exits when its work is done is one-shot, and for it the restart is the reload. In a long-running program, a saved config change takes effect with no restart or rebuild. Watch the file, re-parse it, and replace the config object. On a parse error, keep the last good object and report the error. Ship the watcher in the same change that moves the first value to config. "Nobody tunes it live yet" and "the input is fixed" are not reasons to skip it. This rule overrides the **laziness-protocol** principle skill.
- **Production loads once.** In production, load config once at start and skip the watcher. Later, remote feature flags can override values through the same seam, so the code that reads a value does not change.
- **Config is plain.** Give each value one typed field. Derive a value from the values it depends on instead of storing it twice. Add no wrapper, defaults layer, or schema framework the code does not need.

**The tests:**
- "Could someone want to change this value to change behavior without changing the logic?" If yes, it belongs in config. If it fixes the code's own structure, keep it in code.
- "Does the program keep running until someone stops it?" If yes and a saved config change does not show up without a restart, the watcher is missing.
- "Does reading this value take a string key or a cast?" If yes, the config is untyped. Parse it into a typed object at load.
- "Did the config add a layer the code did not have before?" If yes, remove the layer and read the value through the one config reference.
