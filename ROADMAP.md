# Roadmap

This document tracks hardened's direction at a level above individual issues. It's not a schedule — it's a statement of intent and a way to capture "we've thought about this" for common questions.

## v0.1.x — stabilization (next point releases)

Post-launch tightening driven by first real-world users. Expected cadence: a few weeks between releases.

- **AbortSignal propagation for `resilient()`** — thread a signal into the wrapped call so the deadline actually stops the underlying work, not just the caller-side promise.
- **Prisma `$queryRaw` / `$executeRaw` detection** — handle `TaggedTemplateExpression` nodes alongside `CallExpression` so raw queries participate in `risk/prisma-no-timeout`.
- **Variable-bound `Promise.all` arrays** — trace `const invalidations = [...]; Promise.all(invalidations)` back to the array literal for safe-fan-out detection.
- **React hook fire-and-forget exception** — downgrade `risk/floating-promise` severity inside `useEffect` / event handlers where the pattern is idiomatic.
- **User-configurable safe-callee set** — let `hardened.config.ts` add project-specific callees to the known-safe fan-out list without forking the rule.

## v1.0 — the 1.0 bar

v1.0 ships when hardened has enough real-world validation to make a stability promise. Proxies for "we're ready":

- 1,000+ weekly npm downloads sustained for at least a month
- Zero critical correctness bugs open at release cut
- Documented SARIF fingerprint stability contract (what can churn, what can't)
- Plugin API for contributor-authored rules (currently rules are package-local)
- 6 months of `v0.x` releases without a breaking-change cycle

Until then, hardened is `0.x` — we reserve the right to change rule-semantics in point releases if real-code feedback demands it.

## v2+ — polyglot consideration

The most common question we expect to hear is "does hardened support \<my language\>?" The honest answer is: **not yet, and possibly not in the same binary.**

hardened v0.x/v1.x is deliberately TypeScript / JavaScript only. Supporting another language is not a small addition — every language has its own AST, its own reliability idioms, its own runtime ecosystem, and its own package registry. A single "polyglot hardened" would mean either:

- **A: Separate projects per language family** — e.g., `hardened-dotnet`, `hardened-python`. Honest about the cost; scales naturally as each gets contributors. Shared brand, different binaries.
- **B: Polyglot core with per-language plugins** — a language-agnostic file-walker + rule-registry + reporter-pipeline, with per-language parsers + rule packs + runtimes as plugins. Bigger architectural lift; matches Semgrep's model.
- **C: Ingestion model** — let existing ecosystem analyzers (Roslyn, bandit, gosec) produce findings; hardened owns the *workflow* (SARIF, `--pr`, CI integration, codemod-style fixes). Lowest new-code surface; relies on ecosystem tools.

The decision will be guided by where hardened actually finds product-market fit in the TS/JS world. If users hit us with "I love this but my team is half backend" then polyglot is the obvious next step. If product-market fit is in a narrower slice, dedicated projects for other languages make more sense.

This section will be rewritten when we have real v1.x usage data.

## Things we've explicitly decided NOT to do

- **Heuristic or statistical rule matching.** Rules are deterministic AST matchers. That's the product, not an implementation detail.
- **Hosted SaaS scanning service.** hardened is a CLI. The composite GitHub Action (`compactbench/hardened-action`) is a convenience wrapper, not a hosted product.
- **Auto-retry on mutations.** `resilient()` auto-wraps only with `{ timeout }` on mutation paths. Automatic retry on writes is never safe without an idempotency key; users opt in explicitly per call.
- **Deep-nested rule configuration DSLs.** The `hardened.config.ts` schema is deliberately narrow — severity per rule, ignore globs, runtime defaults. More complex per-rule configuration is a signal that the rule itself should be split.

## How to propose a change

- **Small rule or bug fix** — open an issue with a minimal reproducing example. If you want to also submit the fix, a PR is welcome.
- **New rule** — open a rule-proposal issue first (there's a template). Rules have to pass a "what production incident does this prevent" bar.
- **Architecture-level change** (plugin API, new language, etc.) — open a discussion before coding. Saves cycles on both sides.
