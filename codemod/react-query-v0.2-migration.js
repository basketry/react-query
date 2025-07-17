/**
 * jscodeshift codemod for migrating @basketry/react-query from v0.1.x to v0.2.x
 *
 * This transform will:
 * 1. Replace deprecated hook calls with new queryOptions pattern
 * 2. Update imports to include necessary React Query hooks
 * 3. Preserve all arguments and type parameters
 * 4. Handle query, mutation, and infinite query patterns
 *
 * Usage:
 * jscodeshift -t codemod/react-query-v0.2-migration.js src/ --extensions=ts,tsx --parser=tsx
 */

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let hasModifications = false;
  const reactQueryImportsToAdd = new Set();
  const hookImportsToRemove = new Set();
  const optionsImportsToAdd = new Map(); // Map<modulePath, Set<importName>>

  // Helper to convert hook name to options name
  function getOptionsName(hookName, type) {
    // Remove 'use' prefix and convert to camelCase
    const baseName = hookName.substring(3);
    const camelCaseName = baseName.charAt(0).toLowerCase() + baseName.slice(1);

    switch (type) {
      case 'infinite':
        // useGetWidgetsInfinite -> getWidgetsInfiniteQueryOptions
        return camelCaseName.replace(/Infinite$/, '') + 'InfiniteQueryOptions';
      case 'suspenseInfinite':
        // useSuspenseGetWidgetsInfinite -> getWidgetsInfiniteQueryOptions
        return camelCaseName.replace(/Infinite$/, '') + 'InfiniteQueryOptions';
      case 'suspense':
        // useSuspenseGetWidgets -> getWidgetsQueryOptions
        return camelCaseName + 'QueryOptions';
      case 'mutation':
        // useCreateWidget -> createWidgetMutationOptions
        return camelCaseName + 'MutationOptions';
      default:
        // useGetWidgets -> getWidgetsQueryOptions
        return camelCaseName + 'QueryOptions';
    }
  }

  // Helper to determine hook type
  function getHookType(hookName) {
    if (hookName.includes('useSuspense') && hookName.endsWith('Infinite')) {
      return 'suspenseInfinite';
    }
    if (hookName.endsWith('Infinite')) {
      return 'infinite';
    }
    if (hookName.startsWith('useSuspense')) {
      return 'suspense';
    }
    // Check if it's likely a mutation (contains Create, Update, Delete, etc.)
    if (
      hookName.match(
        /use(Create|Update|Delete|Add|Remove|Set|Save|Post|Put|Patch)/,
      )
    ) {
      return 'mutation';
    }
    return 'query';
  }

  // Helper to get the React Query hook name for a given type
  function getReactQueryHook(type) {
    switch (type) {
      case 'infinite':
        return 'useInfiniteQuery';
      case 'suspenseInfinite':
        return 'useSuspenseInfiniteQuery';
      case 'suspense':
        return 'useSuspenseQuery';
      case 'mutation':
        return 'useMutation';
      default:
        return 'useQuery';
    }
  }

  // Find all imports from hooks modules
  const hookImports = new Map(); // Map<hookName, modulePath>

  root
    .find(j.ImportDeclaration)
    .filter((path) => {
      const source = path.node.source.value;
      return source.includes('/hooks/') && !source.includes('/hooks/runtime');
    })
    .forEach((path) => {
      const modulePath = path.node.source.value;
      path.node.specifiers.forEach((spec) => {
        if (
          j.ImportSpecifier.check(spec) &&
          spec.imported.name.startsWith('use')
        ) {
          hookImports.set(spec.imported.name, modulePath);
        }
      });
    });

  // Transform hook calls
  root
    .find(j.CallExpression)
    .filter((path) => {
      const callee = path.node.callee;
      if (j.Identifier.check(callee)) {
        return hookImports.has(callee.name);
      }
      return false;
    })
    .forEach((path) => {
      const hookName = path.node.callee.name;
      const modulePath = hookImports.get(hookName);
      const hookType = getHookType(hookName);
      const optionsName = getOptionsName(hookName, hookType);
      const reactQueryHook = getReactQueryHook(hookType);

      hasModifications = true;
      hookImportsToRemove.add(hookName);
      reactQueryImportsToAdd.add(reactQueryHook);

      // Track options import to add
      if (!optionsImportsToAdd.has(modulePath)) {
        optionsImportsToAdd.set(modulePath, new Set());
      }
      optionsImportsToAdd.get(modulePath).add(optionsName);

      // Get the type parameters if any
      const typeParams = path.node.typeParameters;

      // Create the options call
      const optionsCall = j.callExpression(
        j.identifier(optionsName),
        path.node.arguments,
      );

      // Preserve type parameters on the options call
      if (typeParams) {
        optionsCall.typeParameters = typeParams;
      }

      // Replace the hook call
      j(path).replaceWith(
        j.callExpression(j.identifier(reactQueryHook), [optionsCall]),
      );
    });

  // Update imports if we made modifications
  if (hasModifications) {
    // Remove old hook imports and add new options imports
    root
      .find(j.ImportDeclaration)
      .filter((path) => {
        const source = path.node.source.value;
        return source.includes('/hooks/') && !source.includes('/hooks/runtime');
      })
      .forEach((path) => {
        const modulePath = path.node.source.value;
        const optionsToAdd = optionsImportsToAdd.get(modulePath);

        if (optionsToAdd) {
          // Filter out removed hooks and add new options
          const newSpecifiers = path.node.specifiers.filter((spec) => {
            if (j.ImportSpecifier.check(spec)) {
              return !hookImportsToRemove.has(spec.imported.name);
            }
            return true;
          });

          // Add new options imports
          optionsToAdd.forEach((optionName) => {
            newSpecifiers.push(j.importSpecifier(j.identifier(optionName)));
          });

          path.node.specifiers = newSpecifiers;
        }
      });

    // Add or update React Query imports
    const existingReactQueryImport = root.find(j.ImportDeclaration, {
      source: { value: '@tanstack/react-query' },
    });

    if (existingReactQueryImport.length > 0) {
      const importDecl = existingReactQueryImport.at(0).get();
      const existingImports = new Set(
        importDecl.node.specifiers
          .filter((spec) => j.ImportSpecifier.check(spec))
          .map((spec) => spec.imported.name),
      );

      // Add missing imports
      reactQueryImportsToAdd.forEach((hookName) => {
        if (!existingImports.has(hookName)) {
          importDecl.node.specifiers.push(
            j.importSpecifier(j.identifier(hookName)),
          );
        }
      });
    } else {
      // Create new React Query import
      const imports = Array.from(reactQueryImportsToAdd).map((name) =>
        j.importSpecifier(j.identifier(name)),
      );

      const newImport = j.importDeclaration(
        imports,
        j.literal('@tanstack/react-query'),
      );

      // Add after the last import
      const lastImport = root.find(j.ImportDeclaration).at(-1);
      if (lastImport.length > 0) {
        lastImport.insertAfter(newImport);
      } else {
        // If no imports, add at the beginning
        root.get().node.program.body.unshift(newImport);
      }
    }
  }

  return hasModifications
    ? root.toSource({
        quote: 'single',
        trailingComma: true,
      })
    : fileInfo.source;
};

// Export helper for testing
module.exports.parser = 'tsx';
