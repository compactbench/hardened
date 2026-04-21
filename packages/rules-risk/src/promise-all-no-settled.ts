import { SyntaxKind, type Node } from "ts-morph"
import type { Match, Rule } from "@hardened/core"

// Detect `Promise.all(...)` calls whose result is discarded (i.e. the call
// appears as a bare expression statement, typically after `await`). This
// shape is characteristic of fan-out patterns — firing off independent side
// effects (metrics, webhooks, notifications) where the caller doesn't read
// the results. `Promise.all` short-circuits on the first rejection, which is
// usually the wrong semantics for fan-out: one failing destination hides the
// rest of the outcomes from the caller. `Promise.allSettled` is the correct
// choice.
//
// Heuristic: flag Promise.all whose enclosing statement is ExpressionStatement
// (result discarded). Assigned/returned/destructured results are legitimate —
// the caller uses them, so at-least-one failing means the whole operation
// can't proceed.
//
// Exception: known-safe fan-outs like React Query's `invalidateQueries`,
// where Promise.all's short-circuit-on-reject is the intended semantic
// (an invalidation failure should propagate, not be silently swallowed).
// See KNOWN_SAFE_FANOUT_CALLEES below.

// Method names whose all-same fan-out under Promise.all is intentional.
// If every element of the Promise.all array literal resolves to a
// CallExpression whose called property is in this set, we skip the finding.
// Ternary branches (`cond ? call() : Promise.resolve()`) and literal
// `Promise.resolve()` no-ops are also treated as safe so the common
// "conditional invalidation" React Query pattern doesn't flag.
// Users who want broader suppression can add `// hardened-ignore-next-line`.
const KNOWN_SAFE_FANOUT_CALLEES = new Set([
  // React Query / TanStack Query cache-control methods. All of these
  // should propagate failures rather than be wrapped in allSettled —
  // a cache inconsistency is something the caller needs to see.
  "invalidateQueries",
  "refetchQueries",
  "fetchQuery",
  "prefetchQuery",
  "removeQueries",
  "resetQueries",
  "cancelQueries",
])

export const promiseAllNoSettled: Rule = {
  id: "risk/promise-all-no-settled",
  category: "risk",
  severity: "info",
  description:
    "Fire-and-forget Promise.all rejects on first failure. Use Promise.allSettled when every outcome should remain visible.",

  match({ file }) {
    const matches: Match[] = []

    file.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) return
      if (node.getExpression().getText() !== "Promise.all") return
      if (!isResultDiscarded(node)) return
      if (isAllKnownSafeFanout(node)) return

      const pos = file.getLineAndColumnAtPos(node.getStart())
      matches.push({
        ruleId: "risk/promise-all-no-settled",
        file: file.getFilePath(),
        line: pos.line,
        column: pos.column,
        severity: "info",
        message:
          "Promise.all with discarded result hides later outcomes on first rejection — prefer Promise.allSettled for fan-out",
        node,
      })
    })

    return matches
  },
  // No auto-fix: swapping Promise.all for Promise.allSettled changes the
  // return shape (PromiseSettledResult<T>[] vs T[]) and may require downstream
  // unwrapping. Must be a human call.
}

// Returns true when the Promise.all call is in a position where its return
// value is not observed: `Promise.all(...)` or `await Promise.all(...)` as a
// bare statement. Assigned, returned, or destructured results don't match.
function isResultDiscarded(call: Node): boolean {
  let current: Node | undefined = call
  // Unwrap `await <call>` so the next parent is the surrounding statement.
  const parent = current.getParent()
  if (parent?.isKind(SyntaxKind.AwaitExpression)) {
    current = parent
  }
  return current.getParent()?.isKind(SyntaxKind.ExpressionStatement) ?? false
}

// Returns true when every element of Promise.all's array argument is a
// method call whose property name is in KNOWN_SAFE_FANOUT_CALLEES. The
// canonical case is React Query's
//   await Promise.all([
//     queryClient.invalidateQueries({ queryKey: [...] }),
//     queryClient.invalidateQueries({ queryKey: [...] }),
//   ])
// where the caller genuinely wants short-circuit-on-reject semantics so
// an invalidation failure surfaces rather than being hidden by allSettled.
// A single non-safe element disables the skip — mixed fan-outs still flag.
//
// We also accept a few adjacent shapes so common React Query idioms don't
// leak false positives:
//   - Conditional expressions: `cond ? safeCall() : otherSafeCall()` is
//     treated as safe iff both branches are safe.
//   - `Promise.resolve()` / `Promise.resolve(x)`: treated as a safe no-op,
//     since it's commonly used as the "else" branch of a conditional
//     invalidation (`cond ? invalidateQueries(...) : Promise.resolve()`).
function isAllKnownSafeFanout(call: Node): boolean {
  if (!call.isKind(SyntaxKind.CallExpression)) return false

  const args = call.getArguments()
  const first = args[0]
  if (!first || !first.isKind(SyntaxKind.ArrayLiteralExpression)) return false

  const elements = first.getElements()
  if (elements.length === 0) return false

  return elements.every(isSafeFanoutElement)
}

function isSafeFanoutElement(node: Node): boolean {
  // `cond ? A : B` — safe iff both A and B are safe. This captures the
  // common "conditional invalidation" idiom cleanly.
  if (node.isKind(SyntaxKind.ConditionalExpression)) {
    return (
      isSafeFanoutElement(node.getWhenTrue()) &&
      isSafeFanoutElement(node.getWhenFalse())
    )
  }
  if (!node.isKind(SyntaxKind.CallExpression)) return false

  // `Promise.resolve()` / `Promise.resolve(x)` — treated as a safe no-op.
  if (node.getExpression().getText() === "Promise.resolve") return true

  const callee = node.getExpression()
  if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return false
  return KNOWN_SAFE_FANOUT_CALLEES.has(callee.getName())
}
