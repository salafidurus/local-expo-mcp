export type ReleaseCommit = {
  hash: string;
  subject: string;
  body: string;
};

export type ReleaseType = "major" | "minor" | "patch";

export type ReleaseNotes = {
  breaking: string[];
  features: string[];
  fixes: string[];
  others: string[];
};

export type ReleasePlan = {
  releaseType: ReleaseType;
  nextVersion: string;
  notes: ReleaseNotes;
};

export function analyzeReleasePlan(
  currentVersion: string,
  commits: ReleaseCommit[]
): ReleasePlan | null {
  let releaseType: ReleaseType | null = null;
  const notes: ReleaseNotes = {
    breaking: [],
    features: [],
    fixes: [],
    others: []
  };

  for (const commit of commits) {
    const summary = normalizeSummary(commit.subject);
    const breaking = isBreakingChange(commit);

    if (breaking) {
      releaseType = "major";
      notes.breaking.push(summary);
      continue;
    }

    if (commit.subject.startsWith("feat:")) {
      releaseType = releaseType === "major" ? "major" : "minor";
      notes.features.push(summary);
      continue;
    }

    if (commit.subject.startsWith("fix:") || commit.subject.startsWith("perf:")) {
      if (releaseType !== "major" && releaseType !== "minor") {
        releaseType = "patch";
      }
      notes.fixes.push(summary);
      continue;
    }

    if (isReleaseRelevant(commit.subject)) {
      if (releaseType === null) {
        releaseType = "patch";
      }
      notes.others.push(summary);
    }
  }

  if (releaseType === null) {
    return null;
  }

  return {
    releaseType,
    nextVersion: bumpVersion(currentVersion, releaseType),
    notes
  };
}

export function renderChangelogSection(
  version: string,
  isoDate: string,
  notes: ReleaseNotes
): string {
  const lines = [`## [${version}] - ${isoDate}`, ""];

  if (notes.breaking.length > 0) {
    lines.push("### Breaking", "");
    for (const item of notes.breaking) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (notes.features.length > 0) {
    lines.push("### Added", "");
    for (const item of notes.features) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (notes.fixes.length > 0) {
    lines.push("### Fixed", "");
    for (const item of notes.fixes) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (notes.others.length > 0) {
    lines.push("### Changed", "");
    for (const item of notes.others) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function bumpVersion(version: string, releaseType: ReleaseType): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (releaseType === "major") {
    return `${major + 1}.0.0`;
  }

  if (releaseType === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function isBreakingChange(commit: ReleaseCommit): boolean {
  return commit.subject.includes("!:") || /BREAKING CHANGE:/m.test(commit.body);
}

function isReleaseRelevant(subject: string): boolean {
  return /^(refactor|build|ci):/.test(subject);
}

function normalizeSummary(subject: string): string {
  return subject.replace(/^[a-z]+(?:\(.+\))?!?:\s*/i, "").trim();
}
