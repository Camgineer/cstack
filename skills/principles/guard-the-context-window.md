---
name: guard-the-context-window
description: "Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Reduce bulk to cited summaries before reasoning from it."
---

# Guard the Context Window

The context window is finite and non-renewable within a session. Every token should be worth its cost.

**Why:** Context overflow degrades reasoning quality, creates compression artifacts, and halts progress.

**Pattern:**
- **Isolate large payloads.** Reduce verbose outputs, screenshots, and large documents into a cited digest before using them in the main account.
- **Keep frequently used content inline.** Templates and references used on every invocation belong in the skill file, not in separate files that cost a read each time.
- **Read in full what you act on as complete.** A listing you will treat as the whole set, such as conflicted files or failing tests, gets counted or filtered (`git diff --name-only --diff-filter=U`), never cut with `head`.
- **Size phases and cap scope.** Limit files per phase, set turn budgets, account for mechanism costs.
