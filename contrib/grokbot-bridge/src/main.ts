import { createBridgeHandler, type BridgeConfig } from "./app.ts";

export function loadConfig(env: Record<string, string | undefined>): BridgeConfig & { port: number } {
  const webhookUrl = required(env, "GROKBOT_WEBHOOK_URL");
  const secret = required(env, "GROKBOT_SECRET");
  const pathToken = required(env, "BRIDGE_PATH_TOKEN");

  const url = new URL(webhookUrl);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("GROKBOT_WEBHOOK_URL must use https");
  }
  if (pathToken.length < 32) {
    throw new Error("BRIDGE_PATH_TOKEN must be at least 32 characters");
  }

  return { webhookUrl, secret, pathToken, port: Number(env.PORT ?? 8787) };
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

if (import.meta.main) {
  const config = loadConfig(process.env);
  Bun.serve({ port: config.port, fetch: createBridgeHandler(config) });
  console.log(`grokbot-bridge listening on port ${config.port}`);
}
