import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const bin = resolve(import.meta.dir, "../../skills/cstack-mode/scripts/watch-pr/watch-pr");
const fakeGh = resolve(import.meta.dir, "../support/fake-gh.ts");
const repo = ["--owner", "owner", "--repo", "repo"];
const head = "| PR | CI | Review | Merge |\n| --- | --- | --- | --- |\n";

type Responses = Record<string, { readonly json?: unknown; readonly stdout?: string; readonly stderr?: string; readonly code?: number }>;

interface BinaryRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly gh: readonly (readonly string[])[];
}

function runWatchPr(
  args: readonly string[],
  options: { readonly responses?: Responses; readonly emptyPath?: boolean; readonly origin?: string } = {}
): BinaryRun {
  const directory = mkdtempSync(join(tmpdir(), "watch-pr seam "));
  try {
    const bins = join(directory, "bin");
    const work = join(directory, "work");
    const empty = join(directory, "empty");
    for (const path of [bins, work, empty]) mkdirSync(path);
    const gh = join(bins, "gh");
    writeFileSync(gh, `#!/bin/sh\nexec '${process.execPath}' '${fakeGh}' "$@"\n`);
    chmodSync(gh, 0o755);
    const log = join(directory, "gh.log");
    const responses = join(directory, "responses.json");
    writeFileSync(log, "");
    writeFileSync(responses, JSON.stringify(options.responses ?? {}));
    const env = {
      ...process.env,
      PATH: options.emptyPath ? empty : `${bins}:${process.env.PATH ?? ""}`,
      FAKE_GH_LOG: log,
      FAKE_GH_RESPONSES: responses,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    };
    if (options.origin !== undefined) {
      for (const git of [["init", "-q"], ["remote", "add", "origin", options.origin]]) {
        const result = spawnSync("git", git, { cwd: work, env, encoding: "utf8" });
        if (result.status !== 0) throw new Error(`fixture git ${git[0]} failed\n${result.stderr}`);
      }
    }
    const result = spawnSync(process.execPath, [bin, ...args], {
      cwd: work,
      env,
      encoding: "utf8",
      timeout: 20_000,
    });
    return {
      status: result.status,
      stdout: result.stdout.replace(/"observedAt":"[^"]+"/g, '"observedAt":"<time>"'),
      stderr: result.stderr,
      gh: readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as string[]),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const graphql = (pullRequest: unknown) => ({ data: { repository: { pullRequest } } });

function pullRequest(number: number, facts: Record<string, unknown> = {}): Responses {
  return {
    [`pr view ${number}`]: {
      json: {
        mergeable: "MERGEABLE",
        mergeStateStatus: "CLEAN",
        reviewDecision: "APPROVED",
        headRefOid: "head",
        headRefName: "feature",
        baseRefName: "main",
        state: "OPEN",
        mergedAt: null,
        isDraft: false,
        ...facts,
      },
    },
    [`pr checks ${number}`]: {
      json: [{ name: "ci", state: "SUCCESS", description: "", link: "", workflow: "CI", bucket: "pass" }],
    },
    [`ReviewThreads ${number}`]: { json: graphql({ reviewThreads: { nodes: [] } }) },
    [`PrCommitStatuses ${number}`]: {
      json: graphql({ commits: { nodes: [{ commit: { oid: "head", statusCheckRollup: { state: "SUCCESS" } } }] } }),
    },
  };
}

const rollup = (nodes: readonly unknown[], endCursor: string | null = null) => ({
  json: graphql({
    commits: {
      nodes: [
        {
          commit: {
            statusCheckRollup: {
              contexts: { pageInfo: { hasNextPage: endCursor !== null, endCursor }, nodes },
            },
          },
        },
      ],
    },
  }),
});

interface StatusRow {
  readonly ci: {
    readonly source: string;
    readonly all: readonly { readonly name: string; readonly kind: string; readonly reportedState: string; readonly link: string }[];
  };
}

function statusRow(stdout: string): StatusRow {
  return (JSON.parse(stdout) as { readonly rows: readonly [StatusRow] }).rows[0];
}

describe("watch-pr binary", () => {
  it("reports a missing gh as a status-query blocker that does not retry", () => {
    const run = runWatchPr([], { emptyPath: true });
    expect(run.stdout).toBe(
      '{"schemaVersion":1,"sequence":1,"observedAt":"<time>","mode":"single","kind":"BLOCKER","terminal":true,"exitCode":7,"blocker":{"kind":"status-query","failures":1,"failure":{"kind":"command-spawn","retryable":false,"detail":"gh not found on PATH"}}}\n'
    );
    expect(run.status).toBe(7);
  });

  it("maps check-run states from the GraphQL rollup and fails closed on unknown conclusions", () => {
    const run = runWatchPr([...repo, "--pr", "42", "--status-only"], {
      responses: {
        ...pullRequest(42),
        "pr checks 42": { code: 8, stderr: "no checks reported" },
        "PrCheckRollup 42": rollup(
          [
            ["in-progress", "IN_PROGRESS", null],
            ["success", "COMPLETED", "SUCCESS"],
            ["neutral", "COMPLETED", "NEUTRAL"],
            ["skipped", "COMPLETED", "SKIPPED"],
            ["action-required", "COMPLETED", "ACTION_REQUIRED"],
            ["timed-out", "COMPLETED", "TIMED_OUT"],
            ["future", "COMPLETED", "FUTURE_VALUE"],
          ].map(([name, status, conclusion]) => ({
            __typename: "CheckRun",
            name,
            status,
            conclusion,
            detailsUrl: `https://ci.example/${name}`,
          }))
        ),
      },
    });
    expect(run.status).toBe(0);
    const row = statusRow(run.stdout);
    expect(row.ci.source).toBe("graphql-rollup");
    expect(row.ci.all.map((check) => [check.name, check.kind, check.reportedState, check.link])).toEqual([
      ["in-progress", "pending", "PENDING", "https://ci.example/in-progress"],
      ["success", "passed", "SUCCESS", "https://ci.example/success"],
      ["neutral", "skipped", "NEUTRAL", "https://ci.example/neutral"],
      ["skipped", "skipped", "SKIPPED", "https://ci.example/skipped"],
      ["action-required", "failed", "ACTION_REQUIRED", "https://ci.example/action-required"],
      ["timed-out", "failed", "FAILURE", "https://ci.example/timed-out"],
      ["future", "failed", "FAILURE", "https://ci.example/future"],
    ]);
  });

  it("maps status contexts across rollup pages, drops unknown nodes, and keeps the review gate out of pending", () => {
    const run = runWatchPr([...repo, "--pr", "42", "--status-only"], {
      responses: {
        ...pullRequest(42),
        "pr checks 42": { code: 8 },
        "PrCheckRollup 42": rollup(
          [
            { __typename: "StatusContext", context: "expected", state: "EXPECTED", targetUrl: "https://ci.example/expected" },
            { __typename: "StatusContext", context: "future", state: "FUTURE_VALUE", targetUrl: null },
            { __typename: "FutureNode" },
          ],
          "page-2"
        ),
        "PrCheckRollup 42 after=page-2": rollup([
          { __typename: "StatusContext", context: "Code Review Gate", state: "PENDING", targetUrl: null },
          { __typename: "CheckRun", name: "Code Review Gate", status: "IN_PROGRESS", conclusion: null },
        ]),
      },
    });
    expect(run.status).toBe(0);
    expect(statusRow(run.stdout).ci.all.map((check) => [check.name, check.kind, check.reportedState, check.link])).toEqual([
      ["expected", "pending", "PENDING", "https://ci.example/expected"],
      ["future", "failed", "FUTURE_VALUE", ""],
      ["Code Review Gate", "code-review-gate", "PENDING", ""],
      ["Code Review Gate", "code-review-gate", "PENDING", ""],
    ]);
  });

  it("blocks on mergeStateStatus CONFLICTING", () => {
    const run = runWatchPr([...repo, "--pr", "42", "--pretty"], {
      responses: pullRequest(42, { mergeStateStatus: "CONFLICTING" }),
    });
    expect(run.stdout).toBe(
      "BLOCKER: merge-conflicts\npr=42\nmergeable=MERGEABLE\nmergeStateStatus=CONFLICTING\naction=resolve merge conflicts before waiting for CI\n"
    );
    expect(run.status).toBe(2);
  });

  it("reads gh's empty reviewDecision as no decision", () => {
    const run = runWatchPr([...repo, "--pr", "42", "--pretty"], {
      responses: pullRequest(42, { reviewDecision: "" }),
    });
    expect(run.stdout).toBe(
      "READY: no merge conflicts, no unresolved review threads, no failing or pending checks\nmergeStateStatus=CLEAN\nreviewDecision=null\nisDraft=false\n"
    );
    expect(run.status).toBe(0);
  });

  it.each([
    ["reviewDecision", "MAYBE"],
    ["mergeStateStatus", "FUTURE_STATE"],
  ])("rejects an unknown %s as a retryable failure carrying the raw value", (field, value) => {
    const run = runWatchPr([...repo, "--pr", "42", "--max-query-errors", "1"], {
      responses: pullRequest(42, { [field]: value }),
    });
    expect(run.stdout).toBe(
      `{"schemaVersion":1,"sequence":1,"observedAt":"<time>","mode":"single","kind":"BLOCKER","terminal":true,"exitCode":7,"blocker":{"kind":"status-query","failures":1,"failure":{"kind":"missing-key","retryable":true,"detail":"invalid pull request.${field}: \\"${value}\\"","rawValue":"\\"${value}\\""}}}\n`
    );
    expect(run.status).toBe(7);
  });

  it("lists unresolved review threads with Bugbot pass counts from every thread", () => {
    const thread = (id: string, isResolved: boolean, body: string, login: string, path: string | null, line: number | null) => ({
      id,
      isResolved,
      comments: { nodes: [{ body, createdAt: "2026-07-25T12:00:00Z", path, line, author: { login } }] },
    });
    const run = runWatchPr([...repo, "--pr", "42", "--pretty"], {
      responses: {
        ...pullRequest(42),
        "ReviewThreads 42": {
          json: graphql({
            reviewThreads: {
              nodes: [
                thread("one", false, "RUN_ID: run-1\nsecond line", "bugbot", "a.ts", 1),
                thread("two", false, "CURSOR_AUTOMATION_ID: run-2 severity high", "cursor", null, null),
                thread("three", true, "RUN_ID: run-3", "bugbot", null, null),
                thread("four", false, "Please rename this.", "reviewer", "b.ts", 9),
              ],
            },
          }),
        },
      },
    });
    expect(run.stdout).toBe(
      "BLOCKER: review-threads\npr=42\nunresolved=3\none a.ts 1 bugbot isBugBot=true bugbotReviewPasses=3 RUN_ID: run-1\ntwo None None cursor isBugBot=true bugbotReviewPasses=3 CURSOR_AUTOMATION_ID: run-2 severity high\nfour b.ts 9 reviewer isBugBot=false bugbotReviewPasses=3 Please rename this.\n"
    );
    expect(run.status).toBe(3);
  });

  it.each([
    ["git@github.com:local/checkout.git", "local/checkout"],
    ["ssh://git@github.com/local/checkout.git", "local/checkout"],
    ["https://github.com/local/checkout", "local/checkout"],
    ["https://gitlab.com/local/checkout.git", "inferred/remote"],
  ])("resolves the repository for --pr from origin %s as %s", (origin, slug) => {
    const run = runWatchPr(["--pr", "42", "--status-only", "--pretty"], {
      origin,
      responses: {
        ...pullRequest(42),
        "pr current 42": { json: { number: 42, url: "https://github.com/inferred/remote/pull/42" } },
      },
    });
    expect(run.stdout).toBe(`${head}| [#42](https://github.com/${slug}/pull/42) | ✅ | ✅ | ✅ |\n`);
    expect(run.status).toBe(0);
    expect(run.gh.find((call) => call[1] === "view" && call.includes("--repo"))?.slice(0, 5)).toEqual([
      "pr",
      "view",
      "42",
      "--repo",
      slug,
    ]);
  });

  it("refuses a current-PR URL outside github.com without retrying", () => {
    const run = runWatchPr(["--max-query-errors", "1"], {
      responses: { "pr current": { json: { number: 7, url: "https://example.com/inferred/remote/pull/7" } } },
    });
    expect(run.stdout).toBe(
      '{"schemaVersion":1,"sequence":1,"observedAt":"<time>","mode":"single","kind":"BLOCKER","terminal":true,"exitCode":7,"blocker":{"kind":"status-query","failures":1,"failure":{"kind":"invalid-context-url","retryable":false,"rawValue":"https://example.com/inferred/remote/pull/7","detail":"could not infer owner/repo from PR URL: https://example.com/inferred/remote/pull/7 (not a canonical GitHub pull URL)"}}}\n'
    );
    expect(run.status).toBe(7);
  });
});
