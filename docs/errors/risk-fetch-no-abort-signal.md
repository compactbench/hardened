# `risk/fetch-no-abort-signal`

| Severity | Auto-fix | Category |
| --- | --- | --- |
| 🟡 warning | no (finding-only) | risk |

## Why this matters

`fetch()` without an `AbortSignal` cannot be aborted by the caller. In a React app, a fetch started in an effect that runs during a route change will keep running after the user navigates away. The promise eventually resolves (or rejects) and updates state on an unmounted component, leading to memory leaks and occasionally a stale render slipping through. In a Node.js request handler, an unabortable fetch holds the request alive past the intended deadline — the same hang pattern as a missing timeout.

## What the rule detects

Calls to the global `fetch(url, ...)` where no argument is an options object carrying a `signal` property. The rule deliberately targets the global `fetch` only — a method call on a user object that happens to be named `fetch` (GraphQL clients, domain-specific HTTP wrappers) is out of scope.

## Why this rule is finding-only

Threading an `AbortSignal` through a codebase is not a local transformation. The signal has to come from somewhere — a `useEffect` cleanup, an outer request context, an explicit `AbortController` the caller creates. Different callsites want different lifecycle bindings. Auto-injecting an `AbortController` without scope analysis produces code that compiles but doesn't actually abort the work. Better to surface the finding and leave the decision to a human.

## Example patterns to reach for

### React component with cleanup

```tsx
useEffect(() => {
  const controller = new AbortController()
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setUser)
  return () => controller.abort()
}, [userId])
```

### Request-scoped signal in a handler

```ts
export async function handler(req: Request): Promise<Response> {
  const res = await fetch("https://upstream.example.com/data", {
    signal: req.signal,
  })
  return new Response(res.body, { status: res.status })
}
```

### Timeout + AbortSignal together

```ts
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 10_000)
try {
  const res = await fetch(url, { signal: controller.signal })
  return await res.json()
} finally {
  clearTimeout(timeout)
}
```

## When to silence

- Intentionally fire-and-forget calls where abort semantics do not matter (but prefer `Promise.allSettled` + explicit fire-and-forget helpers)
- Scripts or one-off CLIs where the process lifetime bounds the fetch

```ts
// hardened-ignore-next-line
await fetch("/health", { method: "POST" })
```

## Related rules

- [`risk/http-no-timeout`](./risk-http-no-timeout.md) — a missing timeout has similar consequences to a missing signal
- [`risk/floating-promise`](./risk-floating-promise.md) — a bare fetch statement that's also floating
