import type { AppContext } from "../app-context.js";
import { createMetroStartHandler } from "./metro-start.js";
import { createMetroStopHandler } from "./metro-stop.js";

export function createMetroRestartHandler(context: AppContext) {
  const stopMetro = createMetroStopHandler(context);
  const startMetro = createMetroStartHandler(context);

  return async function metroRestart(input: {
    projectRoot: string;
    port: number;
    clear?: boolean;
  }) {
    await stopMetro({ projectRoot: input.projectRoot });
    return await startMetro(input);
  };
}
