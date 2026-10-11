# File-change tests

Builders use this fixture for this repository's Node helpers. Import the public entry from `file-change-kit.ts`. Keep command preparation, expected file contents, and the instruction reader in the consumer test. The existing consumers are in `../integration/intent-install.test.ts`.

## Run an interrupted command

Use `withFileChangeHome` for the throwaway home. Prepare the real command's inputs there. Give `fileChangeKit` the executable and fixed arguments as `command`, plus an explicit `PATH` in `env`. The fixture owns `HOME` and starts every command in that home.

```ts
withFileChangeHome(home => {
	const kit = fileChangeKit(home, { command: ["node", script], env: { PATH: bin } });
	const result = kit.runSync(args, [{
		name: "original-replaced",
		operation: "rename",
		edge: "after",
		target: { path: original },
		action: { kind: "kill" },
	}]);
	expect(result.signal).toBe("SIGKILL");
	expect(readFileSync(original, "utf8")).toBe("Replacement bytes.");
});
```

Each `Cut` has a unique name, an operation, a before or after edge, a target, and an action. Operations are `open`, `write`, `rename`, and `delete`. A rename's target is its destination; the reached `CutEvent.from` holds its source. Writes resolve file descriptors to the paths opened by the command. Delete covers `unlinkSync`, `rmSync`, and `rmdirSync`.

Select an exact `path` or a `parent` directory. Optional `flags`, `sourceKind`, `exists`, and positive `occurrence` narrow the cut. To inject a rollback failure, use `after` to name an earlier fault. To fail cleanup of its temporary, use a target of `{ sourceOf: "earlier-rename" }`. Actions are `kill`, `pause`, or `throw` with a message. `processProbe: "denied"` makes only signal-zero owner checks fail with EPERM.

`runSync` rejects pause actions and fails if a requested cut was not reached. Retain a positive assertion about the command's output or files in every case. A named cut reached by a real write prevents a command that does nothing from passing its fault case.

## Overlap two commands

Use `start` for a paused command. Await `at(name)` before inspecting the files or running a second command through the same kit. `atOrExit(name)` returns a tagged cut or process exit for a race whose competing command may be refused before the cut. Observing a nonzero, unsignalled exit through `atOrExit(name)` permits that one cut to be missing at `finish`; assert the expected refusal yourself. Successful completion still requires every cut, including later cuts after a released pause. Release the named pause, await `finish`, and call `stop` in `finally`. `stop` joins the fixture's direct child and also works after `finish` without requiring cuts during teardown.

Each run gets its own private control directory. A second command inherits no fault plan. Pauses and child lifetimes are bounded by `timeout`, which defaults to ten seconds. A missing cut or fixture timeout fails the test.

## Follow the actual instructions

Capture protected file states with `kit.snapshot(paths)`. It records bytes, permission bits, link targets, directories, and required absences. Include every original and later edit the case promises to keep. Keep expected recovery separate from the command's own record.

Call `assertFollowsInstructions` with the first command and result, a real `run` callback, an `instructions` reader, `snapshot` and `expected` callbacks, and the fixture's `move` action. The reader consumes actual stdout and stderr and returns typed run, wait, or move actions. Return every applicable next step in printed order. Leave informational output out of the action list. An unsuccessful result with no next step is a dead end.

The assertion runs the queue to completion, rejects repeated command/output/state and an exceeded step bound, and compares the final snapshot with the expected recovery. Supply `active` and `wait` for a live overlapping run. A printed change to another command while that run remains active fails; printed wait advice releases and joins the known run through `wait`. A fresh-report reader obtains the printed report's actual approval before retrying apply. The setup consumer shows this flow.

`move` preserves a leaf entry within the fixture home and refuses an existing destination or linked parent. Printed shell text is never executed through a shell. A case follows conditional manual recovery only after it establishes the printed condition, such as no active setup command. Exercise applicable alternative branches in separate prepared homes.

## Limits

- The fixture serves this repository only. Installed plugin copies do not contain it. Every plugin user receives the general interruption rule from the builder playbook.
- The preload wraps `openSync`, `writeFileSync`, `writeSync`, `renameSync`, `unlinkSync`, `rmSync`, and `rmdirSync`; `closeSync` maintains descriptor tracking. Cuts recognize string paths and numeric descriptors opened through the preload. URL and Buffer paths, other synchronous methods, asynchronous APIs, direct native syscalls, and other runtimes are not intercepted.
- Node workers and spawned Node descendants may inherit the preload, fault plan, and control files and fire cuts meant for the direct process. Their events can collide, and their lifetimes are not managed. Use this kit only for commands whose tested file operations stay in one direct Node process. For commands that start workers or descendants, use a harness that isolates each fault plan and owns every process or worker lifetime.
- The fixture is not an OS sandbox. `HOME` isolation does not prevent the command or an extra environment variable from naming files elsewhere. Keep every mutable command input and destination in the throwaway home. Source files outside it remain read-only inputs.
- Before and after name call boundaries, not disk durability, partial writes, power loss, or every scheduler interleaving. A write inside another intercepted call is counted once at the outer call.
- Directory identity checks and exclusive control writes refuse ordinary link and folder swaps. They are not an atomic defence against a concurrent malicious actor. If a fixture home is replaced, teardown refuses to remove the replacement.
- The consumer owns instruction grammar, conditional decisions, and the declared protected paths. Unknown advice fails as a dead end. The assertion does not infer missing originals, follow an arbitrary command grammar, compare the whole home, or treat the helper's backup as the expected original. Exit zero alone is insufficient; keep the recovered-file and positive command assertions.
- Pauses are one-shot. Release a reached pause once and join or stop each direct child before leaving the home scope. The assertion bounds steps; each fixture command and pause has its own timeout.

The operation controls adapt the setup integration tests' preloads and the earlier setup-recovery fault harness. Their consumer-specific cases and file assertions remain in the integration suite.
