# One harness-neutral core with thin host adapters

The plugin runs in Claude Code, Codex, Cursor, and Intent from one set of skills. Host differences live in host notes under `skills/cstack-mode/references/hosts/`. Skills name capabilities from the runtime contract instead of tool names, so a new host or a host update changes an adapter, not the core.
