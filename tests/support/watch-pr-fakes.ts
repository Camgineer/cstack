import type {
  Check,
  ChecksFastPath,
  CommitRollup,
  GitHubReader,
  OpenPullRequest,
  PrContext,
  PullRequestFacts,
  Repository,
  ReviewThread,
  RollupPage,
} from "../../skills/cstack-mode/scripts/watch-pr/types.ts";
import { parsePrNumber } from "../../skills/cstack-mode/scripts/watch-pr/types.ts";
import { type CliRuntime, main } from "../../skills/cstack-mode/scripts/watch-pr/cli.ts";

export interface FakeReaderOptions {
  readonly facts?: Partial<Omit<PullRequestFacts, "context">>;
  readonly fastPath?: ChecksFastPath;
  readonly rollupPages?: readonly RollupPage[];
  readonly threads?: readonly ReviewThread[];
  readonly commitRollups?: readonly CommitRollup[];
  readonly openPullRequests?: readonly OpenPullRequest[];
  readonly origin?: Repository | null;
  readonly current?: PrContext;
}

export function passingCheck(name = "ci"): Check {
  return {
    kind: "passed",
    name,
    reportedState: "SUCCESS",
    description: "",
    link: "",
    workflow: "",
  };
}

export function pendingCheck(name = "ci"): Check {
  return {
    kind: "pending",
    name,
    reportedState: "PENDING",
    description: "",
    link: "",
    workflow: "",
  };
}

export function failedCheck(name = "ci"): Check {
  return {
    kind: "failed",
    name,
    reportedState: "FAILURE",
    description: "",
    link: "",
    workflow: "",
  };
}

export function fakeReader(
  options: FakeReaderOptions = {}
): GitHubReader & { readonly calls: readonly string[] } {
  const calls: string[] = [];
  const context = options.current ?? {
    owner: "owner",
    repo: "repo",
    number: parsePrNumber(1),
  };
  const defaults: PullRequestFacts = {
    context,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    reviewDecision: "APPROVED",
    headRefOid: "head",
    headRefName: "feature",
    baseRefName: "main",
    state: "OPEN",
    mergedAt: null,
    isDraft: false,
  };
  let page = 0;
  return {
    calls,
    async originRepo() {
      calls.push("originRepo");
      return options.origin === undefined
        ? { owner: "owner", repo: "repo" }
        : options.origin;
    },
    async currentPr(pr) {
      calls.push("currentPr");
      return { ...context, number: pr ?? context.number };
    },
    async pullRequest(requested) {
      calls.push("pullRequest");
      return { ...defaults, ...options.facts, context: requested };
    },
    async openPullRequests() {
      calls.push("openPullRequests");
      return options.openPullRequests ?? [];
    },
    async checksFastPath() {
      calls.push("checksFastPath");
      return options.fastPath ?? { kind: "checks", checks: [passingCheck()] };
    },
    async checkRollupPage(_requested, after) {
      calls.push(`checkRollupPage:${after ?? "null"}`);
      return options.rollupPages?.[page++] ?? { checks: [], endCursor: null };
    },
    async reviewThreads() {
      calls.push("reviewThreads");
      return options.threads ?? [];
    },
    async commitRollups() {
      calls.push("commitRollups");
      return options.commitRollups ?? [{ oid: "head", state: "SUCCESS" }];
    },
  };
}

type Answer<T> = T | ((call: number) => T);

function answer<T>(value: Answer<T>, call: number): T {
  return typeof value === "function" ? (value as (call: number) => T)(call) : value;
}

export interface FakePr {
  readonly facts?: Answer<Partial<Omit<PullRequestFacts, "context">>>;
  readonly checks?: Answer<ChecksFastPath>;
  readonly rollupPages?: readonly RollupPage[];
  readonly threads?: Answer<readonly ReviewThread[]>;
  readonly commits?: Answer<readonly CommitRollup[]>;
}

export interface FakeGitHub {
  readonly prs?: Readonly<Record<number, FakePr>>;
  readonly origin?: Repository | null;
  readonly current?: PrContext;
  readonly openPullRequests?: readonly OpenPullRequest[];
}

export const OBSERVED_AT = "2026-07-26T00:00:00.000Z";

// A queue bug can loop without sleeping; the budget turns that hang into a failure.
const CALL_BUDGET = 1_000;

export function fakeGitHub(github: FakeGitHub = {}): GitHubReader & {
  readonly calls: readonly string[];
} {
  const calls: string[] = [];
  const counts = new Map<string, number>();
  const record = (entry: string, key: string): number => {
    if (calls.length >= CALL_BUDGET)
      throw new Error("fake GitHub call budget exhausted");
    calls.push(entry);
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return count;
  };
  const pr = (context: PrContext): FakePr => github.prs?.[context.number] ?? {};
  const name = (context: PrContext): string =>
    `${context.owner}/${context.repo}#${context.number}`;
  return {
    calls,
    async originRepo() {
      record("originRepo", "originRepo");
      return github.origin === undefined
        ? { owner: "owner", repo: "repo" }
        : github.origin;
    },
    async currentPr(requested) {
      record(`currentPr ${requested ?? "none"}`, "currentPr");
      const current = github.current ?? {
        owner: "owner",
        repo: "repo",
        number: parsePrNumber(1),
      };
      return { ...current, number: requested ?? current.number };
    },
    async pullRequest(context) {
      const call = record(`pullRequest ${name(context)}`, `pullRequest ${context.number}`);
      return {
        context,
        mergeable: "MERGEABLE",
        mergeStateStatus: "CLEAN",
        reviewDecision: "APPROVED",
        headRefOid: "head",
        headRefName: "feature",
        baseRefName: "main",
        state: "OPEN",
        mergedAt: null,
        isDraft: false,
        ...answer(pr(context).facts ?? {}, call),
      };
    },
    async openPullRequests(repository) {
      record(`openPullRequests ${repository.owner}/${repository.repo}`, "openPullRequests");
      return github.openPullRequests ?? [];
    },
    async checksFastPath(context) {
      const call = record(`checksFastPath ${name(context)}`, `checksFastPath ${context.number}`);
      return answer(
        pr(context).checks ?? { kind: "checks", checks: [passingCheck()] },
        call
      );
    },
    async checkRollupPage(context, after) {
      record(
        `checkRollupPage ${name(context)} after=${after ?? "none"}`,
        `checkRollupPage ${context.number}`
      );
      const pages = pr(context).rollupPages ?? [];
      const index =
        after === null ? 0 : pages.findIndex((page) => page.endCursor === after) + 1;
      return pages[index] ?? { checks: [], endCursor: null };
    },
    async reviewThreads(context) {
      const call = record(`reviewThreads ${name(context)}`, `reviewThreads ${context.number}`);
      return answer(pr(context).threads ?? [], call);
    },
    async commitRollups(context) {
      const call = record(`commitRollups ${name(context)}`, `commitRollups ${context.number}`);
      return answer(
        pr(context).commits ?? [{ oid: "head", state: "SUCCESS" }],
        call
      );
    },
  };
}

export function fakeClock(): {
  readonly clock: CliRuntime["clock"];
  readonly sleeps: readonly number[];
} {
  const sleeps: number[] = [];
  let now = 0;
  return {
    sleeps,
    clock: {
      now: () => now,
      observedAt: () => OBSERVED_AT,
      async sleep(seconds) {
        sleeps.push(seconds);
        now += seconds;
      },
    },
  };
}

export interface WatchRun {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly sleeps: readonly number[];
  readonly calls: readonly string[];
}

export async function watch(
  argv: readonly string[],
  github: FakeGitHub = {}
): Promise<WatchRun> {
  const reader = fakeGitHub(github);
  const { clock, sleeps } = fakeClock();
  let stdout = "";
  let stderr = "";
  const code = await main(argv, {
    reader,
    clock,
    stdout: (value) => {
      stdout += value;
    },
    stderr: (value) => {
      stderr += value;
    },
  });
  return { code, stdout, stderr, sleeps, calls: reader.calls };
}

export function lastEvent(stdout: string): unknown {
  const lines = stdout.trimEnd().split("\n");
  return JSON.parse(lines[lines.length - 1] ?? "");
}
