# `risk/http-no-timeout`

| Severity | Auto-fix | Category |
| --- | --- | --- |
| 🔴 error | yes | risk |

## Why this matters

HTTP calls without a per-request timeout can hang indefinitely when the remote side stops responding — network partition, upstream deadlock, misconfigured load balancer dropping packets silently. The Node.js event loop doesn't help here; the promise simply never resolves. Pending work piles up. Memory climbs. Eventually a platform-level timeout (reverse proxy, Kubernetes liveness probe) kills the process, cascading into dropped requests from other users.

A caller-side deadline converts an unbounded wait into a fast, observable failure for your code path: the caller gets an exception in a known time and can retry or fall back. The wrapped client operation may continue underneath unless the client also receives its own native timeout or abort option.

## What the rule detects

Calls of the form `<client>.METHOD(...)` where the proven HTTP client config argument does not carry a `timeout` property, for five HTTP client families:

- `axios.get/post/put/delete/patch/head/options`
- `got.get/post/put/delete/patch/head`
- `ky.get/post/put/delete/patch/head`
- `http.request`, `http.get`, and the `https` variants
- Any identifier bound to `axios.create(...)`, `got.extend(...)`, `ky.create(...)`, or `ky.extend(...)` (instance clients — including `this.api.get(...)` in class methods)

## Example

### Before

```ts
import axios from "axios"

export async function getOrder(orderId: string) {
  return axios.get(`/api/orders/${orderId}`)
}
```

### After (`hardened risk fix`)

```ts
import axios from "axios"
import { resilient } from "hardened-runtime"

export async function getOrder(orderId: string) {
  return resilient(() => axios.get(`/api/orders/${orderId}`), {
    timeout: 10_000,
    retries: 3,
  })
}
```

Idempotent methods (`get`, `head`, `options`) get retries by default. Writes (`post`, `put`, `patch`, `delete`) get a timeout but no auto-retry — retrying a write without an idempotency key can duplicate side effects.

## When to silence

Legitimate reasons to keep an unbounded call:

- A streaming endpoint intentionally held open (server-sent events, long polling)
- A tool that shells out to a local process and genuinely has no expected upper bound
- Test code that mocks the client

Put the directive before the call. Blank lines and comment-only lines may sit between the directive and the call; the directive applies only to the next non-comment, non-blank line.

```ts
// hardened-ignore-next-line
return axios.get("/internal/stream", { responseType: "stream" })
```

## Related rules

- [`risk/fetch-no-abort-signal`](./risk-fetch-no-abort-signal.md) — same concern for `fetch()` calls
- [`risk/db-no-query-timeout`](./risk-db-no-query-timeout.md) — same concern for database queries
