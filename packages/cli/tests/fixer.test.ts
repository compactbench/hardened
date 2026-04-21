import { describe, expect, it } from "vitest"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DEFAULT_CONFIG, Fixer, Scanner } from "@hardened/core"
import { riskRules } from "@hardened/rules-risk"

async function scanAndFix(cwd: string) {
  const scanner = new Scanner({ rules: riskRules, config: DEFAULT_CONFIG, cwd })
  const findings = await scanner.run()
  const fixer = new Fixer({
    findings,
    rules: riskRules,
    config: DEFAULT_CONFIG,
    dryRun: false,
  })
  return fixer.apply()
}

describe("fixer import handling and source preservation", () => {
  it("merges resilient into an existing hardened-runtime named import", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-fixer-import-"))
    try {
      await mkdir(join(tmp, "src"), { recursive: true })
      const file = join(tmp, "src", "api.ts")
      await writeFile(
        file,
        `import axios from "axios"
import { timeout } from "hardened-runtime"

export async function loadUser(id: string) {
  return axios.get(\`/users/\${id}\`)
}
`,
      )

      await scanAndFix(tmp)
      const output = await readFile(file, "utf8")

      expect(output).toContain(
        `import { timeout, resilient } from "hardened-runtime"`,
      )
      expect(output.match(/from "hardened-runtime"/g)).toHaveLength(1)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("is idempotent when fix runs twice", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-fixer-idem-"))
    try {
      await mkdir(join(tmp, "src"), { recursive: true })
      const file = join(tmp, "src", "api.ts")
      await writeFile(
        file,
        `import axios from "axios"

export async function loadUser(id: string) {
  return axios.get(\`/users/\${id}\`)
}
`,
      )

      await scanAndFix(tmp)
      const first = await readFile(file, "utf8")
      await scanAndFix(tmp)
      const second = await readFile(file, "utf8")

      expect(second).toBe(first)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it("preserves the original call text inside the wrapper", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "hardened-fixer-range-"))
    try {
      await mkdir(join(tmp, "src"), { recursive: true })
      const file = join(tmp, "src", "api.ts")
      await writeFile(
        file,
        `import axios from "axios"

export async function sendEvent(payload: Record<string, unknown>) {
  return axios.post(
    "/events",
    {
      ...payload,
      // keep this comment attached to the request body
      source: "api",
    },
  )
}
`,
      )

      await scanAndFix(tmp)
      const output = await readFile(file, "utf8")

      expect(output).toContain(`resilient(() => axios.post(
    "/events",
    {
      ...payload,
      // keep this comment attached to the request body
      source: "api",
    },
  ), { timeout: 10000 })`)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})
