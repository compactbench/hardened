import { SyntaxKind, type Node } from "ts-morph"
import type { Match, Rule } from "@hardened/core"

// Detect `await` expressions that execute once per iteration of a loop or
// a `.forEach` callback. These are typically either N+1 patterns (a network
// call per item) or missed parallelism opportunities where the iterations
// are independent and could run via `Promise.all`.
//
// Scope decision: when the iterations are legitimately sequential (later
// iterations depend on earlier results — cursor pagination, state machines),
// users silence the finding with `// hardened-ignore-next-line`. The rule
// doesn't try to detect dependency statically — that's intractable and fragile.
export const awaitInLoop: Rule = {
  id: "risk/await-in-loop",
  category: "risk",
  severity: "warning",
  description:
    "`await` inside a loop runs iterations sequentially. Either use `Promise.all` for parallelism or silence with an ignore directive if the sequencing is intentional.",

  match({ file }) {
    const matches: Match[] = []

    file.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.AwaitExpression)) return
      if (!isInsideLoopContext(node)) return

      const pos = file.getLineAndColumnAtPos(node.getStart())
      matches.push({
        ruleId: "risk/await-in-loop",
        file: file.getFilePath(),
        line: pos.line,
        column: pos.column,
        severity: "warning",
        message:
          "await inside a loop runs iterations sequentially — consider Promise.all if iterations are independent",
        node,
      })
    })

    return matches
  },
  // No auto-fix: converting a sequential loop to Promise.all changes
  // semantics (execution order, failure behavior). Must be a human call.
}

// Walk up from an AwaitExpression. Flag it as in-loop if the nearest enclosing
// scope is a loop body OR the callback of a `.forEach(...)` call. Stop walking
// at any other function boundary — the await belongs to a separate async
// context at that point.
function isInsideLoopContext(node: Node): boolean {
  let parent = node.getParent()
  while (parent) {
    if (
      parent.isKind(SyntaxKind.ForStatement) ||
      parent.isKind(SyntaxKind.ForInStatement) ||
      parent.isKind(SyntaxKind.ForOfStatement) ||
      parent.isKind(SyntaxKind.WhileStatement) ||
      parent.isKind(SyntaxKind.DoStatement)
    ) {
      return true
    }

    // Function boundary: stop unless it's the callback of a .forEach call.
    if (
      parent.isKind(SyntaxKind.ArrowFunction) ||
      parent.isKind(SyntaxKind.FunctionExpression)
    ) {
      const fnParent = parent.getParent()
      if (fnParent?.isKind(SyntaxKind.CallExpression)) {
        const callee = fnParent.getExpression()
        if (
          callee.isKind(SyntaxKind.PropertyAccessExpression) &&
          callee.getName() === "forEach"
        ) {
          return true
        }
      }
      return false
    }

    parent = parent.getParent()
  }
  return false
}
