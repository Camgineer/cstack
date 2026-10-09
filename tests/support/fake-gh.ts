import { appendFileSync, readFileSync } from "node:fs";

interface Response {
  readonly json?: unknown;
  readonly stdout?: string;
  readonly stderr?: string;
  readonly code?: number;
}

const argv = process.argv.slice(2);
const log = process.env.FAKE_GH_LOG;
const script = process.env.FAKE_GH_RESPONSES;
if (log === undefined || script === undefined)
  throw new Error("fake gh needs FAKE_GH_LOG and FAKE_GH_RESPONSES");
appendFileSync(log, `${JSON.stringify(argv)}\n`);

function field(prefix: string): string | undefined {
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function key(): string {
  const [group, command, target] = argv;
  if (group === "api" && command === "graphql") {
    const name = /query (\w+)/.exec(field("query=") ?? "")?.[1] ?? "unknown";
    const after = field("after=");
    return `${name} ${field("pr=")}${after === undefined ? "" : ` after=${after}`}`;
  }
  const scope = group === "pr" && command === "view" && !argv.includes("--repo") ? "current" : command;
  return target === undefined || target.startsWith("--")
    ? `${group} ${scope}`
    : `${group} ${scope} ${target}`;
}

const responses = JSON.parse(readFileSync(script, "utf8")) as Record<string, Response>;
const response = responses[key()];
if (response === undefined) {
  process.stderr.write(`fake gh has no response for ${key()}\n`);
  process.exit(99);
}
process.stdout.write(response.json === undefined ? (response.stdout ?? "") : JSON.stringify(response.json));
process.stderr.write(response.stderr ?? "");
process.exit(response.code ?? 0);
