export type RingBufferToArrayOptions = {
  limit?: number;
};

export class RingBuffer<T> {
  readonly #capacity: number;
  readonly #items: T[] = [];

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("RingBuffer capacity must be a positive integer");
    }

    this.#capacity = capacity;
  }

  push(item: T): void {
    this.#items.push(item);

    if (this.#items.length > this.#capacity) {
      this.#items.shift();
    }
  }

  toArray(options: RingBufferToArrayOptions = {}): T[] {
    const { limit } = options;

    if (limit === undefined || limit >= this.#items.length) {
      return [...this.#items];
    }

    if (limit <= 0) {
      return [];
    }

    return this.#items.slice(-limit);
  }
}
