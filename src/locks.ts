export class LockManager {
  private readonly queues = new Map<string, Promise<void>>();

  getQueueCount(): number {
    return this.queues.size;
  }

  async withLock<T>(key: string, work: () => Promise<T> | T): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const next = previous.then(() => current);
    this.queues.set(key, next);

    await previous;

    try {
      return await work();
    } finally {
      release();
      if (this.queues.get(key) === next) {
        this.queues.delete(key);
      }
    }
  }
}
