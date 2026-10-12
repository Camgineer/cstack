---
name: create-verification-skill
description: "Use when an app lacks repeatable user-path verification, or its verification skill or feature map needs updating."
---

# Create a verification skill

Every serious project needs a scripted way to drive the real app and prove behavior: launch it, exercise a feature the way a user would, and capture evidence. This skill generates that as a project-local skill (`<project-skills>/verify-<app>/`) tailored to the repo. You write the generator's output for the next agent, not for a human: it will be read cold, mid-task, by an agent that has never seen the app.

## Choose the path and resolve the destination

Before either path uses `<project-skills>`, resolve it to a directory the active harness discovers for this project. Read the project's existing skill configuration and the active harness's available documentation or settings. Reuse an existing project skill directory when it is supported; otherwise use a documented project-local destination. Confirm discovery through the harness's available skill list or documented discovery rule. If you cannot establish a supported destination, ask the person for it before writing. Replace `<project-skills>` with that resolved path in every command and generated instruction.

For creation, follow steps 1-4 and finish after the generated skill's proof. For an audit or update of an existing verification skill, go directly to [Update an existing verification skill](#update-an-existing-verification-skill). Do not regenerate it or seed its map first.

## 1. Interview the repo, not the user

Answer these from the codebase and only ask the user what you cannot observe:

- **Surface:** what does a user actually touch? A web UI, a CLI/TUI, a desktop app, an API, a mobile app, a library? A repo can have several; pick the primary one and note the rest.
- **Run:** how does the app start locally? Prefer the repo's own documented dev command (package scripts, Makefile, README quickstart). Note ports, env vars, seed data, auth.
- **Drive:** how can an agent interact with it programmatically? Existing harnesses first. Playwright/Cypress specs, expect scripts, PTY helpers, curl-able endpoints, a debug port. Only then pick a generic recipe: browser/CDP for web and Electron, a tmux/PTY harness for CLI/TUI, plain HTTP for services.
- **Observe:** what evidence can be captured? Screenshots, terminal transcripts, response bodies, logs, exit codes, DB state.
- **Isolate:** can two instances run side by side (ports, data dirs, profiles)? If not, say so in the generated skill: refusing to double-drive a shared instance beats corrupting the user's session.

If the checkout doesn't build or start as-is, fix that first (or report it precisely) before generating; a skill written against a broken base teaches wrong steps. When an irrelevant missing asset blocks startup (a static dir the API never serves, a sample config), the generated skill may create it, clearly marked as verification scaffolding, and remove it in cleanup.

## 2. Generate the skill

Write `<project-skills>/verify-<app>/SKILL.md` with YAML frontmatter (`name: verify-<app>` and a `description` that names the app, the surface, and when to reach for it) and these sections, each grounded in what the interview actually found (no placeholders left):

- **Launch:** the exact command that starts the app for verification, and how to tell it's ready (a log line, a port answering, a prompt). Include teardown. For a short-lived CLI or TUI there is no server to keep alive: launch means build the binary (or install deps) once, then start each drive in its own isolated PTY or tmux session.
- **Doctor:** one read-only check that answers "is this instance worth driving?". Check the process, build, port ownership, and auth. An agent runs this first whenever anything looks off.
- **Drive:** the harness recipe with real selectors/commands from this repo, not examples. Prefer stable handles (ARIA labels, data attributes, prompt strings, route paths) over coordinates and tab order.
- **Evidence:** what to capture for a proof and where it goes under `tmp/<task>/` inside the project. State the proof standards: exercise the real user path, not internal setters or test-only endpoints; capture the action and the resulting state, not just the final screen; verify side effects (files written, rows inserted, messages sent) alongside what's visible; mocks only where a production boundary already isolates the external system. When the safe path is a dry-run or test mode, verify what it actually skips by observing (files, network, git refs) rather than trusting its name: some dry-runs still touch the network or open a browser.
- **Cleanup:** how to tear down instances the run created. Never kill by process name; kill what you started. Cleanup removes instances and scratch state, never the evidence: proof artifacts survive the teardown, in a location the skill names.
- **Helpers:** any script the skill ships is executable and its invocation is shown in the skill body. A helper the reader has to reverse-engineer is not a helper.

## 3. Seed the feature map

Create `<project-skills>/verify-<app>/features/README.md` plus one file per user-facing feature you can identify (aim for the top 3-5 to start, from routes, commands, menus, or docs). Follow the shape in [`references/feature-map-example/`](references/feature-map-example/), with a README index and one file per feature. Each file answers, from the user's point of view: what the feature is, how to reach it, how to drive it with the harness, and what observable end state proves it works. The four H2s are `Sub-features`, `How to get to it (user POV)`, `Driving it with <harness>`, and `Gotchas`. The map is the repo's maintained verification source; a proof that drives one convenient entry point is incomplete when the map lists others.

## 4. Prove the generated skill before handing it over

Run its own instructions end to end once: launch, doctor, drive ONE mapped feature (one is enough; the map exists so later runs can cover the rest), capture evidence, clean up. After cleanup, confirm the evidence still exists at the named location. A cleanup that removes the proof fails this step. Fix what fails, and run the generated cleanup after every failed iteration too, so broken attempts don't strand processes and ports. A generated skill that was never executed is a draft, not a deliverable.

After the proof, report the generated skill's path, the mapped feature exercised, and the evidence. Creation ends here.

## Update an existing verification skill

Cover every feature file from source and exercise every feature live. Update the existing skill rather than regenerating its map.

### Outcomes

Pick one, and say which:

- **clean**. every feature got source and live coverage; nothing needs changing.
- **changed**. proven doc, harness, or map corrections are verified on the current branch.
- **blocked**. coverage could not finish or a proven fix could not be verified safely. Say exactly what blocked it.

### Edit scope

Only edit the verification skill's own directory (its SKILL.md, features/, and any harness scripts it owns). Never edit product code during a run: a behavior the map describes that the app no longer does is either doc drift (fix the map) or a product regression (report it, don't paper over it in docs).

### Pass

0. **Locate the target.** Find the verification skill to maintain: the project-local skill whose body has launch/drive sections and a feature map (usually `<project-skills>/verify-*/`). Several candidates → ask which one; none → report the missing target and offer the creation path instead of inventing one.

1. **Index hygiene.** Read the feature map README and glob its sibling files. Fix missing, extra, duplicate, or dead entries. Lightweight; no generated inventory.

2. **Source pass.** Read every feature file and explain "how does this user-facing feature work?" from source, flag likely doc drift with citations, and write one concise live-verification recipe. Keep this pass read-only; drive the app in step 4. Return shape: feature summary / source entry points / likely drift or none / one recipe.

3. **Reconcile.** Every feature file has a returned summary. Merge overlapping recipes into as few app states as practical. Spot-check cited drift; don't re-prove clean claims. Sweep recent churn for user-facing surfaces missing from the map; require a concrete source path before calling one missing.

4. **Live pass.** Drive every feature even when source looks clean. Follow the target skill's launch model: one instance driven serially for a server or UI, or a fresh isolated session per short-lived CLI drive.
   - Run doctor before the first drive, on each fresh session, and after a failed or surprising drive. If doctor cannot see a wedged UI, reset or relaunch it.
   - Preserve captured evidence through every cleanup and check it at the named location.
   - Clean failed-iteration residue and stop only instances you started when they are no longer useful. On a shared instance, clean your residue instead of stopping the instance.
   - If doctor fails because of skill drift, fix it within edit scope and retry once. Restart only what the fix invalidates.
   - Mark a feature `verified-unreachable` only with its attempted route and concrete missing prerequisite, such as auth, entitlement, OS, or external state. Add an omitted prerequisite to the map.
   - Re-drive every harness fix. Tear down after the final drive and confirm the evidence remains.

5. **Triage.** Wrong or missing user-POV description → doc drift, fix it. Working behavior the harness can't drive → harness gap, fix it; a harness fix follows the same helpers rule as generation (scripts executable, invocation documented in the skill body). App behavior that's actually broken → product gap; record it for the user, keep it out of the edits.

6. **Verify or stop.** Re-read every changed file and verify every correction on the current branch. Report clean, changed, or blocked with honest source and live coverage. End here.

Keep concise run notes (features covered, unreachable prerequisites, confirmed drift, outcome) in `tmp/<task>/` inside the project.
