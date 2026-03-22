import { mkdir as defaultMkdir, writeFile as defaultWriteFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  MetroLogEntry,
  MobileAppActionResult,
  MobileForegroundAppResult,
  MobileMcpDevice,
  MobileMcpIntegration
} from "../app-context.js";
import { createError } from "../utils/errors.js";
import { resolvePackageBin as defaultResolvePackageBin } from "../utils/paths.js";

type McpClientCallResult = {
  content?: Array<{
    type: string;
    text?: string;
    mimeType?: string;
    data?: string;
  }>;
  isError?: boolean;
};

type McpClientLike = {
  connect: (transport: unknown) => Promise<void>;
  callTool: (input: {
    name: string;
    arguments: Record<string, unknown>;
  }) => Promise<McpClientCallResult>;
  close?: () => Promise<void> | void;
};

type TransportLike = {
  pid: number | null;
  close?: () => Promise<void> | void;
};

export function createMobileMcpIntegration(input?: {
  cwd?: string;
  outputDir?: string;
  nodeCommand?: string;
  resolvePackageBin?: (input: {
    packageName: string;
    binName?: string;
    cwd?: string;
  }) => Promise<string>;
  createClient?: () => McpClientLike;
  createTransport?: (input: {
    command: string;
    args: string[];
    cwd?: string;
    stderr: "pipe";
  }) => TransportLike;
  mkdir?: (path: string, options: { recursive: true }) => Promise<void>;
  writeFile?: (path: string, data: Uint8Array) => Promise<void>;
  randomId?: () => string;
}): MobileMcpIntegration {
  const cwd = input?.cwd ?? process.cwd();
  const outputDir = input?.outputDir ?? resolve(cwd, ".local-expo-mcp", "screenshots");
  const nodeCommand = input?.nodeCommand ?? process.execPath;
  const resolvePackageBin = input?.resolvePackageBin ?? defaultResolvePackageBin;
  const mkdir = input?.mkdir ?? defaultMkdir;
  const writeFile = input?.writeFile ?? defaultWriteFile;
  const randomId = input?.randomId ?? randomUUID;
  const createClient =
    input?.createClient ??
    (() =>
      new Client({
        name: "local-expo-mcp",
        version: "0.1.0"
      }) as unknown as McpClientLike);
  const createTransport =
    input?.createTransport ??
    ((transportInput: {
      command: string;
      args: string[];
      cwd?: string;
      stderr: "pipe";
    }) => new StdioClientTransport(transportInput) as unknown as TransportLike);

  let connectedClient: McpClientLike | undefined;
  let connectedTransport: TransportLike | undefined;
  let connectPromise: Promise<McpClientLike> | undefined;
  let initialized = false;

  return {
    async screenshot(input) {
      await ensureInitialized();
      const screenshotResult = await callTool("mobile_screenshot", {
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });

      const imageContent = screenshotResult.content?.find(
        (entry) => entry.type === "image" && typeof entry.data === "string"
      );

      if (!imageContent?.data) {
        throw createError("MOBILE_MCP_COMMAND_FAILED", "mobile_screenshot did not return image content");
      }

      const extension = extensionFromMimeType(imageContent.mimeType);
      const screenshotPath = join(outputDir, `${randomId()}.${extension}`);
      const normalizedScreenshotPath = screenshotPath.replace(/\\/g, "/");

      await mkdir(outputDir, { recursive: true });
      await writeFile(normalizedScreenshotPath, Buffer.from(imageContent.data, "base64"));

      return { path: normalizedScreenshotPath };
    },
    async listDevices() {
      const result = await callTool("mobile_list_devices", {});
      const devices = parseTextPayload<Array<{ id: string; platform: "android"; state: string }>>(result, "mobile_list_devices");
      return devices.map((device) => ({ ...device, source: "mobile-mcp" as const } satisfies MobileMcpDevice));
    },
    async recentLogs(input) {
      const result = await callTool("mobile_recent_logs", {
        ...(input?.limit ? { limit: input.limit } : {})
      });
      return parseTextPayload<MetroLogEntry[]>(result, "mobile_recent_logs");
    },
    async launchApp(input) {
      const result = await callTool("mobile_launch_app", {
        appId: input.appId,
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return parseTextPayload<MobileAppActionResult>(result, "mobile_launch_app");
    },
    async terminateApp(input) {
      const result = await callTool("mobile_terminate_app", {
        appId: input.appId,
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return parseTextPayload<MobileAppActionResult>(result, "mobile_terminate_app");
    },
    async foregroundApp(input) {
      const result = await callTool("mobile_foreground_app", {
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return parseTextPayload<MobileForegroundAppResult>(result, "mobile_foreground_app");
    },
    async close() {
      await resetConnection();
    }
  };

  async function ensureClient(): Promise<McpClientLike> {
    if (connectedClient) {
      return connectedClient;
    }

    connectPromise ??= (async () => {
      const executablePath = await resolvePackageBin({
        packageName: "mobile-mcp",
        binName: "mobile-mcp",
        cwd
      });
      const transport = createTransport({
        command: nodeCommand,
        args: [executablePath],
        cwd,
        stderr: "pipe"
      });
      const client = createClient();
      await client.connect(transport);
      connectedClient = client;
      connectedTransport = transport;
      return client;
    })();

    return connectPromise;
  }

  async function ensureInitialized() {
    if (initialized) {
      return;
    }

    const result = await callTool("mobile_init", {});
    assertToolSuccess(result, "mobile_init");
    initialized = true;
  }

  async function callTool(name: string, args: Record<string, unknown>) {
    try {
      const client = await ensureClient();
      const result = await client.callTool({
        name,
        arguments: args
      });
      assertToolSuccess(result, name);
      return result;
    } catch (error) {
      await resetConnection();
      throw error;
    }
  }

  async function resetConnection() {
    const client = connectedClient;
    const transport = connectedTransport;

    connectedClient = undefined;
    connectedTransport = undefined;
    connectPromise = undefined;
    initialized = false;

    await client?.close?.();
    await transport?.close?.();
  }
}

function assertToolSuccess(result: McpClientCallResult, toolName: string) {
  if (result.isError) {
    throw createError("MOBILE_MCP_COMMAND_FAILED", `${toolName} failed`);
  }
}

function parseTextPayload<T>(result: McpClientCallResult, toolName: string): T {
  const text = result.content?.find((entry) => entry.type === "text" && typeof entry.text === "string")?.text;

  if (!text) {
    throw createError("MOBILE_MCP_COMMAND_FAILED", `${toolName} did not return text content`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw createError("MOBILE_MCP_COMMAND_FAILED", `${toolName} returned invalid JSON`);
  }
}

function extensionFromMimeType(mimeType?: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  return "png";
}
