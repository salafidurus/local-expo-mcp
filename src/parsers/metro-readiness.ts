export type MetroReadinessParseResult = {
  ready: boolean;
  devServerUrl?: string;
  protocolHint?: "http" | "exp";
};

export function parseMetroReadinessLine(line: string): MetroReadinessParseResult {
  if (/Webpack waiting on/i.test(line)) {
    return { ready: false };
  }

  const httpMatch = line.match(/(?:Metro waiting on|Waiting on)\s+(http:\/\/[\w.-]+:\d+)/i);
  if (httpMatch) {
    return {
      ready: true,
      devServerUrl: httpMatch[1],
      protocolHint: "http"
    };
  }

  const expMatch = line.match(/Waiting on\s+(exp:\/\/[\w.-]+:\d+)/i);
  if (expMatch) {
    return {
      ready: false,
      protocolHint: "exp"
    };
  }

  return { ready: false };
}
