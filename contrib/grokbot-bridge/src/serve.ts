import { handle, readConfig } from "./bridge.ts";

const loaded = readConfig(process.env);
if (!loaded.ok) {
  console.error(`grokbot-bridge will not start. ${loaded.problem}`);
  process.exit(1);
}

const port = Number(process.env.PORT ?? 8787);
Bun.serve({ port, fetch: (request) => handle(request, process.env) });
console.log(`grokbot-bridge listening on port ${port}`);
