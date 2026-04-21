import { describe, expect, it } from "vitest"
import { buildSarif } from "../src/reporters/sarif.js"
import type { Match } from "@hardened/core"

function fakeMatch(overrides: Partial<Match>): Match {
  return {
    ruleId: "risk/http-no-timeout",
    file: "C:/repo/src/api.ts",
    line: 10,
    column: 5,
    severity: "error",
    message: "axios.get() has no timeout",
    node: {} as Match["node"],
    ...overrides,
  }
}

describe("SARIF 2.1.0 reporter", () => {
  it("produces valid top-level SARIF structure", () => {
    const log = buildSarif({ findings: [], cwd: "C:/repo" })
    expect(log.version).toBe("2.1.0")
    expect(log.$schema).toMatch(/sarif-schema-2\.1\.0\.json$/)
    expect(log.runs).toHaveLength(1)
    expect(log.runs[0]?.tool.driver.name).toBe("hardened")
  })

  it("maps severity → SARIF level correctly (error|warning|note)", () => {
    const findings: Match[] = [
      fakeMatch({ severity: "error", ruleId: "risk/http-no-timeout" }),
      fakeMatch({ severity: "warning", ruleId: "risk/fetch-no-abort-signal" }),
      fakeMatch({ severity: "info", ruleId: "risk/promise-all-no-settled" }),
    ]
    const log = buildSarif({ findings, cwd: "C:/repo" })
    const results = log.runs[0]!.results
    expect(results[0]?.level).toBe("error")
    expect(results[1]?.level).toBe("warning")
    expect(results[2]?.level).toBe("note") // SARIF calls info-level 'note'
  })

  it("converts file paths to POSIX-relative under cwd", () => {
    const findings = [fakeMatch({ file: "C:/repo/src/api.ts" })]
    const log = buildSarif({ findings, cwd: "C:/repo" })
    const uri = log.runs[0]!.results[0]!.locations[0]!.physicalLocation.artifactLocation.uri
    expect(uri).toBe("src/api.ts")
    expect(uri).not.toContain("\\")
  })

  it("deduplicates rule descriptors across multiple findings", () => {
    const findings: Match[] = [
      fakeMatch({ ruleId: "risk/http-no-timeout" }),
      fakeMatch({ ruleId: "risk/http-no-timeout", line: 20 }),
      fakeMatch({ ruleId: "risk/http-no-timeout", line: 30 }),
    ]
    const log = buildSarif({ findings, cwd: "C:/repo" })
    const rules = log.runs[0]!.tool.driver.rules
    expect(rules).toHaveLength(1)
    expect(rules[0]?.id).toBe("risk/http-no-timeout")
    expect(log.runs[0]!.results).toHaveLength(3)
  })

  it("emits one rule descriptor per unique ruleId", () => {
    const findings: Match[] = [
      fakeMatch({ ruleId: "risk/http-no-timeout" }),
      fakeMatch({ ruleId: "risk/fetch-no-abort-signal", severity: "warning" }),
      fakeMatch({ ruleId: "risk/floating-promise", severity: "warning" }),
    ]
    const log = buildSarif({ findings, cwd: "C:/repo" })
    const ruleIds = log.runs[0]!.tool.driver.rules.map((r) => r.id).sort()
    expect(ruleIds).toEqual([
      "risk/fetch-no-abort-signal",
      "risk/floating-promise",
      "risk/http-no-timeout",
    ])
  })

  it("handles empty findings (empty results + empty rules)", () => {
    const log = buildSarif({ findings: [], cwd: "C:/repo" })
    expect(log.runs[0]?.results).toEqual([])
    expect(log.runs[0]?.tool.driver.rules).toEqual([])
  })

  it("emits stable partial fingerprints when only line numbers shift", () => {
    const before = buildSarif({
      cwd: "C:/repo",
      findings: [fakeMatch({ line: 10, column: 3 })],
    })
    const after = buildSarif({
      cwd: "C:/repo",
      findings: [fakeMatch({ line: 14, column: 3 })],
    })

    expect(
      after.runs[0]?.results[0]?.partialFingerprints.primaryLocationLineHash,
    ).toBe(
      before.runs[0]?.results[0]?.partialFingerprints.primaryLocationLineHash,
    )
  })

  it("disambiguates multiple findings of the same rule+file via occurrence index", () => {
    // Distinct findings sharing rule+file+context+text must get unique fingerprints.
    const findings: Match[] = [
      fakeMatch({ line: 10 }),
      fakeMatch({ line: 20 }),
      fakeMatch({ line: 30 }),
    ]
    const log = buildSarif({ cwd: "C:/repo", findings })
    const prints = log.runs[0]!.results.map(
      (r) => r.partialFingerprints.primaryLocationLineHash,
    )
    expect(new Set(prints).size).toBe(3)
  })

  it("keeps occurrence-index scoped per (rule, file) — different files start fresh", () => {
    // Occurrence indices reset per file; cross-file findings stay distinct.
    const findings: Match[] = [
      fakeMatch({ file: "C:/repo/a.ts", line: 10 }),
      fakeMatch({ file: "C:/repo/a.ts", line: 20 }),
      fakeMatch({ file: "C:/repo/b.ts", line: 10 }),
      fakeMatch({ file: "C:/repo/b.ts", line: 20 }),
    ]
    const log = buildSarif({ cwd: "C:/repo", findings })
    const prints = log.runs[0]!.results.map(
      (r) => r.partialFingerprints.primaryLocationLineHash,
    )
    // All four must be distinct.
    expect(new Set(prints).size).toBe(4)
  })
})
