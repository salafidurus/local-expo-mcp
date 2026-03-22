export type ParsedMetroError = {
  type: "module_resolution" | "typescript" | "babel_parse" | "asset_resolution" | "runtime";
  message: string;
  file?: string;
  line?: number;
  column?: number;
  suggestedFixes: string[];
};

export function parseMetroErrorText(text: string): ParsedMetroError | undefined {
  const normalized = text.replace(/\\/g, "/").trim();

  return (
    parseModuleResolution(normalized) ??
    parseTypeScript(normalized) ??
    parseBabelParse(normalized) ??
    parseAssetResolution(normalized) ??
    parseRuntime(normalized)
  );
}

function parseModuleResolution(text: string): ParsedMetroError | undefined {
  const match = text.match(/Unable to resolve module\s+([^\s]+)\s+from\s+(.+?)(?::\s|:\r?\n|\r?\n|$)/i);
  if (!match) {
    return undefined;
  }

  return {
    type: "module_resolution",
    file: match[2],
    message: `Unable to resolve module ${match[1]}`,
    suggestedFixes: [
      "Check that the target file exists at the expected path.",
      "Check import path casing and relative path segments.",
      "Check whether the import relies on an extension or platform-specific file that does not exist."
    ]
  };
}

function parseTypeScript(text: string): ParsedMetroError | undefined {
  const match = text.match(/ERROR in\s+(.+?):(\d+):(\d+)\s*[\r\n]+(TS\d+:\s*.+)/i);
  if (!match) {
    return undefined;
  }

  return {
    type: "typescript",
    file: match[1],
    line: Number(match[2]),
    column: Number(match[3]),
    message: match[4].trim(),
    suggestedFixes: [
      "Check the reported property or symbol name against the declared TypeScript type.",
      "Update the type definition or narrow the value before using it.",
      "Run the TypeScript compiler directly if you need a fuller diagnostic trace."
    ]
  };
}

function parseBabelParse(text: string): ParsedMetroError | undefined {
  const match = text.match(/SyntaxError:\s*((?:[A-Za-z]:)?[^:\n]+):\s*(.+?)\s*\((\d+):(\d+)\)/i);
  if (!match) {
    return undefined;
  }

  return {
    type: "babel_parse",
    file: match[1],
    line: Number(match[3]),
    column: Number(match[4]),
    message: match[2].trim(),
    suggestedFixes: [
      "Inspect the syntax near the reported line and column.",
      "Check for unclosed JSX, parentheses, braces, or commas.",
      "If Babel syntax support is expected, verify the relevant Expo or Babel configuration."
    ]
  };
}

function parseAssetResolution(text: string): ParsedMetroError | undefined {
  const match = text.match(/Unable to resolve asset\s+([^\s]+)\s+from\s+(.+?)(?::\s|:\r?\n|\r?\n|$)/i);
  if (!match) {
    return undefined;
  }

  return {
    type: "asset_resolution",
    file: match[2],
    message: `Unable to resolve asset ${match[1]}`,
    suggestedFixes: [
      "Check that the asset file exists and is committed at the expected path.",
      "Check the asset import path casing and relative path.",
      "Check whether Metro asset extensions or Expo asset handling need to be updated."
    ]
  };
}

function parseRuntime(text: string): ParsedMetroError | undefined {
  if (!text) {
    return undefined;
  }

  return {
    type: "runtime",
    message: firstLine(text),
    suggestedFixes: [
      "Inspect the latest Metro error and related source file.",
      "Check the stack trace or redbox details in the running app.",
      "Re-run the failing flow after clearing Metro if the error appears stale."
    ]
  };
}

function firstLine(text: string): string {
  return text.split(/\r?\n/, 1)[0] ?? text;
}
