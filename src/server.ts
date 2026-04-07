#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAppContext, disposeAppContext, type AppContext } from "./app-context.js";
import { createAdbIntegration } from "./integrations/adb.js";
import { createExpoCliIntegration } from "./integrations/expo-cli.js";
import { createExpoMcpIntegration } from "./integrations/expo-mcp-client.js";
import { createMobileMcpIntegration } from "./integrations/mobile-mcp-client.js";
import { errorResult } from "./mcp/responses.js";
import { toolSchemas } from "./mcp/schemas.js";
import { readPackageVersion } from "./utils/paths.js";
import { createToolRegistry } from "./mcp/tool-registry.js";
import { toAppError } from "./utils/errors.js";

const TOOL_DESCRIPTIONS: Record<string, string> = {
  project_inspect: "Inspect a project root and detect Expo-specific metadata.",
  metro_start: "Start Metro for a local Expo project.",
  metro_stop: "Stop Metro for a local Expo project.",
  metro_restart: "Restart Metro for a local Expo project.",
  metro_status: "Get Metro runtime status for a local Expo project.",
  metro_logs_recent: "Get recent Metro logs.",
  metro_errors_recent: "Get recent structured Metro errors.",
  dev_server_attach: "Attach hidden expo-mcp after Metro is ready.",
  android_run: "Run the local Android Expo workflow.",
  device_list: "List available devices.",
  device_logs_recent: "Get recent device logs.",
  device_screenshot: "Capture a device screenshot.",
  device_dump_ui: "Dump the current mobile UI hierarchy through hidden mobile-mcp.",
  device_tap: "Tap a coordinate on the active mobile device through hidden mobile-mcp.",
  device_swipe: "Swipe across the active mobile device through hidden mobile-mcp.",
  device_type_text: "Type text into the focused field on the active mobile device through hidden mobile-mcp.",
  device_key_press: "Press a device key such as enter, back, or home through hidden mobile-mcp.",
  device_app_launch: "Launch an app on the active mobile device through hidden mobile-mcp.",
  device_app_terminate: "Terminate an app on the active mobile device through hidden mobile-mcp.",
  device_foreground_app: "Inspect the foreground app on the active mobile device through hidden mobile-mcp.",
  session_summary: "Summarize current orchestration state for a project."
};

type ShutdownProcessLike = {
  once: (event: "SIGINT" | "SIGTERM", listener: () => void | Promise<void>) => unknown;
  exitCode?: number;
};

export type ConnectedServer = {
  connect: (transport: any) => Promise<void>;
  close?: () => Promise<void>;
};

type CreatedServer = {
  server: ConnectedServer;
  context: AppContext;
};

export function createRuntimeContext(): AppContext {
  const expoCli = createExpoCliIntegration();

  return createAppContext({
    integrations: {
      expoCli,
      androidExpoCli: expoCli,
      expoMcp: createExpoMcpIntegration(),
      adb: createAdbIntegration(),
      mobileMcp: createMobileMcpIntegration()
    }
  });
}

export async function createServer(input?: { context?: AppContext }): Promise<{ server: McpServer; context: AppContext }> {
  const mcpServer = new McpServer({
    name: "local-expo-mcp",
    version: readPackageVersion()
  });

  const context = input?.context ?? createRuntimeContext();
  const toolRegistry = createToolRegistry(context);

  for (const [name, handler] of Object.entries(toolRegistry)) {
    const inputSchema = toolSchemas[name as keyof typeof toolSchemas] as any;

    mcpServer.registerTool(
      name,
      {
        description: TOOL_DESCRIPTIONS[name] ?? `${name} tool`,
        inputSchema
      },
      async (args: Record<string, unknown>) => executeToolHandler(handler as (input: Record<string, unknown>) => Promise<unknown> | unknown, args)
    );
  }

  return { server: mcpServer, context };
}

export async function executeToolHandler(
  handler: (input: Record<string, unknown>) => Promise<unknown> | unknown,
  args: Record<string, unknown>
) {
  const result = await normalizeToolResult(handler, args);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2)
      }
    ],
    structuredContent: result as Record<string, unknown>,
    isError: Boolean(
      typeof result === "object" &&
        result !== null &&
        "ok" in result &&
        (result as { ok?: boolean }).ok === false
    )
  };
}

async function normalizeToolResult(
  handler: (input: Record<string, unknown>) => Promise<unknown> | unknown,
  args: Record<string, unknown>
) {
  try {
    return await handler(args);
  } catch (error) {
    return errorResult(toAppError(error));
  }
}

export async function startServer(input?: {
  context?: AppContext;
  transport?: any;
  processLike?: ShutdownProcessLike;
  createServer?: (input?: { context?: AppContext }) => Promise<CreatedServer>;
  disconnect?: (input: { server: ConnectedServer; context: AppContext }) => Promise<void>;
}) {
  const created = await (input?.createServer ?? createServer)({ context: input?.context });
  const server = created.server;
  const context = created.context;
  const transport = input?.transport ?? new StdioServerTransport();
  const processLike = input?.processLike ?? process;
  const disconnect = input?.disconnect ?? defaultDisconnect;

  await server.connect(transport);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    processLike.exitCode = processLike.exitCode ?? 0;
    await disconnect({ server, context });
  };

  processLike.once("SIGINT", shutdown);
  processLike.once("SIGTERM", shutdown);

  return {
    server,
    context,
    shutdown
  };
}

async function defaultDisconnect(input: { server: ConnectedServer; context: AppContext }) {
  await input.server.close?.();
  await disposeAppContext(input.context);
}

