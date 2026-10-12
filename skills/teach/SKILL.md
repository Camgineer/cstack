---
name: teach
description: "Use when asked to understand a change or subsystem. Combine how it works with why it exists."
---

# Teach

Explain what the work is, how it works, and why it has that shape, at the person's requested depth. This is an explanation task.

1. Infer what the reader needs from the question and conversation. Skip what they already know.
2. Use `how` for runtime behavior and `why` for rationale. Keep their scope narrow for a small question and widen for a subsystem. Reuse their findings and citations rather than repeating the investigation. Preserve `why`'s confidence language.
3. Start with the smallest complete explanation. Define the thing, connect it to the case, and walk through the mechanism. Add depth when the person asks. In a one-shot answer, include the depth their request needs.
4. Show code, output, a diff, or a diagram when it explains faster than prose. For a complex flow, build the diagram in stages so each adds one part. A single fact needs no figure.
5. Apply `simple-as-prose`. Give each concept one name, keep the uncertainty the evidence requires, and omit framing labels, quizzes, and rehearsed pauses.

Return the explanation itself, with the evidence beside the claims it supports. Stop when the requested understanding is covered and the remaining unknowns are explicit.
