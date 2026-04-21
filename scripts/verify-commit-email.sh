#!/usr/bin/env bash
# Verify the local git commit email matches the expected noreply address.
set -euo pipefail

ALLOWED_EMAIL_PATTERN='^[0-9]+\+UsernameLoad@users\.noreply\.github\.com$'

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  echo "ERROR: not inside a git repo"
  exit 1
fi
cd "${REPO_ROOT}"

LOCAL_NAME="$(git config --local user.name || true)"
LOCAL_EMAIL="$(git config --local user.email || true)"

fail() {
  echo ""
  echo "  ========================================"
  echo "  COMMIT EMAIL CHECK FAILED"
  echo "  ========================================"
  echo "  $1"
  echo ""
  echo "  Fix it:"
  echo "    git config --local user.name  \"<your display name>\""
  echo "    git config --local user.email \"216450868+UsernameLoad@users.noreply.github.com\""
  echo ""
  exit 1
}

if [[ -z "${LOCAL_NAME}" ]]; then
  fail "Local user.name is not set."
fi

if [[ -z "${LOCAL_EMAIL}" ]]; then
  fail "Local user.email is not set."
fi

if ! [[ "${LOCAL_EMAIL}" =~ ${ALLOWED_EMAIL_PATTERN} ]]; then
  fail "Local user.email '${LOCAL_EMAIL}' does not match the expected noreply address."
fi

echo "OK: commit email verified."
echo "  user.name  = ${LOCAL_NAME}"
echo "  user.email = ${LOCAL_EMAIL}"
