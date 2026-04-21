# @hardened/rules-config

> **Reserved for v2. Not implemented yet.**

This package will host rules that extract hardcoded values (URLs, timeouts, magic numbers, feature flags) into a typed config layer and a generated `.env.example`.

When implemented it slots into the existing engine by exporting a `configRules: Rule[]` array, mirroring `@hardened/rules-risk`. The CLI `config` subcommand (already stubbed in `packages/cli/src/commands/config.ts`) wires up against it with no core changes.

See [`docs/vision.md`](../../docs/vision.md) for the roadmap.
