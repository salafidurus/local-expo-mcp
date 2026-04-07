import { access, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { errorResult, okResult } from "../mcp/responses.js";
import { createError } from "../utils/errors.js";
import { normalizeProjectRoot } from "../utils/paths.js";

export type InspectProjectInput = {
  projectRoot: string;
};

export async function inspectProject(input: InspectProjectInput) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const packageJsonPath = path.join(projectRoot, "package.json");
  const appJsonPath = path.join(projectRoot, "app.json");
  const appConfigTsPath = path.join(projectRoot, "app.config.ts");
  const appConfigJsPath = path.join(projectRoot, "app.config.js");

  try {
    await access(packageJsonPath);
  } catch {
    return errorResult(
      createError("PROJECT_NOT_FOUND", "Project root does not contain a package.json", {
        projectRoot
      })
    );
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    packageManager?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  const hasExpoDependency = Boolean(dependencies.expo);
  const expoConfig = (await detectExpoConfig(appJsonPath, appConfigTsPath, appConfigJsPath)) ?? null;

  if (!hasExpoDependency && !expoConfig) {
    return errorResult(
      createError("PROJECT_NOT_EXPO", "Project root does not appear to be an Expo project", {
        projectRoot
      })
    );
  }

  const hasAndroid = await pathExists(path.join(projectRoot, "android"));
  const hasIos = await pathExists(path.join(projectRoot, "ios"));

  return okResult({
    projectRoot,
    projectType: "expo",
    packageManager: detectPackageManager(projectRoot, packageJson),
    expoConfig: expoConfig ?? undefined,
    hasAndroid,
    hasIos,
    recommendedNextStep: "metro_start"
  });
}

async function detectExpoConfig(...candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return path.basename(candidate);
    }
  }

  return undefined;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function detectPackageManager(projectRoot: string, packageJson: { packageManager?: string }): string {
  if (packageJson.packageManager) {
    return packageJson.packageManager.split("@")[0];
  }

  if (existsSync(path.join(projectRoot, "bun.lock")) || existsSync(path.join(projectRoot, "bun.lockb"))) {
    return "bun";
  }
  if (existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(path.join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }

  return "npm";
}

