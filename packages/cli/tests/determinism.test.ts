import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Project, type SourceFile } from "ts-morph"
import { DEFAULT_CONFIG, isIgnoredLine, type Match, type Rule } from "@hardened/core"
import { riskRules } from "@hardened/rules-risk"

const here = fileURLToPath(new URL(".", import.meta.url))
const corpusRoot = resolve(here, "..", "..", "..", "fixtures", "corpus")

// Same helper as corpus.test.ts — duplicate intentionally: this test is about
// repeated runs producing identical output. Independence from the other
// suite makes the integrity signal clearer.
function scanSource(source: string, rules: Rule[]): Match[] {
  const project = new Project({
    compilerOptions: { allowJs: true, target: 99 },
    useInMemoryFileSystem: true,
  })
  const file: SourceFile = project.createSourceFile("input.ts", source)

  const matches: Match[] = []
  for (const rule of rules) {
    const fileMatches = rule.match({ file, project, config: DEFAULT_CONFIG })
    for (const m of fileMatches) {
      if (isIgnoredLine(file, m.line)) continue
      matches.push(m)
    }
  }
  return matches
}

function normalize(matches: Match[]): string {
  // Compare on everything except the live AST node (which has object identity).
  return JSON.stringify(
    matches.map((m) => ({
      ruleId: m.ruleId,
      file: m.file,
      line: m.line,
      column: m.column,
      severity: m.severity,
      message: m.message,
      meta: m.meta,
    })),
  )
}

// Collect every fixture file path from the corpus tree.
function collectFixtures(): string[] {
  const fixtures: string[] = []
  for (const category of readdirSync(corpusRoot, { withFileTypes: true })) {
    if (!category.isDirectory()) continue
    const catDir = join(corpusRoot, category.name)
    for (const scenario of readdirSync(catDir, { withFileTypes: true })) {
      if (!scenario.isDirectory()) continue
      fixtures.push(join(catDir, scenario.name, "before.ts"))
    }
  }
  return fixtures
}

describe("determinism: same input twice = identical output", () => {
  for (const fixturePath of collectFixtures()) {
    const shortName = fixturePath
      .replace(corpusRoot, "")
      .replace(/\\/g, "/")
      .replace(/\/before\.ts$/, "")
      .replace(/^\//, "")

    it(shortName, () => {
      const source = readFileSync(fixturePath, "utf8")
      const first = normalize(scanSource(source, riskRules))
      const second = normalize(scanSource(source, riskRules))
      expect(second).toBe(first)
    })
  }
})
