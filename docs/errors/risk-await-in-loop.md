# `risk/await-in-loop`

| Severity | Auto-fix | Category |
| --- | --- | --- |
| 🟡 warning | no (finding-only) | risk |

## Why this matters

`await` inside a loop runs each iteration sequentially. For ten items at 200ms each, that's 2 seconds. With `Promise.all`, the same ten items complete in ~200ms — whichever is slowest. The difference between "fast" and "slow" is often exactly this single pattern.

The rule catches two common shapes:

1. **N+1 fetches in a CRUD handler.** `for (const id of ids) { users.push(await getUser(id)) }`. One request becomes N — plus round-trip latency. Often called N+1 because the outer query returns N ids, then N inner queries fetch each. Total: N+1 queries to do work that should be 1-2.
2. **Missed parallelism on independent work.** Sending a notification to three destinations, or updating three indexes, sequentially — when each one could have run in parallel.

## What the rule detects

An `await` expression whose closest enclosing scope is:

- `for`, `for...of`, `for...in`
- `while`, `do...while`
- The callback of a `.forEach(...)` call

The rule does not descend past other function boundaries — an `await` inside an inner async function is treated as a separate scope.

## Why this rule is finding-only

Some loops are legitimately sequential:

- **Cursor pagination.** Page N+1 needs page N's `next` cursor.
- **State machines.** Each iteration depends on the previous result.
- **Throttling / rate-limiting.** Deliberately serializing to respect an upstream quota.
- **Write order.** Migrations, audit events, sequences where ordering is semantic.

Automatically converting these to `Promise.all` changes program semantics in ways a static tool can't see. The finding is a prompt for a human to decide.

## Example

### Before — missed parallelism

```ts
export async function loadUsers(ids: string[]): Promise<User[]> {
  const users: User[] = []
  for (const id of ids) {
    users.push(await fetchUser(id))
  }
  return users
}
```

### After — parallel

```ts
export async function loadUsers(ids: string[]): Promise<User[]> {
  return Promise.all(ids.map((id) => fetchUser(id)))
}
```

If concurrency needs bounding (some APIs throttle above N in-flight requests), reach for [`p-limit`](https://github.com/sindresorhus/p-limit) rather than hand-rolling.

### Legitimate sequential — add the directive

```ts
export async function loadAllCustomers(): Promise<Customer[]> {
  const results: Customer[] = []
  let cursor: string | null = null
  do {
    // hardened-ignore-next-line
    const page = await fetchPage(cursor)
    results.push(...page.items)
    cursor = page.next
  } while (cursor)
  return results
}
```

## Related rules

- [`risk/promise-all-no-settled`](./risk-promise-all-no-settled.md) — the opposite problem: parallelizing with `Promise.all` when one failure shouldn't abort the batch
- [`risk/floating-promise`](./risk-floating-promise.md) — unhandled async work
