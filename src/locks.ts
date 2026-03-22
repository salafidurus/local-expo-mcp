export class LockManager {
  readonly #queues = new Map<string, Promise<void>>();

  async withLock<T>(key: string, work: () => Promise<T> | T): Promise<T> {
    const previous = this.#queues.get(key) ?? Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.#queues.set(key, previous.then(() => current));

    await previous;

    try {
      return await work();
    } finally {
      release();
      const latest = this.#queues.get(key);
      if (latest === current || latest === previous.then(() => current)) {
        this.#queues.delete(key);
      }
    }
  }
}
