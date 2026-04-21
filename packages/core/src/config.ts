import { existsSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { extname, resolve } from "node:path"
import { createJiti } from "jiti"
import { z } from "zod"
import type { ResolvedConfig, UserConfig } from "./types.js"

export const DEFAULT_CONFIG: ResolvedConfig = {
  rules: {},
  // Default ignore globs for typical TypeScript project layouts. Override via user config.
  ignore: [
    // Build output & tooling caches
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/coverage/**",
    // Test files by name
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.test.js",
    "**/*.test.jsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/*.spec.js",
    "**/*.spec.jsx",
    // Test / E2E directories
    "**/tests/**",
    "**/test/**",
    "**/__tests__/**",
    "**/__mocks__/**",
    "**/e2e/**",
    // Fixtures / test corpora
    "**/fixtures/**",
    "**/__fixtures__/**",
    // One-shot tooling — sequential awaits and missing timeouts are expected
    "**/scripts/**",
    "**/ops/**",
    "**/tools/**",
    "**/seed-*",
    "**/seeds/**",
    "**/migrations/**",
    // Archived / legacy code kept for reference
    "**/archive/**",
    "**/archived/**",
    "**/legacy/**",
  ],
  runtime: {
    defaults: {
      timeout: 10_000,
      retries: 3,
      backoff: "exponential",
    },
  },
}

const CONFIG_FILENAMES = [
  "hardened.config.ts",
  "hardened.config.mts",
  "hardened.config.mjs",
  "hardened.config.js",
  "hardened.config.cjs",
]

// Schema for the user-facing config object. Strict at the top level so typos
// in key names produce a clear error instead of silently doing nothing.
const SeveritySchema = z.enum(["error", "warning", "info", "off"])

const BackoffSchema = z.enum(["exponential", "linear", "constant"])

const RuntimeDefaultsSchema = z
  .object({
    timeout: z.number().int().nonnegative().optional(),
    retries: z.number().int().nonnegative().optional(),
    backoff: BackoffSchema.optional(),
  })
  .strict()

const UserConfigSchema = z
  .object({
    rules: z.record(z.string(), SeveritySchema).optional(),
    ignore: z.array(z.string()).optional(),
    runtime: z
      .object({
        defaults: RuntimeDefaultsSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export async function loadConfig(cwd: string = process.cwd()): Promise<ResolvedConfig> {
  for (const name of CONFIG_FILENAMES) {
    const p = resolve(cwd, name)
    if (!existsSync(p)) continue
    try {
      // hardened-ignore-next-line
      const user = await loadConfigFile(p)
      return mergeConfig(DEFAULT_CONFIG, user)
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new Error(formatZodError(p, err))
      }
      throw new Error(
        `hardened: failed to load ${p}:1: ${err instanceof Error ? err.message : String(err)}\n` +
          "  What you can do: fix the config module error or temporarily move the config file aside.",
      )
    }
  }
  return DEFAULT_CONFIG
}

/**
 * Load a config file as a module. For TypeScript (.ts / .mts) we use jiti,
 * which transpiles on the fly — Node's native dynamic import() doesn't
 * handle .ts. For JS flavors (.js / .mjs / .cjs) we use native import()
 * to avoid a jiti round-trip.
 */
async function loadConfigFile(filePath: string): Promise<UserConfig> {
  const ext = extname(filePath)
  let mod: { default?: unknown }

  if (ext === ".ts" || ext === ".mts") {
    const jiti = createJiti(import.meta.url, {
      interopDefault: true,
      moduleCache: false,
    })
    mod = (await jiti.import(filePath)) as { default?: unknown }
  } else {
    mod = (await import(pathToFileURL(filePath).href)) as { default?: unknown }
  }

  // Support both `export default { ... }` and bare named exports.
  const raw = mod.default ?? mod
  return UserConfigSchema.parse(raw) as UserConfig
}

export function defineConfig(config: UserConfig): UserConfig {
  return config
}

function mergeConfig(base: ResolvedConfig, user: UserConfig): ResolvedConfig {
  return {
    rules: { ...base.rules, ...(user.rules ?? {}) },
    ignore: user.ignore ?? base.ignore,
    runtime: {
      defaults: {
        ...base.runtime.defaults,
        ...(user.runtime?.defaults ?? {}),
      },
    },
  }
}

function formatZodError(filePath: string, err: z.ZodError): string {
  const source = safeRead(filePath)
  const header = `hardened: invalid config in ${filePath}:`
  const lines: string[] = [header]
  for (const issue of err.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)"
    const line = source ? findLikelyConfigLine(source, issue.path) : 1
    const detail = issue.message
    // zod's default message for enum mismatch is useful but sometimes long;
    // keep it as-is — it already lists valid values.
    lines.push(`  ${filePath}:${line}: ${path}: ${detail}`)
  }
  lines.push(
    "\n  What you can do: edit the highlighted config key so it matches the documented schema.",
  )
  lines.push(
    "  See https://github.com/compactbench/hardened/tree/main/docs for the config schema.",
  )
  return lines.join("\n")
}

function safeRead(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf8")
  } catch {
    return null
  }
}

function findLikelyConfigLine(source: string, path: Array<string | number>): number {
  const lines = source.split(/\r?\n/)
  const keys = path.filter((part): part is string => typeof part === "string")
  for (const key of [...keys].reverse()) {
    const keyRe = new RegExp(`\\b${escapeRegex(key)}\\b`)
    const index = lines.findIndex((line) => keyRe.test(line))
    if (index >= 0) return index + 1
  }
  return 1
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
