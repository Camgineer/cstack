---
name: grill-with-docs
description: Grill the user relentlessly about a plan, design, or decision, showing each question and writing the glossary and ADRs as answers settle. Use for grill, 'grill me', stress-testing a plan, or sharpening a design before building it.
license: MIT
metadata:
  source: "Merges grill-with-docs and grilling from mattpocock/skills, https://github.com/mattpocock/skills"
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Grill with Docs

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Run two companion skills for the whole session, every round:

- The **show-me** skill puts each question in front of the user as the thing itself. A question about a signature shows the signature. A question about flow shows the call tree. A choice between options shows each option as code, a diff, or a diagram, side by side. Prose frames the question in a line or two; the view carries it. Follow [principle-show-dont-tell](../principle-show-dont-tell/SKILL.md).
- The **domain-modeling** skill keeps the language sharp. Challenge terms against `GLOSSARY.md`, write each term into it the moment it resolves, and offer an ADR when a decision qualifies.

## Rounds

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question, show it, and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

````
❓ **Q1** - **<question title>**: <one or two lines framing the decision>

```<lang>
<the show-me view: code, diff, tree, or diagram of the options>
```

➡️ <your recommended answer>

---

❓ **Q2** - ...
````

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

## First round

When the user brings a solution rather than a problem, such as "add a cache" or "build a dashboard", treat the solution as evidence of a problem. The first round works back to that problem, and it becomes the root of the design tree. Ask it in the round format:

- Name the signal that prompted the solution: the complaint, metric, incident, or request behind it.
- Offer three framings of the underlying problem, each pointing to a different build, shown side by side.
- Show each load-bearing assumption in a table with the risk if it is wrong, the cheapest test that checks it, and its evidence status: none, anecdotal, or measured.

An assumption with evidence status none gets its test before its design. Recommend the test, and keep the design questions that depend on it off the frontier until the result is in.

## Facts versus decisions

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (code, files, tools, history), delegate a read-only investigator to find it, or look it up yourself. Ask the user only for what you cannot look up. Don't block on it: a running investigation is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

## Done

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed, every resolved term in `GLOSSARY.md`, and every qualifying decision offered as an ADR. Do not act on the plan until the user confirms you have reached a shared understanding.
