---
name: how
description: "Use for code walkthroughs, runtime flow, and module ownership or layering questions. Trace claims to source."
---

# How

Trace the code to explain runtime behavior, module ownership, or layering. Match the depth to the question. If scope is ambiguous, state your interpretation and continue.

## Evidence

- Pin the commit with `git rev-parse HEAD` and state it with the answer. Note uncommitted changes in cited files.
- Cite `path:line` for each component and relationship.
- Follow a read, write, or call to the site that performs it. Names, docs, and config are leads.
- Mark configured but uncalled capabilities as optional. Put each unknown beside the claim it limits.

## Explore and explain

For a narrow question, read the code and explain it directly. For a subsystem, split the question into two to four distinct angles and use [explorer-prompt.md](references/explorer-prompt.md) for each pass. If the environment supports parallel read-only helpers, they may do those passes; otherwise do them yourself.

Reconcile overlapping findings and check contradictions against source. Use [explainer-prompt.md](references/explainer-prompt.md) to combine them. Include only sections the question needs. Stop when the reader can trace the relevant path and each unresolved boundary is named.
