import { SyntaxKind, type Node, type SourceFile } from "ts-morph"
import type { Fix, Match, Rule } from "@hardened/core"

// Detect Prisma model operations that don't carry a configured timeout.
// Prisma queries block on pool-level timeouts by default; a hung query can
// hold a connection for Prisma's pool limit. Wrap in resilient() to cap
// per-call duration.
//
// Raw template-tagged calls such as prisma.$queryRaw`SELECT ...` are
// TaggedTemplateExpression nodes, not CallExpression nodes. They are an
// explicit v0.1 scope gap and are documented in README + per-rule docs.

const PRISMA_OPERATIONS = new Set([
  "findMany",
  "findUnique",
  "findFirst",
  "findUniqueOrThrow",
  "findFirstOrThrow",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "aggregate",
  "groupBy",
  "count",
])

const PRISMA_MODULE = "@prisma/client"

export const prismaNoTimeout: Rule = {
  id: "risk/prisma-no-timeout",
  category: "risk",
  severity: "error",
  description:
    "Prisma operations without a timeout can block a connection indefinitely.",

  match({ file }) {
    const matches: Match[] = []
    const clients = collectPrismaClients(file)

    file.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) return

      const transactionInfo = identifyPrismaTransactionCall(node, clients)
      if (transactionInfo) {
        if (prismaTransactionHasTimeout(node)) return

        const pos = file.getLineAndColumnAtPos(node.getStart())
        matches.push({
          ruleId: "risk/prisma-no-timeout",
          file: file.getFilePath(),
          line: pos.line,
          column: pos.column,
          severity: "error",
          message: `${transactionInfo.receiverText}.$transaction() has no explicit timeout option`,
          node,
        })
        return
      }

      const callee = node.getExpression()
      if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return
      const operation = callee.getName()
      if (!PRISMA_OPERATIONS.has(operation)) return

      // Callee receiver should be `prisma.<model>` (two-level PropertyAccess).
      const modelAccess = callee.getExpression()
      if (!modelAccess.isKind(SyntaxKind.PropertyAccessExpression)) return
      const rootIdent = modelAccess.getExpression()
      if (!rootIdent.isKind(SyntaxKind.Identifier)) return
      if (!clients.has(rootIdent.getText())) return

      if (getEnclosingPrismaTransaction(node, clients)) return
      if (isAlreadyWrapped(node)) return

      const pos = file.getLineAndColumnAtPos(node.getStart())
      const modelName = modelAccess.getName()
      matches.push({
        ruleId: "risk/prisma-no-timeout",
        file: file.getFilePath(),
        line: pos.line,
        column: pos.column,
        severity: "error",
        message: `${rootIdent.getText()}.${modelName}.${operation}() has no timeout — can block a connection indefinitely`,
        node,
      })
    })

    return matches
  },

  fix(match, { config }): Fix | null {
    const call = match.node
    const { timeout } = config.runtime.defaults
    const policy = `{ timeout: ${timeout} }`

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

function collectPrismaClients(file: SourceFile): Set<string> {
  const constructors = collectPrismaClientConstructors(file)
  const clients = new Set<string>()

  file.forEachDescendant((node) => {
    if (node.isKind(SyntaxKind.VariableDeclaration)) {
      const nameNode = node.getNameNode()
      const init = unwrapExpression(node.getInitializer())
      if (
        nameNode.isKind(SyntaxKind.Identifier) &&
        init &&
        isPrismaClientConstructor(init, constructors)
      ) {
        clients.add(nameNode.getText())
      }
      return
    }

    if (node.isKind(SyntaxKind.BinaryExpression)) {
      if (node.getOperatorToken().getText() !== "=") return
      const left = node.getLeft()
      const init = unwrapExpression(node.getRight())
      if (!init || !isPrismaClientConstructor(init, constructors)) return

      if (left.isKind(SyntaxKind.Identifier)) {
        clients.add(left.getText())
      }
      return
    }
  })

  return clients
}

function collectPrismaClientConstructors(file: SourceFile): Set<string> {
  const constructors = new Set<string>()
  const namespaces = new Set<string>()

  for (const decl of file.getImportDeclarations()) {
    if (decl.getModuleSpecifierValue() !== PRISMA_MODULE) continue

    const namespaceImport = decl.getNamespaceImport()
    if (namespaceImport) {
      namespaces.add(namespaceImport.getText())
    }

    for (const named of decl.getNamedImports()) {
      if (named.getName() === "PrismaClient") {
        constructors.add(named.getAliasNode()?.getText() ?? named.getName())
      }
    }
  }

  file.forEachDescendant((node) => {
    if (!node.isKind(SyntaxKind.VariableDeclaration)) return
    const init = node.getInitializer()
    if (!init?.isKind(SyntaxKind.CallExpression)) return
    if (init.getExpression().getText() !== "require") return
    if (getStringArg(init, 0) !== PRISMA_MODULE) return

    const nameNode = node.getNameNode()
    if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
      for (const element of nameNode.getElements()) {
        const propertyName = element.getPropertyNameNode()?.getText()
        const localName = element.getNameNode().getText()
        if ((propertyName ?? localName) === "PrismaClient") {
          constructors.add(localName)
        }
      }
      return
    }

    if (nameNode.isKind(SyntaxKind.Identifier)) {
      namespaces.add(nameNode.getText())
    }
  })

  for (const namespace of namespaces) {
    constructors.add(`${namespace}.PrismaClient`)
  }

  return constructors
}

function isPrismaClientConstructor(
  node: Node,
  constructors: Set<string>,
): boolean {
  if (!node.isKind(SyntaxKind.NewExpression)) return false
  return constructors.has(node.getExpression().getText())
}

function identifyPrismaTransactionCall(
  call: Node,
  clients: Set<string>,
): { receiverText: string } | null {
  if (!call.isKind(SyntaxKind.CallExpression)) return null
  const callee = call.getExpression()
  if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return null
  if (callee.getName() !== "$transaction") return null
  const receiver = callee.getExpression()
  if (!receiver.isKind(SyntaxKind.Identifier)) return null
  if (!clients.has(receiver.getText())) return null
  return { receiverText: receiver.getText() }
}

function prismaTransactionHasTimeout(call: Node): boolean {
  if (!call.isKind(SyntaxKind.CallExpression)) return false
  return call.getArguments().some((arg) => {
    if (!arg.isKind(SyntaxKind.ObjectLiteralExpression)) return false
    return arg.getProperties().some((p) => {
      if (!p.isKind(SyntaxKind.PropertyAssignment)) return false
      return p.getName() === "timeout"
    })
  })
}

// Walk ancestors looking for a CallExpression whose callee is `prisma.$transaction`.
// Inner operations are reported through the surrounding $transaction call
// itself: with `{ timeout }` the transaction is safe, without it the transaction
// call receives one finding instead of every operation inside it.
function getEnclosingPrismaTransaction(
  node: Node,
  clients: Set<string>,
): Node | undefined {
  let parent = node.getParent()
  while (parent) {
    if (identifyPrismaTransactionCall(parent, clients)) {
      return parent
    }
    parent = parent.getParent()
  }
  return undefined
}

function unwrapExpression(node: Node | undefined): Node | undefined {
  let current = node
  while (current) {
    if (
      current.isKind(SyntaxKind.AwaitExpression) ||
      current.isKind(SyntaxKind.ParenthesizedExpression) ||
      current.isKind(SyntaxKind.AsExpression) ||
      current.isKind(SyntaxKind.TypeAssertionExpression) ||
      current.isKind(SyntaxKind.NonNullExpression)
    ) {
      current = current.getExpression()
      continue
    }
    break
  }
  return current
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
