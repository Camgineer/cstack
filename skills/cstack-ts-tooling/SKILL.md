---
name: cstack-ts-tooling
description: "Standards for TypeScript repository tooling scripts. Use when writing, editing, or configuring repository scripts and checks in TypeScript repositories."
paths: ["**/*.ts", "**/*.tsx", "**/tsconfig.json", "**/biome.json"]
---

# TypeScript repository tooling

Apply these standards to repository tooling scripts, checks, generators, and maintenance utilities in TypeScript repositories. Application runtime dependencies and framework build pipelines stay outside this scope.

## Rules

- **Write tooling scripts in TypeScript.** Author repository scripts as `.ts` files rather than shell or untyped JavaScript files.
- **Run with native Node TypeScript execution.** Execute scripts directly with `node <script>.ts` using erasable TypeScript syntax. Do not add a separate build step, bundler, or third-party TypeScript runner for tooling scripts.
- **Format and lint with Biome.** Use Biome as the formatter and linter for repository tooling scripts.
- **Keep zero runtime dependencies.** Use the Node standard library for tooling scripts. Add a third-party runtime dependency only when you state why the script requires it.
