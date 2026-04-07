import { renderChangelogSection, type ReleaseNotes } from "./release-plan.ts";

export function parseUnreleased(changelog: string): ReleaseNotes | null {
  const match = /## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|$)/i.exec(changelog);
  if (!match) return null;

  const section = match[1];
  const notes: ReleaseNotes = { breaking: [], features: [], fixes: [], others: [] };

  const blocks: Array<[RegExp, keyof ReleaseNotes]> = [
    [/### Breaking\b([\s\S]*?)(?=\n###|$)/i, "breaking"],
    [/### Added\b([\s\S]*?)(?=\n###|$)/i, "features"],
    [/### Fixed\b([\s\S]*?)(?=\n###|$)/i, "fixes"],
    [/### Changed\b([\s\S]*?)(?=\n###|$)/i, "others"]
  ];

  for (const [pattern, key] of blocks) {
    const block = pattern.exec(section);
    if (!block) continue;
    const items = [...block[1].matchAll(/^- (.+)$/gm)].map(m => m[1].trim());
    notes[key].push(...items);
  }

  return Object.values(notes).some(arr => arr.length > 0) ? notes : null;
}

export function upsertReleaseChangelog(
  changelog: string,
  version: string,
  isoDate: string,
  notes: ReleaseNotes,
  previousPendingVersion?: string
): string {
  const normalized = changelog.replace(/\r\n/g, "\n");
  const section = renderChangelogSection(version, isoDate, notes);

  if (previousPendingVersion) {
    const replaced = replaceReleaseSection(normalized, previousPendingVersion, section);
    if (replaced !== normalized) {
      return replaced;
    }
  }

  // Purely automated insertion: find the first version header or insert after intro
  const firstVersionIndex = normalized.indexOf("\n## [");
  if (firstVersionIndex !== -1) {
    return `${normalized.slice(0, firstVersionIndex)}\n\n${section}\n${normalized.slice(firstVersionIndex).trimStart()}`;
  }

  // Fallback: after the first two lines (Title + empty line) or at top
  const secondNewline = normalized.indexOf("\n", normalized.indexOf("\n") + 1);
  if (secondNewline !== -1) {
    const insertAt = secondNewline + 1;
    return `${normalized.slice(0, insertAt)}\n${section}\n${normalized.slice(insertAt).trimStart()}`;
  }

  return `${section}\n\n${normalized}`;
}

function replaceReleaseSection(changelog: string, version: string, nextSection: string): string {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## \\[${escapedVersion}\\] - .*?(?=\\n## \\[|$)`, "s");

  if (!pattern.test(changelog)) {
    return changelog;
  }

  return changelog.replace(pattern, nextSection.trimEnd());
}

