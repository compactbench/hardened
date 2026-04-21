# Security

## Reporting a vulnerability

Until a dedicated email exists, use a **GitHub Security Advisory** on this repo. Private repos support this.

Please do not open a public issue for vulnerabilities.

## Scope

- The `hardened` CLI and published packages (`@hardened/core`, `@hardened/rules-risk`, `hardened-runtime`)
- The fixer's correctness: a fix must never introduce a new bug in the host codebase beyond the one it was designed to address
- Any code generation or AST rewriting behavior

## Out of scope

- Attacks requiring physical access
- DoS via volumetric attacks
- Issues in outdated dependencies already flagged by Dependabot

## Response

- Acknowledgement within 72 hours
- Fix timeline communicated within 7 days
- Coordinated disclosure preferred
