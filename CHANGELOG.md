# Changelog

All notable changes to hardened will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] — 2026-04-21

### Fixed

- `--version` output and SARIF `tool.driver.version` now match the installed package version.
- Auto-fix declares `hardened-runtime@^0.1.2`.

## [0.1.1] — 2026-04-21

### Fixed

- Published packages had `workspace:*` strings leaking into dependency specs, causing `npm install hardened` to fail with `EUNSUPPORTEDPROTOCOL`. Republished via `pnpm publish` which properly resolves the workspace protocol. The 0.1.0 tarballs on npm are deprecated; install `0.1.1` or newer.

## [0.1.0] — 2026-04-21 (deprecated — use 0.1.1+)

Initial release. hardened is a deterministic TypeScript/JavaScript CLI that finds production-reliability risks in the source — missing timeouts, uncancellable fetches, floating promises — and applies reviewable codemod-style auto-fixes.

### Added

**Commands**

- `hardened risk scan` — report findings (terminal · JSON · SARIF 2.1.0)
- `hardened risk fix` — apply auto-fixes in place
- `hardened risk fix --pr` — apply fixes on a branch and open a draft GitHub PR
- `hardened init` — generate a project-tailored `hardened.config.ts`

**Rules** — all in the `risk` category, all deterministic, all AST-based.

| Rule | Severity | Auto-fix |
| --- | --- | --- |
| `risk/http-no-timeout` | error | yes |
| `risk/db-no-query-timeout` | error | yes |
| `risk/prisma-no-timeout` | error | yes |
| `risk/fetch-no-abort-signal` | warning | no (finding-only) |
| `risk/floating-promise` | warning | no (finding-only) |
| `risk/await-in-loop` | warning | no (finding-only) |
| `risk/promise-all-no-settled` | info | no (finding-only) |

Each rule is documented in `docs/errors/<rule-id>.md` with a before/after example, when-to-silence guidance, and related rules.

**Runtime**

- `hardened-runtime` package exports `resilient()` — a caller-side deadline helper. When the deadline fires, the caller-side promise rejects. Note: the wrapped operation continues on its own until it naturally resolves or errors; true `AbortSignal` propagation is planned for v0.1.x.

**Platform features**

- SARIF 2.1.0 output with stable `partialFingerprints` (rule + file + logical context + stable node text + per-(rule,file) occurrence index) so code-scanning UIs correlate findings across scans without merging distinct occurrences.
- Default ignore patterns covering build output, tests (`**/*.test.*`, `**/*.spec.*`, `**/tests/**`, `**/__tests__/**`, `**/e2e/**`), fixtures (`**/fixtures/**`, `**/__fixtures__/**`), one-shot tooling (`**/scripts/**`, `**/ops/**`, `**/tools/**`, `**/seed-*`, `**/seeds/**`, `**/migrations/**`), and archived code (`**/archive/**`, `**/legacy/**`). All user-overridable via `hardened.config.ts`.
- React Query / TanStack Query cache-control fan-out suppression in `risk/promise-all-no-settled` — recognizes `invalidateQueries`, `refetchQueries`, `fetchQuery`, `prefetchQuery`, `removeQueries`, `resetQueries`, `cancelQueries`, including conditional branches (`cond ? invalidateQueries(...) : Promise.resolve()`).
- `HARDENED_CORPUS_READONLY=1` env var forbids all hardened-driven filesystem writes. `risk fix`, `risk fix --pr`, and `init` refuse to run and exit 1 with an actionable message. `risk scan` remains functional.
- `// hardened-ignore-next-line` directive to suppress findings on the immediately following non-comment, non-blank line.
- Rule-metadata validation at package load — a rule missing `id`, `category`, `severity`, `description`, or `match` fails on import rather than at scan time.
- `zod`-validated config schema; invalid config throws with a `file:line` hint and an actionable recovery message rather than silently defaulting.
- Auto-generated rule catalogue (`docs/RULES.md`) with CI-enforced freshness.

### Known limitations (shipping as-is; tracked for point releases)

- **TypeScript / JavaScript only.** Polyglot support (C#/.NET, Python, Go, Java, Rust) is a v2+ conversation. See `ROADMAP.md`.
- **Prisma `$queryRaw` / `$executeRaw` / `$queryRawUnsafe` are not detected** — they're `TaggedTemplateExpression` nodes, not `CallExpression`. v0.1.x.
- **`resilient()` does not propagate `AbortSignal`** into the wrapped call — the deadline is caller-side only. v0.1.x.
- **Variable-bound Promise.all arrays** (`const invalidations = [...]; Promise.all(invalidations)`) are not traced for safe-fan-out detection. v0.1.x.
- **React hook fire-and-forget patterns** (`useEffect(() => { doAsync().then(...) })`) flag under `risk/floating-promise`. Silence individually with `// hardened-ignore-next-line` until v0.1.x adds a "inside `useEffect`" exception.

### Benchmarks

- Synthetic corpus: ~8.5 s for 10,000 TypeScript files (~0.85 ms/file at scale)
- CI regression gate: 1k-file scan must complete under 2× the tracked baseline
- 267 tests, vitest, all passing on Node 20

[0.1.2]: https://github.com/compactbench/hardened/releases/tag/v0.1.2
[0.1.1]: https://github.com/compactbench/hardened/releases/tag/v0.1.1
[0.1.0]: https://github.com/compactbench/hardened/releases/tag/v0.1.0
