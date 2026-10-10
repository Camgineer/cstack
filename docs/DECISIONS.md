# Decisions

Dated decisions about how work on this repository runs, with the reason for each. Reopen one only with new evidence.

## Format

Add each entry at the top of the log, newest first, in this shape:

```markdown
### YYYY-MM-DD. The decision in one sentence

- **Why.** The reason, in one or two sentences.
- **Reverses when.** The evidence or event that would change it.
```

Record a decision the operator made or approved. Record the coordinator's own recommendation in [STATUS.md](STATUS.md) until the operator rules on it. To reverse a decision, add a new entry that names the old one, and leave the old entry in place.

## Log

### 2026-10-09. Stale pull requests go to the operator, and no agent closes one

- **Why.** Closing discards someone's work and is the operator's call, like a merge. An agent can misjudge whether a quiet branch still matters.
- **Reverses when.** The operator names a rule for closing, such as an age limit, that an agent can apply without judgment.

### 2026-10-09. #114 and #115 are optional until the operator rules to close or keep them

- **Why.** Both served a workflow that ran in a Claude Code Project, and the work no longer runs there. Neither was ever run against its live service.
- **Reverses when.** The operator rules on either one, or the work returns to a Project.

### 2026-10-09. The coordinator's long-term memory lives in `docs/`, not in a chat

- **Why.** A chat thread ends, compacts, or moves hosts, and the next coordinator cannot read it. Tracked files survive all three and reach every child through its worktree.
- **Reverses when.** The operator picks another home. The pull request that added `docs/` asks whether status updates should ship in plugin releases.

### 2026-10-09. One coordinator thread owns the repository, delegates all code, and never merges

- **Why.** One owner keeps the plan and the pull request queue in one place, and children keep the coordinator's context free for planning. The operator keeps the merge because each merge to main releases to every user.
- **Reverses when.** The operator grants a merge or auto-merge authority in writing, or retires the coordinator.
