---
name: setup-bot
description: "Create or resume a persistent local bot when the user explicitly requests bot setup or adoption."
---

# Set up a bot

Read `references/operating-contract.md` before preparing or resuming a bot. User instructions determine whether this is guided setup or authorized execution. Explain proposed actions and wait when the user wants to run steps themselves.

1. Establish the purpose and authority from the conversation. For existing chats, extract current decisions and unfinished work with source references; multi-chat aggregation is optional. Resolve consequential contradictions with the user.
2. Propose a unique stable bot ID, purpose and initial queue. Obtain alignment before activating that bot. Create records under `~/.agents/bots/<bot-id>/` without overwriting another identity.
3. Obtain the real native task ID and host from trusted runtime context or native inspection tools. Verify them through native state before recording a current binding. Unknown identity stays unverified, never guessed.
4. Create `IDENTITY.json`, `SOUL.md`, `WORK.md`, `DECISIONS.md` and `CONTEXT.md` according to the operating contract. Preserve pending user review separately from approved decisions.
5. Read the user's applicable model policy, including `~/.codex/pstack-models.md` when present. Use supported role/model/effort choices and record requested settings separately from observed routing. Missing policy is a setup question, not permission to invent one.
6. Discover actual native delegation and result-return tools, including deferred catalogs. Delegate a user-authorized bounded task with scope, context, ownership, acceptance and return route. Read back the result independently and update the work board. Native subagents are distinct from separate user-visible tasks.
7. Verify startup readback and task binding. Report precisely which delegation, responsiveness, continuation and recovery behaviors were observed. File creation or a tool description is not operational proof. Installation, schedules and fleet broadcasts require their own user scope.

For resumption, reconcile the recorded task binding, workers, checkpoints and pending replies before dispatching more work. Keep the existing stable identity. Do not treat a missing result message as evidence that execution stopped.
