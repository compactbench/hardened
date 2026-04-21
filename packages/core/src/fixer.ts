import { readFileSync, writeFileSync } from "node:fs"
import type { Edit, Fix, FixResult, ImportSpec, Match, ResolvedConfig, Rule } from "./types.js"

export interface FixerOpts {
  findings: Match[]
  rules: Rule[]
  config: ResolvedConfig
  dryRun?: boolean
}

export class Fixer {
  constructor(private readonly opts: FixerOpts) {}

  async apply(): Promise<FixResult> {
    const rulesById = new Map(this.opts.rules.map((r) => [r.id, r]))
    const fixesByFile = new Map<string, Fix[]>()
    const skipped: Match[] = []
    const deps = new Map<string, string>()

    for (const finding of this.opts.findings) {
      const rule = rulesById.get(finding.ruleId)
      if (!rule?.fix) {
        skipped.push(finding)
        continue
      }
      const fix = rule.fix(finding, { config: this.opts.config })
      if (!fix) {
        skipped.push(finding)
        continue
      }
      const bucket = fixesByFile.get(finding.file) ?? []
      bucket.push(fix)
      fixesByFile.set(finding.file, bucket)
      for (const dep of fix.addDependencies ?? []) {
        deps.set(dep.name, dep.version)
      }
    }

    const changed: string[] = []
    let applied = 0

    for (const [filePath, fixes] of fixesByFile) {
      let source = readFileSync(filePath, "utf8")
      const allEdits: Edit[] = fixes
        .flatMap((f) => f.edits)
        .filter((e) => e.file === filePath)
        .sort((a, b) => b.range[0] - a.range[0])

      const kept: Edit[] = []
      for (const edit of allEdits) {
        if (kept.some((k) => rangesOverlap(k.range, edit.range))) continue
        kept.push(edit)
      }

      for (const edit of kept) {
        source =
          source.slice(0, edit.range[0]) +
          edit.replacement +
          source.slice(edit.range[1])
        applied++
      }

      const imports = fixes.flatMap((f) => f.addImports ?? [])
      if (imports.length > 0) {
        source = injectImports(source, imports)
      }

      if (!this.opts.dryRun) {
        writeFileSync(filePath, source)
      }
      changed.push(filePath)
    }

    return {
      filesChanged: changed,
      fixesApplied: applied,
      skipped,
      addedDependencies: Array.from(deps, ([name, version]) => ({ name, version })),
    }
  }
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return !(a[1] <= b[0] || b[1] <= a[0])
}

function injectImports(source: string, imports: ImportSpec[]): string {
  const bySource = new Map<string, Set<string>>()
  for (const imp of imports) {
    const bucket = bySource.get(imp.from) ?? new Set<string>()
    imp.names.forEach((n) => bucket.add(n))
    bySource.set(imp.from, bucket)
  }

  const newImportLines: string[] = []
  for (const [from, names] of bySource) {
    const merged = mergeIntoExistingNamedImport(source, from, names)
    source = merged.source
    if (merged.didMerge) continue

    const hasExactNamedImport = [...names].every((name) =>
      hasNamedImport(source, from, name),
    )
    if (hasExactNamedImport) continue

    newImportLines.push(`import { ${[...names].sort().join(", ")} } from "${from}"`)
  }

  if (newImportLines.length === 0) return source

  const importBlock = source.match(/(?:^|\n)((?:import\s[^\n]+\n)+)/)
  if (importBlock && importBlock.index != null) {
    const insertPos = importBlock.index + importBlock[0].length
    return (
      source.slice(0, insertPos) +
      newImportLines.join("\n") +
      "\n" +
      source.slice(insertPos)
    )
  }
  return newImportLines.join("\n") + "\n" + source
}

function mergeIntoExistingNamedImport(
  source: string,
  from: string,
  names: Set<string>,
): { source: string; didMerge: boolean } {
  const importRe = new RegExp(
    `import\\s+([^\\n;]*?\\{)([\\s\\S]*?)(\\}[^\\n;]*?from\\s+["']${escapeRegex(from)}["'])`,
    "m",
  )
  const match = source.match(importRe)
  if (!match || match.index == null) {
    return { source, didMerge: false }
  }

  const existingNames = splitNamedImports(match[2] ?? "")
  const existingImported = new Set(
    existingNames.map((name) => name.split(/\s+as\s+/i)[0]!.trim()),
  )
  const missing = [...names].filter((name) => !existingImported.has(name)).sort()
  if (missing.length === 0) {
    return { source, didMerge: true }
  }

  const nextNames = [...existingNames, ...missing]
  const replacement = `import ${match[1]} ${nextNames.join(", ")} ${match[3]}`
  return {
    source:
      source.slice(0, match.index) +
      replacement +
      source.slice(match.index + match[0].length),
    didMerge: true,
  }
}

function hasNamedImport(source: string, from: string, name: string): boolean {
  const importRe = new RegExp(
    `import\\s+[^\\n;]*?\\{([\\s\\S]*?)\\}[^\\n;]*?from\\s+["']${escapeRegex(from)}["']`,
    "m",
  )
  const match = source.match(importRe)
  if (!match) return false
  return splitNamedImports(match[1] ?? "").some(
    (existing) => existing.split(/\s+as\s+/i)[0]?.trim() === name,
  )
}

function splitNamedImports(raw: string): string[] {
  return raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
