# ADR 0001: License — Apache 2.0

## Status

Accepted — 2026-04-19.

## Context

Hardened is an OSS developer tool with expected downstream commercial use (teams installing it in SaaS codebases, potential corporate contributions). The license affects contributor comfort, corporate adoption, and the shape of any future cloud/enterprise tier.

## Options considered

1. **MIT** — maximally permissive, shortest license. No patent grant.
2. **Apache 2.0** — permissive with explicit patent grant and contributor license defaults. Preferred by most corporate OSS.
3. **BSL / SSPL / ELv2** — source-available with commercial-use restrictions. Useful for "open core" where the cloud tier is protected.

## Decision

Apache 2.0 for all packages in this monorepo.

## Consequences

- **Patent grant** protects downstream users and contributors.
- **Contributor License terms** default into place — no extra CLA needed for most contributions.
- Corporate adopters are comfortable (Apache 2.0 is the default they check for).
- A future cloud/enterprise tier lives in a separate repo with proprietary licensing if needed — it does not have to live here.
- We are NOT using a source-available model (BSL/SSPL) because it would block the primary goal: frictionless CLI adoption via `npx`.
