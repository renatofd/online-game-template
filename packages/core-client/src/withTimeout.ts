/** Thrown by `withTimeout` when the promise did not settle in time. */
export class TimeoutError extends Error {
  constructor(message = "timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Settles like `promise`, or rejects with a TimeoutError after `ms`.
 * The original promise keeps running; callers clean up its late result if needed.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
