# `risk/db-no-query-timeout`

| Severity | Auto-fix | Category |
| --- | --- | --- |
| 🔴 error | yes | risk |

## Why this matters

A database query without a statement-level timeout can block indefinitely when the planner picks a bad path, a lock isn't released, or a peer session holds a row. While it blocks, it pins one connection from the pool. Pools have a finite size (often 10–25). A handful of bad queries can exhaust the pool, at which point every other request — healthy or not — queues up waiting for a connection. One slow query quietly becomes a global outage.

A statement timeout bounds the worst case. The caller gets an exception they can handle or retry. When using `resilient()`, that is a caller-side deadline only; prefer the database driver's native statement timeout when you need the database statement itself to stop.

## What the rule detects

`<receiver>.query(...)` calls where the receiver is proven to come from `pg` or `mysql2` imports/factories and no argument carries a `timeout`, `statement_timeout`, or `queryTimeout` option. Arbitrary objects with a `.query()` method are not flagged.

## Transaction-aware exceptions

The rule does not fire on:

- Queries whose first-arg string is a transaction control statement (`BEGIN`, `START TRANSACTION`, `COMMIT`, `ROLLBACK`, etc.)
- Any query in a function that contains a `BEGIN` or `START TRANSACTION` query — the assumption is that transaction-level timeout controls cover the statements inside

These exceptions match how real `pg` + `mysql2` code looks in practice. If you're rolling your own connection manager, silence with the directive where you have a separate timeout policy.

## Example

### Before

```ts
import { Pool } from "pg"

const pool = new Pool({ host: "db.internal" })

export async function listOrders(userId: string) {
  return pool.query(
    "SELECT id, total FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  )
}
```

### After (`hardened risk fix`)

```ts
import { Pool } from "pg"
import { resilient } from "hardened-runtime"

const pool = new Pool({ host: "db.internal" })

export async function listOrders(userId: string) {
  return resilient(
    () =>
      pool.query(
        "SELECT id, total FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
        [userId],
      ),
    { timeout: 10_000 },
  )
}
```

The auto-fix uses `timeout` only — no retry. Database queries aren't safe to blindly retry (writes in particular), and even reads may have caching implications. Add retries manually if your policy allows.

The auto-fix is a caller-side deadline. It does not stop the underlying database statement by itself.

## Alternative: native `statement_timeout`

For `pg`, you can also set the timeout at the query level using the object form:

```ts
await pool.query({
  text: "SELECT ...",
  values: [userId],
  statement_timeout: 5_000,
})
```

The rule recognizes `statement_timeout` as a valid timeout and won't flag this.

## When to silence

- Explicitly long-running queries (ETL jobs, bulk imports) where you've intentionally picked a duration that your ops tooling handles
- Queries inside a transaction block that you've manually confirmed is covered by a transaction-level timeout

```ts
// hardened-ignore-next-line
await pool.query("VACUUM ANALYZE large_table")  // intentional long-running
```

## Related rules

- [`risk/prisma-no-timeout`](./risk-prisma-no-timeout.md) — equivalent for Prisma operations
- [`risk/http-no-timeout`](./risk-http-no-timeout.md) — same idea for HTTP calls
