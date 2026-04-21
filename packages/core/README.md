# @hardened/core

Rule engine, scanner, and fixer primitives for [`hardened`](https://github.com/compactbench/hardened).

This package is the AST-based engine that powers the `hardened` CLI. It walks TypeScript source via [`ts-morph`](https://github.com/dsherret/ts-morph), runs registered rules, and applies deterministic code transformations. Most users will interact with this package indirectly through the `hardened` CLI; direct use is for authors of custom rule packs.

## What lives here

- **`Scanner`** — file discovery + rule dispatch + ignore handling
- **`Fixer`** — apply AST edits to disk with import insertion + dependency tracking
- **`loadConfig` / `defineConfig` / `DEFAULT_CONFIG`** — `hardened.config.ts` parsing via `jiti` with zod-validated schema
- **`isIgnoredLine`** — `// hardened-ignore-next-line` directive resolution
- **`validateRuleModule` / `validateRuleModules`** — rule-metadata validation at package load
- **`isReadonlyCorpusEnabled` / `assertWriteAllowed`** — `HARDENED_CORPUS_READONLY` env-var gate
- **Types** — `Rule`, `Match`, `Fix`, `ResolvedConfig`, `UserConfig`, etc.

## Install

```bash
npm install @hardened/core
```

## Status

Public API is semver-tracked alongside the `hardened` CLI. Rule metadata shape, config schema, and match/fix interfaces may still shift during `0.x` — pin to the `^0.1` range for stability.

## Full docs + source

[compactbench/hardened](https://github.com/compactbench/hardened)

## License

Apache-2.0.
