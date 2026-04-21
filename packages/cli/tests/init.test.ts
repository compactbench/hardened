import { describe, expect, it } from "vitest"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { detectDependencies, renderConfig } from "../src/commands/init.js"

async function withTempPkg(pkg: object, test: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "hardened-init-"))
  try {
    await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2))
    await test(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe("hardened init — detectDependencies", () => {
  it("returns empty detection when no package.json exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hardened-nopkg-"))
    try {
      const d = detectDependencies(join(dir, "package.json"))
      expect(d).toEqual({ http: [], db: [] })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("detects axios in dependencies", async () => {
    await withTempPkg(
      { dependencies: { axios: "^1.7.0", react: "^18.0.0" } },
      async (dir) => {
        const d = detectDependencies(join(dir, "package.json"))
        expect(d.http).toContain("axios")
        expect(d.db).toEqual([])
      },
    )
  })

  it("detects Prisma in devDependencies", async () => {
    await withTempPkg(
      { devDependencies: { "@prisma/client": "^5.0.0" } },
      async (dir) => {
        const d = detectDependencies(join(dir, "package.json"))
        expect(d.db).toContain("Prisma")
      },
    )
  })

  it("detects multiple libs across dep groups", async () => {
    await withTempPkg(
      {
        dependencies: { axios: "^1.7.0", pg: "^8.11.0" },
        devDependencies: { got: "^14.0.0" },
      },
      async (dir) => {
        const d = detectDependencies(join(dir, "package.json"))
        expect(d.http).toEqual(expect.arrayContaining(["axios", "got"]))
        expect(d.db).toContain("pg (node-postgres)")
      },
    )
  })

  it("returns empty on malformed package.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "hardened-bad-"))
    try {
      await writeFile(join(dir, "package.json"), "{ not valid json")
      const d = detectDependencies(join(dir, "package.json"))
      expect(d).toEqual({ http: [], db: [] })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe("hardened init — renderConfig", () => {
  it("includes defineConfig import and all rules", () => {
    const src = renderConfig({ http: [], db: [] })
    expect(src).toMatch(/import \{ defineConfig \} from "hardened"/)
    expect(src).toMatch(/"risk\/http-no-timeout": "error"/)
    expect(src).toMatch(/"risk\/fetch-no-abort-signal": "warning"/)
    expect(src).toMatch(/"risk\/floating-promise": "warning"/)
    expect(src).toMatch(/"risk\/await-in-loop": "warning"/)
    expect(src).toMatch(/"risk\/promise-all-no-settled": "info"/)
    expect(src).toMatch(/"risk\/db-no-query-timeout": "error"/)
    expect(src).toMatch(/"risk\/prisma-no-timeout": "error"/)
  })

  it("includes detected libraries in the header comment", () => {
    const src = renderConfig({ http: ["axios"], db: ["Prisma"] })
    expect(src).toMatch(/Detected libraries.*axios.*Prisma/)
  })

  it("produces a header noting zero detections when empty", () => {
    const src = renderConfig({ http: [], db: [] })
    expect(src).toMatch(/No known HTTP\/DB client dependencies detected/)
  })

  it("includes standard ignore patterns and runtime defaults", () => {
    const src = renderConfig({ http: [], db: [] })
    expect(src).toMatch(/"\*\*\/node_modules\/\*\*"/)
    expect(src).toMatch(/"\*\*\/fixtures\/\*\*"/)
    expect(src).toMatch(/timeout: 10_000/)
    expect(src).toMatch(/retries: 3/)
    expect(src).toMatch(/backoff: "exponential"/)
  })
})
