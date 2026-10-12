---
name: prototype
description: Use when the user asks for prototype. Follow the task from evidence and scope through verification on the current branch.
disable-model-invocation: true
---

# Prototype


The one guide where the Laziness Protocol's "smallest change" and the verification bar invert. Speed over polish, code quality does not matter, no planning. The rigor is in picking the right design cheaply. Propose variations the user didn't ask for, throw an approach away and try another.

1. Scope the decision the prototype exists to make: which layout, which interaction, which density, or for an empirical fork which behavior, timing, or approach. No decision means no prototype. Ask what decision the sketch should settle.
2. Gather references when the design space is open. Search for prior art, summarize a moodboard of themes, palettes, and layouts, let the user pick directions before building. Skip when the direction is set.
3. Build the local throwaway prototype in `tmp/<task>/` inside the project. For a visual decision, vanilla HTML/CSS/JS or the lightest stack that renders the idea, CDN deps, a dev server with hot reload. For a behavioral or timing decision, the smallest script that exercises the question. For a business-logic or state-model decision, one self-contained HTML file that opens with a double-click: the question stated at the top, the logic as a pure module (a reducer, a state machine, or pure functions) that never touches the page so it can lift into the real code, the full state rendered after every action, free-play buttons for each action, and one tab per scenario (the happy path, an awkward edge case, an attempt at something illegal) that replays from a reset state. Label it in domain language so a non-developer can drive it. No production framework, no tests, no abstractions.
4. When comparing alternatives, build them behind one switcher (buttons or a keypress), each variant labeled. This is the [exhaust-the-design-space](../principles/exhaust-the-design-space.md) reference made cheap.
5. Verify on the matching surface. For a visual decision, screenshot each variant via the control skill and drive the interaction. For a behavioral or timing decision, observe the thing you are deciding by logging the timing, printing the output, or watching the render. The observation is the test here, not an assertion.
6. Present alternatives, tradeoffs, and a recommendation. The output is the decision plus the throwaway artifact, not shippable code. Record the chosen direction for the real build; use `architect` when its shape needs design. Keep the validated decision and a logic prototype's pure module as evidence for the real build. Keep the prototype in `tmp/<task>/`.

**Reply:** the variants explored, the evidence (screenshots for a visual decision, the observed output or timing for a behavioral one), tradeoffs, your recommendation, and the local scratch path. Say plainly that the prototype is throwaway.

Keep scratch files in a gitignored `tmp/<task>/` at the project root, out of commits, and remove the task folder when work is merged or dropped unless someone still needs its evidence; leave test-owned temporary directories alone.

## Done

End when the scoped work is verified on the current branch. Report the evidence and any unverified or blocked checks.
