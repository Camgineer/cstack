import { describe, expect, it } from "bun:test";
import type {
  CommitRollup,
  MergeStateStatus,
  QueryFailure,
  RollupState,
} from "../../skills/cstack-mode/scripts/watch-pr/types.ts";
import {
  WatcherQueryError,
  parsePrNumber,
} from "../../skills/cstack-mode/scripts/watch-pr/types.ts";
import {
  OBSERVED_AT,
  failedCheck,
  lastEvent,
  passingCheck,
  pendingCheck,
  watch,
} from "../support/watch-pr-fakes.ts";

const repo = ["--owner", "owner", "--repo", "repo"];
const head = "| PR | CI | Review | Merge |\n| --- | --- | --- | --- |\n";
const row = (
  number: number,
  ci: string,
  review: string,
  merge: string,
  slug = "owner/repo"
): string =>
  `| [#${number}](https://github.com/${slug}/pull/${number}) | ${ci} | ${review} | ${merge} |\n`;
const pr = (number: number) => ({
  owner: "owner",
  repo: "repo",
  number: parsePrNumber(number),
});
const pending = (name = "build") => ({
  kind: "checks" as const,
  checks: [pendingCheck(name)],
});
const failing = (failure: QueryFailure) => () => {
  throw new WatcherQueryError(failure);
};
const merged = { state: "MERGED", mergedAt: "2026-07-25T12:00:00Z" } as const;
const readyText =
  "READY: no merge conflicts, no unresolved review threads, no failing or pending checks\n";
const statusAction =
  "action=verify current PR context, GitHub authentication, and API availability, then rearm\n";

describe("usage", () => {
  it.each([
    [["--unknown"], "unknown option '--unknown'"],
    [["--interval", "0"], "must be greater than zero"],
    [["--sweep-interval", "-1"], "must be greater than zero"],
    [["--timeout", "-1"], "must be zero or greater"],
    [["--max-query-errors", "1.5"], "must be a positive integer"],
    [["--pr", "abc"], "must be a positive integer"],
    [["--stack", "--queued-stack"], "cannot be used with option '--queued-stack'"],
    [["--stack-prs", "1,2"], "error: --stack-prs requires --queued-stack"],
    [["--queued-stack", "--stack-prs", "1,1"], "contains a duplicate PR"],
  ])("rejects %j with exit 64 and no output", async (argv, reason) => {
    const run = await watch(argv);
    expect(run.code).toBe(64);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain(reason);
    expect(run.calls).toEqual([]);
  });

  it("prints help with exit 0 and reads GitHub only for a real run", async () => {
    const help = await watch(["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain(
      "Usage: watch-pr [options]\n\nWatch one pull request, a connected stack, or an immutable queued stack.\nJSON (NDJSON while polling) is the default; --pretty renders human text.\n"
    );
    expect(help.calls).toEqual([]);
    const status = await watch([...repo, "--pr", "1", "--status-only"]);
    expect(status.code).toBe(0);
    expect(status.calls[0]).toBe("pullRequest owner/repo#1");
  });
});

describe("defaults", () => {
  it("polls a pending PR every 60 seconds and prints NDJSON", async () => {
    const run = await watch([...repo, "--pr", "1"], {
      prs: {
        1: { checks: (call) => (call === 1 ? pending() : { kind: "checks", checks: [passingCheck()] }) },
      },
    });
    expect(run.code).toBe(0);
    expect(run.sleeps).toEqual([60]);
    const lines = run.stdout.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      `{"schemaVersion":1,"sequence":1,"observedAt":"${OBSERVED_AT}","mode":"single","kind":"WAITING","terminal":false,"frontier":{"owner":"owner","repo":"repo","number":1},"reason":{"kind":"pending-checks","pending":[{"kind":"pending","name":"build","reportedState":"PENDING","description":"","link":"","workflow":""}]}}`
    );
    expect(JSON.parse(lines[1] ?? "")).toMatchObject({
      sequence: 2,
      mode: "single",
      kind: "READY",
      terminal: true,
      exitCode: 0,
      scope: { kind: "single", pr: { kind: "ready-pr", context: pr(1) } },
    });
  });

  it("has no deadline, so a long wait still ends READY", async () => {
    const run = await watch([...repo, "--pr", "1"], {
      prs: {
        1: { checks: (call) => (call <= 100 ? pending() : { kind: "checks", checks: [passingCheck()] }) },
      },
    });
    expect(run.code).toBe(0);
    expect(run.sleeps).toEqual(Array(100).fill(60));
    expect(lastEvent(run.stdout)).toMatchObject({ kind: "READY", sequence: 101 });
  });

  it("blocks a draft PR once its checks settle", async () => {
    const run = await watch([...repo, "--pr", "12", "--pretty"], {
      prs: {
        12: {
          facts: { isDraft: true },
          checks: (call) => (call === 1 ? pending() : { kind: "checks", checks: [passingCheck()] }),
        },
      },
    });
    expect(run.stdout).toBe(
      "WAITING: frontier=#12; 1 check pending\nBLOCKER: draft-pr\npr=12\naction=mark the PR ready for review before waiting for the merge queue\n"
    );
    expect(run.code).toBe(6);
    expect(run.sleeps).toEqual([60]);
  });

  it("gives up after five consecutive query errors with a capped backoff", async () => {
    const run = await watch([...repo, "--pr", "1", "--interval", "1", "--pretty"], {
      prs: {
        1: {
          facts: failing({ kind: "command-exit", retryable: true, detail: "HTTP 502", code: 1 }),
        },
      },
    });
    const retry = (seconds: number) =>
      `RETRY: GitHub status query failed; retrying in ${seconds}s\ndetail=HTTP 502\n`;
    expect(run.stdout).toBe(
      `${retry(60)}${retry(120)}${retry(240)}${retry(300)}BLOCKER: status-query\nfailures=5\ndetail=HTTP 502\n${statusAction}`
    );
    expect(run.code).toBe(7);
    expect(run.sleeps).toEqual([60, 120, 240, 300]);
  });

  it("whole-stack sweeps every 300 seconds and prints each wait once", async () => {
    const run = await watch(
      [...repo, "--queued-stack", "--stack-prs", "30,31", "--interval", "100", "--timeout", "300", "--pretty"]
    );
    const sweep = `${head}${row(30, "✅", "✅", "✅")}${row(31, "✅", "✅", "✅")}`;
    expect(run.stdout).toBe(
      `QUEUE: captured 2 PRs bottom-to-top: #30,#31\n${sweep}WAITING: frontier=#30 is blocker-free; waiting for merge queue (2 PRs unmerged)\n${sweep}TIMEOUT: queued stack still has 2 PRs unmerged; frontier=#30\n`
    );
    expect(run.code).toBe(5);
    expect(run.sleeps).toEqual([100, 100, 100]);
    expect(run.calls.filter((call) => call.startsWith("pullRequest"))).toEqual([
      "pullRequest owner/repo#30",
      "pullRequest owner/repo#31",
      "pullRequest owner/repo#30",
      "pullRequest owner/repo#30",
      "pullRequest owner/repo#30",
      "pullRequest owner/repo#31",
    ]);
  });
});

describe("options", () => {
  it("runs a frozen queue with custom cadence, drafts allowed, as text", async () => {
    const run = await watch(
      [
        ...repo,
        "--queued-stack",
        "--stack-prs",
        "#10, 11,#12",
        "--interval",
        "2.5",
        "--sweep-interval",
        "5",
        "--timeout",
        "5",
        "--allow-draft",
        "--pretty",
      ],
      { prs: { 10: { facts: { isDraft: true } }, 11: { facts: { isDraft: true } } } }
    );
    const sweep = `${head}${row(10, "✅", "✅", "⏸ draft")}${row(11, "✅", "✅", "⏸ draft")}${row(12, "✅", "✅", "✅")}`;
    expect(run.stdout).toBe(
      `QUEUE: captured 3 PRs bottom-to-top: #10,#11,#12\n${sweep}WAITING: frontier=#10 is blocker-free; waiting for merge queue (3 PRs unmerged)\n${sweep}TIMEOUT: queued stack still has 3 PRs unmerged; frontier=#10\n`
    );
    expect(run.code).toBe(5);
    expect(run.sleeps).toEqual([2.5, 2.5]);
  });

  it("honours --max-query-errors and reports each failure as NDJSON", async () => {
    const failure = { kind: "command-exit", retryable: true, detail: "HTTP 502", code: 1 } as const;
    const run = await watch([...repo, "--pr", "1", "--max-query-errors", "2"], {
      prs: { 1: { facts: failing(failure) } },
    });
    expect(run.stdout).toBe(
      `{"schemaVersion":1,"sequence":1,"observedAt":"${OBSERVED_AT}","mode":"single","kind":"RETRY","terminal":false,"failure":{"kind":"command-exit","retryable":true,"detail":"HTTP 502","code":1},"consecutiveFailures":1,"retryInSeconds":60}\n` +
        `{"schemaVersion":1,"sequence":2,"observedAt":"${OBSERVED_AT}","mode":"single","kind":"BLOCKER","terminal":true,"exitCode":7,"blocker":{"kind":"status-query","failures":2,"failure":{"kind":"command-exit","retryable":true,"detail":"HTTP 502","code":1}}}\n`
    );
    expect(run.code).toBe(7);
    expect(run.sleeps).toEqual([60]);
  });
});

describe("rendering", () => {
  it("prints a status-only verdict as one compact JSON line", async () => {
    const run = await watch([...repo, "--pr", "1", "--status-only"], {
      prs: { 1: { facts: merged } },
    });
    const context = '{"owner":"owner","repo":"repo","number":1}';
    expect(run.stdout).toBe(
      `{"schemaVersion":1,"sequence":1,"observedAt":"${OBSERVED_AT}","mode":"single","kind":"STATUS","terminal":true,"exitCode":0,"reason":"status-only","rows":[{"kind":"merged","context":${context},"facts":{"context":${context},"mergeable":"MERGEABLE","mergeStateStatus":"CLEAN","reviewDecision":"APPROVED","headRefOid":"head","headRefName":"feature","baseRefName":"main","state":"MERGED","mergedAt":"2026-07-25T12:00:00Z","isDraft":false}}]}\n`
    );
    expect(run.code).toBe(0);
  });

  it("renders every CI, review, and merge cell in the status table", async () => {
    const thread = (id: string) => ({
      id,
      firstComment: null,
      isBugbot: false,
      bugbotReviewPasses: 0,
    });
    const run = await watch(
      [...repo, "--queued-stack", "--stack-prs", "1,2,3,4,5,6,7,8,9", "--status-only", "--pretty"],
      {
        prs: {
          1: { facts: merged },
          2: { facts: { state: "CLOSED" } },
          3: { facts: { isDraft: true } },
          4: {
            facts: { reviewDecision: "CHANGES_REQUESTED" },
            checks: pending(),
            commits: [
              { oid: "old", state: "SUCCESS" },
              { oid: "head", state: "PENDING" },
            ],
          },
          5: {
            facts: { mergeable: "CONFLICTING" },
            checks: { kind: "checks", checks: [failedCheck("lint"), pendingCheck("test")] },
            commits: [{ oid: "head", state: "FAILURE" }],
          },
          6: {
            facts: { mergeStateStatus: "BLOCKED" },
            commits: [{ oid: "head", state: "FAILURE" }],
          },
          7: { checks: pending("Cursor Bugbot"), threads: [thread("a"), thread("b")] },
          8: { threads: [thread("c")] },
          9: { checks: pending("Security Review") },
        },
      }
    );
    expect(run.stdout).toBe(
      head +
        row(1, "—", "—", "✅ merged") +
        row(2, "—", "—", "❌ closed") +
        row(3, "✅", "✅", "⏸ draft") +
        row(4, "⏳ 1 pending, was ✅", "✅", "⚠️ changes requested") +
        row(5, "❌ 1 failed, 1 pending", "✅", "⚠️ conflict") +
        row(6, "❌ GitHub reports failing checks", "✅", "✅") +
        row(7, "⏳ 1 pending", "🤖 running, 2 open", "✅") +
        row(8, "✅", "📝 1 open", "✅") +
        row(9, "⏳ 1 pending", "🤖 running", "✅")
    );
    expect(run.code).toBe(0);
  });

  it("prints a status-only queued stack without starting the queue", async () => {
    const run = await watch(
      [...repo, "--queued-stack", "--stack-prs", "1", "--status-only", "--pretty"]
    );
    expect(run.stdout).toBe(`${head}${row(1, "✅", "✅", "✅")}`);
    expect(run.code).toBe(0);
    expect(run.sleeps).toEqual([]);
  });
});

describe("GitHub merge assessment", () => {
  it.each<[MergeStateStatus, RollupState, number, object]>([
    ["BLOCKED", "FAILURE", 4, { kind: "refused" }],
    ["BLOCKED", "ERROR", 4, { kind: "refused" }],
    ["BLOCKED", "PENDING", 0, { kind: "allowed", basis: "rollup" }],
    ["UNSTABLE", "FAILURE", 0, { kind: "allowed", basis: "merge-state" }],
    ["UNKNOWN", "ERROR", 0, { kind: "allowed", basis: "merge-state" }],
    ["UNKNOWN", "EXPECTED", 0, { kind: "allowed", basis: "merge-state" }],
    ["UNKNOWN", "FAILURE", 0, { kind: "allowed", basis: "merge-state" }],
    ["UNKNOWN", "PENDING", 0, { kind: "allowed", basis: "merge-state" }],
    ["UNKNOWN", "SUCCESS", 0, { kind: "allowed", basis: "merge-state" }],
    ["UNKNOWN", null, 0, { kind: "allowed", basis: "merge-state" }],
    ["CLEAN", "SUCCESS", 0, { kind: "allowed", basis: "merge-state" }],
  ])("%s with head rollup %s exits %d", async (mergeStateStatus, headRollupState, code, verdict) => {
    const commits: readonly CommitRollup[] = [{ oid: "head", state: headRollupState }];
    const run = await watch([...repo, "--pr", "1"], {
      prs: { 1: { facts: { mergeStateStatus }, commits } },
    });
    expect(run.code).toBe(code);
    const event = lastEvent(run.stdout) as {
      readonly scope?: { readonly pr: { readonly proof: { readonly ci: { readonly github: unknown } } } };
      readonly blocker?: { readonly ci: { readonly github: unknown } };
    };
    expect(event.scope?.pr.proof.ci.github ?? event.blocker?.ci.github).toEqual({
      ...verdict,
      mergeStateStatus,
      headRollupState,
    });
  });

  it("reports a GitHub refusal behind a clean check list as failing checks", async () => {
    const run = await watch([...repo, "--pr", "1", "--pretty"], {
      prs: {
        1: {
          facts: { mergeStateStatus: "BLOCKED" },
          commits: [{ oid: "head", state: "FAILURE" }],
        },
      },
    });
    expect(run.stdout).toBe(
      "BLOCKER: failing-checks\npr=1\nfailed=0\nmergeStateStatus=BLOCKED\nheadRollupState=FAILURE\n"
    );
    expect(run.code).toBe(4);
  });
});

describe("check reads", () => {
  it("falls back to paginated GraphQL only when the fast path has no checks", async () => {
    const run = await watch(
      [...repo, "--queued-stack", "--stack-prs", "1,2,3", "--status-only"],
      {
        prs: {
          1: { checks: { kind: "checks", checks: [passingCheck("fast")] } },
          2: {
            checks: { kind: "unusable", exitCode: 8, stderr: "" },
            rollupPages: [
              { checks: [passingCheck("first")], endCursor: "next" },
              { checks: [failedCheck("second")], endCursor: null },
            ],
          },
          3: {
            checks: { kind: "checks", checks: [] },
            rollupPages: [{ checks: [pendingCheck("fallback")], endCursor: null }],
          },
        },
      }
    );
    expect(run.code).toBe(0);
    const rows = (lastEvent(run.stdout) as {
      readonly rows: readonly { readonly ci: { readonly source: string; readonly all: readonly { readonly name: string }[] } }[];
    }).rows;
    expect(rows.map((item) => [item.ci.source, item.ci.all.map((check) => check.name)])).toEqual([
      ["gh-pr-checks", ["fast"]],
      ["graphql-rollup", ["first", "second"]],
      ["graphql-rollup", ["fallback"]],
    ]);
    expect(run.calls.filter((call) => call.startsWith("check"))).toEqual([
      "checksFastPath owner/repo#1",
      "checksFastPath owner/repo#2",
      "checkRollupPage owner/repo#2 after=none",
      "checkRollupPage owner/repo#2 after=next",
      "checksFastPath owner/repo#3",
      "checkRollupPage owner/repo#3 after=none",
    ]);
  });

  it("fails closed when neither path returns a check", async () => {
    const unusable = await watch([...repo, "--pr", "1", "--max-query-errors", "1", "--pretty"], {
      prs: {
        1: { checks: { kind: "unusable", exitCode: 8, stderr: "credential cannot read checks\nsecond line" } },
      },
    });
    expect(unusable.stdout).toBe(
      `BLOCKER: status-query\nfailures=1\ndetail=could not read PR checks: fast path exit=8; GraphQL rollup was empty; credential cannot read checks\n${statusAction}`
    );
    expect(unusable.code).toBe(7);
    const empty = await watch([...repo, "--pr", "1", "--max-query-errors", "1"], {
      prs: { 1: { checks: { kind: "checks", checks: [] } } },
    });
    expect(empty.stdout).toBe(
      `{"schemaVersion":1,"sequence":1,"observedAt":"${OBSERVED_AT}","mode":"single","kind":"BLOCKER","terminal":true,"exitCode":7,"blocker":{"kind":"status-query","failures":1,"failure":{"kind":"checks-unavailable","retryable":true,"detail":"could not read PR checks: fast path and GraphQL rollup were empty"}}}\n`
    );
    expect(empty.code).toBe(7);
  });

  it("skips commit history for a pending queued PR but reads it for a status table", async () => {
    const github = {
      prs: {
        2: {
          checks: pending(),
          commits: [
            { oid: "old", state: "SUCCESS" },
            { oid: "head", state: "PENDING" },
          ] satisfies CommitRollup[],
        },
      },
    };
    const queued = await watch(
      [...repo, "--queued-stack", "--stack-prs", "2", "--timeout", "60", "--pretty"],
      github
    );
    expect(queued.stdout).toBe(
      `QUEUE: captured 1 PR bottom-to-top: #2\n${head}${row(2, "⏳ 1 pending", "✅", "✅")}WAITING: frontier=#2; 1 check pending\nTIMEOUT: queued stack still has 1 PR unmerged; frontier=#2\n`
    );
    expect(queued.code).toBe(5);
    expect(queued.calls.filter((call) => call.startsWith("commitRollups"))).toEqual([]);
    const status = await watch([...repo, "--pr", "2", "--status-only", "--pretty"], github);
    expect(status.stdout).toBe(`${head}${row(2, "⏳ 1 pending, was ✅", "✅", "✅")}`);
    expect(status.calls.filter((call) => call.startsWith("commitRollups"))).toEqual([
      "commitRollups owner/repo#2",
    ]);
  });

  it("reads nothing past the PR facts of a merged PR", async () => {
    const run = await watch(
      [...repo, "--queued-stack", "--stack-prs", "5,6", "--status-only", "--pretty"],
      { prs: { 5: { facts: merged } } }
    );
    expect(run.stdout).toBe(`${head}${row(5, "—", "—", "✅ merged")}${row(6, "✅", "✅", "✅")}`);
    expect(run.calls).toEqual([
      "pullRequest owner/repo#5",
      "pullRequest owner/repo#6",
      "reviewThreads owner/repo#6",
      "checksFastPath owner/repo#6",
      "commitRollups owner/repo#6",
    ]);
  });
});

describe("context and stack discovery", () => {
  const local = { owner: "local", repo: "checkout" };
  it.each([
    [[...repo, "--pr", "42"], local, ["pullRequest owner/repo#42"]],
    [["--owner", "explicit", "--repo", "repo", "--pr", "42"], local, ["pullRequest explicit/repo#42"]],
    [["--pr", "42"], local, ["originRepo", "pullRequest local/checkout#42"]],
    [["--owner", "fork", "--pr", "42"], local, ["originRepo", "pullRequest fork/checkout#42"]],
    [["--pr", "42"], null, ["originRepo", "currentPr 42", "pullRequest inferred/remote#42"]],
    [[], null, ["currentPr none", "pullRequest inferred/remote#7"]],
  ])("resolves %j with origin %j through %j", async (argv, origin, calls) => {
    const run = await watch([...argv, "--status-only"], {
      origin,
      current: { owner: "inferred", repo: "remote", number: parsePrNumber(7) },
    });
    expect(run.code).toBe(0);
    expect(run.calls.slice(0, calls.length)).toEqual(calls);
  });

  it("orders the connected stack bottom-to-top and leaves out unrelated PRs", async () => {
    const run = await watch([...repo, "--stack", "--pr", "42", "--status-only", "--pretty"], {
      openPullRequests: [
        { number: parsePrNumber(43), headRefName: "upstack", baseRefName: "feature" },
        { number: parsePrNumber(44), headRefName: "unrelated", baseRefName: "main" },
        { number: parsePrNumber(42), headRefName: "feature", baseRefName: "base-feature" },
        { number: parsePrNumber(41), headRefName: "base-feature", baseRefName: "main" },
      ],
    });
    expect(run.stdout).toBe(
      `${head}${row(41, "✅", "✅", "✅")}${row(42, "✅", "✅", "✅")}${row(43, "✅", "✅", "✅")}`
    );
    expect(run.calls[0]).toBe("openPullRequests owner/repo");
  });
});

describe("stack decisions", () => {
  it("reports an upstack conflict before a failing frontier", async () => {
    const run = await watch([...repo, "--stack", "--pr", "10", "--pretty"], {
      openPullRequests: [
        { number: parsePrNumber(10), headRefName: "feature", baseRefName: "main" },
        { number: parsePrNumber(11), headRefName: "upstack", baseRefName: "feature" },
      ],
      prs: {
        10: {
          checks: { kind: "checks", checks: [failedCheck()] },
          commits: [{ oid: "head", state: "FAILURE" }],
        },
        11: { facts: { mergeable: "CONFLICTING" } },
      },
    });
    expect(run.stdout).toBe(
      `${head}${row(10, "❌ 1 failed", "✅", "✅")}${row(11, "✅", "✅", "⚠️ conflict")}BLOCKER: merge-conflicts\npr=11\nmergeable=CONFLICTING\nmergeStateStatus=CLEAN\naction=resolve merge conflicts before waiting for CI\n`
    );
    expect(run.code).toBe(2);
  });

  it("waits on the upstack PR whose checks are pending, then reports the stack ready", async () => {
    const run = await watch([...repo, "--stack", "--pr", "20", "--pretty"], {
      openPullRequests: [
        { number: parsePrNumber(20), headRefName: "bottom", baseRefName: "main" },
        { number: parsePrNumber(21), headRefName: "top", baseRefName: "bottom" },
      ],
      prs: {
        21: {
          checks: (call) =>
            call === 1 ? pending("upstack-build") : { kind: "checks", checks: [passingCheck()] },
        },
      },
    });
    expect(run.stdout).toBe(
      `${head}${row(20, "✅", "✅", "✅")}${row(21, "⏳ 1 pending", "✅", "✅")}WAITING: frontier=#21; 1 check pending\n${head}${row(20, "✅", "✅", "✅")}${row(21, "✅", "✅", "✅")}${readyText}`
    );
    expect(run.code).toBe(0);
    expect(run.sleeps).toEqual([60]);
  });
});

describe("queued stack", () => {
  it("retries a failed read at the same PR and finishes the sweep from there", async () => {
    const run = await watch(
      [...repo, "--queued-stack", "--stack-prs", "20,21,22", "--timeout", "60", "--pretty"],
      {
        prs: {
          21: {
            facts: (call) => {
              if (call === 1)
                throw new WatcherQueryError({
                  kind: "command-exit",
                  retryable: true,
                  detail: "rate limited",
                  code: 1,
                });
              return {};
            },
          },
        },
      }
    );
    expect(run.stdout).toBe(
      `QUEUE: captured 3 PRs bottom-to-top: #20,#21,#22\nRETRY: GitHub status query failed; retrying in 60s\ndetail=rate limited\n${head}${row(20, "✅", "✅", "✅")}${row(21, "✅", "✅", "✅")}${row(22, "✅", "✅", "✅")}TIMEOUT: queued stack still has 3 PRs unmerged; frontier=#20\n`
    );
    expect(run.code).toBe(5);
    expect(run.calls.filter((call) => call.startsWith("pullRequest"))).toEqual([
      "pullRequest owner/repo#20",
      "pullRequest owner/repo#21",
      "pullRequest owner/repo#21",
      "pullRequest owner/repo#22",
    ]);
  });

  it("advances to the next PR without sleeping and completes when all merge", async () => {
    const run = await watch([...repo, "--queued-stack", "--stack-prs", "40,41", "--pretty"], {
      prs: {
        40: { facts: (call) => (call === 1 ? {} : merged) },
        41: { facts: (call) => (call <= 2 ? {} : merged) },
      },
    });
    expect(run.stdout).toBe(
      `QUEUE: captured 2 PRs bottom-to-top: #40,#41\n${head}${row(40, "✅", "✅", "✅")}${row(41, "✅", "✅", "✅")}WAITING: frontier=#40 is blocker-free; waiting for merge queue (2 PRs unmerged)\nADVANCE: merged #40; next=#41; remaining=1\nWAITING: frontier=#41 is blocker-free; waiting for merge queue (1 PR unmerged)\nCOMPLETE: queued stack merged (2 PRs)\n`
    );
    expect(run.code).toBe(0);
    expect(run.sleeps).toEqual([60, 60]);
    expect(run.calls.filter((call) => call.startsWith("pullRequest"))).toEqual([
      "pullRequest owner/repo#40",
      "pullRequest owner/repo#41",
      "pullRequest owner/repo#40",
      "pullRequest owner/repo#41",
      "pullRequest owner/repo#41",
    ]);
  });
});
