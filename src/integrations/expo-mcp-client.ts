import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ExpoMcpIntegration } from "../app-context.js";
import { resolvePackageBin as defaultResolvePackageBin } from "../utils/paths.js";

type McpClientLike = {
  connect: (transport: unknown) => Promise<void>;
  close?: () => Promise<void> | void;
};

type TransportLike = {
  pid: number | null;
  close?: () => Promise<void> | void;
};

export function createExpoMcpIntegration(input?: {
  clock?: () => number;
  cwd?: string;
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
}): ExpoMcpIntegration {
  const clock = input?.clock ?? (() => Date.now());
  const cwd = input?.cwd ?? process.cwd();
  const nodeCommand = input?.nodeCommand ?? process.execPath;
  const resolvePackageBin = input?.resolvePackageBin ?? defaultResolvePackageBin;
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

  return {
    async attach({ projectRoot, devServerUrl }) {
      const executablePath = await resolvePackageBin({
        packageName: "expo-mcp",
        binName: "expo-mcp",
        cwd
      });

      const transport = createTransport({
        command: nodeCommand,
        args: [executablePath, "--dev-server-url", devServerUrl],
        cwd: projectRoot,
        stderr: "pipe"
      });
      const client = createClient();
      await client.connect(transport);

      return {
        pid: transport.pid ?? -1,
        status: "attached",
        startedAt: clock(),
        async detach() {
          await client.close?.();
          await transport.close?.();
        }
      };
    }
  };
}
