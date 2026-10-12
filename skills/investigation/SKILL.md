---
name: investigation
description: Use when the user asks for investigation. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Investigation

Investigation requests are read-only. They produce a cited explanation or a recommendation, not a code change.

1. Invoke `how`. For motivation questions, also invoke `why`.
2. Produce the `how`-shaped output (Overview / Key Concepts / How It Works / Where Things Live / Gotchas), or a recommendation with a tradeoffs table if the request is a decision between alternatives.
3. Invoke `simple-as-prose` and apply it to the reply.

End with the cited answer. A code change needs its own scope and authorization.

**Reply:** the investigation output. For "are we sure?" answers, include your real judgment with reasons. Push back if the premise is wrong.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
