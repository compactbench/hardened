# ADR 0002: Monorepo layout with reserved slots for v2 and v3

## Status

Accepted — 2026-04-19.

## Context

The product roadmap spans three related but independent tools:

- **v1 — `hardened risk`** — production resilience auto-fixer (ship first)
- **v2 — `hardened config`** — hardcoded-value extractor
- **v3 — `hardened schema`** — cross-layer naming enforcer

All three share AST parsing (ts-morph), rule contract, scanner, fixer, config loader, and CLI plumbing. They differ in which rules they run and which adapters they need.

## Decision

Single pnpm-workspace monorepo with the following package shape:

```
packages/
├── core/            # AST engine + Rule contract + scanner + fixer + config (shared)
├── rules-risk/      # v1 rules (ships now)
├── rules-config/    # v2 rules (empty slot, reserved)
├── rules-schema/    # v3 rules (empty slot, reserved)
├── runtime/         # `resilient()` wrapper users import at runtime
└── cli/             # `hardened` binary that stitches it together
```

CLI subcommands exist from day 1 (`risk`, `config`, `schema`), but `config` and `schema` print "coming soon" until their rule packages ship.

## Consequences

- **Zero core refactors** when v2/v3 ship: add rules to the empty package, uncomment a CLI wire-up.
- **Discoverability** — `hardened --help` shows the full product surface from v1 so users understand where this is going.
- **Ships fast** — v1 only implements `rules-risk`; stub packages are ~3 lines of `package.json` each.
- **Small cost** — extra empty packages add ~1kb to the repo and clutter the top-level package list, which we accept.

## Alternatives considered

- **Single-package CLI** — would require a refactor when v2 lands (split rules into modules, abstract shared logic). Rejected: the refactor is predictable and cheap to avoid now.
- **Separate repos per command** — would duplicate AST engine + config loader three times. Rejected: too much shared surface.
- **Plugin system with external rule packages** — premature abstraction. We don't yet know what third-party rule authors need. Ship internal rules first, extract a plugin API when two or more external consumers ask for it.
