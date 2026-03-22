import { createServer } from "node:net";

export async function isTcpPortAvailable(port: number, host = "127.0.0.1"): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function findAvailableTcpPort(host = "127.0.0.1"): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();

    server.once("error", reject);

    server.listen(0, host, () => {
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
  });
}
