export type ManagedProcessName =
  | "metro"
  | "expo-mcp"
  | "mobile-mcp"
  | "android-run"
  | "ios-run";

export type ProcessStatus = "running" | "stopped" | "failed";

export type ProcessRecord = {
  name: ManagedProcessName;
  ownerKey: string;
  pid: number;
  cwd: string;
  startedAt: number;
  stoppedAt?: number;
  status: ProcessStatus;
  command: string;
  args: string[];
};

export class ProcessStore {
  readonly #records = new Map<string, ProcessRecord>();

  upsert(record: ProcessRecord): void {
    this.#records.set(this.#toKey(record.name, record.ownerKey), { ...record });
  }

  get(name: ManagedProcessName, ownerKey: string): ProcessRecord | undefined {
    const record = this.#records.get(this.#toKey(name, ownerKey));
    return record ? { ...record, args: [...record.args] } : undefined;
  }

  updateStatus(
    name: ManagedProcessName,
    ownerKey: string,
    status: ProcessStatus,
    stoppedAt?: number
  ): void {
    const key = this.#toKey(name, ownerKey);
    const current = this.#records.get(key);

    if (!current) {
      return;
    }

    this.#records.set(key, {
      ...current,
      status,
      stoppedAt: stoppedAt ?? current.stoppedAt
    });
  }

  #toKey(name: ManagedProcessName, ownerKey: string): string {
    return `${name}::${ownerKey}`;
  }
}
