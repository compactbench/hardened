import type { Match } from "@hardened/core"

export function reportJson(findings: Match[]): void {
  const serializable = findings.map((f) => ({
    ruleId: f.ruleId,
    file: f.file,
    line: f.line,
    column: f.column,
    severity: f.severity,
    message: f.message,
    meta: f.meta,
  }))
  console.log(JSON.stringify(serializable, null, 2))
}
