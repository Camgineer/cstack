---
name: setup-pstack
description: Configure C-Stack model roles. Writes a local overlay that plugin updates do not replace. Use for /setup-pstack, configure pstack models, or changing C-Stack model choices.
---

# Setup C-Stack models

Plugin defaults live in `policy/cstack-models.md`. They return on every plugin update.

Personal choices live in `~/.agents/cstack-models.md`. That file is outside the plugin cache. Named roles there replace the plugin default. Missing roles keep the default. Delete the file, or delete a line, to restore shipped defaults.

Never write model choices into the plugin cache or this repository.

## Steps

1. Read `policy/cstack-models.md`.
2. Read `~/.agents/cstack-models.md` if it exists.
3. Enumerate spawn-tool slugs in this session. Never write a spawn slug the live spawn tool cannot take. Lead-only slugs may use create_thread.
4. Show the resolved table: role, plugin default, overlay value, resolved value.
5. Ask which roles to change. Spawn seats stay at most five distinct spawn slugs. Leads are not spawn seats.
6. Write `~/.agents/cstack-models.md` with only the roles that differ from `policy/cstack-models.md`. Keep overlay roles the user did not change.
7. Tell the user the overlay path and that plugin updates will not touch it.

## Overlay shape

```
# C-Stack model overlay. Named roles replace policy/cstack-models.md. Delete a line to restore the plugin default.
engineering-lead: anthropic/claude-fable-5-1 medium
other-lead: anthropic/claude-opus-5 medium
reviewer: gpt-5.6-sol medium
interrogate: cursor/muse-spark-1.3 max
implementer: combo/grok-4.6 high
cheap: gpt-5.6-luna high
extraction: gpt-5.6-luna medium
comment-audit: gpt-5.6-luna medium
readiness: gpt-6-astra medium
art: gpt-6-astra medium
```

Valid role keys are exactly those names.

