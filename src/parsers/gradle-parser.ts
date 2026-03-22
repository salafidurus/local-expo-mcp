export type GradleFailure = {
  type: "dependency_resolution" | "sdk_ndk_mismatch" | "signing_config" | "adb_install_failure";
  summary: string;
  suggestedFixes: string[];
};

export function parseGradleFailure(output: string): GradleFailure | undefined {
  const lines = output.split(/\r?\n/).map((line) => line.trim());

  const dependencyLine = lines.find((line) => {
    const normalized = line.replace(/^>\s+/, "");
    return /^Could not resolve\s+/i.test(normalized) && !/all files for configuration/i.test(normalized);
  });

  if (dependencyLine) {
    const summary = dependencyLine.replace(/^>\s+/, "").replace(/[.]+$/, "");
    return {
      type: "dependency_resolution",
      summary,
      suggestedFixes: [
        "Verify Maven repository configuration",
        "Check dependency coordinates and version alignment",
        "Re-run after refreshing Gradle dependencies if configuration is correct"
      ]
    };
  }

  return undefined;
}
