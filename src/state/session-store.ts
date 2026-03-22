export type MetroSessionState = {
  pid: number;
  port: number;
  devServerUrl: string;
  startedAt: number;
};

export type AttachedExpoMcpState = {
  status: "attached" | "detached" | "failed";
  startedAt: number;
  pid?: number;
};

export type AndroidRunState = {
  startedAt: number;
  status: "success" | "failed" | "running";
  phase?: string;
  summary?: string;
};

export type ProjectSessionState = {
  projectRoot: string;
  projectType?: string;
  metro?: MetroSessionState;
  attachedExpoMcp?: AttachedExpoMcpState;
  lastAndroidRun?: AndroidRunState;
};

export class SessionStore {
  readonly #sessions = new Map<string, ProjectSessionState>();

  get(projectRoot: string): ProjectSessionState | undefined {
    const key = normalizeProjectRoot(projectRoot);
    const session = this.#sessions.get(key);
    return session ? structuredClone(session) : undefined;
  }

  upsert(session: ProjectSessionState): void {
    const normalized = normalizeProjectRoot(session.projectRoot);
    this.#sessions.set(normalized, {
      ...session,
      projectRoot: normalized
    });
  }

  merge(projectRoot: string, patch: Partial<ProjectSessionState>): void {
    const key = normalizeProjectRoot(projectRoot);
    const current = this.#sessions.get(key) ?? { projectRoot: key };
    const hasMetro = Object.prototype.hasOwnProperty.call(patch, "metro");
    const hasAttachedExpoMcp = Object.prototype.hasOwnProperty.call(patch, "attachedExpoMcp");
    const hasLastAndroidRun = Object.prototype.hasOwnProperty.call(patch, "lastAndroidRun");

    this.#sessions.set(key, {
      ...current,
      ...patch,
      projectRoot: key,
      metro: hasMetro ? patch.metro : current.metro,
      attachedExpoMcp: hasAttachedExpoMcp ? patch.attachedExpoMcp : current.attachedExpoMcp,
      lastAndroidRun: hasLastAndroidRun ? patch.lastAndroidRun : current.lastAndroidRun
    });
  }
}

function normalizeProjectRoot(projectRoot: string): string {
  return projectRoot.replace(/\\/g, "/").replace(/\/+$/, "");
}
