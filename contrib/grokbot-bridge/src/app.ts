import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { notifyGrokbot, type WebhookConfig } from "./notify.ts";

export type BridgeConfig = WebhookConfig & {
  pathToken: string;
};

export function createBridgeHandler(config: BridgeConfig, fetchFn?: typeof fetch) {
  const endpoint = `/mcp/${config.pathToken}`;

  return async function handle(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== endpoint) {
      return new Response("not found", { status: 404 });
    }

    const server = new McpServer({ name: "grokbot-bridge", version: "0.1.0" });
    server.registerTool(
      "notify_grokbot",
      {
        title: "Notify Grok Bot",
        description:
          "Send a blocker, question, or finished-work note from a Project thread to Grok Bot.",
        inputSchema: {
          message: z.string().min(1).max(4000),
          project: z.string().min(1),
          thread: z.string().min(1),
        },
      },
      async (input) => {
        const result = await notifyGrokbot(config, input, fetchFn);
        if (!result.ok) {
          return { isError: true, content: [{ type: "text", text: result.error }] };
        }
        return { content: [{ type: "text", text: `Delivered to Grok Bot (HTTP ${result.status}).` }] };
      },
    );

    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    return transport.handleRequest(request);
  };
}
