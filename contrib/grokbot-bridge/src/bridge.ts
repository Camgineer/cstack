// A remote MCP server (Streamable HTTP, stateless JSON responses) with one tool that forwards a note to a webhook.
// It uses only Fetch API globals, so the same handler runs on Bun, Node 18+, and Cloudflare Workers.

export type Env = Record<string, string | undefined>;

const SERVER_INFO = { name: "grokbot-bridge", version: "0.1.0" };
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_MESSAGE_LENGTH = 4000;
const MAX_LABEL_LENGTH = 200;
const WEBHOOK_TIMEOUT_MS = 10_000;

export const NOTIFY_TOOL = {
  name: "notify_grokbot",
  description:
    "Send a note to the team's Grok Bot webhook. Use it for blockers, questions that need a person, and finished work from a Claude Project thread.",
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string", minLength: 1, maxLength: MAX_MESSAGE_LENGTH, description: "The text to send." },
      project: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "The project the thread belongs to." },
      thread: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "The thread title or link." },
    },
    required: ["message"],
    additionalProperties: false,
  },
};

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: JsonRpcId;
  method?: unknown;
  params?: Record<string, unknown>;
};

export async function handle(request: Request, env: Env, fetchWebhook: typeof fetch = fetch): Promise<Response> {
  const token = env.BRIDGE_TOKEN;
  const webhookUrl = env.GROKBOT_WEBHOOK_URL;
  const webhookSecret = env.GROKBOT_WEBHOOK_SECRET;
  if (!token || !webhookUrl || !webhookSecret) {
    return text("Bridge is not configured.", 500);
  }
  if (new URL(request.url).pathname !== `/mcp/${token}`) {
    return text("Not found.", 404);
  }
  if (request.method !== "POST") {
    return text("Method not allowed.", 405, { allow: "POST" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error." } }, 400);
  }

  const messages: unknown[] = Array.isArray(body) ? body : [body];
  const replies: object[] = [];
  for (const message of messages) {
    const reply = await dispatch(message as JsonRpcRequest, { webhookUrl, webhookSecret }, fetchWebhook);
    if (reply) replies.push(reply);
  }
  if (replies.length === 0) {
    return new Response(null, { status: 202 });
  }
  return json(Array.isArray(body) ? replies : replies[0]);
}

async function dispatch(
  message: JsonRpcRequest,
  webhook: { webhookUrl: string; webhookSecret: string },
  fetchWebhook: typeof fetch,
): Promise<object | null> {
  // A message without an id is a notification, and gets no reply.
  if (message.id === undefined) return null;
  const id = message.id;
  switch (message.method) {
    case "initialize":
      return result(id, {
        protocolVersion: negotiateVersion(message.params?.protocolVersion),
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, { tools: [NOTIFY_TOOL] });
    case "tools/call":
      return callTool(id, message.params ?? {}, webhook, fetchWebhook);
    default:
      return rpcError(id, -32601, `Method not found: ${String(message.method)}`);
  }
}

async function callTool(
  id: JsonRpcId,
  params: Record<string, unknown>,
  webhook: { webhookUrl: string; webhookSecret: string },
  fetchWebhook: typeof fetch,
): Promise<object> {
  if (params.name !== NOTIFY_TOOL.name) {
    return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
  }
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  const problem = checkArguments(args);
  if (problem) return result(id, toolError(problem));

  const payload = {
    message: (args.message as string).trim(),
    project: args.project ?? null,
    thread: args.thread ?? null,
    source: "claude-projects",
  };
  try {
    const response = await fetchWebhook(webhook.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${webhook.webhookSecret}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!response.ok) {
      return result(id, toolError(`The Grok Bot webhook answered ${response.status}.`));
    }
  } catch (error) {
    return result(id, toolError(`The Grok Bot webhook could not be reached: ${errorName(error)}.`));
  }
  return result(id, { content: [{ type: "text", text: "Sent to Grok Bot." }], isError: false });
}

function checkArguments(args: Record<string, unknown>): string | null {
  const allowed = new Set(["message", "project", "thread"]);
  const unknown = Object.keys(args).find((key) => !allowed.has(key));
  if (unknown) return `Unknown argument: ${unknown}.`;
  if (typeof args.message !== "string" || args.message.trim() === "") return "message must be a non-empty string.";
  if (args.message.length > MAX_MESSAGE_LENGTH) return `message must be at most ${MAX_MESSAGE_LENGTH} characters.`;
  for (const key of ["project", "thread"] as const) {
    const value = args[key];
    if (value !== undefined && (typeof value !== "string" || value.length > MAX_LABEL_LENGTH)) {
      return `${key} must be a string of at most ${MAX_LABEL_LENGTH} characters.`;
    }
  }
  return null;
}

function negotiateVersion(requested: unknown): string {
  return typeof requested === "string" && PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
}

function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown error";
}

function result(id: JsonRpcId, value: object) {
  return { jsonrpc: "2.0", id, result: value };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function text(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}
