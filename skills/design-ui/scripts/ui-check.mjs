// Usage: node ui-check.mjs <url> [out-dir] [widths=375,768,1280]
// Resolves Playwright from the current project first, then from global installs.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const [url, outDir = "ui-check", widthArg = "375,768,1280"] = process.argv.slice(2);
if (!url) {
  console.error("usage: node ui-check.mjs <url> [out-dir] [widths]");
  process.exit(2);
}

function loadPlaywright() {
  const roots = [join(process.cwd(), "noop.js")];
  try {
    roots.push(join(execSync("npm root -g", { encoding: "utf8" }).trim(), "noop.js"));
  } catch {}
  for (const root of roots) {
    try {
      return createRequire(root)("playwright");
    } catch {}
  }
  console.error("Playwright not found in this project or globally. Use the control-ui skill's harness instead.");
  process.exit(2);
}

function audit() {
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const background = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.length === 3 || (c.length === 4 && c[3] === 1)) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.opacity !== "0";
  };
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.id || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);

  const smallTargets = [...document.querySelectorAll("button, a[href], input, select, textarea, [role=button]")]
    .filter(visible)
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < 44 || r.height < 44;
    })
    .map(name);

  const textEls = [...document.querySelectorAll("body *")].filter(
    (el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
  );
  const lowContrast = [];
  const clipped = [];
  for (const el of textEls) {
    const s = getComputedStyle(el);
    if (el.closest("[disabled], [aria-disabled=true]")) continue;
    const fg = parse(s.color);
    const [a, b] = [lum(fg.slice(0, 3)), lum(background(el))].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) lowContrast.push(`${name(el)} (${ratio.toFixed(2)}:1)`);
    if (s.overflow !== "visible" && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 1) clipped.push(name(el));
  }

  return {
    horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
    smallTargets,
    lowContrast,
    clipped,
  };
}

const { chromium } = loadPlaywright();
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const report = {};
let failures = 0;
for (const width of widthArg.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(outDir, `${width}.png`), fullPage: true });
  const result = { ...(await page.evaluate(audit)), errors };
  failures += Number(result.horizontalScroll) + result.smallTargets.length + result.lowContrast.length + result.clipped.length + errors.length;
  report[width] = result;
  await page.close();
}
await browser.close();
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(failures ? `${failures} problem(s). Screenshots in ${outDir}.` : `No problems. Screenshots in ${outDir}.`);
process.exit(failures ? 1 : 0);
