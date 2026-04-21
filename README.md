# hardened

> **Find and fix unbounded TypeScript I/O before it ships.**

`hardened` is a deterministic CLI that scans your TypeScript project for production-reliability risks: HTTP calls without timeouts, database queries that can hang, `fetch()` calls without lifecycle signals, and risky async fan-outs. It applies reviewable auto-fixes where the local transformation is clear. No AI, no hidden state. Same input always produces the same finding set and fix.

[![license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

## The 30-second demo

Your code today:

```ts
import axios from "axios"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function chargeInvoice(id: string, amount: number) {
  const invoice = await prisma.invoice.findUnique({ where: { id } })
  return axios.post("/api/payments/charge", { invoiceId: id, amount })
}
```

After `npx hardened risk fix`:

```ts
import axios from "axios"
import { resilient } from "hardened-runtime"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function chargeInvoice(id: string, amount: number) {
  const invoice = await resilient(
    () => prisma.invoice.findUnique({ where: { id } }),
    { timeout: 10_000 },
  )
  return resilient(
    () => axios.post("/api/payments/charge", { invoiceId: id, amount }),
    { timeout: 10_000 },
  )
}
```

Two calls that could have hung your whole API under load now have caller-side deadlines. If the deadline fires, `resilient()` rejects the caller's promise; the underlying operation may continue unless the client supports its own abort mechanism.

## Why not ESLint?

Use ESLint too. `hardened` is narrower: it focuses on production I/O boundaries where a finding often needs more than a local token edit. Its auto-fixes can wrap calls, add imports, request runtime dependencies, and keep the diff reviewable across a codebase. The CLI also ships a small runtime package, opens draft PRs with `--pr`, and emits SARIF directly for code scanning. ESLint rules are excellent for broad style, correctness, and type-aware checks; `hardened` deliberately avoids that surface. The overlap is intentional only where zero-config reliability checks are useful on projects that do not already have type-aware linting configured.

## Install

```bash
npm install -D hardened          # or: pnpm / yarn / bun
```

No install required to try it:

```bash
npx hardened risk scan           # report findings without changing anything
```

## Getting started (60 seconds)

```bash
# 1. Generate a tailored config (detects axios/prisma/pg/etc. in your package.json).
npx hardened init

# 2. See what it would flag.
npx hardened risk scan

# 3. Apply fixes locally.
npx hardened risk fix

# 4. Or: apply fixes on a new branch and open a draft PR for review.
npx hardened risk fix --pr
```

## What it flags

Seven rules as of v0.1, covering the most common reliability gaps. See [docs/RULES.md](docs/RULES.md) for the full catalogue (auto-generated from source metadata).

| Rule | Severity | Auto-fix | What it catches |
|---|---|---|---|
| `risk/http-no-timeout` | 🔴 error | yes | `axios`, `got`, `ky`, `fetch`, native `http`/`https` calls missing a timeout |
| `risk/db-no-query-timeout` | 🔴 error | yes | `pg` / `mysql2` query calls missing a statement timeout |
| `risk/prisma-no-timeout` | 🔴 error | yes | Prisma `findMany` / `update` / `delete` / etc. without a configured timeout |
| `risk/fetch-no-abort-signal` | 🟡 warning | finding-only | `fetch()` calls without AbortSignal for component/request lifecycle cleanup |
| `risk/floating-promise` | 🟡 warning | finding-only | Promise-returning calls that nothing awaits, catches, or chains |
| `risk/await-in-loop` | 🟡 warning | finding-only | Sequential N+1 patterns where parallelism may be intended |
| `risk/promise-all-no-settled` | 🔵 info | finding-only | Fire-and-forget `Promise.all` that should use `Promise.allSettled` |

## Config (optional)

Zero-config by default. To customize, keep or edit the file `npx hardened init` created:

```ts
// hardened.config.ts
import { defineConfig } from "hardened"

export default defineConfig({
  rules: {
    "risk/http-no-timeout": "error",
    "risk/fetch-no-abort-signal": "warning",
    "risk/await-in-loop": "off",         // silence a rule
  },
  ignore: [
    "**/legacy/**",                       // exclude paths
  ],
  runtime: {
    defaults: {
      timeout: 5_000,                     // your default timeout
      retries: 2,                         // retry count for idempotent calls
      backoff: "exponential",
    },
  },
})
```

## Silencing a single call

Put `// hardened-ignore-next-line` before the call. Blank lines and comment-only lines may sit between the directive and the call; the directive applies only to the next non-comment, non-blank line.

```ts
// hardened-ignore-next-line
return axios.get(`/api/legacy/${id}`)    // intentionally no timeout
```

## CI integration

Drop hardened into your pipeline in two shapes:

- **SARIF upload to GitHub code-scanning** — findings show up in the Security tab. Output: `hardened risk scan --sarif out.sarif`, then pass through `github/codeql-action/upload-sarif@v3`.
- **Sticky PR comment bot** — see [`docs/recipes/ci-comment-bot.md`](docs/recipes/ci-comment-bot.md) for a copy-paste workflow that posts a per-PR findings summary and updates in place.

### Environment variables

- **`GITHUB_TOKEN`** — required only for `hardened risk fix --pr`. Any token with `repo` scope works. If unset, `--pr` mode falls back to `gh auth token` from the GitHub CLI. Unset is fine for all other commands.
- **`HARDENED_CORPUS_READONLY=1`** — operator-controlled write gate. When set, `risk fix`, `risk fix --pr`, and `init` refuse to run and exit 1. `risk scan` remains functional. Useful for running the scanner against a code snapshot that must not be modified.

## Commands

```bash
hardened init                        # generate hardened.config.ts
hardened risk scan                   # report findings
hardened risk scan --json            # machine-readable output
hardened risk scan --sarif [file]    # SARIF 2.1.0 for code-scanning
hardened risk fix                    # apply auto-fixes to disk
hardened risk fix --dry-run          # show what would change, don't write
hardened risk fix --pr               # open a draft GitHub PR on a new branch
```

## v0.1 scope

`resilient()` enforces a caller-side deadline; it does not abort the wrapped syscall by itself. AbortSignal propagation is planned for a follow-on release. Prisma raw template-tagged calls such as `prisma.$queryRaw\`SELECT ...\`` are outside v0.1 detection because they are `TaggedTemplateExpression` nodes, not normal call expressions.

## Design principles

1. **Zero/near-zero config.** Reasonable defaults. Config is opt-in, not required.
2. **Deterministic output.** Same input → byte-identical fix. Proven by a cross-corpus determinism test suite.
3. **Safe to run automatically.** Rules where the fix isn't uniquely determined stay finding-only. The things we auto-apply are the things no human disputes.
4. **Opinionated but not ideological.** `// hardened-ignore-next-line` always wins — legitimate sequential code, known unsafe opt-outs, and research snippets stay exactly how you wrote them.

## Roadmap

| Version | Status | What it adds |
|---|---|---|
| `v0.1` | Alpha | `hardened risk` — 7 rules, auto-fix for 3 of them, PR flow, SARIF |
| `v1.0` | Planned | Hardening of the risk ruleset + stable config API |
| `v2.0` | Reserved | `hardened config` — extract hardcoded values to config layer |
| `v3.0` | Reserved | `hardened schema` — DB ↔ API ↔ frontend naming consistency |

The `v2` and `v3` packages exist as empty slots in the monorepo today so future commands ship without core refactors.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Apache 2.0.

Bugs, rule proposals, and design feedback welcome via [GitHub Issues](https://github.com/compactbench/hardened/issues). Rule proposals are reviewed against three criteria: determinism, false-positive risk, and whether the local transformation is safe enough to automate.

## License

Apache 2.0. See [LICENSE](LICENSE).
