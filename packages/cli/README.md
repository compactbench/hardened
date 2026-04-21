# hardened

> **Find and fix unbounded TypeScript I/O before it ships.**

`hardened` is a deterministic CLI that scans TypeScript/JavaScript for production-reliability risks — HTTP calls without timeouts, database queries that can hang, `fetch()` calls without lifecycle signals, floating promises, risky fan-outs — and applies reviewable codemod-style auto-fixes where the local transformation is unambiguous. No AI, no hidden state, same input always produces the same finding set.

## Install

```bash
npm install -D hardened
# or: pnpm / yarn / bun
```

Or one-shot without installing:

```bash
npx hardened risk scan
```

## Quickstart

```bash
npx hardened init           # generate a tailored hardened.config.ts
npx hardened risk scan      # report findings (no changes)
npx hardened risk fix       # apply auto-fixes in place
npx hardened risk fix --pr  # open a draft GitHub PR with the fixes
```

## Rules shipped in v0.1

| Rule | Severity | Auto-fix |
| --- | --- | :-: |
| `risk/http-no-timeout` | error | yes |
| `risk/db-no-query-timeout` | error | yes |
| `risk/prisma-no-timeout` | error | yes |
| `risk/fetch-no-abort-signal` | warning | finding-only |
| `risk/floating-promise` | warning | finding-only |
| `risk/await-in-loop` | warning | finding-only |
| `risk/promise-all-no-settled` | info | finding-only |

Each rule has deep documentation under [`docs/errors/`](https://github.com/compactbench/hardened/tree/main/docs/errors) covering why the problem matters, what the rule detects, before/after examples, and when to silence.

## Output formats

- Human-readable (default) — coloured, grouped by file, noisy for humans
- `--json` — machine-readable findings dump
- `--sarif [file]` — SARIF 2.1.0 for GitHub code-scanning, with stable `partialFingerprints`

## Environment variables

- `GITHUB_TOKEN` — required for `risk fix --pr` (or falls back to `gh auth token`)
- `HARDENED_CORPUS_READONLY=1` — blocks all hardened-driven writes (`fix`, `--pr`, `init`), keeps `scan` working. Useful for scanning corpora that must not be modified.

## Full documentation

- **README + philosophy:** [compactbench/hardened](https://github.com/compactbench/hardened)
- **Rule catalogue:** [docs/RULES.md](https://github.com/compactbench/hardened/blob/main/docs/RULES.md)
- **Per-rule docs:** [docs/errors/](https://github.com/compactbench/hardened/tree/main/docs/errors)
- **Changelog:** [CHANGELOG.md](https://github.com/compactbench/hardened/blob/main/CHANGELOG.md)
- **Roadmap:** [ROADMAP.md](https://github.com/compactbench/hardened/blob/main/ROADMAP.md)

## License

Apache-2.0.
