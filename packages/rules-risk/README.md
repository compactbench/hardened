# @hardened/rules-risk

Production-reliability risk rules for [`hardened`](https://github.com/compactbench/hardened).

Seven deterministic AST-based rules that detect the kinds of unbounded-I/O patterns that cause production outages. Ships with the `hardened` CLI; published separately so rule authors can extend or replace the catalogue.

## Rules shipped

| Rule | Severity | Auto-fix | Detects |
| --- | --- | :-: | --- |
| `risk/http-no-timeout` | error | yes | `axios`, `got`, `ky`, native `http`/`https` calls missing a timeout |
| `risk/db-no-query-timeout` | error | yes | `pg` / `mysql2` queries missing a statement timeout |
| `risk/prisma-no-timeout` | error | yes | Prisma operations and `$transaction` calls missing a timeout option |
| `risk/fetch-no-abort-signal` | warning | finding-only | `fetch()` calls without an `AbortSignal` |
| `risk/floating-promise` | warning | finding-only | Promise-returning calls that nothing awaits, catches, or chains |
| `risk/await-in-loop` | warning | finding-only | Sequential `await` patterns where parallelism may be intended |
| `risk/promise-all-no-settled` | info | finding-only | Discarded `Promise.all` fan-outs where `Promise.allSettled` would be safer |

Each rule has deep documentation under [`docs/errors/`](https://github.com/compactbench/hardened/tree/main/docs/errors).

## Install

```bash
npm install @hardened/rules-risk
```

Usually you don't install this directly — the `hardened` CLI already bundles it.

## Usage

```ts
import { Scanner, loadConfig } from "@hardened/core"
import { riskRules } from "@hardened/rules-risk"

const config = await loadConfig(process.cwd())
const scanner = new Scanner({ rules: riskRules, config, cwd: process.cwd() })
const findings = await scanner.run()
```

## Status

Rules may add new patterns or tighten detection logic during `0.x`. Rule IDs are stable once shipped.

## Full docs + source

[compactbench/hardened](https://github.com/compactbench/hardened)

## License

Apache-2.0.
