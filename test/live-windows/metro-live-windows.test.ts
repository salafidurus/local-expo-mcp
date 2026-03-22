import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import path from "node:path";
import { createExpoCliIntegration } from "../../src/integrations/expo-cli.js";

function resolveLiveProjectRoot(): string {
  return process.env.LIVE_EXPO_PROJECT_ROOT ?? path.resolve("test/live-projects/expo-smoke-app");
}

async function findOpenPort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine an open TCP port"));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

describe("metro live smoke", () => {
  it(
    "starts a real Metro instance and detects the dev server URL",
    async () => {
      const projectRoot = resolveLiveProjectRoot();
      const port = process.env.LIVE_METRO_PORT
        ? Number(process.env.LIVE_METRO_PORT)
        : await findOpenPort();
      const expoCli = createExpoCliIntegration({ metroStartTimeoutMs: 90_000 });

      const controller = await expoCli.startMetro({
        projectRoot,
        port,
        clear: true
      });

      try {
        expect(controller.pid).toBeGreaterThan(0);
        expect(controller.devServerUrl).toBe(`http://127.0.0.1:${port}`);
      } finally {
        await controller.stop();
      }
    },
    120_000
  );
});
