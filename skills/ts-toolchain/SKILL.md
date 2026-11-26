---
name: ts-toolchain
description: "Standards for TypeScript repository tooling scripts in any repository and TypeScript project setup. Use when writing repository scripts, checks, generators, or automation, or when configuring TypeScript projects, tsconfig.json, or Biome."
paths: ["**/*.ts", "**/*.tsx", "**/tsconfig.json", "**/biome.json", "**/package.json"]
---

# TypeScript toolchain

Use TypeScript as the default language for repository tooling scripts across all repositories, and apply the project setup rules below for TypeScript codebases.

## Repository tooling scripts

Apply these rules to repository scripts, checks, generators, and automation in any repository. Use another language only when the repository or runtime requires it, such as Unity C# or Blender Python.

- **Write scripts in TypeScript.** Author tooling scripts as `.ts` files rather than shell or untyped JavaScript files.
- **Run with native Node type stripping.** Execute scripts directly with `node <script>.ts` in erasable TypeScript syntax. Do not add a build step, bundler, or third-party TypeScript runner for tooling scripts.
- **Format and lint with Biome.** Use Biome to format and lint repository tooling scripts.
- **Keep zero runtime dependencies.** Use the Node standard library. Add a third-party runtime dependency only when you state why the script requires it.

## TypeScript project setup

- **Greenfield and new projects.** Install the latest stable TypeScript (7+, native Go compiler) and use Biome for formatting and linting instead of ESLint and Prettier. Start `tsconfig.json` with strict defaults aligned with Total TypeScript (Matt Pocock) best practices:

  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "noImplicitOverride": true,
      "erasableSyntaxOnly": true,
      "verbatimModuleSyntax": true,
      "isolatedModules": true,
      "moduleDetection": "force",
      "skipLibCheck": true,
      "module": "preserve",
      "noEmit": true
    }
  }
  ```

  Use `"module": "preserve"` and `"noEmit": true` for bundled or native-run projects. When transpiling with `tsc`, use `"module": "NodeNext"` instead and emit files as needed.
- **Existing repositories.** Never auto-upgrade TypeScript major versions, replace an existing ESLint or Prettier setup with Biome, or enable breaking strict flags such as `noUncheckedIndexedAccess` or `erasableSyntaxOnly` unasked. Keep the repository's pinned toolchain unless the task explicitly scopes a migration.
- **Type-level patterns.** Defer to [typescript-best-practices](../typescript-best-practices/SKILL.md) for type design, narrowing, brands, and runtime validation. Do not duplicate those rules here.
