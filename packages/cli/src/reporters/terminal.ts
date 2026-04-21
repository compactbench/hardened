import pc from "picocolors"
import type { Match } from "@hardened/core"

export function reportTerminal(findings: Match[]): void {
  if (findings.length === 0) {
    console.log(pc.green("✓ No production risks detected."))
    return
  }

  const byFile = new Map<string, Match[]>()
  for (const f of findings) {
    const bucket = byFile.get(f.file) ?? []
    bucket.push(f)
    byFile.set(f.file, bucket)
  }

  for (const [file, items] of byFile) {
    console.log(pc.bold(file))
    items.sort((a, b) => a.line - b.line || a.column - b.column)
    for (const item of items) {
      const sev =
        item.severity === "error"
          ? pc.red("error  ")
          : item.severity === "warning"
            ? pc.yellow("warn   ")
            : pc.blue("info   ")
      const loc = pc.dim(`${item.line}:${item.column}`.padEnd(8))
      console.log(`  ${loc}${sev}${item.message}  ${pc.dim(item.ruleId)}`)
    }
    console.log()
  }

  const errors = findings.filter((f) => f.severity === "error").length
  const warnings = findings.filter((f) => f.severity === "warning").length
  console.log(
    `${findings.length} issue${findings.length === 1 ? "" : "s"} ` +
      `(${pc.red(`${errors} error${errors === 1 ? "" : "s"}`)}, ` +
      `${pc.yellow(`${warnings} warning${warnings === 1 ? "" : "s"}`)})`,
  )
  console.log(`\nRun ${pc.cyan("hardened risk fix")} to apply auto-fixes.`)
}
