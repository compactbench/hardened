# Recipe: PR comment bot

Run `hardened` on every pull request and post findings as a sticky comment on the PR. The bot updates in place when new commits are pushed, so the PR only ever has one hardened comment.

## What you get

- Every PR automatically scanned for `risk/*` findings.
- A formatted summary comment with per-file breakdown and a severity icon per line.
- The comment updates rather than spawning new ones on each push.
- Optional: fail the workflow if any `error`-level findings exist (commented out by default — opt-in when you're ready to block merges).

## Workflow file

Save as `.github/workflows/hardened.yml`:

```yaml
name: hardened

on:
  pull_request:
    branches: [main]

jobs:
  scan:
    name: hardened risk scan
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Run hardened
        id: scan
        run: pnpm exec hardened risk scan --json > findings.json
        continue-on-error: true

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('node:fs');
            const findings = JSON.parse(fs.readFileSync('findings.json', 'utf8'));

            const MARKER = '<!-- hardened-bot -->';

            // Build the comment body.
            const buildBody = () => {
              if (findings.length === 0) {
                return `${MARKER}\n## hardened: no findings ✓\n\nNo production-safety risks detected in this PR.`;
              }
              const byFile = new Map();
              for (const f of findings) {
                const list = byFile.get(f.file) ?? [];
                list.push(f);
                byFile.set(f.file, list);
              }
              const errors = findings.filter(f => f.severity === 'error').length;
              const warnings = findings.filter(f => f.severity === 'warning').length;
              const infos = findings.filter(f => f.severity === 'info').length;
              const lines = [
                MARKER,
                `## hardened: ${findings.length} finding${findings.length === 1 ? '' : 's'}`,
                '',
                `**${errors}** error · **${warnings}** warning · **${infos}** info`,
                '',
              ];
              for (const [file, items] of byFile) {
                lines.push(`<details><summary><code>${file}</code> (${items.length})</summary>`);
                lines.push('');
                for (const i of items) {
                  const icon =
                    i.severity === 'error' ? '🔴' :
                    i.severity === 'warning' ? '🟡' : '🔵';
                  lines.push(`- ${icon} **${i.line}:${i.column}** \`${i.ruleId}\` — ${i.message}`);
                }
                lines.push('');
                lines.push('</details>');
                lines.push('');
              }
              lines.push('---');
              lines.push('Run `npx hardened risk fix` locally to auto-apply fixes, or `npx hardened risk fix --pr` to open a draft PR.');
              return lines.join('\n');
            };

            const body = buildBody();

            // Find an existing hardened comment (sticky-comment pattern).
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              per_page: 100,
            });
            const existing = comments.find(c => c.body?.includes(MARKER));

            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }

      # Uncomment this to fail the workflow when any error-level finding exists.
      # - name: Fail on errors
      #   run: |
      #     if jq -e '[.[] | select(.severity=="error")] | length > 0' findings.json; then
      #       echo "Found error-level findings — blocking merge."
      #       exit 1
      #     fi
```

## How it works

1. **Checkout + install** — standard setup.
2. **Run hardened** — `risk scan --json > findings.json`. `continue-on-error: true` ensures the comment step still runs even if the scan exits non-zero (which it does when `error`-level findings are present).
3. **Sticky comment** — the script looks for a prior comment containing the invisible `<!-- hardened-bot -->` HTML marker. If found, it updates in place. Otherwise it creates a new one.

## Customizations

- **Block merges on errors.** Uncomment the final step. PRs with any `error`-level finding then fail CI until resolved or silenced with `// hardened-ignore-next-line`.
- **Scan only changed files.** Pass `--cwd <subpath>` to limit scope, or use `git diff --name-only` to generate a list and skip the run when no TS files changed.
- **Upload to GitHub code-scanning instead.** Replace the Comment step with `hardened risk scan --sarif out.sarif` followed by `github/codeql-action/upload-sarif@v3`. Findings then appear in the Security tab, not as PR comments.

## Requirements

- Repo has `pnpm` (or adapt to your package manager — `npm exec hardened` works too).
- `hardened` is installed as a devDependency (or use `npx hardened` without install).
- The default `GITHUB_TOKEN` has the right permissions (`pull-requests: write` in the job-level `permissions` block above).
