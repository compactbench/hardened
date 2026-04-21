# Telemetry Blueprint

Telemetry is not implemented in v0.1. This document defines the shape we would use if telemetry is added later.

## Default

Telemetry is off by default. No code path reads `TELEMETRY_ENABLED` today, and no network request is made by `hardened`.

If telemetry is ever added, opt-in would require both:

- `TELEMETRY_ENABLED=true`
- A config field that explicitly enables telemetry for the current project

Either missing value means no collection.

## Candidate Events

Events would be aggregate-only:

- `scan_started`: CLI version, command, platform, Node major version
- `scan_completed`: elapsed milliseconds, files scanned, findings total, findings by rule id
- `fix_completed`: fixes applied, files changed, skipped finding count by rule id
- `sarif_written`: result count and output format only
- `pr_flow_completed`: branch created, commit created, PR created as booleans
- `error_reported`: error category and command, with no stack trace by default

## Redaction Rules

Telemetry must never include:

- Absolute paths
- Repository names or remote URLs
- File names
- Source snippets
- Finding messages containing user identifiers
- Package names from the scanned project
- Environment variable names or values
- Git branch names
- PR titles, commit messages, or issue text

Rule ids are allowed because they are hardened-owned strings. Counts and elapsed times are allowed.

## Transport

If added, telemetry should be sent after command completion with a short timeout and should never change command success or failure. Failed telemetry delivery must be silent unless a debug flag is explicitly enabled.

## User Controls

Future implementation should include:

- `hardened telemetry status`
- `hardened telemetry disable`
- A visible line in `hardened init` output when telemetry remains disabled
- Documentation of exactly which aggregate fields are sent

## Verification

Before enabling telemetry in any release, CI should include a fixture that runs `hardened risk scan` with telemetry disabled and asserts that no HTTP transport is called.
