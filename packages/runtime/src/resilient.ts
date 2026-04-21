import {
  ConstantBackoff,
  ExponentialBackoff,
  TimeoutStrategy,
  handleAll,
  retry,
  timeout,
  wrap,
} from "cockatiel"

export interface ResilientOpts {
  /** Caller-side deadline in milliseconds. 0 disables. Default 10_000. */
  timeout?: number
  /** Retry attempts on failure. 0 disables. Default 0. */
  retries?: number
  /** Backoff strategy between retries. Default "exponential". */
  backoff?: "exponential" | "constant"
  /** Base delay in ms for backoff. Default 200. */
  backoffMs?: number
}

/**
 * Wraps a Promise-returning function with timeout + retry policies.
 * Timeout is a caller-side deadline: the returned promise rejects when it
 * fires; the wrapped operation continues unless it honors AbortSignal.
 * Defaults: 10s timeout, no retries.
 */
export async function resilient<T>(
  fn: () => Promise<T>,
  opts: ResilientOpts = {},
): Promise<T> {
  const {
    timeout: timeoutMs = 10_000,
    retries = 0,
    backoff = "exponential",
    backoffMs = 200,
  } = opts

  const policies = []

  if (timeoutMs > 0) {
    policies.push(timeout(timeoutMs, TimeoutStrategy.Aggressive))
  }

  if (retries > 0) {
    const backoffPolicy =
      backoff === "constant"
        ? new ConstantBackoff(backoffMs)
        : new ExponentialBackoff({ initialDelay: backoffMs })
    policies.push(
      retry(handleAll, {
        maxAttempts: retries,
        backoff: backoffPolicy,
      }),
    )
  }

  if (policies.length === 0) {
    return fn()
  }
  if (policies.length === 1) {
    return policies[0]!.execute(fn)
  }
  return wrap(...(policies as [typeof policies[0], ...typeof policies])).execute(fn)
}
