import { handle } from "./bridge.ts";

const port = Number(process.env.PORT ?? 8787);
Bun.serve({ port, fetch: (request) => handle(request, process.env) });
console.log(`grokbot-bridge listening on port ${port}`);
