---
name: principle-test-behavior-not-implementation
description: "Apply when you write, change, review, or keep a test. Test only at a public seam, the entry a module's outside callers use, at the unit, integration, and end-to-end levels. Run libraries for real and never make one the subject. Assert the result callers observe against a literal expected value. If the test would still pass when every imported function returns undefined, rewrite the assertion or delete the test."
disable-model-invocation: true
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Test Behavior, Not Implementation

A test calls the code the way its users do and asserts the result they observe against a literal expected value. A test that asserts which internal calls the code made, or restates a constant the code contains, does neither.

## Where to test

A **public seam** is the entry a module's outside callers use. Test only there, so every call into your code is one an outside caller makes. The rule is the same at every level:

| Level | The seam | Runs for real | May be faked |
| --- | --- | --- | --- |
| Unit | A package's exports, a directory's entry file, or a script's main function. Files inside the module that call each other are internal, even through an export. | Your code, libraries, in-memory stand-ins | Remote services, third-party or your own, plus time and randomness, behind a port you own |
| Integration | A process boundary: CLI arguments, output, and exit code, an HTTP route, files, a database | Your modules, libraries, local services | Remote services, behind a port you own or as a stand-in at the boundary, such as a fake binary on `PATH` or a local HTTP stub |
| End to end | What the user touches: the UI, the CLI as typed, the public API | Everything | Nothing |

**Ports are part of the seam.** A dependency the public interface accepts, such as a clock, a client, or a mailer, is part of the seam even when only tests pass a fake for it, and so are the port's types, error classes, and constructors. An export, hook, or state read that exists only for a test is internal, so route the test through a seam instead.

**Private logic worth its own test.** Push its edge cases through the seam. For each internal rule, pick a seam input whose result differs from the nearest wrong version of that rule. The wrong version must change what the test asserts. A run that ends at a timeout, a fake's call budget, or an unrelated invariant does not catch it. When the seam cannot reach a case, promote the logic to a module with its own public interface that outside callers use, then test that seam. When a behavior is hard to reach through any seam, reshape the module per the **encode-lessons-in-structure** principle skill.

**Libraries and SDKs.** Your code is the subject and a library is a collaborator. Run each library for real through your seam, including stand-ins such as a temp directory or an in-memory database. When a library upgrade changes behavior you rely on, your seam tests fail, so a test that pins the library's own behavior adds nothing. An SDK for a remote service sits behind your port, so a test replaces it with the port's fake or runs it against a local stub at the process boundary. The requests your code sends a faked service are observable output, so assert their payloads, and assert that a request was skipped only in a test that also covers the input that sends it.

## Assertions

The check: before you keep a test, ask whether it would still pass if every function it imports returned `undefined`. If yes, it observes no behavior and cannot fail for a defect. Rewrite the assertion or delete the test.

**Why:** A test that cannot fail for a defect costs CI time and review attention and catches nothing. A constant pin also fails when someone edits the constant or the prompt it restates, so it prevents that edit.

**Five shapes that still pass when every imported function returns `undefined`:**

- **Weak or no assertion.** No `expect`, or only `toBeDefined`, `toBeTruthy`, `not.toThrow`, `toBeInstanceOf`, `toBeGreaterThan(0)`.
- **Mock or absence only.** Only `toHaveBeenCalled`, `not.toHaveBeenCalled`, `toBeUndefined`, `toEqual([])`, `toHaveLength(0)`, `not.toBe(wrongValue)`.
- **Self-referential.** The expected value comes from the code under test: `expect(f(a)).toBe(f(a))`, `expect(parsed.url).toBe(buildUrl(...))`.
- **Constant pin.** The assertion restates a hand-maintained constant, config default, table row, or prompt string: `expect(LIMITS.maxTools).toBe(8)`, `expect(PROMPT).toContain("You are")`.
- **Fixture asserts fixture.** The assertion reads data the test built or a value computed in `beforeEach`, and the subject never runs inside the body.

**The fix:** call the subject inside the test body with one concrete input and assert the literal output or the observable effect, `expect(slugify("Hello, World!")).toBe("hello-world")`. For an absence, assert the presence on the other input in the same test. For a constant, test the mechanism that reads it with one input instead of restating the value. For a mock, assert the payload it received or the state after the call, not that it was called. When no such assertion exists, delete the test.

**Symmetric inputs.** When the subject takes two sides, such as ours and theirs, old and new, or base and head, give each side a distinct value that shows up in the result, so a test fails when the code swaps them.

**Failure paths.** Assert the machine-readable output that carries the field under test, not a rendering that looks the same for both values. Bound the subject's own waits and retries with its own options, so a regression fails on an assertion within seconds instead of at a timeout.

**Keep** a test of a relation across a table's rows (a key present in two tables, a parent that exists), and a compile-time check in a `*.test-d.ts` file.
