# `risk/prisma-no-timeout`

| Severity | Auto-fix | Category |
| --- | --- | --- |
| 🔴 error | yes | risk |

## Why this matters

Prisma operations wait on the underlying database pool and inherit its behavior: a slow query holds the connection until the pool timeout fires — typically 10 seconds, sometimes higher. A handful of slow reads can saturate the pool (the default is `num_physical_cpus * 2 + 1`), at which point every other Prisma call in the process queues, and the queue turns into a visible outage.

Wrapping Prisma calls in `resilient(() => ..., { timeout })` gives the caller a deadline regardless of pool policy. It does not stop the Prisma engine work underneath by itself.

## What the rule detects

Calls of the form `<client>.<model>.<operation>(...)` where `<client>` is a variable bound to `new PrismaClient()` and `<operation>` is one of 15 known Prisma client operations:

- `findMany`, `findUnique`, `findFirst`, `findUniqueOrThrow`, `findFirstOrThrow`
- `create`, `createMany`
- `update`, `updateMany`, `upsert`
- `delete`, `deleteMany`
- `aggregate`, `groupBy`, `count`

The rule tracks all Prisma client instances in a file, so `const primary = new PrismaClient()` and `const replica = new PrismaClient()` are both covered.

## Transaction-aware exception

Operations inside `prisma.$transaction(...)` are treated as covered only when the transaction call includes an explicit `{ timeout: ... }` option. A transaction without that option receives one finding on the `$transaction` call instead of one finding per operation inside it:

```ts
// Not flagged — explicit transaction-level timeout applies.
await prisma.$transaction(
  [
    prisma.user.update({ where: { id }, data: {...} }),
    prisma.post.create({ data: {...} }),
  ],
  { timeout: 10_000 },
)
```

This is flagged:

```ts
await prisma.$transaction([
  prisma.user.update({ where: { id }, data: {...} }),
  prisma.post.create({ data: {...} }),
])
```

## Example

### Before

```ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function loadUser(id: string) {
  return prisma.user.findUnique({ where: { id } })
}
```

### After (`hardened risk fix`)

```ts
import { PrismaClient } from "@prisma/client"
import { resilient } from "hardened-runtime"

const prisma = new PrismaClient()

export async function loadUser(id: string) {
  return resilient(
    () => prisma.user.findUnique({ where: { id } }),
    { timeout: 10_000 },
  )
}
```

The auto-fix uses `timeout` only — Prisma operations aren't auto-retried because writes aren't safe to retry without an idempotency key.

## Scope: `$queryRaw` and friends

Raw template-tagged calls like `prisma.$queryRaw\`SELECT ...\`` are **not** currently detected — they're `TaggedTemplateExpression` nodes, not `CallExpression`. Treat them as you would a raw `pool.query` and wrap manually for now; automatic detection is planned.

## When to silence

- Operations inside custom transaction helpers that already wrap with their own timeout
- Reporting or analytics queries where a long timeout is semantically correct

```ts
// hardened-ignore-next-line
await prisma.report.findMany({ where: { ... } })  // cron, long-running by design
```

## Related rules

- [`risk/db-no-query-timeout`](./risk-db-no-query-timeout.md) — raw `pg` / `mysql2` equivalents
- [`risk/http-no-timeout`](./risk-http-no-timeout.md) — same pattern for HTTP calls
