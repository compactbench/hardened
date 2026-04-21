# `risk/promise-all-no-settled`

| Severity | Auto-fix | Category |
| --- | --- | --- |
| 🔵 info | no (finding-only) | risk |

## Why this matters

`Promise.all([...])` short-circuits on the first rejection — as soon as any promise rejects, the outer promise rejects too, and the remaining promises keep running but their results are discarded. For a "fan-out" pattern (metrics to three destinations, webhooks to three subscribers, replicated writes to three regions) that's usually the wrong semantic: Datadog being down shouldn't prevent CloudWatch and Prometheus from receiving the same sample.

`Promise.allSettled([...])` returns an array of per-promise outcomes so the caller can observe partial failure and decide what to do — log the ones that failed, page oncall if quorum drops, retry the laggards.

For required-data loads (fetch user, orders, and invoice together for a billing page) `Promise.all` remains correct: if any of the three fails, the caller can't render a useful page anyway, so failing fast is fine.

## What the rule detects

`Promise.all([...])` calls whose result is **discarded** — specifically, the call appears as a bare `ExpressionStatement` (typically right after `await`, not assigned to anything). This shape is the fan-out fingerprint: nothing consumes the results, so the whole point was to fire the work in parallel.

Destructured or assigned results (`const [a, b] = await Promise.all([...])`) are correctly identified as required-data loads and not flagged.

## Why this rule is finding-only

The fix swaps the return shape from `T[]` to `PromiseSettledResult<T>[]`, and the caller usually wants to do something with the `.status === "rejected"` entries (log them, page oncall, retry). Auto-replacing strips the opportunity for that deliberate handling.

## Example

### Before

```ts
export async function broadcastMetric(event: MetricEvent): Promise<void> {
  await Promise.all([
    datadog.report(event),
    cloudwatch.report(event),
    prometheus.report(event),
  ])
}
```

If Datadog returns a 503, CloudWatch and Prometheus writes are still in flight — but the outer function rejects and the caller probably retries the whole broadcast, double-sending to the two healthy destinations.

### After

```ts
export async function broadcastMetric(event: MetricEvent): Promise<void> {
  const results = await Promise.allSettled([
    datadog.report(event),
    cloudwatch.report(event),
    prometheus.report(event),
  ])
  for (const [i, r] of results.entries()) {
    if (r.status === "rejected") {
      const sink = ["datadog", "cloudwatch", "prometheus"][i]
      logger.warn({ err: r.reason, sink }, "metric sink failed")
    }
  }
}
```

Each sink is attempted independently. Failures are logged, not swallowed, and the other sinks aren't penalized.

## Known-safe exception: React Query cache-control fan-outs

The canonical React Query mutation-success pattern is:

```ts
onSuccess: async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["users"] }),
    queryClient.invalidateQueries({ queryKey: ["projects"] }),
  ])
}
```

Here `Promise.all`'s short-circuit-on-reject is the correct semantic — if a cache invalidation fails, the error should propagate so the caller can react, not be silently buried inside a `PromiseSettledResult`. The rule recognizes this shape and **skips findings** when every element of the array is a method call in the known-safe cache-control set:

| Callee | Source |
| --- | --- |
| `invalidateQueries` | React Query / TanStack Query |
| `refetchQueries` | React Query / TanStack Query |
| `fetchQuery` | React Query / TanStack Query |
| `prefetchQuery` | React Query / TanStack Query |
| `removeQueries` | React Query / TanStack Query |
| `resetQueries` | React Query / TanStack Query |
| `cancelQueries` | React Query / TanStack Query |

Two adjacent shapes are also accepted as safe so the common idioms don't leak:

**Conditional branches** — both the `when-true` and `when-false` of a ternary are evaluated; the element is safe iff both branches are safe.

```ts
// Safe — both branches are safe-fan-out elements.
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["loads"] }),
  quoteRequestId
    ? queryClient.invalidateQueries({ queryKey: ["quote", quoteRequestId] })
    : Promise.resolve(),
])
```

**`Promise.resolve()`** — treated as a safe no-op, since it's common as the else-branch of a conditional invalidation.

A single non-safe element disables the skip. Mixed fan-outs still flag, because the presence of a different call usually means the caller is doing real work whose failure it probably wants to see:

```ts
// Flagged — sendNotification's failure would mask the invalidations.
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["users"] }),
  sendNotification("admin"),
])
```

### What the rule does NOT yet skip (v0.1 scope gap)

Variable-bound arrays and user wrapper functions still flag even if every underlying call is a cache-control operation:

```ts
// Flagged in v0.1 — rule doesn't yet trace variable bindings.
const invalidations = [
  queryClient.invalidateQueries({ queryKey: ["a"] }),
  queryClient.invalidateQueries({ queryKey: ["b"] }),
]
if (id) {
  invalidations.push(
    queryClient.invalidateQueries({ queryKey: ["c", id] }),
  )
}
await Promise.all(invalidations)

// Flagged in v0.1 — user-defined wrapper names aren't in the callee set.
await Promise.all([
  invalidateMyDomainQueries(id),
  queryClient.invalidateQueries({ queryKey: ["shared"] }),
])
```

If your codebase uses either pattern frequently, silence individual sites with:

```ts
// hardened-ignore-next-line
await Promise.all(invalidations)
```

Proper variable-binding tracking is planned for v0.1.x.

## When to silence

- **Required-data loads.** Usually not flagged (result is assigned), but edge cases with side effects in the promises may want an explicit ignore.
- **Transactional semantics.** When all-or-nothing is the invariant — e.g. writing to three replicas where a partial write is worse than no write — `Promise.all` is correct.

```ts
// hardened-ignore-next-line
await Promise.all([write(a), write(b), write(c)])  // all-or-nothing by design
```

## Related rules

- [`risk/await-in-loop`](./risk-await-in-loop.md) — the opposite problem: serialized when parallel was the goal
- [`risk/floating-promise`](./risk-floating-promise.md) — a single call with no error handling
