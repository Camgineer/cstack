---
name: recall
description: "Use when resuming work or reconstructing recent context. Check history and live state within the requested scope."
---

# Recall

**Before you start or resume work, you rebuild the user's recent working context and hand back a tight capsule of where things stand now and what to do next.**

Keep it tight and on-topic. Read only what the in-scope threads need, then stop.

Your context lives in two records. Your own chat history holds what you did and decided. The shared record holds everything that happened around the same code under other names: the symptoms users keep reporting, the fixes that shipped and got reverted, the errors still firing in prod. That second record is what the **why** skill searches, across source control, the issue tracker, chat and issue channels, long-form docs, and error tracking. A feature with a long bug tail keeps most of its story there, so don't reconstruct it from your transcripts alone.

Use the host's supported history tools and their timestamps. Never derive host-private transcript paths or read another project's history without authorization. If history access is unavailable, use a user-provided export or digest and report the gap.

1. Classify, then route. Recall loads working context across recent chats before you act. If the user already gave you a full state capsule (paths, branch, the change), use it and skip the mining.
2. Lock the scope before searching. Pin the window ("recent" is a real range, default the last 7 days), the topic if named, and the workspace (default the active one. Never read another project's transcripts without being asked). State the scope back. Never quietly turn "all" into "recent N".
3. Fan out across your chat history. Use parallel read-only helpers if the harness has them, otherwise do the passes yourself. For each corpus slice, order candidates by host-provided timestamps and never by UUID name, search the topic first and then read only the matching chats and only their relevant regions, and skip the current chat plus obvious noise (subagent, eval, and test chats). Record the same schema, one block per chat: topic, the user's goal, decisions, open threads, struggles and corrections, and artifacts (PRs, tickets, branches), each citing the chat UUID. For one or two chats, skip the fan-out and search directly. Keep raw transcripts out of the final brief; retain their cited findings.
4. Sweep the shared record when an open thread or unclear prior outcome needs context outside your history. Hand it to the **why** skill's source investigators, but steer their question from "why was this built this way" to "what's the current state, what's been tried and didn't hold, and what are users still reporting". Reuse its per-source playbooks, run the investigators in parallel with the chat-history mining, and inherit its posture: one investigator per source, null results are findings, skip an unavailable MCP and say so. Fold what comes back into the brief. For a complete supplied state capsule, verify live state directly and skip redundant history searches. For pure activity recall with no named target, history and live state are enough.
5. Verify against live state. Take the PRs, branches, and tickets that the mining and the sweep surfaced and check them with `git` and `gh`. When the answer hinges on what an agent actually did (the tools it ran, files it read, errors it hit), read the full transcript, not just a trimmed local copy.
6. Write the brief to the contract below. Group by thread. Stay on the named topic.

## Output contract

Lead with the capsule, then the thread status, then the problems, then the next move. Deeper detail goes below or gets cut.

- **Capsule.** At most 5 bullets. What this work is and where it stands overall.
- **Threads.** One line each, prefixed with exactly one status tag: `[merged #N]`, `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]`, or `[planned, not started]`. A thread with no tag is not done yet, so tag it.
- **Problems.** At most 5, the recurring ones. Include the symptoms users keep reporting and any fix that shipped and was reverted, so the next attempt starts where the last one failed.
- **Next move.** The single most useful next action, concrete.

An adjacent feature or ticket stays out unless it blocks this one. When the capsule and thread lines outgrow a screen, cut detail before you cut threads. Write the brief through the **simple-as-prose** skill, cite chat findings by UUID and shared-record findings by their source (PR #, ticket ID, chat permalink, error-tracker issue), and sanitize private context before any public output.

**Reply:** the brief, to the contract above.
