import { SyntaxKind, type Node, type SourceFile } from "ts-morph"
import type { Fix, Match, Rule } from "@hardened/core"

// Detect query calls on receivers proven to come from `pg` or `mysql2` client
// factories. The old name-based heuristic (`pool|client|connection|db`) was
// too broad and flagged arbitrary `.query()` methods unrelated to databases.

const TX_CONTROL_KEYWORDS = new Set([
  "BEGIN",
  "START TRANSACTION",
  "COMMIT",
  "END",
  "ROLLBACK",
  "ROLLBACK TO SAVEPOINT",
])
const TIMEOUT_PROPS = new Set(["timeout", "statement_timeout", "queryTimeout"])
const PG_MODULES = new Set(["pg"])
const MYSQL_MODULES = new Set(["mysql2", "mysql2/promise"])
const PG_CLIENT_CONSTRUCTORS = new Set(["Pool", "Client"])
const PG_CLIENT_TYPES = new Set(["Pool", "Client", "PoolClient"])
const MYSQL_FACTORY_FUNCTIONS = new Set(["createConnection", "createPool"])

interface DbImports {
  pgConstructors: Set<string>
  pgTypes: Set<string>
  pgModules: Set<string>
  mysqlModules: Set<string>
  mysqlFactories: Set<string>
}

export const dbNoQueryTimeout: Rule = {
  id: "risk/db-no-query-timeout",
  category: "risk",
  severity: "error",
  description:
    "Database queries without a timeout can hang indefinitely, pinning connections and exhausting pools.",

  match({ file }) {
    const matches: Match[] = []
    const dbReceivers = collectDbQueryReceivers(file)

    file.forEachDescendant((node) => {
      if (!node.isKind(SyntaxKind.CallExpression)) return

      const callee = node.getExpression()
      if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return
      if (callee.getName() !== "query") return

      const receiverName = getReceiverName(callee.getExpression())
      if (!receiverName || !dbReceivers.has(receiverName)) return

      if (isTransactionControlQuery(node)) return
      if (isInsideTransactionalFunction(node)) return
      if (isAlreadyWrapped(node)) return
      if (queryHasTimeoutOption(node)) return

      const pos = file.getLineAndColumnAtPos(node.getStart())
      matches.push({
        ruleId: "risk/db-no-query-timeout",
        file: file.getFilePath(),
        line: pos.line,
        column: pos.column,
        severity: "error",
        message: `${callee.getExpression().getText()}.query() has no timeout — can pin a connection indefinitely`,
        node,
      })
    })

    return matches
  },

  fix(match, { config }): Fix | null {
    const call = match.node
    const { timeout, retries } = config.runtime.defaults
    // Reads are often idempotent and safe to retry; writes aren't. Without
    // parsing the SQL, we can't tell. Default: timeout only, no retries.
    // Users can swap the policy via custom rules later.
    const policy = `{ timeout: ${timeout} }`
    void retries

    return {
      edits: [
        {
          file: call.getSourceFile().getFilePath(),
          range: [call.getStart(), call.getEnd()],
          replacement: `resilient(() => ${call.getText()}, ${policy})`,
        },
      ],
      addImports: [{ from: "hardened-runtime", names: ["resilient"] }],
      addDependencies: [{ name: "hardened-runtime", version: "^0.1.0" }],
    }
  },
}

function collectDbQueryReceivers(file: SourceFile): Set<string> {
  const imports = collectDbImports(file)
  const receivers = new Set<string>()

  file.forEachDescendant((node) => {
    if (node.isKind(SyntaxKind.Parameter)) {
      const nameNode = node.getNameNode()
      if (!nameNode.isKind(SyntaxKind.Identifier)) return
      if (isPgTypeReference(node.getTypeNode(), imports)) {
        receivers.add(nameNode.getText())
      }
      return
    }

    if (node.isKind(SyntaxKind.VariableDeclaration)) {
      const nameNode = node.getNameNode()
      if (!nameNode.isKind(SyntaxKind.Identifier)) return

      if (isPgTypeReference(node.getTypeNode(), imports)) {
        receivers.add(nameNode.getText())
      }

      const init = unwrapExpression(node.getInitializer())
      if (init && isDbClientFactory(init, imports, receivers)) {
        receivers.add(nameNode.getText())
      }
      return
    }

    if (node.isKind(SyntaxKind.BinaryExpression)) {
      if (node.getOperatorToken().getText() !== "=") return
      const left = node.getLeft()
      const init = unwrapExpression(node.getRight())
      if (!init || !isDbClientFactory(init, imports, receivers)) return

      if (left.isKind(SyntaxKind.Identifier)) {
        receivers.add(left.getText())
        return
      }

      if (
        left.isKind(SyntaxKind.PropertyAccessExpression) &&
        left.getExpression().getKind() === SyntaxKind.ThisKeyword
      ) {
        receivers.add(left.getName())
      }
      return
    }

    if (node.isKind(SyntaxKind.PropertyDeclaration)) {
      const nameNode = node.getNameNode()
      const init = unwrapExpression(node.getInitializer())
      if (
        nameNode.isKind(SyntaxKind.Identifier) &&
        init &&
        isDbClientFactory(init, imports, receivers)
      ) {
        receivers.add(nameNode.getText())
      }
    }
  })

  return receivers
}

function collectDbImports(file: SourceFile): DbImports {
  const imports: DbImports = {
    pgConstructors: new Set(),
    pgTypes: new Set(),
    pgModules: new Set(),
    mysqlModules: new Set(),
    mysqlFactories: new Set(),
  }

  for (const decl of file.getImportDeclarations()) {
    const moduleName = decl.getModuleSpecifierValue()
    const isPg = PG_MODULES.has(moduleName)
    const isMysql = MYSQL_MODULES.has(moduleName)
    if (!isPg && !isMysql) continue

    const defaultImport = decl.getDefaultImport()
    const namespaceImport = decl.getNamespaceImport()

    if (isPg) {
      if (defaultImport) imports.pgModules.add(defaultImport.getText())
      if (namespaceImport) imports.pgModules.add(namespaceImport.getText())
      for (const named of decl.getNamedImports()) {
        const imported = named.getName()
        const local = named.getAliasNode()?.getText() ?? imported
        if (PG_CLIENT_CONSTRUCTORS.has(imported)) {
          imports.pgConstructors.add(local)
        }
        if (PG_CLIENT_TYPES.has(imported)) {
          imports.pgTypes.add(local)
        }
      }
      continue
    }

    if (defaultImport) imports.mysqlModules.add(defaultImport.getText())
    if (namespaceImport) imports.mysqlModules.add(namespaceImport.getText())
    for (const named of decl.getNamedImports()) {
      const imported = named.getName()
      const local = named.getAliasNode()?.getText() ?? imported
      if (MYSQL_FACTORY_FUNCTIONS.has(imported)) {
        imports.mysqlFactories.add(local)
      }
    }
  }

  file.forEachDescendant((node) => {
    if (!node.isKind(SyntaxKind.VariableDeclaration)) return
    const init = node.getInitializer()
    if (!init?.isKind(SyntaxKind.CallExpression)) return
    if (init.getExpression().getText() !== "require") return

    const moduleName = getStringArg(init, 0)
    if (!moduleName) return
    const nameNode = node.getNameNode()

    if (PG_MODULES.has(moduleName)) {
      if (nameNode.isKind(SyntaxKind.Identifier)) {
        imports.pgModules.add(nameNode.getText())
        return
      }
      if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
        for (const element of nameNode.getElements()) {
          const propertyName = element.getPropertyNameNode()?.getText()
          const localName = element.getNameNode().getText()
          const imported = propertyName ?? localName
          if (PG_CLIENT_CONSTRUCTORS.has(imported)) {
            imports.pgConstructors.add(localName)
          }
          if (PG_CLIENT_TYPES.has(imported)) {
            imports.pgTypes.add(localName)
          }
        }
      }
      return
    }

    if (MYSQL_MODULES.has(moduleName)) {
      if (nameNode.isKind(SyntaxKind.Identifier)) {
        imports.mysqlModules.add(nameNode.getText())
        return
      }
      if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
        for (const element of nameNode.getElements()) {
          const propertyName = element.getPropertyNameNode()?.getText()
          const localName = element.getNameNode().getText()
          const imported = propertyName ?? localName
          if (MYSQL_FACTORY_FUNCTIONS.has(imported)) {
            imports.mysqlFactories.add(localName)
          }
        }
      }
    }
  })

  return imports
}

function isDbClientFactory(
  node: Node,
  imports: DbImports,
  receivers: Set<string>,
): boolean {
  if (node.isKind(SyntaxKind.NewExpression)) {
    const expr = node.getExpression()
    if (
      expr.isKind(SyntaxKind.Identifier) &&
      imports.pgConstructors.has(expr.getText())
    ) {
      return true
    }
    if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
      const receiver = unwrapExpression(expr.getExpression())
      return (
        receiver?.isKind(SyntaxKind.Identifier) === true &&
        imports.pgModules.has(receiver.getText()) &&
        PG_CLIENT_CONSTRUCTORS.has(expr.getName())
      )
    }
    return false
  }

  if (!node.isKind(SyntaxKind.CallExpression)) return false

  const callee = node.getExpression()
  if (callee.isKind(SyntaxKind.Identifier)) {
    return imports.mysqlFactories.has(callee.getText())
  }

  if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return false

  const receiver = unwrapExpression(callee.getExpression())
  if (!receiver?.isKind(SyntaxKind.Identifier)) return false

  const receiverName = receiver.getText()
  const method = callee.getName()

  if (
    imports.mysqlModules.has(receiverName) &&
    MYSQL_FACTORY_FUNCTIONS.has(method)
  ) {
    return true
  }

  return receivers.has(receiverName) && method === "connect"
}

function isPgTypeReference(typeNode: Node | undefined, imports: DbImports): boolean {
  if (!typeNode) return false
  if (typeNode.isKind(SyntaxKind.TypeReference)) {
    const typeName = typeNode.getTypeName()
    if (typeName.isKind(SyntaxKind.Identifier)) {
      return imports.pgTypes.has(typeName.getText())
    }
    if (typeName.isKind(SyntaxKind.QualifiedName)) {
      const left = typeName.getLeft().getText()
      const right = typeName.getRight().getText()
      return imports.pgModules.has(left) && PG_CLIENT_TYPES.has(right)
    }
  }
  return false
}

function getReceiverName(receiver: Node): string | null {
  const unwrapped = unwrapExpression(receiver)
  if (!unwrapped) return null
  if (unwrapped.isKind(SyntaxKind.Identifier)) return unwrapped.getText()
  if (
    unwrapped.isKind(SyntaxKind.PropertyAccessExpression) &&
    unwrapped.getExpression().getKind() === SyntaxKind.ThisKeyword
  ) {
    return unwrapped.getName()
  }
  return null
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

// Recognize `.query("BEGIN")`, `.query("COMMIT")`, etc. These are transaction
// control statements — no timeout applies, no flag.
function isTransactionControlQuery(call: Node): boolean {
  if (!call.isKind(SyntaxKind.CallExpression)) return false
  const firstArg = call.getArguments()[0]
  if (!firstArg) return false
  if (
    firstArg.isKind(SyntaxKind.StringLiteral) ||
    firstArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
  ) {
    const raw = firstArg.getLiteralValue().trim().toUpperCase()
    return TX_CONTROL_KEYWORDS.has(raw)
  }
  return false
}

// If the enclosing function contains a BEGIN/START TRANSACTION .query() call,
// treat every .query() in that function as protected by the transaction's
// own timeout. Coarse but matches the common pg pattern.
function isInsideTransactionalFunction(call: Node): boolean {
  const fn = getEnclosingFunction(call)
  if (!fn) return false

  let found = false
  fn.forEachDescendant((descendant, traversal) => {
    if (found) {
      traversal.stop()
      return
    }
    if (!descendant.isKind(SyntaxKind.CallExpression)) return
    if (descendant === call) return

    const callee = descendant.getExpression()
    if (!callee.isKind(SyntaxKind.PropertyAccessExpression)) return
    if (callee.getName() !== "query") return

    const firstArg = descendant.getArguments()[0]
    if (!firstArg) return
    if (
      !firstArg.isKind(SyntaxKind.StringLiteral) &&
      !firstArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
    )
      return

    const raw = firstArg.getLiteralValue().trim().toUpperCase()
    if (raw === "BEGIN" || raw === "START TRANSACTION") {
      found = true
      traversal.stop()
    }
  })
  return found
}

function getEnclosingFunction(node: Node): Node | undefined {
  return node.getFirstAncestor(
    (a) =>
      a.isKind(SyntaxKind.FunctionDeclaration) ||
      a.isKind(SyntaxKind.FunctionExpression) ||
      a.isKind(SyntaxKind.ArrowFunction) ||
      a.isKind(SyntaxKind.MethodDeclaration),
  )
}

function queryHasTimeoutOption(call: Node): boolean {
  if (!call.isKind(SyntaxKind.CallExpression)) return false
  return call.getArguments().some((arg) => {
    if (!arg.isKind(SyntaxKind.ObjectLiteralExpression)) return false
    return arg.getProperties().some((p) => {
      if (!p.isKind(SyntaxKind.PropertyAssignment)) return false
      return TIMEOUT_PROPS.has(p.getName())
    })
  })
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
