import { readFileSync } from "node:fs";

type Strength = "strong" | "weak";
type Rule =
	| "sentence-length"
	| "paragraph-length"
	| "semicolon"
	| "dash"
	| "passive"
	| "stock-phrase";
type CatalogEntry = { phrase: string; strength: Strength };
export type Hit = {
	offset: number;
	rule: Rule;
	strength: Strength;
	message: string;
};

function firstSentence(text: string): string {
	let quoted = false;
	for (let index = 0; index < text.length; index++) {
		if (text[index] === '"') quoted = !quoted;
		if (!quoted && text[index] === "." && /\s|$/.test(text[index + 1] ?? "")) {
			return text.slice(0, index);
		}
	}
	return text;
}

export function parseCatalog(text: string): CatalogEntry[] {
	const entries = new Map<string, CatalogEntry>();
	for (const entry of text.matchAll(/^- \*\*(.*?)\*\*(.*)$/gm)) {
		const [, label = "", body = ""] = entry;
		if (label === "Passive voice") continue;
		const strength = label === "Stacked hedges" ? "weak" : "strong";
		let examples: string[];
		if (
			label === "Stock AI words." ||
			label === "Hype words" ||
			label === "Abstract metaphor nouns"
		) {
			const list = firstSentence(body.replace(/^.*?such as /, ""));
			examples = list.split(/,\s*|\s+or\s+/).map((item) => {
				const quoted = /"([^"]+)"/.exec(item);
				return (
					quoted?.[1] ?? item.replace(/^or\s+/, "").replace(/\s+as\s+.*$/, "")
				);
			});
		} else if (/\bbecomes?\b/.test(body)) {
			examples = body.split(/\.\s+/).flatMap((sentence) => {
				const beforeFix = sentence.split(/\bbecomes?\b/)[0] ?? "";
				return [...beforeFix.matchAll(/"([^"]+)"/g)].map(
					(match) => match[1] ?? "",
				);
			});
		} else {
			examples = [...firstSentence(body).matchAll(/"([^"]+)"/g)].map(
				(match) => match[1] ?? "",
			);
		}
		if (label === '"Refers to" leads') examples.push("Refers to");
		if (label === "Contrast framing")
			examples = examples.map((example) => example.split(/\s+X\b/)[0] ?? "");
		for (const example of examples) {
			const phrase = example
				.trim()
				.replace(/[*!.,:?]+$/g, "")
				.toLowerCase();
			if (!phrase || /\b[XY]\b/.test(example) || /[`*]/.test(phrase)) continue;
			entries.set(phrase, { phrase, strength });
		}
	}
	return [...entries.values()];
}

const catalogPath = new URL("../ai-tells.md", import.meta.url);

export function readCatalog(): CatalogEntry[] {
	const entries = parseCatalog(readFileSync(catalogPath, "utf8"));
	if (entries.length === 0) throw new Error("No examples found in ai-tells.md");
	return entries;
}

function mask(text: string): string {
	return text.replace(/[^\r\n]/g, " ");
}

function maskQuotes(text: string): string {
	const delimiters = new Map([
		['"', '"'],
		["'", "'"],
		["“", "”"],
		["‘", "’"],
	]);
	const isLetter = (character: string) => /[\p{L}\p{N}]/u.test(character);
	const isEscaped = (index: number) => {
		let slashes = 0;
		for (let before = index - 1; text[before] === "\\"; before--) slashes++;
		return slashes % 2 === 1;
	};
	let start = 0;
	const parts: string[] = [];
	for (let index = 0; index < text.length; index++) {
		const opening = text[index] ?? "";
		const closing = delimiters.get(opening);
		if (
			!closing ||
			isEscaped(index) ||
			(opening === "'" && isLetter(text[index - 1] ?? ""))
		)
			continue;
		for (
			let end = text.indexOf(closing, index + 1);
			end >= 0;
			end = text.indexOf(closing, end + 1)
		) {
			if (
				isEscaped(end) ||
				(closing === "'" &&
					isLetter(text[end - 1] ?? "") &&
					isLetter(text[end + 1] ?? ""))
			)
				continue;
			parts.push(text.slice(start, index), mask(text.slice(index, end + 1)));
			start = end + 1;
			index = end;
			break;
		}
	}
	return parts.join("") + text.slice(start);
}

function proseOnly(text: string): string {
	let block:
		| { kind: "prose" }
		| { kind: "quote" }
		| { kind: "fence"; marker: string; length: number } = { kind: "prose" };
	let prose = text.replace(/^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/, mask);
	prose = prose.replace(/^.*(?:\r?\n|$)/gm, (line) => {
		const marker = /^ {0,3}(`{3,}|~{3,})(.*)/.exec(line);
		if (block.kind === "fence") {
			if (
				marker?.[1]?.[0] === block.marker &&
				marker[1].length >= block.length &&
				!marker[2]?.trim()
			) {
				block = { kind: "prose" };
			}
			return mask(line);
		}
		if (block.kind === "quote") {
			if (
				!line.trim() ||
				/^ {0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|`{3,}|~{3,})/.test(line)
			) {
				block = { kind: "prose" };
			} else return mask(line);
		}
		if (marker?.[1]) {
			block = {
				kind: "fence",
				marker: marker[1][0] ?? "",
				length: marker[1].length,
			};
			return mask(line);
		}
		if (/^\s*>/.test(line)) {
			block = { kind: "quote" };
			return mask(line);
		}
		return line;
	});

	const backticks = /`+/g;
	for (
		let opening = backticks.exec(prose);
		opening;
		opening = backticks.exec(prose)
	) {
		const start = opening.index;
		const closingTicks = /`+/g;
		closingTicks.lastIndex = backticks.lastIndex;
		for (
			let closing = closingTicks.exec(prose);
			closing;
			closing = closingTicks.exec(prose)
		) {
			if (closing[0].length !== opening[0].length) continue;
			const end = closing.index + closing[0].length;
			prose =
				prose.slice(0, start) +
				mask(prose.slice(start, end)) +
				prose.slice(end);
			backticks.lastIndex = end;
			break;
		}
	}

	prose = prose.replace(/!?\[[^\]\n]*\]\([^\n)]*\)/g, (link) => {
		if (link.startsWith("!")) return mask(link);
		const destination = link.indexOf("](") + 1;
		return link.slice(0, destination) + mask(link.slice(destination));
	});
	return maskQuotes(prose);
}

function paragraphs(text: string): { text: string; offset: number }[] {
	const blocks: { text: string; offset: number }[] = [];
	let start = 0;
	let block = "";
	const flush = () => {
		if (block.trim()) blocks.push({ text: block, offset: start });
		block = "";
	};
	for (const match of text.matchAll(/^.*(?:\r?\n|$)/gm)) {
		const line = match[0];
		const boundary = /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)/.test(line);
		if (!line.trim() || boundary) flush();
		if (!line.trim()) continue;
		if (!block) start = match.index;
		block += line.replace(/^(\s*)(?:#{1,6}\s|[-*+]\s|\d+[.)]\s)/, mask);
		if (/^\s*(?:#|\|)/.test(line)) flush();
	}
	flush();
	return blocks;
}

function escaped(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkProse(text: string, catalog = readCatalog()): Hit[] {
	const prose = proseOnly(text);
	const hits: Hit[] = [];
	for (const match of prose.matchAll(/[;\u2013\u2014]/g)) {
		const semicolon = match[0] === ";";
		hits.push({
			offset: match.index,
			rule: semicolon ? "semicolon" : "dash",
			strength: "strong",
			message: semicolon
				? "Use a period or comma instead of a semicolon."
				: "Use a period or comma instead of a dash.",
		});
	}
	const passive =
		/\b(?:am|is|are|was|were|be|been|being)\s+(?:[a-z]+ly\s+)?(?:[a-z]+ed|built|done|made|given|taken|written|run|sent|shown|kept|set|put|found|known|seen|read|told|held|left|lost|brought|bought|caught|chosen|drawn|driven|eaten|felt|forgotten|heard|met|paid|sold|spoken|taught|thought|won|worn)\b/gi;
	for (const match of prose.matchAll(passive)) {
		hits.push({
			offset: match.index,
			rule: "passive",
			strength: "weak",
			message: `Weak. Possible passive voice in ${JSON.stringify(match[0])}. Name the actor when it matters.`,
		});
	}
	for (const { phrase, strength } of catalog) {
		const pattern = new RegExp(
			`(?<![\\p{L}\\p{N}_])${escaped(phrase).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}_])`,
			"giu",
		);
		for (const match of prose.matchAll(pattern)) {
			hits.push({
				offset: match.index,
				rule: "stock-phrase",
				strength,
				message: `${strength === "weak" ? "Weak. " : ""}Replace ${JSON.stringify(phrase)} with concrete wording.`,
			});
		}
	}
	const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
	for (const paragraph of paragraphs(prose)) {
		const sentences = [
			...segmenter.segment(paragraph.text.replace(/[\r\n]/g, " ")),
		].filter(({ segment }) => /[\p{L}\p{N}]/u.test(segment));
		if (sentences.length > 6) {
			hits.push({
				offset: paragraph.offset + paragraph.text.search(/\S/),
				rule: "paragraph-length",
				strength: "strong",
				message: `Paragraph has ${sentences.length} sentences (limit 6). Split it.`,
			});
		}
		for (const sentence of sentences) {
			const words =
				sentence.segment.match(/[\p{L}\p{N}]+(?:['’/-][\p{L}\p{N}]+)*/gu) ?? [];
			if (words.length <= 25) continue;
			hits.push({
				offset:
					paragraph.offset + sentence.index + sentence.segment.search(/\S/),
				rule: "sentence-length",
				strength: "strong",
				message: `Sentence has ${words.length} words (limit 25). Split it.`,
			});
		}
	}
	return hits.sort(
		(left, right) =>
			left.offset - right.offset || left.rule.localeCompare(right.rule),
	);
}

export function formatHit(path: string, text: string, hit: Hit): string {
	const prefix = text.slice(0, hit.offset);
	const line = prefix.split("\n").length;
	const column = [...prefix.slice(prefix.lastIndexOf("\n") + 1)].length + 1;
	return `${path}:${line}:${column} ${hit.rule} ${hit.message}`;
}

if (import.meta.main) {
	const [path, ...extra] = process.argv.slice(2);
	if (!path || extra.length > 0) {
		process.stderr.write("Usage: node prose-check.ts <file|->\n");
		process.exitCode = 2;
	} else {
		try {
			const text = readFileSync(path === "-" ? 0 : path, "utf8");
			const hits = checkProse(text);
			for (const hit of hits)
				process.stdout.write(`${formatHit(path, text, hit)}\n`);
			process.exitCode = hits.some((hit) => hit.strength === "strong") ? 1 : 0;
		} catch (error) {
			process.stderr.write(
				`${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exitCode = 2;
		}
	}
}
