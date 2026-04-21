# Vision

Hardened makes production reliability a one-command concern.

## Why this exists

The ecosystem is full of resilience libraries (Cockatiel, Opossum, Polly, Resilience4j) and lint rules that flag missing timeouts — but nobody ships the auto-fix. The default state of a codebase is "will hang on network partition" and the only way to fix it today is hundreds of hand edits.

`hardened` closes that gap. Deterministic, zero-config, safe to run on any existing codebase, emits a reviewable diff.

## Three commands, three eras

### v1 — `hardened risk` (shipping)

Wraps external calls in `timeout + retry + circuit breaker` with safe defaults. v1 scope: axios, `fetch`, Node `http`. Expand to DB clients, queue publishers, and gRPC in v1.x.

### v2 — `hardened config` (next)

Extracts hardcoded URLs, magic numbers, and feature flags into a typed config layer. Generates `.env.example`. Detects leaked secrets en route.

### v3 — `hardened schema` (later)

Enforces consistent naming across the stack: Postgres columns, ORM models, API DTOs, frontend types. Rename cascades across layers as a single command: `hardened schema rename orders.totalPrice orders.totalAmount`.

## What we won't build

- Semantic lints that require judgment ("is this variable name good?"). Hardened ships only rules where the fix is uniquely determined.
- Formatter features. Use a dedicated formatter.
- Security scanning. Use Snyk / Socket / Semgrep.
- Heuristic or statistical rule matching. Hardened is deterministic AST matching — `--fix` has to be trustworthy on first install.

## Business shape

- **OSS core** (Apache 2.0) — CLI, rules, runtime. Distributed via npm.
- **Cloud tier** (future) — team dashboard, PR bot, policy enforcement in CI, risk-score trend over time.
- **Enterprise** (future) — SSO, multi-repo rollups, compliance report generators (e.g., "100% of external calls have enforced timeouts" — a SOC2-shaped artifact).

See `docs/architecture/adr/0001-license-apache-2.0.md` for the license decision, `0002-monorepo.md` for the package layout rationale.
