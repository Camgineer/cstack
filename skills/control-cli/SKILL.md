---
name: control-cli
description: Build or adapt a local harness to drive, inspect, and profile an interactive CLI or TUI without external services. Use for CLI UX checks, reproducing CLI bugs, startup regressions, memory leaks, hangs, prompt flows, or terminal demos.
license: MIT
metadata:
  source: "control-cli from Cursor Team Kit by Cursor, https://github.com/cursor/plugins/tree/23e4138daa01c42d4969f7a5465f82704e64f798/cursor-team-kit/skills/control-cli"
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.

# Control CLI

Exercise an interactive CLI through a repeatable local harness. Reuse the repo's own test or demo harness when it exists, or a project verification skill from **create-verification-skill**. Otherwise assemble a temporary harness from standard local tools.

## Uses

- Reproducing CLI and TUI bugs with deterministic input.
- Verifying keyboard flows, prompts, interrupts, resize behavior, and terminal layout.
- Capturing before and after transcripts for bug fixes.
- Profiling startup time, slow operations, hangs, or memory growth.
- Recording a short terminal demo when output is easier to show than explain.

## Harness loop

1. Identify the command under test and the smallest reproducible workspace.
2. Discover existing local harnesses: package scripts, e2e tests, demo recorders, expect scripts, or PTY helpers.
3. If no harness exists, launch the CLI in an isolated terminal session with deterministic environment variables.
4. Capture the current screen before interacting.
5. Send one action at a time: text, Enter, arrows, Escape, Ctrl-C, or resize.
6. Wait for a concrete screen pattern or prompt before the next action.
7. Save the transcript and any profile artifacts.
8. End the session cleanly.

## Harness options

- Repo-native harness: checked-in scripts know the app's startup, environment, and prompts, so try them first.
- `tmux`: managed sessions, `capture-pane`, `send-keys`, attach and detach.
- PTY probe: a short Python, Node, or Expect script when tmux is unavailable.
- Runtime inspector: the Node or Bun inspector for CPU profiles, heap snapshots, and live evaluation.
- Terminal recorder: repo-local demo tools or asciinema-compatible tools when the user asks for a demo.

## Minimal tmux harness

```bash
SESSION="cli-harness-$(date +%s)"
tmux new-session -d -s "$SESSION" -- <command-under-test>
tmux capture-pane -pt "$SESSION"
tmux send-keys -t "$SESSION" "help" Enter
tmux capture-pane -pt "$SESSION"
tmux kill-session -t "$SESSION"
```

To attach an inspector, start the CLI with its runtime's inspect flag. For Node, set `NODE_OPTIONS="--inspect=127.0.0.1:0"`. For Bun, run `bun --inspect=127.0.0.1:0 <script>`. Read the terminal output for the inspector URL, then use DevTools-compatible tooling to profile.

## Minimal PTY harness

Use a PTY script when you need deterministic waits and the repo has neither tmux nor a demo harness. Keep it temporary unless the user asks for a reusable test.

```python
import os
import pty
import select
import subprocess
import time

master_fd, slave_fd = pty.openpty()
proc = subprocess.Popen(
    ["<command>", "<arg>"],
    stdin=slave_fd,
    stdout=slave_fd,
    stderr=slave_fd,
    close_fds=True,
)
os.close(slave_fd)

deadline = time.time() + 30
buffer = b""
while time.time() < deadline:
    ready, _, _ = select.select([master_fd], [], [], 0.25)
    if not ready:
        continue
    chunk = os.read(master_fd, 4096)
    buffer += chunk
    if b"<ready text>" in buffer:
        os.write(master_fd, b"help\n")
        break

print(buffer.decode(errors="replace"))
proc.terminate()
os.close(master_fd)
```

For richer terminal control, use `pty.fork()` or an existing PTY library.

## Profiling recipes

- Startup regression: time baseline and treatment startup on the same machine, environment, and command.
- Slow operation: start a CPU profile, perform the operation, stop the profile, and compare top self-time functions.
- Memory leak: force GC if available, take a heap snapshot, repeat the operation, force GC again, and take another snapshot.
- Hang: capture the screen, active handles or resources, and a stack or CPU sample before interrupting.

## Guardrails

- Wait on a screen pattern or prompt. When a fixed sleep is unavoidable, say why.
- Keep credentials and destructive commands out of a controlled session.
- Keep a temporary harness in `tmp/<task>/` inside the project, per [Scratch files](../cstack-mode/SKILL.md#scratch-files). Reuse the repo's own testing or demo harness when it exists.
- Adapt commands to the current repo's scripts and runtime.
- Clean up tmux sessions and inspector processes unless the user asks to keep them. Follow [Scratch files](../cstack-mode/SKILL.md#scratch-files) for harness and artifact cleanup.
