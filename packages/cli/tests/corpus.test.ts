import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Project, type SourceFile } from "ts-morph"
import {
  DEFAULT_CONFIG,
  isIgnoredLine,
  type Match,
  type Rule,
} from "@hardened/core"
import { riskRules } from "@hardened/rules-risk"

const here = fileURLToPath(new URL(".", import.meta.url))
const corpusRoot = resolve(here, "..", "..", "..", "fixtures", "corpus")

interface ExpectedFinding {
  ruleId: string
  severity: "error" | "warning" | "info"
}

const targetRuleByCategory: Record<string, string> = {
  "await-in-loop": "risk/await-in-loop",
  axios: "risk/http-no-timeout",
  "axios-instances": "risk/http-no-timeout",
  fetch: "risk/fetch-no-abort-signal",
  "floating-promise": "risk/floating-promise",
  "got-ky": "risk/http-no-timeout",
  "node-http": "risk/http-no-timeout",
  "pg-mysql": "risk/db-no-query-timeout",
  prisma: "risk/prisma-no-timeout",
  "promise-all-settled": "risk/promise-all-no-settled",
}

// Scan a single in-memory source string. Avoids touching disk so fixtures can
// reference packages that aren't installed in the test environment.
function scanSource(source: string, rules: Rule[]): Match[] {
  const project = new Project({
    compilerOptions: { allowJs: true, target: 99 },
    useInMemoryFileSystem: true,
  })
  const file: SourceFile = project.createSourceFile("input.ts", source)

  const matches: Match[] = []
  for (const rule of rules) {
    const fileMatches = rule.match({
      file,
      project,
      config: DEFAULT_CONFIG,
    })
    for (const m of fileMatches) {
      if (isIgnoredLine(file, m.line)) continue
      matches.push(m)
    }
  }
  return matches
}

const categories = readdirSync(corpusRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

describe("corpus coverage matrix", () => {
  it("keeps at least 5 positive and 5 negative scenarios per rule", () => {
    const coverage = new Map<
      string,
      { positive: Set<string>; negative: Set<string> }
    >()

    for (const ruleId of Object.values(targetRuleByCategory)) {
      coverage.set(ruleId, { positive: new Set(), negative: new Set() })
    }

    for (const category of categories) {
      const targetRuleId = targetRuleByCategory[category]
      if (!targetRuleId) continue

      const scenarios = readdirSync(join(corpusRoot, category), {
        withFileTypes: true,
      })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)

      for (const scenario of scenarios) {
        const expected: ExpectedFinding[] = JSON.parse(
          readFileSync(
            join(corpusRoot, category, scenario, "expected.json"),
            "utf8",
          ),
        )
        const bucket = coverage.get(targetRuleId)!
        const label = `${category}/${scenario}`
        if (expected.some((finding) => finding.ruleId === targetRuleId)) {
          bucket.positive.add(label)
        } else {
          bucket.negative.add(label)
        }
      }
    }

    for (const [ruleId, bucket] of coverage) {
      expect(
        bucket.positive.size,
        `${ruleId} positive fixtures: ${[...bucket.positive].join(", ")}`,
      ).toBeGreaterThanOrEqual(5)
      expect(
        bucket.negative.size,
        `${ruleId} negative fixtures: ${[...bucket.negative].join(", ")}`,
      ).toBeGreaterThanOrEqual(5)
    }
  })
})

for (const category of categories) {
  describe(`corpus: ${category}`, () => {
    const categoryDir = join(corpusRoot, category)
    const scenarios = readdirSync(categoryDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()

    for (const scenario of scenarios) {
      it(scenario, () => {
        const scenarioDir = join(categoryDir, scenario)
        const before = readFileSync(join(scenarioDir, "before.ts"), "utf8")
        const expected: ExpectedFinding[] = JSON.parse(
          readFileSync(join(scenarioDir, "expected.json"), "utf8"),
        )

        const actual = scanSource(before, riskRules)
        const actualMinimized = actual.map((m) => ({
          ruleId: m.ruleId,
          severity: m.severity,
        }))

        expect(actualMinimized).toEqual(expected)
      })
    }
  })
}
