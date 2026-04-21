import { SyntaxKind, type Node, type SourceFile } from "ts-morph"
import type { Fix, Match, Rule } from "@hardened/core"

// HTTP clients we detect. The rule flags a CallExpression whose callee is a
// property access on one of these identifiers (or a tracked HTTP client instance)
// and no argument is an object literal carrying `timeout`.
const AXIOS_METHODS = new Set([
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "head",
  "options",
])
const GOT_KY_METHODS = new Set([
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "head",
])
const NATIVE_HTTP_METHODS = new Set(["request", "get"])

type HttpClientKind = "axios" | "got" | "ky" | "http" | "https"

const HTTP_CLIENT_METHODS = new Map<HttpClientKind, Set<string>>([
  ["axios", AXIOS_METHODS],
  ["got", GOT_KY_METHODS],
  ["ky", GOT_KY_METHODS],
  ["http", NATIVE_HTTP_METHODS],
  ["https", NATIVE_HTTP_METHODS],
])

const HTTP_MODULES = new Map<string, HttpClientKind>([
  ["axios", "axios"],
  ["got", "got"],
  ["ky", "ky"],
  ["http", "http"],
  ["node:http", "http"],
  ["https", "https"],
  ["node:https", "https"],
])

const IDEMPOTENT_METHODS = new Set(["get", "head", "options"])

interface MethodCallInfo {
  receiverText: string
  method: string
  clientKind: HttpClientKind
}

export const httpNoTimeout: Rule = {
  id: "risk/http-no-timeout",
  category: "risk",
  severity: "error",
  description:
    "HTTP calls without a timeout can hang indefinitely under network partition.",

  match({ file }) {
    const matches: Match[] = []
    const clients = collectImportedHttpClients(file)
    const instances = collectHttpClientInstances(file, clients)

    file.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) return

      const callee = node.getExpression()
      const info = identifyHttpCall(callee, clients, instances)
      if (!info) return

      if (isAlreadyWrapped(node)) return
      if (hasTimeoutForHttpCall(node, info)) return

      const pos = file.getLineAndColumnAtPos(node.getStart())
      matches.push({
        ruleId: "risk/http-no-timeout",
        file: file.getFilePath(),
        line: pos.line,
        column: pos.column,
        severity: "error",
        message: `${info.receiverText}.${info.method}() has no timeout — can hang indefinitely on network partition`,
        node,
        meta: { method: info.method },
      })
    })

    return matches
  },

  fix(match, { config }): Fix | null {
    const call = match.node
    const method = match.meta?.method as string | undefined
    if (!method) return null

    const { timeout, retries } = config.runtime.defaults
    const isIdempotent = IDEMPOTENT_METHODS.has(method)
    const policy = isIdempotent
      ? `{ timeout: ${timeout}, retries: ${retries} }`
      : `{ timeout: ${timeout} }`

    return {
      edits: [
        {
          file: call.getSourceFile().getFilePath(),
          range: [call.getStart(), call.getEnd()],
          replacement: `resilient(() => ${call.getText()}, ${policy})`,
        },
      ],
      addImports: [{ from: "hardened-runtime", names: ["resilient"] }],
      addDependencies: [{ name: "hardened-runtime", version: "^0.1.2" }],
    }
  },
}

/**
 * Only identifiers proven to come from the matching HTTP module are eligible
 * for direct matching. This avoids flagging local mocks or unrelated variables
 * that happen to be named `axios`, `got`, `ky`, `http`, or `https`.
 */
function collectImportedHttpClients(file: SourceFile): Map<string, HttpClientKind> {
  const clients = new Map<string, HttpClientKind>()

  for (const decl of file.getImportDeclarations()) {
    const kind = HTTP_MODULES.get(decl.getModuleSpecifierValue())
    if (!kind) continue

    const defaultImport = decl.getDefaultImport()
    if (defaultImport) {
      clients.set(defaultImport.getText(), kind)
    }

    const namespaceImport = decl.getNamespaceImport()
    if (namespaceImport) {
      clients.set(namespaceImport.getText(), kind)
    }

    for (const named of decl.getNamedImports()) {
      if (named.getName() !== "default") continue
      const alias = named.getAliasNode()
      if (alias) {
        clients.set(alias.getText(), kind)
      }
    }
  }

  file.forEachDescendant((node) => {
    if (!node.isKind(SyntaxKind.VariableDeclaration)) return
    const nameNode = node.getNameNode()
    if (!nameNode.isKind(SyntaxKind.Identifier)) return

    const init = node.getInitializer()
    if (!init?.isKind(SyntaxKind.CallExpression)) return
    if (init.getExpression().getText() !== "require") return

    const moduleName = getStringArg(init, 0)
    if (!moduleName) return
    const kind = HTTP_MODULES.get(moduleName)
    if (!kind) return
    clients.set(nameNode.getText(), kind)
  })

  return clients
}

/**
 * Walk the file once to find every variable/class-field that is assigned from
 * an HTTP client factory call (axios.create, got.extend, ky.create, etc.).
 * Method calls on these identifiers are treated the same as direct client
 * calls (axios.METHOD, got.METHOD, ...) for the timeout check.
 *
 * Patterns recognized:
 *   const api = axios.create({...})
 *   let api; api = got.extend({...})
 *   class X { api = axios.create({...}) }
 *   class X { constructor() { this.api = ky.create({...}) } }
 */
function collectHttpClientInstances(
  file: SourceFile,
  clients: Map<string, HttpClientKind>,
): Map<string, HttpClientKind> {
  const names = new Map<string, HttpClientKind>()

  file.forEachDescendant((node) => {
    if (!node.isKind(SyntaxKind.CallExpression)) return
    const instanceKind = identifyInstanceFactory(node.getExpression(), clients)
    if (!instanceKind) return

    const parent = node.getParent()
    if (!parent) return

    if (parent.isKind(SyntaxKind.VariableDeclaration)) {
      const nameNode = parent.getNameNode()
      if (nameNode.isKind(SyntaxKind.Identifier)) {
        names.set(nameNode.getText(), instanceKind)
      }
      return
    }

    if (parent.isKind(SyntaxKind.BinaryExpression)) {
      const op = parent.getOperatorToken().getText()
      if (op !== "=") return
      const left = parent.getLeft()
      if (left.isKind(SyntaxKind.Identifier)) {
        names.set(left.getText(), instanceKind)
      } else if (left.isKind(SyntaxKind.PropertyAccessExpression)) {
        const receiver = left.getExpression().getText()
        if (receiver === "this") {
          names.set(left.getName(), instanceKind)
        }
      }
      return
    }

    if (parent.isKind(SyntaxKind.PropertyDeclaration)) {
      const nameNode = parent.getNameNode()
      if (nameNode.isKind(SyntaxKind.Identifier)) {
        names.set(nameNode.getText(), instanceKind)
      }
    }
  })

  return names
}

function identifyHttpCall(
  callee: Node,
  clients: Map<string, HttpClientKind>,
  instances: Map<string, HttpClientKind>,
): MethodCallInfo | null {
  if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return null

  const method = callee.getName()
  const receiver = unwrapReceiver(callee.getExpression())

  // `<client>.METHOD` or `instanceVar.METHOD`
  if (receiver.isKind(SyntaxKind.Identifier)) {
    const name = receiver.getText()

    const clientKind = clients.get(name)
    const clientMethods = clientKind
      ? HTTP_CLIENT_METHODS.get(clientKind)
      : undefined
    if (clientMethods && clientMethods.has(method)) {
      return { receiverText: name, method, clientKind: clientKind! }
    }

    // Instance variable from a known factory (axios.create, got.extend, …)
    const instanceKind = instances.get(name)
    const instanceMethods = instanceKind
      ? HTTP_CLIENT_METHODS.get(instanceKind)
      : undefined
    if (instanceMethods?.has(method)) {
      return { receiverText: name, method, clientKind: instanceKind! }
    }

    return null
  }

  // `this.instance.METHOD`
  if (receiver.isKind(SyntaxKind.PropertyAccessExpression)) {
    const innerReceiver = unwrapReceiver(receiver.getExpression())
    const innerName = receiver.getName()
    const instanceKind = instances.get(innerName)
    if (
      innerReceiver.getKind() === SyntaxKind.ThisKeyword &&
      instanceKind &&
      HTTP_CLIENT_METHODS.get(instanceKind)?.has(method)
    ) {
      return { receiverText: `this.${innerName}`, method, clientKind: instanceKind }
    }
  }

  return null
}

function identifyInstanceFactory(
  callee: Node,
  clients: Map<string, HttpClientKind>,
): HttpClientKind | null {
  if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return null

  const receiver = unwrapReceiver(callee.getExpression())
  if (!receiver.isKind(SyntaxKind.Identifier)) return null

  const clientKind = clients.get(receiver.getText())
  const method = callee.getName()
  if (clientKind === "axios" && method === "create") return "axios"
  if (clientKind === "got" && method === "extend") return "got"
  if (clientKind === "ky" && (method === "create" || method === "extend")) {
    return "ky"
  }
  return null
}

// Peel away type-level syntactic wrappers that have no runtime effect.
function unwrapReceiver(node: Node): Node {
  let current = node
  while (true) {
    if (
      current.isKind(SyntaxKind.NonNullExpression) ||
      current.isKind(SyntaxKind.ParenthesizedExpression) ||
      current.isKind(SyntaxKind.AsExpression) ||
      current.isKind(SyntaxKind.TypeAssertionExpression)
    ) {
      current = current.getExpression()
      continue
    }
    break
  }
  return current
}

function hasTimeoutForHttpCall(call: Node, info: MethodCallInfo): boolean {
  if (!call.isKind(SyntaxKind.CallExpression)) return false
  const args = call.getArguments()
  return getTimeoutConfigArgIndexes(info).some((index) =>
    isObjectLiteralWithTimeout(args[index]),
  )
}

function getTimeoutConfigArgIndexes(info: MethodCallInfo): number[] {
  if (info.clientKind === "axios") {
    if (info.method === "post" || info.method === "put" || info.method === "patch") {
      return [2]
    }
    return [1]
  }

  if (info.clientKind === "got" || info.clientKind === "ky") {
    return [1]
  }

  return [0, 1]
}

function isObjectLiteralWithTimeout(arg: Node | undefined): boolean {
  if (!arg) return false
  if (!arg.isKind(SyntaxKind.ObjectLiteralExpression)) return false
  return arg
    .getProperties()
    .some(
      (p) =>
        p.isKind(SyntaxKind.PropertyAssignment) && p.getName() === "timeout",
    )
}

function getStringArg(call: Node, index: number): string | null {
  if (!call.isKind(SyntaxKind.CallExpression)) return null
  const arg = call.getArguments()[index]
  if (!arg) return null
  if (
    arg.isKind(SyntaxKind.StringLiteral) ||
    arg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
  ) {
    return arg.getLiteralValue()
  }
  return null
}

function isAlreadyWrapped(call: Node): boolean {
  let parent = call.getParent()
  while (parent) {
    if (parent.isKind(SyntaxKind.CallExpression)) {
      const expr = parent.getExpression().getText()
      if (/^(resilient|retry|circuitBreaker|withTimeout)\b/.test(expr)) {
        return true
      }
    }
    parent = parent.getParent()
  }
  return false
}
