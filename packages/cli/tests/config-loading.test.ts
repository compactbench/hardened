import { describe, expect, it } from "vitest"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadConfig, DEFAULT_CONFIG } from "@hardened/core"

describe("config loader", () => {
  it("returns DEFAULT_CONFIG when no file exists", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-cfg-"))
    try {
      const cfg = await loadConfig(tmp)
      expect(cfg).toEqual(DEFAULT_CONFIG)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("loads a TypeScript config via jiti", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-cfg-ts-"))
    try {
      const src = `export default {
  ignore: ["**/custom-ignored/**"],
  runtime: { defaults: { timeout: 12345 } },
}
`
      await writeFile(join(tmp, "hardened.config.ts"), src)
      const cfg = await loadConfig(tmp)
      expect(cfg.ignore).toContain("**/custom-ignored/**")
      expect(cfg.runtime.defaults.timeout).toBe(12345)
      // Other runtime defaults preserved from DEFAULT_CONFIG
      expect(cfg.runtime.defaults.retries).toBe(DEFAULT_CONFIG.runtime.defaults.retries)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("loads an ESM JavaScript config via native import", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-cfg-mjs-"))
    try {
      const src = `export default {
  ignore: ["**/legacy-build/**"],
}
`
      await writeFile(join(tmp, "hardened.config.mjs"), src)
      const cfg = await loadConfig(tmp)
      expect(cfg.ignore).toEqual(["**/legacy-build/**"])
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("merges user overrides without losing unset defaults", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-cfg-merge-"))
    try {
      await mkdir(tmp, { recursive: true })
      const src = `export default {
  rules: { "risk/http-no-timeout": "warning" },
}
`
      await writeFile(join(tmp, "hardened.config.ts"), src)
      const cfg = await loadConfig(tmp)
      // User rule override
      expect(cfg.rules["risk/http-no-timeout"]).toBe("warning")
      // Defaults preserved where not overridden
      expect(cfg.ignore).toEqual(DEFAULT_CONFIG.ignore)
      expect(cfg.runtime.defaults.timeout).toBe(DEFAULT_CONFIG.runtime.defaults.timeout)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("prefers .ts over .mjs when both exist (priority order)", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-cfg-order-"))
    try {
      await writeFile(
        join(tmp, "hardened.config.ts"),
        `export default { ignore: ["ts-wins"] }\n`,
      )
      await writeFile(
        join(tmp, "hardened.config.mjs"),
        `export default { ignore: ["mjs-loses"] }\n`,
      )
      const cfg = await loadConfig(tmp)
      expect(cfg.ignore).toEqual(["ts-wins"])
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})

describe("config loader — schema validation", () => {
  it("rejects an invalid severity value", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-bad-sev-"))
    try {
      await writeFile(
        join(tmp, "hardened.config.mjs"),
        `export default { rules: { "risk/http-no-timeout": "critical" } }\n`,
      )
      await expect(loadConfig(tmp)).rejects.toThrow(
        /invalid config in .*hardened\.config\.mjs/,
      )
      await expect(loadConfig(tmp)).rejects.toThrow(/rules.risk\/http-no-timeout/)
      await expect(loadConfig(tmp)).rejects.toThrow(/What you can do:/)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("rejects a wrong type for runtime.defaults.timeout", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-bad-timeout-"))
    try {
      await writeFile(
        join(tmp, "hardened.config.mjs"),
        `export default { runtime: { defaults: { timeout: "fast" } } }\n`,
      )
      await expect(loadConfig(tmp)).rejects.toThrow(
        /runtime\.defaults\.timeout/,
      )
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("rejects an unknown top-level key (strict mode)", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-unknown-key-"))
    try {
      await writeFile(
        join(tmp, "hardened.config.mjs"),
        `export default { rules: {}, unknownOption: true }\n`,
      )
      await expect(loadConfig(tmp)).rejects.toThrow(/unknownOption/)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("accepts a valid config exactly as-given", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-valid-"))
    try {
      await writeFile(
        join(tmp, "hardened.config.mjs"),
        `export default {
  rules: { "risk/http-no-timeout": "warning", "risk/floating-promise": "off" },
  ignore: ["custom/**"],
  runtime: { defaults: { timeout: 3000, retries: 5, backoff: "constant" } },
}
`,
      )
      const cfg = await loadConfig(tmp)
      expect(cfg.rules["risk/http-no-timeout"]).toBe("warning")
      expect(cfg.rules["risk/floating-promise"]).toBe("off")
      expect(cfg.ignore).toEqual(["custom/**"])
      expect(cfg.runtime.defaults.timeout).toBe(3000)
      expect(cfg.runtime.defaults.retries).toBe(5)
      expect(cfg.runtime.defaults.backoff).toBe("constant")
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})
