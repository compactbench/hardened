import { describe, expect, it } from "vitest"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Fixer, Scanner, loadConfig } from "@hardened/core"
import { riskRules } from "@hardened/rules-risk"

const here = fileURLToPath(new URL(".", import.meta.url))
const fixtureRoot = resolve(here, "..", "..", "..", "fixtures", "sample-app")

async function runScan() {
  const config = await loadConfig(fixtureRoot)
  // Smoke test deliberately scans code under fixtures/sample-app/. The
  // default ignore list (which includes **/fixtures/**) would correctly
  // filter this out for real users, so we narrow the ignore list here to
  // just build output. This isolates the smoke test from changes to the
  // default ignore list.
  const scanConfig = { ...config, ignore: ["**/node_modules/**"] }
  const scanner = new Scanner({
    rules: riskRules,
    config: scanConfig,
    cwd: fixtureRoot,
  })
  const findings = await scanner.run()
  return { findings, config: scanConfig }
}

describe("smoke: end-to-end scan + fix on fixtures/sample-app", () => {
  it("scanner produces 5 errors and 1 warning", async () => {
    const { findings } = await runScan()
    const errors = findings.filter((f) => f.severity === "error")
    const warnings = findings.filter((f) => f.severity === "warning")
    expect(errors).toHaveLength(5)
    expect(warnings).toHaveLength(1)
  })

  it("every error is risk/http-no-timeout", async () => {
    const { findings } = await runScan()
    const errors = findings.filter((f) => f.severity === "error")
    expect(errors.map((e) => e.ruleId)).toEqual(
      Array.from({ length: 5 }, () => "risk/http-no-timeout"),
    )
  })

  it("warning is risk/fetch-no-abort-signal", async () => {
    const { findings } = await runScan()
    const warnings = findings.filter((f) => f.severity === "warning")
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.ruleId).toBe("risk/fetch-no-abort-signal")
  })

  it("respects // hardened-ignore-next-line directive (specialCase function)", async () => {
    const { findings } = await runScan()
    // specialCase has the directive right above its axios.get call.
    // No finding should exist within the function body (lines ~33–36).
    const insideSpecialCase = findings.filter((f) => f.line >= 33 && f.line <= 36)
    expect(insideSpecialCase).toHaveLength(0)
  })

  it("does not flag calls that already pass a timeout option", async () => {
    const { findings } = await runScan()
    // safeGet on line ~28–30 passes { timeout: 5000 } — should be clean.
    const insideSafeGet = findings.filter((f) => f.line >= 27 && f.line <= 31)
    expect(insideSafeGet).toHaveLength(0)
  })

  it("fixer produces 5 auto-fixes and skips the finding-only warning", async () => {
    const { findings, config } = await runScan()
    const fixer = new Fixer({ findings, rules: riskRules, config, dryRun: true })
    const result = await fixer.apply()

    expect(result.fixesApplied).toBe(5)
    expect(result.filesChanged).toHaveLength(1)
    expect(result.skipped.length).toBeGreaterThanOrEqual(1)
    const skippedIds = result.skipped.map((s) => s.ruleId)
    expect(skippedIds).toContain("risk/fetch-no-abort-signal")
  })

  it("fixer requests hardened-runtime as an added dependency", async () => {
    const { findings, config } = await runScan()
    const fixer = new Fixer({ findings, rules: riskRules, config, dryRun: true })
    const result = await fixer.apply()

    expect(result.addedDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "hardened-runtime" }),
      ]),
    )
  })

  it("applying fix to disk + re-scanning produces 0 errors", async () => {
    const { mkdir, mkdtemp, readFile, rm, writeFile } = await import(
      "node:fs/promises"
    )
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")

    const tmpRoot = await mkdtemp(join(tmpdir(), "hardened-smoke-"))
    try {
      // Copy only the single source file we need. The full fixture directory
      // contains pnpm-managed node_modules symlinks that Windows can't mirror
      // without elevated permissions.
      const src = await readFile(join(fixtureRoot, "src", "api.ts"), "utf8")
      await mkdir(join(tmpRoot, "src"), { recursive: true })
      await writeFile(join(tmpRoot, "src", "api.ts"), src)

      const config = await loadConfig(tmpRoot)
      // Narrow ignore for consistency with runScan above — the tmpRoot
      // path shouldn't match default-ignored patterns anyway, but making
      // this explicit keeps the smoke test hermetic.
      const scanConfig = { ...config, ignore: ["**/node_modules/**"] }
      const initialScanner = new Scanner({
        rules: riskRules,
        config: scanConfig,
        cwd: tmpRoot,
      })
      const initialFindings = await initialScanner.run()

      const fixer = new Fixer({
        findings: initialFindings,
        rules: riskRules,
        config: scanConfig,
        dryRun: false,
      })
      await fixer.apply()

      // Fresh Scanner re-reads source from disk after the Fixer wrote to it.
      const rescanner = new Scanner({
        rules: riskRules,
        config: scanConfig,
        cwd: tmpRoot,
      })
      const rescanFindings = await rescanner.run()
      const errorsAfterFix = rescanFindings.filter((f) => f.severity === "error")

      expect(errorsAfterFix).toHaveLength(0)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
