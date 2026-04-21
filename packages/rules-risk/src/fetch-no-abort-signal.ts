import { SyntaxKind, type Node } from "ts-morph"
import type { Match, Rule } from "@hardened/core"

export const fetchNoAbortSignal: Rule = {
  id: "risk/fetch-no-abort-signal",
  category: "risk",
  severity: "warning",
  description:
    "fetch() calls without an AbortSignal can outlive component unmounts or request deadlines.",

  match({ file }) {
    const matches: Match[] = []

    file.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) return
      if (node.getExpression().getText() !== "fetch") return

      const optsArg = node.getArguments()[1]
      if (hasSignalProp(optsArg)) return

      const pos = file.getLineAndColumnAtPos(node.getStart())
      matches.push({
        ruleId: "risk/fetch-no-abort-signal",
        file: file.getFilePath(),
        line: pos.line,
        column: pos.column,
        severity: "warning",
        message:
          "fetch() call has no AbortSignal for component/request lifecycle cleanup",
        node,
      })
    })

    return matches
  },
  // fix(): deliberately omitted. Threading an AbortSignal through a call graph
  // requires scope analysis (React unmount lifecycle, awaiting context, etc.).
  // Finding-only for v1. Human reviews and adds AbortController manually.
}

function hasSignalProp(optsArg: Node | undefined): boolean {
  if (!optsArg) return false
  if (!optsArg.isKind(SyntaxKind.ObjectLiteralExpression)) return false
  return optsArg
    .getProperties()
    .some(
      (p) =>
        (p.isKind(SyntaxKind.PropertyAssignment) && p.getName() === "signal") ||
        (p.isKind(SyntaxKind.ShorthandPropertyAssignment) &&
          p.getName() === "signal"),
    )
}
