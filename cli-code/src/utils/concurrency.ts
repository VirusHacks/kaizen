export async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

export interface ConcurrencyResult<T> {
  successes: { index: number; result: T }[];
  failures: { index: number; error: unknown }[];
}

export async function runWithConcurrencySettled<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void
): Promise<ConcurrencyResult<R>> {
  const successes: { index: number; result: R }[] = [];
  const failures: { index: number; error: unknown }[] = [];
  let currentIndex = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        const result = await fn(items[index], index);
        successes.push({ index, result });
      } catch (error) {
        failures.push({ index, error });
      }
      completed++;
      onProgress?.(completed, items.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return { successes, failures };
}
