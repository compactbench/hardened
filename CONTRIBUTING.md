# Contributing to hardened

Thanks for the interest. Hardened is in early alpha — the API will change, but PRs are welcome.

## Development setup

```bash
pnpm install
pnpm build
pnpm test
```

## Writing a new rule

Rules live in `packages/rules-risk/src/` (or the future `rules-config`, `rules-schema` packages). Each rule:

1. Implements the `Rule` interface from `@hardened/core`
2. Has a `match()` function that walks the AST and returns findings
3. Optionally has a `fix()` function that returns a deterministic code transformation
4. Must be deterministic — same input always produces same output
5. Should have a test fixture under `fixtures/`

Example: see `packages/rules-risk/src/http-no-timeout.ts`.

## Determinism rule

If you can't write a fix that produces the same output every time for the same input — don't ship the fix. Emit a finding only and let a human decide. This is how `hardened` earns trust to auto-apply.

## Commit style

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
