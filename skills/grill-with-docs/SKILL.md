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

## Set up the documents

Keep one long-lived spec. Use the **Shared document** capability for a separate grill document titled `Grill: <topic>`, linked from the spec. Each grill covers one round or one slice and holds open questions only. When that capability has no route, ask in the reply alone and keep settled decisions in the spec.

Tell people how to answer in chat or by commenting on a question's heading or sentence. Put an index of open questions at the top, with each question's number, owner, and title. Give every listed question its own section with its owner, view, and recommendation. A held question also names what it waits on.

With more than one person, assign each person a distinct marker and tell them the mapping once. Start each question with its owner's marker. Use all the owners' markers for a joint decision. With one person, name them as the owner. Keep question numbers unchanged and never reuse a settled number.

## Rounds

Work the design tree in rounds. The **frontier** holds decisions whose prerequisites are settled. Ask a frontier question when the work it blocks is next. Hold the rest with their prerequisites or the later work they block. A question that depends on another open answer waits for a later round.

Ask each round in the grill document and in the reply. Leave the structured question tool unused for a round. It carries too little context, and in a shared chat one person's submit skips the questions meant for others.

Lead each question with your recommendation and its reason. List only other options you can back with a real reason. One strong option is enough. Show each option at the highest fidelity you can produce fastest, such as code, a diff, a table, a diagram, or a mockup. When only running something settles the choice, sketch it per the Prototype playbook (`../cstack-mode/playbooks/prototype.md`) and show the result.

Use this format in both the document and the reply:

````
### <owner marker or name> Q1. <question title>

Recommended. <Option and why it wins.>

<One or two sentences framing the decision.>

```<lang>
<The view of the options.>
```

- <Other option and its reason.>
````

Add each new question to the grill document before showing it in the reply. When a decision changes an open question, update that question in the document in the same turn as the reply that says so. Make small edits. After each write, read the document back and check that every heading appears once and code fences come in pairs.

## Settle an answer

An answer in chat or in the document settles the same question. Check who answered and which question they answered. Another person's agreement does not settle the owner's question. Record that agreement in the spec and keep the question open for its owner. Continue reversible work on the recommended option within the existing authorization, recorded as waiting on that person. Honor sign-off gates and stop dependent work that needs their authority.

When the owner answers, do these in the same turn:

1. Write the decision into the spec with who decided it and when.
2. Reply where the answer was given. Reply in each thread on that question, and close each thread once the question is fully settled.
3. Remove the settled question's index entry and section from the grill document. Keep comment anchors until their threads are closed, using the host's route.
4. Recompute the frontier. Update any affected open question in the document, then show the change in the reply.

A partial or ambiguous answer keeps the question open. State what remains for its owner. A joint question stays open until every owner answers.

When the last question settles, leave the grill document empty and mark it done. The spec keeps the decisions, agreements, and waiting owners.

## First round

When the user brings a solution rather than a problem, such as "add a cache" or "build a dashboard", treat the solution as evidence of a problem. The first round works back to that problem, and it becomes the root of the design tree. Ask it in the round format:

- Name the signal that prompted the solution: the complaint, metric, incident, or request behind it.
- Offer each framing of the underlying problem you can back with a reason, each pointing to a different build, shown side by side.
- Show each load-bearing assumption in a table with the risk if it is wrong, the cheapest test that checks it, and its evidence status: none, anecdotal, or measured.

An assumption with evidence status none gets its test before its design. Recommend the test, and keep the design questions that depend on it off the frontier until the result is in.

## Facts versus decisions

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (code, files, tools, history), delegate a read-only investigator to find it, or look it up yourself. Ask the user only for what you cannot look up. Don't block on it: a running investigation is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

## Absent decider

When a decision belongs to someone outside the session, grill the send, not the subject. Ask the user who it goes to, what that person knows, and what the user needs back. Then write a questionnaire for that person: a one-paragraph context, then single-idea questions ordered most important first, each with its owner and the round format. Add a one-line why only where a question could be misread. Hand the questionnaire to the user to send, list the waiting branches as open, and keep their dependent questions off the frontier until the answers come back.

## Done

The session is done when the frontier is empty, or holds only branches waiting on an absent decider: every branch of the design tree visited or explicitly held, nothing left silently assumed, every resolved term in `GLOSSARY.md`, and every qualifying decision offered as an ADR. Do not act on the plan until the user confirms you have reached a shared understanding.
