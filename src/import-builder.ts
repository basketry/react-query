export class ImportBuilder {
  constructor(
    private readonly module: string,
    private defaultImport?: string,
  ) {}

  private readonly imports = new Set<string>();
  private readonly types = new Set<string>();

  static combine(builders: ImportBuilder[]): ImportBuilder[] {
    const buildersByModule = new Map<string, ImportBuilder[]>();

    for (const builder of builders) {
      const buildersForModule = buildersByModule.get(builder.module) ?? [];
      buildersForModule.push(builder);
      buildersByModule.set(builder.module, buildersForModule);
    }

    const result: ImportBuilder[] = [];
    for (const [module, buildersForModule] of Array.from(buildersByModule)) {
      const combined = new ImportBuilder(module);
      for (const { imports, types, defaultImport } of buildersForModule) {
        if (defaultImport) combined.defaultImport = defaultImport;
        for (const item of Array.from(imports)) combined.imports.add(item);
        for (const type of Array.from(types)) combined.types.add(type);
      }
      result.push(combined);
    }

    return result;
  }

  static sort(builders: ImportBuilder[]): ImportBuilder[] {
    return builders.sort((a, b) => compareModules(a.module, b.module));
  }

  fn(item: string): string {
    this.imports.add(item);
    return item;
  }

  type(item: string): string {
    if (item !== 'void') {
      this.imports.add(item);
      this.types.add(item);
    }
    return item;
  }

  build(): string | undefined {
    const clauses: string[] = [];

    if (this.defaultImport) {
      clauses.push(this.defaultImport);
    }

    if (this.imports.size) {
      const imports = Array.from(this.imports).sort((a, b) =>
        a.localeCompare(b),
      );

      if (this.imports.size === this.types.size) {
        clauses.push(`type { ${imports.join(', ')} }`);
      } else {
        clauses.push(
          `{ ${imports
            .map((item) => (this.types.has(item) ? `type ${item}` : item))
            .join(', ')} }`,
        );
      }
    }

    if (clauses.length) {
      return `import ${clauses.join(', ')} from '${this.module}'`;
    }

    return undefined;
  }
}

function compareModules(a: string, b: string): number {
  // Helper to determine if an import is a local import
  const isLocalImport = (importPath: string) => importPath.startsWith('.');

  // Helper to normalize a module name for comparison
  const normalizeForComparison = (importPath: string) =>
    importPath.startsWith('@') ? importPath.slice(1) : importPath;

  // Check if either is a package import
  const aIsLocal = isLocalImport(a);
  const bIsLocal = isLocalImport(b);

  // Rule 1: Package imports come before local imports
  if (!aIsLocal && bIsLocal) return -1;
  if (aIsLocal && !bIsLocal) return 1;

  // Rule 2 & 3: If both are local imports, more general (deeper) modules come first
  if (aIsLocal && bIsLocal) {
    const depthA = (a.match(/\.\.\//g) || []).length;
    const depthB = (b.match(/\.\.\//g) || []).length;

    if (depthA !== depthB) return depthB - depthA;
  }

  // Rule 4: Sort alphabetically, ignoring `@` prefix
  const normalizedA = normalizeForComparison(a);
  const normalizedB = normalizeForComparison(b);

  return normalizedA.localeCompare(normalizedB);
}
