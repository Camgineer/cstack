import { handle, type Env } from "./bridge.ts";

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
};
