import { RingBuffer } from "../utils/ring-buffer.js";

export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  level: LogLevel;
  text: string;
  at: number;
};

export class LogStore {
  readonly #capacity: number;
  readonly #buffers = new Map<string, RingBuffer<LogEntry>>();

  constructor(capacity = 500) {
    this.#capacity = capacity;
  }

  append(channel: string, entry: LogEntry): void {
    const buffer = this.#getOrCreate(channel);
    buffer.push(entry);
  }

  recent(channel: string, limit?: number): LogEntry[] {
    const buffer = this.#buffers.get(channel);
    if (!buffer) {
      return [];
    }

    return buffer.toArray({ limit });
  }

  #getOrCreate(channel: string): RingBuffer<LogEntry> {
    let buffer = this.#buffers.get(channel);

    if (!buffer) {
      buffer = new RingBuffer<LogEntry>(this.#capacity);
      this.#buffers.set(channel, buffer);
    }

    return buffer;
  }
}
