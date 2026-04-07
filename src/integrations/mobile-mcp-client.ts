import { mkdir as defaultMkdir, writeFile as defaultWriteFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  MetroLogEntry,
  MobileAppActionResult,
  MobileForegroundAppResult,
  MobileGestureResult,
  MobileMcpDevice,
  MobileUiNode,
  MobileMcpIntegration
} from "../app-context.js";
import { createError } from "../utils/errors.js";
import { readPackageVersion, resolvePackageBin as defaultResolvePackageBin } from "../utils/paths.js";

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
        version: readPackageVersion()
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
      await ensureInitialized();
      const result = await callTool("mobile_list_devices", {});
      const devices = parseTextPayload<Array<{ id: string; platform: "android"; state: string }>>(result, "mobile_list_devices");
      return devices.map((device) => ({ ...device, source: "mobile-mcp" as const } satisfies MobileMcpDevice));
    },
    async recentLogs(input) {
      await ensureInitialized();
      const result = await callTool("mobile_recent_logs", {
        ...(input?.limit ? { limit: input.limit } : {})
      });
      return parseTextPayload<MetroLogEntry[]>(result, "mobile_recent_logs");
    },
    async launchApp(input) {
      await ensureInitialized();
      const result = await callTool("mobile_launch_app", {
        appId: input.appId,
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return parseTextPayload<MobileAppActionResult>(result, "mobile_launch_app");
    },
    async terminateApp(input) {
      await ensureInitialized();
      const result = await callTool("mobile_terminate_app", {
        appId: input.appId,
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return parseTextPayload<MobileAppActionResult>(result, "mobile_terminate_app");
    },
    async foregroundApp(input) {
      await ensureInitialized();
      const result = await callTool("mobile_foreground_app", {
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return parseTextPayload<MobileForegroundAppResult>(result, "mobile_foreground_app");
    },
    async dumpUi(input) {
      await ensureInitialized();
      const result = await callTool("mobile_dump_ui", {
        ...(input?.deviceId ? { deviceId: input.deviceId } : {})
      });
      const raw = readTextPayload(result, "mobile_dump_ui");

      return {
        raw,
        nodes: parseUiNodes(raw)
      };
    },
    async tap(input) {
      await ensureInitialized();
      const result = await callTool("mobile_tap", {
        x: input.x,
        y: input.y,
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return toGestureResult("tap", input.deviceId, readTextPayload(result, "mobile_tap"));
    },
    async swipe(input) {
      await ensureInitialized();
      const result = await callTool("mobile_swipe", {
        startX: input.startX,
        startY: input.startY,
        endX: input.endX,
        endY: input.endY,
        ...(typeof input.duration === "number" ? { duration: input.duration } : {}),
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return toGestureResult("swipe", input.deviceId, readTextPayload(result, "mobile_swipe"));
    },
    async typeText(input) {
      await ensureInitialized();
      const result = await callTool("mobile_type", {
        text: input.text,
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return toGestureResult("type", input.deviceId, readTextPayload(result, "mobile_type"));
    },
    async keyPress(input) {
      await ensureInitialized();
      const result = await callTool("mobile_key_press", {
        key: input.key,
        ...(input.deviceId ? { deviceId: input.deviceId } : {})
      });
      return toGestureResult("key_press", input.deviceId, readTextPayload(result, "mobile_key_press"));
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
        binName: "mobile-mcp"
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
  const text = readTextPayload(result, toolName);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw createError("MOBILE_MCP_COMMAND_FAILED", `${toolName} returned invalid JSON`);
  }
}

function readTextPayload(result: McpClientCallResult, toolName: string): string {
  const text = result.content?.find((entry) => entry.type === "text" && typeof entry.text === "string")?.text;

  if (!text) {
    throw createError("MOBILE_MCP_COMMAND_FAILED", `${toolName} did not return text content`);
  }

  return text;
}

function toGestureResult(
  action: MobileGestureResult["action"],
  deviceId: string | undefined,
  message: string
): MobileGestureResult {
  return {
    action,
    ...(deviceId ? { deviceId } : {}),
    message
  };
}

type XmlNode = {
  text?: string;
  "content-desc"?: string;
  "resource-id"?: string;
  class?: string;
  bounds?: string;
  clickable?: string;
  enabled?: string;
  node?: XmlNode | XmlNode[];
  [key: string]: XmlNode | XmlNode[] | string | undefined;
};

function parseUiNodes(raw: string): MobileUiNode[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
  });
  const jsonObj = parser.parse(raw) as { hierarchy?: XmlNode } & XmlNode;
  const nodes: MobileUiNode[] = [];

  function walk(obj: unknown): void {
    if (!obj || typeof obj !== "object") {
      return;
    }

    const xmlObj = obj as XmlNode;
    const nodeData = xmlObj.node;
    if (nodeData) {
      const nodeArray = Array.isArray(nodeData) ? nodeData : [nodeData];
      for (const node of nodeArray) {
        nodes.push({
          text: node.text === "" ? undefined : node.text,
          contentDescription: node["content-desc"] === "" ? undefined : node["content-desc"],
          resourceId: node["resource-id"] === "" ? undefined : node["resource-id"],
          className: node.class === "" ? undefined : node.class,
          bounds: node.bounds === "" ? undefined : node.bounds,
          clickable: node.clickable === "true" ? true : node.clickable === "false" ? false : undefined,
          enabled: node.enabled === "true" ? true : node.enabled === "false" ? false : undefined
        });
        walk(node);
      }
    }

    for (const key of Object.keys(xmlObj)) {
      if (key !== "node") {
        walk(xmlObj[key]);
      }
    }
  }

  walk(jsonObj.hierarchy || jsonObj);
  return nodes;
}

function extensionFromMimeType(mimeType?: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  return "png";
}

