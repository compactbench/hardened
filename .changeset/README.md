# Changesets

Hardened uses [changesets](https://github.com/changesets/changesets) for version management.

## When you make a change worth releasing

Run `pnpm changeset` and follow the prompts. This creates a markdown file in `.changeset/` describing the change. Commit it with your PR.

## What counts as "worth releasing"

- Any change to code in a published package (`@hardened/core`, `@hardened/rules-risk`, `hardened-runtime`, `hardened`)
- New rules
- Bug fixes affecting user-visible behavior
- Documentation that users will see on npm

## What does NOT need a changeset

- Internal refactors with no behavior change
- CI / tooling changes
- Fixture updates
- Internal-only docs

## Release flow

Maintainers merge changesets into `main`. When ready to release, run the `Version Packages` workflow which:

1. Consumes all pending changesets
2. Bumps package versions according to the collected changes
3. Updates each package's `CHANGELOG.md`
4. Opens a release PR

Merging that PR publishes to npm with provenance.
