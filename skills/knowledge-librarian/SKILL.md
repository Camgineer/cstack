---
name: knowledge-librarian
description: Retrieve a short evidence-backed brief from the shared read-only Knowledge corpus before substantive product, architecture, process or prioritization discussion.
---

# Knowledge Librarian

Reuse an existing brief when its question and cited evidence remain current. Otherwise pass a focused question and only the relevant approved decisions to [the local launcher](scripts/brief.py), using stdin:

```text
python3 <this-skill-directory>/scripts/brief.py
```

Invoke through an argument-array subprocess or a quoted literal stdin block. The launcher runs a fresh restricted Codex CLI session; it does not create a user-facing task or require another cockpit. Independent questions may run concurrently. Reuse is owned by the caller, so every product need not wait on one serial Librarian task.

Read the brief, check decisive cited passages, and distinguish current user decisions from historical corpus policy. Preserve the brief and relevant citations in the ticket/handoff when needed for continuity. Missing or conflicting evidence should narrow the claim and block only the affected decision.

The launcher permits corpus reads and minimal runtime access, disables network for worker commands, and excludes user MCP configuration, apps, web, image tools, generated memories and subagent delegation. It does not isolate the calling coordinator or grant ingestion authority. Keep Knowledge maintenance separate. On launch failure, report the retrieval gap and continue independent work; do not replace it with a full-access child advertised as restricted.
