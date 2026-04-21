import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [
      "packages/*/tests/**/*.test.ts",
      "packages/*/src/**/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "fixtures/**",
    ],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/dist/**",
        "packages/rules-config/**",
        "packages/rules-schema/**",
      ],
    },
    testTimeout: 10_000,
  },
})
