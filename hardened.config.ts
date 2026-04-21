// Dogfood config for hardened itself. Unlike user-facing examples, this
// file doesn't import defineConfig from "hardened" because the monorepo
// root doesn't declare hardened as a dep — workspace packages resolve
// inside each package's own node_modules via pnpm. External users should
// use `import { defineConfig } from "hardened"` for type inference.

export default {
  rules: {
    "risk/http-no-timeout": "error",
    "risk/fetch-no-abort-signal": "warning",
    "risk/floating-promise": "warning",
  },
  ignore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/fixtures/**",
    "**/fixtures-pending/**",
    "**/corpus-pending/**",
  ],
  runtime: {
    defaults: {
      timeout: 10_000,
      retries: 3,
      backoff: "exponential",
    },
  },
}
