import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	checkProse,
	formatHit,
	parseCatalog,
	readCatalog,
} from "./prose-check.ts";

const script = fileURLToPath(new URL("./prose-check.ts", import.meta.url));
const words = Array.from({ length: 26 }, (_, index) => `word${index}`).join(
	" ",
);

const cases = [
	{
		rule: "sentence-length",
		bad: `${words}.`,
		fixed: `${words.replace("word13 word14", "word13. Word14")}.`,
	},
	{
		rule: "paragraph-length",
		bad: "One. Two. Three. Four. Five. Six. Seven.",
		fixed: "One. Two. Three.\n\nFour. Five. Six. Seven.",
	},
	{
		rule: "semicolon",
		bad: "Read it; then save it.",
		fixed: "Read it. Then save it.",
	},
	{
		rule: "dash",
		bad: "Read it\u2014then save it.",
		fixed: "Read it. Then save it.",
	},
	{
		rule: "dash",
		bad: "Read it\u2013then save it.",
		fixed: "Read it. Then save it.",
	},
	{
		rule: "passive",
		bad: "The draft was written by Sam.",
		fixed: "Sam wrote the draft.",
	},
	{
		rule: "stock-phrase",
		bad: "Utilize the tool in order to delve into logs.",
		fixed: "Use the tool to read logs.",
	},
];

for (const { rule, bad, fixed } of cases) {
	test(`${rule} flags the sample and accepts its revision`, () => {
		assert.ok(checkProse(bad).some((hit) => hit.rule === rule));
		assert.deepEqual(checkProse(fixed), []);
	});
}

test("length limits accept exactly 25 words and six sentences", () => {
	assert.deepEqual(
		checkProse(`${words.split(" ").slice(0, 25).join(" ")}.`),
		[],
	);
	assert.deepEqual(checkProse("One. Two. Three. Four. Five. Six."), []);
});

test("wrapped prose counts as one paragraph and one sentence", () => {
	assert.equal(
		checkProse(`${words.replace("word13 ", "word13\n")}.`)[0]?.rule,
		"sentence-length",
	);
	assert.equal(
		checkProse("One. Two.\nThree. Four.\nFive. Six. Seven.")[0]?.rule,
		"paragraph-length",
	);
});

test("separate Markdown list items are separate paragraphs", () => {
	assert.deepEqual(
		checkProse("- One.\n- Two.\n- Three.\n- Four.\n- Five.\n- Six.\n- Seven."),
		[],
	);
	assert.deepEqual(checkProse("1. Read the draft.\n2. Save it."), []);
});

test("fenced code skips backticks, tildes, long fences, and unclosed fences", () => {
	for (const fence of ["```", "~~~", "````", "~~~~"]) {
		assert.deepEqual(
			checkProse(
				`${fence}ts\nUtilize; ${words}\u2014\n${fence}\nUse the tool.`,
			),
			[],
		);
	}
	assert.deepEqual(checkProse("```\nUtilize;\u2014"), []);
	assert.deepEqual(checkProse("````\n```\nUtilize;\n````"), []);
});

test("inline code skips delimiters of matching length and multiline spans", () => {
	assert.deepEqual(
		checkProse("Run `utilize();` and ``a `b`; robust\u2014``."),
		[],
	);
	assert.deepEqual(checkProse("Read `utilize\nrobust;` now."), []);
	assert.ok(
		checkProse("An unmatched ` leaves robust visible.").some(
			(hit) => hit.rule === "stock-phrase",
		),
	);
});

test("quotes skip straight, curly, single, double, multiline, and block quotes", () => {
	for (const quoted of [
		'"Utilize; robust\u2014"',
		"'Utilize; robust\u2014'",
		"“Utilize; robust\u2014”",
		"‘Utilize; robust\u2014’",
		'"Utilize;\nrobust\u2014"',
		"> Utilize; robust\u2014\n> More; robust",
	]) {
		assert.deepEqual(checkProse(quoted), []);
	}
});

test("apostrophes in contractions leave prose visible", () => {
	assert.equal(
		checkProse("It's robust and doesn't use logs.")[0]?.rule,
		"stock-phrase",
	);
	assert.equal(checkProse("You're absolutely right!")[0]?.rule, "stock-phrase");
});

test("quoted contractions, escaped quotes, and nested quotations remain ignored", () => {
	assert.deepEqual(checkProse("'It's robust; don't utilize it.'"), []);
	assert.deepEqual(checkProse('"A \\"robust\\" tool; utilize it."'), []);
	assert.deepEqual(checkProse("“It’s 'robust'; utilize it.”"), []);
});

test("block quotes include lazy continuation lines and stop at a new block", () => {
	assert.deepEqual(checkProse("> Utilize;\nrobust;\n\nRead the draft."), []);
	assert.ok(
		checkProse("> Utilize;\n# Robust").some(
			(hit) => hit.rule === "stock-phrase",
		),
	);
});

test("frontmatter and link destinations are skipped but link labels are checked", () => {
	assert.deepEqual(
		checkProse(
			'---\nname: robust\ndescription: "Utilize;"\n---\nRead [the docs](https://example.com/robust).',
		),
		[],
	);
	assert.equal(
		checkProse("Read [robust docs](https://example.com).")[0]?.rule,
		"stock-phrase",
	);
});

test("an opening horizontal rule leaves the following prose visible", () => {
	assert.ok(
		checkProse("---\nRobust;").some((hit) => hit.rule === "stock-phrase"),
	);
});

test("catalog parser reads examples and excludes labels and suggested replacements", () => {
	const catalog = parseCatalog(
		[
			"- **Stock AI words.** Novelword, secondword. Use the plain word.",
			"- **Hype words** such as flashword, or showword. Say what changes.",
			'- **Filler phrases.** "Please note this" becomes "read". "Ignore that" becomes "go".',
			'- **Staged run-ups**, such as "Start here!" or "Pause...". Start with the point.',
			'- **Stacked hedges** such as "might perhaps maybe". Use one hedge, such as "may".',
		].join("\n"),
	);
	assert.deepEqual(catalog, [
		{ phrase: "novelword", strength: "strong" },
		{ phrase: "secondword", strength: "strong" },
		{ phrase: "flashword", strength: "strong" },
		{ phrase: "showword", strength: "strong" },
		{ phrase: "please note this", strength: "strong" },
		{ phrase: "ignore that", strength: "strong" },
		{ phrase: "start here", strength: "strong" },
		{ phrase: "pause", strength: "strong" },
		{ phrase: "might perhaps maybe", strength: "weak" },
	]);
	assert.ok(
		checkProse("Novelword.", catalog).some(
			(hit) => hit.rule === "stock-phrase",
		),
	);
	assert.deepEqual(checkProse("Read and go. Use may.", catalog), []);
});

test("live catalog supplies stock words, phrases, placeholders, and strength", () => {
	const catalog = readCatalog();
	for (const phrase of [
		"delve",
		"pivotal",
		"seamless",
		"elevate",
		"flywheel",
		"utilize",
		"in order to",
		"not just",
		"refers to",
		"at its core",
		"let me know if",
		"[insert date]",
		"example.com",
		"api surface",
	]) {
		assert.ok(
			catalog.some((entry) => entry.phrase === phrase),
			`Missing ${phrase}`,
		);
	}
	for (const phrase of [
		"use",
		"help",
		"many",
		"base",
		"read",
		"plain word",
		"stock ai words",
	]) {
		assert.ok(
			!catalog.some((entry) => entry.phrase === phrase),
			`Incorrect example ${phrase}`,
		);
	}
	assert.equal(
		catalog.find((entry) => entry.phrase === "could potentially possibly")
			?.strength,
		"weak",
	);
});

test("stock phrases ignore case, match across wrapped lines, and respect word boundaries", () => {
	assert.equal(checkProse("IN ORDER\nTO read logs.")[0]?.rule, "stock-phrase");
	assert.deepEqual(checkProse("The delver returned a wellknown answer."), []);
	assert.equal(
		checkProse("Delve. Delve.").filter((hit) => hit.rule === "stock-phrase")
			.length,
		2,
	);
});

test("passive voice is weak, including an adverb and an irregular participle", () => {
	for (const text of [
		"The draft is carefully checked.",
		"The draft has been written.",
		"The error was caught.",
	]) {
		const hits = checkProse(text);
		assert.equal(hits.length, 1);
		assert.equal(hits[0]?.strength, "weak");
		assert.equal(hits[0]?.rule, "passive");
	}
});

test("source coordinates survive ignored text, CRLF, and Unicode", () => {
	const text = '```ts\r\nrobust;\r\n```\r\n"Utilize;" 😀 robust;\r\n';
	const output = checkProse(text).map((hit) =>
		formatHit("draft.md", text, hit),
	);
	assert.deepEqual(output, [
		'draft.md:4:14 stock-phrase Replace "robust" with concrete wording.',
		"draft.md:4:20 semicolon Use a period or comma instead of a semicolon.",
	]);
});

test("CLI reads stdin and returns zero for clean and weak-only prose", () => {
	for (const input of ["Read the draft.", "The draft was written."]) {
		const result = spawnSync(process.execPath, [script, "-"], {
			input,
			encoding: "utf8",
		});
		assert.equal(result.status, 0, result.stderr);
		assert.equal(result.stderr, "");
		if (input.includes("written"))
			assert.match(result.stdout, /^-:1:11 passive Weak\./);
		else assert.equal(result.stdout, "");
	}
});

test("CLI fails strong hits and prints one line per hit", () => {
	const result = spawnSync(process.execPath, [script, "-"], {
		input: "Utilize;",
		encoding: "utf8",
	});
	assert.equal(result.status, 1);
	assert.equal(result.stderr, "");
	assert.equal(
		result.stdout,
		'-:1:1 stock-phrase Replace "utilize" with concrete wording.\n-:1:8 semicolon Use a period or comma instead of a semicolon.\n',
	);
});

test("CLI reads a file and preserves its path in diagnostics", (context) => {
	const directory = mkdtempSync(join(tmpdir(), "prose-check-test-"));
	context.after(() => rmSync(directory, { recursive: true, force: true }));
	const path = join(directory, "draft.md");
	writeFileSync(path, "Read it; save it.\n");
	const result = spawnSync(process.execPath, [script, path], {
		encoding: "utf8",
	});
	assert.equal(result.status, 1, result.stderr);
	assert.equal(
		result.stdout,
		`${path}:1:8 semicolon Use a period or comma instead of a semicolon.\n`,
	);
});

test("CLI reports usage and read errors with exit two", () => {
	for (const args of [[], ["-", "extra"], ["/no-such-prose-linter-file"]]) {
		const result = spawnSync(process.execPath, [script, ...args], {
			encoding: "utf8",
		});
		assert.equal(result.status, 2);
		assert.equal(result.stdout, "");
		assert.ok(result.stderr.trim());
	}
});
