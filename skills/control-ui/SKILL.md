---
name: control-ui
description: Build or adapt a local browser or CDP harness to drive and inspect a web, IDE, or Electron UI. Use for UI verification, reproducing UI bugs, screenshots, accessibility snapshots, perf profiles, or visual diffs.
license: MIT
metadata:
  source: "control-ui from Cursor Team Kit by Cursor, https://github.com/cursor/plugins/tree/23e4138daa01c42d4969f7a5465f82704e64f798/cursor-team-kit/skills/control-ui"
---

Read [the runtime contract](../poteto-mode/references/runtime.md) before executing this workflow.

# Control UI

Use local browser automation to verify UI behavior with evidence. Reuse the repo's own Playwright, browser, or Electron harness when it exists, or a project verification skill from **create-verification-skill**. Otherwise assemble a temporary local harness around the app's dev server or Chromium debug port.

## Uses

- Reproducing UI bugs that depend on real browser focus, keyboard input, scrolling, resizing, or rendering.
- Verifying visual or accessibility changes with screenshots and snapshots.
- Checking local web, IDE, or Electron behavior before shipping.
- Capturing console logs, network logs, CPU profiles, traces, or heap snapshots.
- Producing before and after evidence for the **principle-prove-it-works** skill.

## Setup

1. Start the app locally with the repo's documented dev command.
2. Discover existing local harnesses: Playwright tests, Cypress specs, Storybook, browser scripts, Electron launch scripts, or snapshot tools.
3. For a web app, connect to the local URL with the existing browser tooling.
4. For Electron or Chromium, enable a remote debugging port when supported.
5. Select the page by stable app markers rather than tab order.
6. Target elements by accessibility role, label, or stable `data-*` selector rather than coordinates.

## Generic web harness

Use the browser tooling the repo or environment already provides. When the repo already has Playwright, a minimal one-off probe looks like this. Run it with the repo's script runner.

```javascript
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:<port>");
await page.getByRole("button", { name: /submit/i }).click();
await page.screenshot({ path: "<tmp-dir>/ui-harness-after.png", fullPage: true });
await browser.close();
```

Keep the project's dependencies unchanged for a probe. Add Playwright as a dependency only when the user asks.

## Generic CDP harness

For Electron or a Chromium app launched with `--remote-debugging-port=<port>`, connect over CDP:

```javascript
import { chromium } from "playwright";

const browser = await chromium.connectOverCDP("http://127.0.0.1:<debug-port>");
const pages = browser.contexts().flatMap((context) => context.pages());
let page;
for (const candidate of pages) {
  if (await candidate.locator("<app-root-selector>").count()) {
    page = candidate;
    break;
  }
}

if (!page) {
  console.log(await Promise.all(pages.map(async (p) => ({
    title: await p.title(),
    url: p.url(),
  }))));
  throw new Error("No matching app page found");
}

await page.screenshot({ path: "<tmp-dir>/ui-harness-cdp.png", fullPage: true });
await browser.close();
```

Replace `<app-root-selector>` with a stable marker from the current repo, such as a root app node, a landmark, or a product-specific `data-*` attribute. Replace `<tmp-dir>` with a temporary directory outside the repo.

## Interaction loop

1. Capture a page snapshot or screenshot before acting.
2. Choose a target from the latest page structure.
3. Perform one structural action: click, type, keypress, drag, scroll, navigate, or resize.
4. Capture a fresh snapshot or screenshot.
5. Verify the expected state change.
6. Save before and after artifacts when the user asked for proof.

## CDP capabilities

Use raw CDP when higher-level browser APIs fall short:

- Performance: CPU profiles, traces, paint flashing, FPS meter, layout shift inspection.
- Memory: heap snapshots and forced GC for leak investigations.
- Network: request blocking, throttling, cache disablement, request and response logs.
- Rendering: viewport changes, color scheme emulation, reduced motion, accessibility checks.
- Debugging: console streaming, exception capture, DOM snapshots.

## Page selection

When several app windows or tabs share a debug port:

- Match a positive marker for the surface under test, such as an app root selector.
- Add a negative marker to exclude the wrong surface when needed.
- When no page matches, list the available page titles and URLs and choose from them.

## Guardrails

- Re-query elements after navigation or structural changes.
- Click by coordinates only right after a fresh screenshot.
- Keep test data local and disposable.
- Ask before saving screenshots or heap snapshots from privacy-sensitive workspaces.
- Discover selectors, ports, and script paths from the current repo.
- Stop dev servers, debug sessions, and temporary profiles when done.
