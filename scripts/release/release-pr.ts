import type { ReleaseNotes, ReleasePlan, ReleaseType } from "./release-plan.ts";

export type PendingReleaseState = {
  baseVersion: string;
  releaseType: ReleaseType;
  nextVersion: string;
  notes: ReleaseNotes;
};

export function mergeReleaseState(
  existing: PendingReleaseState | null,
  incoming: ReleasePlan,
  fallbackBaseVersion: string
): PendingReleaseState {
  const baseVersion = existing?.baseVersion ?? fallbackBaseVersion;
  const releaseType = maxReleaseType(existing?.releaseType, incoming.releaseType);
  const notes = mergeNotes(existing?.notes, incoming.notes);

  return {
    baseVersion,
    releaseType,
    nextVersion: bumpVersion(baseVersion, releaseType),
    notes
  };
}

export function renderReleasePrBody(version: string, notes: ReleaseNotes): string {
  const lines = [`## Release ${version}`, "", "### Included changes", ""];

  appendSection(lines, "Breaking", notes.breaking);
  appendSection(lines, "Added", notes.features);
  appendSection(lines, "Fixed", notes.fixes);
  appendSection(lines, "Changed", notes.others);


  return `${lines.join("\n").trimEnd()}\n`;
}

export function upsertReleaseChangelog(
  changelog: string,
  version: string,
  isoDate: string,
  notes: ReleaseNotes,
  previousPendingVersion?: string
): string {
  const normalized = changelog.replace(/\r\n/g, "\n");
  const unreleasedHeader = "## [Unreleased]";
  const unreleasedIndex = normalized.indexOf(unreleasedHeader);

  let manualNotes = "";
  let baseChangelog = normalized;

  if (unreleasedIndex !== -1) {
    const afterUnreleasedHeader = unreleasedIndex + unreleasedHeader.length;
    const nextSectionIndex = normalized.indexOf("\n## [", afterUnreleasedHeader);

    if (nextSectionIndex !== -1) {
      manualNotes = normalized.slice(afterUnreleasedHeader, nextSectionIndex).trim();
      baseChangelog = normalized.slice(0, afterUnreleasedHeader) + "\n" + normalized.slice(nextSectionIndex);
    } else {
      manualNotes = normalized.slice(afterUnreleasedHeader).trim();
      baseChangelog = normalized.slice(0, afterUnreleasedHeader) + "\n";
    }
  }

  const section = renderChangelogSection(version, isoDate, notes, manualNotes);

  if (previousPendingVersion) {
    const replaced = replaceReleaseSection(baseChangelog, previousPendingVersion, section);
    if (replaced !== baseChangelog) {
      return replaced;
    }
  }

  // If no previous pending section was found to replace, insert it after [Unreleased]
  const newUnreleasedIndex = baseChangelog.indexOf(unreleasedHeader);
  if (newUnreleasedIndex === -1) {
    return `${baseChangelog.trimEnd()}\n\n${section}`;
  }

  const afterUnreleased = newUnreleasedIndex + unreleasedHeader.length;
  return `${baseChangelog.slice(0, afterUnreleased)}\n\n${section}${baseChangelog.slice(afterUnreleased)}`;
}

function replaceReleaseSection(changelog: string, version: string, nextSection: string): string {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## \\[${escapedVersion}\\] - .*?(?=\\n## \\[|$)`, "s");

  if (!pattern.test(changelog)) {
    return changelog;
  }

  return changelog.replace(pattern, nextSection.trimEnd());
}

function renderChangelogSection(
  version: string,
  isoDate: string,
  notes: ReleaseNotes,
  manualNotes?: string
): string {
  const lines = [`## [${version}] - ${isoDate}`, ""];

  if (manualNotes) {
    lines.push(manualNotes, "");
  }

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

function appendSection(lines: string[], heading: string, items: string[]): void {
  if (items.length === 0) {
    return;
  }

  lines.push(`#### ${heading}`, "");
  for (const item of items) {
    lines.push(`- ${item}`);
  }
  lines.push("");
}

function mergeNotes(
  existing: ReleaseNotes | undefined,
  incoming: ReleaseNotes
): ReleaseNotes {
  return {
    breaking: unique([...(existing?.breaking ?? []), ...incoming.breaking]),
    features: unique([...(existing?.features ?? []), ...incoming.features]),
    fixes: unique([...(existing?.fixes ?? []), ...incoming.fixes]),
    others: unique([...(existing?.others ?? []), ...incoming.others])
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function maxReleaseType(
  left: ReleaseType | undefined,
  right: ReleaseType
): ReleaseType {
  const severity: Record<ReleaseType, number> = {
    patch: 1,
    minor: 2,
    major: 3
  };

  if (!left) {
    return right;
  }

  return severity[left] >= severity[right] ? left : right;
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
