import { existsSync } from "node:fs";
import { join } from "node:path";

export function ensureDependenciesInstalled(): void {
  if (!existsSync(join(import.meta.dir, "node_modules", "commander", "package.json"))) {
    throw new Error(
      "Dependencies are not installed. Copy this scripts directory to an owned working directory outside the plugin cache, review package.json and bun.lock, then explicitly run bun install --frozen-lockfile there. Discovery and helper startup never install dependencies."
    );
  }
}
