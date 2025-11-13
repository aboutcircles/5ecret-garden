interface BatchOptions<T, R> {
  /**
   * Time (in ms) to wait after the first request before
   * firing off a batch fetch (e.g. 20 for your case).
   */
  waitTimeMs: number;

  /**
   * Maximum size of a single backend fetch call
   * (e.g. 50 if there's a limit in your fetch function).
   */
  maxBatchSize: number;

  /**
   * A function that takes an array of items (T) and returns
   * a Promise of a Map<T,R>, where each T in the input
   * is mapped to its result R.
   */
  fetchFunction: (items: T[]) => Promise<Map<T, R>>;
}

export class BatchAggregator<T, R> {
  private queue: Array<{
    item: T;
    resolve: (res: R) => void;
    reject: (err?: unknown) => void;
  }> = [];

  private batchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private options: BatchOptions<T, R>) {}

  public enqueue(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      // Add this request to the queue
      this.queue.push({ item, resolve, reject });

      // Schedule a timer if we haven't already
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(
          () => this.flush(),
          this.options.waitTimeMs
        );
      }
    });
  }

  private async flush() {
    this.batchTimeout = null;

    // Copy and clear out the queue
    const currentQueue = [...this.queue];
    this.queue.length = 0;

    // Process in chunks of `maxBatchSize`
    const chunkSize = this.options.maxBatchSize;
    for (let i = 0; i < currentQueue.length; i += chunkSize) {
      const slice = currentQueue.slice(i, i + chunkSize);
      const items = slice.map((q) => q.item);

      let resultMap: Map<T, R>;
      try {
        resultMap = await this.options.fetchFunction(items);
      } catch (err) {
        // If our fetchFunction fails, reject all requests in this chunk
        slice.forEach(({ reject }) => reject(err));
        continue; // Move on to next chunk
      }

      // Resolve each item’s promise
      for (const { item, resolve, reject } of slice) {
        if (resultMap.has(item)) {
          resolve(resultMap.get(item)!);
        } else {
          reject(new Error(`No result found for ${item}.`));
        }
      }
    }
  }
}
