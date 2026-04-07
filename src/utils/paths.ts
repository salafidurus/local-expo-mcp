import { dirname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PackageJson = {
  bin?: string | Record<string, string>;
};

export async function resolvePackageBin(input: {
  packageName: string;
  binName?: string;
}): Promise<string> {
  const packageJsonPath = require.resolve(`${input.packageName}/package.json`);
  const packageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8")
  ) as PackageJson;

  const relativeBinPath = resolveBinPath(packageJson.bin, input.packageName, input.binName);
  return resolve(dirname(packageJsonPath), relativeBinPath);
}

function resolveBinPath(
  binField: PackageJson["bin"],
  packageName: string,
  requestedBinName?: string
): string {
  if (!binField) {
    throw new Error(`Package ${packageName} does not declare a bin entry`);
  }

  if (typeof binField === "string") {
    return binField;
  }

  if (requestedBinName) {
    const declared = binField[requestedBinName];
    if (!declared) {
      throw new Error(`Package ${packageName} does not declare bin ${requestedBinName}`);
    }
    return declared;
  }

  const entries = Object.values(binField);
  if (entries.length !== 1) {
    throw new Error(
      `Package ${packageName} declares multiple bins; a binName is required`
    );
  }

  return entries[0];
}

export function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function readPackageVersion(): string {
  const packageJson = require("../../package.json") as { version: string };
  return packageJson.version;
}
