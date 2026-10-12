---
name: design-ui
description: "Use before building, changing, or critiquing UI appearance. Apply project tokens, cover states, and inspect screenshots."
metadata:
  source: "Ideas adapted, not copied, from hallmark by nutlope (https://github.com/nutlope/hallmark), MengTo/Skills (https://github.com/MengTo/Skills), layers by Jamie Mill (https://github.com/jamiemill/layers-skills), and design-plugin by 0xdesign (https://github.com/0xdesign/design-plugin). Each declares the MIT license."
---

# Design UI

Make UI that looks like it belongs to the product, then look at it. The design comes from the project's system, the states come from an inventory, and the verdict comes from screenshots checked against the design gates.

For a critique with no edits, run steps 1, 5, and 6 read-only and return the ranked findings.

## 1. Read the system

Find what the project already decided:

- Tokens: CSS custom properties, the Tailwind or theme config, or the UI library's theme.
- The design system package, if the project uses one. Use its components rather than re-creating them.
- Two or three existing components closest to the one you are building.

Write a short system note with `path:line` citations: colours (including greys), type scale, spacing scale, radii, shadows, and the components you will reuse.

When the project has no system, define a compact one in a single tokens file before any UI code, and say in the reply that you chose it.

Done when every colour, font, size, space, and radius the change needs maps to a named token. Add a missing token to the tokens file first, then use it.

## 2. Inventory the states

Breadboard the screen. List each place, each affordance in it, and where that affordance leads. An affordance with no destination is an unmade decision.

For each component, decide every state that applies: default, hover, focus-visible, active, disabled, loading, empty, error, and success. Then decide the failure paths: validation errors, a server error, offline, a timeout, very long content, and one item versus many.

Invoke [feel](../feel/SKILL.md) for motion tokens, transitions between these states, and sound.

Done when every affordance names a destination and every state has a decision. A missing state that changes what the user sees is a product call. Pick a default, build it, and name it in the reply.

## 3. Build inside the system

Build against the system note and the inventory. Read [gates.md](references/gates.md) before writing UI code, and build to it.

When you change a shared token or component style, the existing screens that use it change too. Render them in step 5 and name the change in the reply.

When the layout or interaction model is open, sketch alternatives yourself, moving one named axis (hierarchy, layout, density, or interaction model) against the same fixture data, then compare.

## 4. Lock the system with a check

Make going around the tokens fail a check, per [encode-lessons-in-structure](../principles/encode-lessons-in-structure.md). Prefer the project's own linter (a stylelint or ESLint rule, or a theme config that only exposes the tokens). Otherwise run the scan in [gates.md](references/gates.md#scan) over the changed files and fix every hit.

Add a new lint dependency or CI step only when the user asked for one. Otherwise report the scan result and offer the rule.

Done when the check or scan reports zero raw values in the changed files outside the tokens file.

## 5. Render every state

Build a preview that shows every state from step 2 at once: the project's Storybook or component gallery if it has one, or a temporary route or page. Force hover, focus, and active with classes or the harness's state emulation, and use fixtures for loading, empty, and error.

Invoke `control-ui` and drive the preview with it:

- Screenshot at 375, 768, and 1280 pixels wide, and in dark mode when the project supports it.
- Check the DOM at each width: no horizontal scroll, no clipped or overflowing text, every touch target at least 44 by 44 CSS pixels, and text contrast at least 4.5:1. When the project has Playwright, or it is installed globally, run `node scripts/ui-check.mjs <url> <out-dir>` from the project root, with the script path resolved from this skill's directory. Set `<out-dir>` to `tmp/<task>/` inside the project. It screenshots each width, prints every failure, and exits non-zero when it finds one.
- Run the project's accessibility tool too when it has one.
- Open and look at every screenshot yourself. Caption each one with what it proves ("375px browser viewport", not "mobile").

Delete the temporary preview when you are done, unless the project keeps a gallery.

Done when every state renders at every width with zero DOM or accessibility failures.

## 6. Critique

Check the screenshots against the system note, inventory, user's request, and [gates.md](references/gates.md). Rank findings, each citing a screenshot and an element:

- **P0.** Broken: clipped text, failed contrast, a missing state, an unreachable control.
- **P1.** Off-system or confusing: a raw value, the wrong hierarchy, two primary actions.
- **P2.** Polish.

Run the Removal Test on every decorative element: name it, state its job, and recommend removal if the screen stays as clear without it. Make the edits yourself.

Fix every P0 and P1, re-render, and repeat the check until no P0 or P1 remains.

## Reply

Before and after screenshots with captions, the system note, every default you chose for a missing state or system, the check from step 4, and the findings you left as P2.

Keep scratch files in a gitignored `tmp/<task>/` at the project root, out of commits, and remove the task folder when work is merged or dropped unless someone still needs its evidence; leave test-owned temporary directories alone.
