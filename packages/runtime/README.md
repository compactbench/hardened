# hardened-runtime

Runtime primitives for code transformed by [`hardened`](https://github.com/compactbench/hardened).

Exports `resilient()` — a caller-side deadline helper built on [cockatiel](https://github.com/connor4312/cockatiel). When `hardened risk fix` wraps a call (HTTP, database, Prisma), the resulting code imports `resilient` from this package.

## Install

```bash
npm install hardened-runtime
```

Automatically listed as a dependency request by `hardened risk fix` when it inserts wraps for the first time.

## Usage

```ts
import { resilient } from "hardened-runtime"

// Enforces a 10-second caller-side deadline.
const user = await resilient(
  () => prisma.user.findUnique({ where: { id } }),
  { timeout: 10_000 },
)
```

Options:

- `timeout` — milliseconds. If the wrapped operation hasn't resolved by then, the caller-side promise rejects with a timeout error.
- `retries` — count of retry attempts for idempotent operations (opt-in; never applied to mutations by `hardened risk fix`).
- `backoff` — `"exponential" | "linear" | "constant"`.

## Semantics

`resilient()` enforces a **caller-side deadline**. When the deadline fires:

- The caller-side promise rejects with a timeout error.
- The wrapped operation continues on its own until it naturally resolves or errors — **the underlying syscall is not aborted**.

If you need the wrapped call to actually stop, the client library must support an abort mechanism (e.g., `AbortSignal` for `fetch`, per-operation timeout for database clients). Proper `AbortSignal` propagation through `resilient()` is planned for a point release.

## Full docs + source

[compactbench/hardened](https://github.com/compactbench/hardened)

## License

Apache-2.0.
