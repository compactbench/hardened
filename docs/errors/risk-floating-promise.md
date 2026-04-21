# `risk/floating-promise`

| Severity | Auto-fix | Category |
| --- | --- | --- |
| 🟡 warning | no (finding-only) | risk |

## Why this matters

A Promise-returning call that is neither `await`ed nor `.catch()`-handled silently swallows any rejection. In production, this means an upstream API blip, a transient DB connection error, or a validation failure becomes an invisible NaN — no log, no metric, no stack trace. The failure only surfaces when its secondary effects do: a user sees stale data, a counter didn't increment, a webhook never fired.

Node.js prints unhandled-rejection warnings but the default policy (`--unhandled-rejections=warn`) often gets silenced by frameworks or suppressed by log filters. Even when visible, a warning lacks the callsite context you'd get from an exception chain.

## What the rule detects

An `ExpressionStatement` whose inner expression is a `CallExpression` matching one of these callee patterns:

- Starts with `axios.` (any method)
- Is `fetch` exactly
- Ends with `.then`, `.fetch`, `.save`, `.query`, `.exec`, or `.execute`

And not any of:

- Wrapped in `await`
- Chained with `.then(...)` or `.catch(...)`

This overlaps with `@typescript-eslint/no-floating-promises`. `hardened` keeps this rule because it runs without type-aware ESLint setup, stays self-contained with the rest of `hardened risk scan`, and is idempotent alongside TS-ESLint rather than a replacement for it.

## Why this rule is finding-only

The correct fix is intent-dependent. `await`ing changes control flow and might create unwanted serialization. Adding `.catch(logger.error)` is often right but throws away context about which error-handling policy the project actually wants. `void someCall()` and explicit fire-and-forget helpers are sometimes the clean answer. Auto-applying any one of these masks the decision.

## Example

### Before

```ts
import { db } from "./db"

export function pruneOldLogs(): void {
  db.query("DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'")
}
```

If the DB connection drops, the DELETE silently fails and logs accumulate forever.

### After options

```ts
// (a) Await if the caller should know the outcome.
export async function pruneOldLogs(): Promise<void> {
  await db.query("DELETE FROM logs WHERE ...")
}

// (b) Fire-and-forget with explicit error handling.
export function pruneOldLogs(): void {
  db.query("DELETE FROM logs WHERE ...")
    .catch((err) => logger.error({ err }, "log prune failed"))
}

// (c) Explicit fire-and-forget with the void operator.
export function pruneOldLogs(): void {
  void db.query("DELETE FROM logs WHERE ...")
}
```

Pick the one your team's error-handling conventions dictate.

## When to silence

- Calls that are genuinely fire-and-forget AND whose library already handles errors internally (some metrics SDKs, telemetry shippers)

```ts
// hardened-ignore-next-line
metrics.reportEvent("user.signup", { tier })
```

## Related rules

- [`risk/await-in-loop`](./risk-await-in-loop.md) — opposite problem: awaiting when you shouldn't serialize
- [`risk/promise-all-no-settled`](./risk-promise-all-no-settled.md) — fan-out patterns where one failure shouldn't abort the batch
