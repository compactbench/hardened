import { SyntaxKind, type Node } from "ts-morph"
import type { Match, Rule } from "@hardened/core"

// Surface-level detection: top-level CallExpression statements that return a
// Promise-shaped value and are not awaited or chained with .catch(). Prefer
// typescript-eslint's `no-floating-promises` for deep type-aware checks —
// this rule catches the common axios/fetch cases without a TypeChecker call.
export const floatingPromise: Rule = {
  id: "risk/floating-promise",
  category: "risk",
  severity: "warning",
  description:
    "Unhandled promises silently swallow errors and mask production failures.",

  match({ file }) {
    const matches: Match[] = []

    file.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.ExpressionStatement)) return
      const inner = node.getExpression()
      if (!inner.isKind(SyntaxKind.CallExpression)) return

      const exprText = inner.getExpression().getText()
      if (!isPromiseShaped(exprText)) return
      if (hasErrorHandler(inner)) return

      const pos = file.getLineAndColumnAtPos(inner.getStart())
      matches.push({
        ruleId: "risk/floating-promise",
        file: file.getFilePath(),
        line: pos.line,
        column: pos.column,
        severity: "warning",
        message: `Promise-returning call '${exprText}' is not awaited or caught`,
        node: inner,
      })
    })

    return matches
  },
  // No fix: inserting `await` or `.catch()` changes control flow. Emit a
  // finding and let a human pick the right semantics.
}

function isPromiseShaped(expr: string): boolean {
  return /^(axios\.|fetch\b|.*\.(then|fetch|save|query|exec|execute)\b)/.test(expr)
}

function hasErrorHandler(call: Node): boolean {
  let parent = call.getParent()
  while (parent) {
    if (parent.isKind(SyntaxKind.AwaitExpression)) return true
    if (parent.isKind(SyntaxKind.PropertyAccessExpression)) {
      const name = parent.getName()
      if (name === "catch" || name === "then") return true
    }
    if (parent.isKind(SyntaxKind.CallExpression)) {
      const exprText = parent.getExpression().getText()
      if (/\.(catch|then)$/.test(exprText)) return true
    }
    parent = parent.getParent()
  }
  return false
}
