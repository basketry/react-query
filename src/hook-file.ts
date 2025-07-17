import {
  getHttpMethodByName,
  getTypeByName,
  HttpMethod,
  HttpPath,
  Interface,
  isRequired,
  Method,
  Service,
} from 'basketry';

import {
  buildDescription,
  buildParamsType,
  buildTypeName,
} from '@basketry/typescript';
import { from } from '@basketry/typescript/lib/utils';

import { camel } from 'case';
import { NamespacedReactQueryOptions } from './types';
import { ModuleBuilder } from './module-builder';
import { ImportBuilder } from './import-builder';
import { NameFactory } from './name-factory';

export class HookFile extends ModuleBuilder {
  constructor(
    service: Service,
    options: NamespacedReactQueryOptions | undefined,
    private readonly int: Interface,
  ) {
    super(service, options);
  }
  private readonly nameFactory = new NameFactory(this.service, this.options);
  private readonly tanstack = new ImportBuilder('@tanstack/react-query');
  private readonly runtime = new ImportBuilder('./runtime');
  private readonly context = new ImportBuilder('./context');

  private readonly types = new ImportBuilder(
    this.options?.reactQuery?.typesModule ?? '../types',
  );
  protected readonly importBuilders = [
    this.tanstack,
    this.types,
    this.context,
    this.runtime,
  ];

  *body(): Iterable<string> {
    const applyPageParam = () => this.runtime.fn('applyPageParam');
    const CompositeError = () => this.runtime.fn('CompositeError');
    const getInitialPageParam = () => this.runtime.fn('getInitialPageParam');
    const getNextPageParam = () => this.runtime.fn('getNextPageParam');
    const getPreviousPageParam = () => this.runtime.fn('getPreviousPageParam');
    const PageParam = () => this.runtime.type('PageParam');

    const type = (t: string) => this.types.type(t);

    const serviceName = this.nameFactory.buildServiceName(this.int);

    for (const method of [...this.int.methods].sort((a, b) =>
      a.name.value.localeCompare(b.name.value),
    )) {
      const paramsType = from(buildParamsType(method));
      const httpMethod = getHttpMethodByName(this.service, method.name.value);
      const httpPath = this.getHttpPath(httpMethod);
      const q = method.parameters.every((param) => !isRequired(param))
        ? '?'
        : '';

      const paramsExpression = method.parameters.length
        ? `params${q}: ${type(paramsType)}`
        : '';

      const isGet = httpMethod?.verb.value === 'get' && !!httpPath;

      if (isGet) {
        yield* this.generateQueryOptions(method);
      } else if (httpPath) {
        const mutationOptions = () => this.tanstack.fn('mutationOptions');
        const paramsCallsite = method.parameters.length ? 'params' : '';
        const serviceGetterName = camel(`get_${this.int.name.value}_service`);
        const mutationOptionsName = camel(
          `${method.name.value}_mutation_options`,
        );

        yield* buildDescription(
          method.description,
          undefined,
          method.deprecated?.value,
        );
        yield `export const ${mutationOptionsName} = () => {`;
        yield `  const ${serviceName} = ${this.context.fn(
          serviceGetterName,
        )}()`;
        yield `  return ${mutationOptions()}({`;
        yield `    mutationFn: async (${paramsExpression}) => {`;
        yield `      const res = await ${serviceName}.${camel(
          method.name.value,
        )}(${paramsCallsite});`;
        yield `      if (res.errors.length) { throw new ${CompositeError()}(res.errors); }`;
        yield `      else if (!res.data) { throw new Error('Unexpected data error: Failed to get example'); }`;
        yield `      return res.data;`;
        yield `    },`;
        yield `  });`;
        yield `}`;

        // Generate deprecated mutation hook wrapper
        const useMutation = () => this.tanstack.fn('useMutation');
        const useQueryClient = () => this.tanstack.fn('useQueryClient');
        const hookName = this.nameFactory.getHookName(method);
        const fileName = camel(this.int.name.value);

        yield '';
        yield* this.buildDeprecationMessage(
          'mutation',
          method.name.value,
          hookName,
          fileName,
        );
        yield `export const ${hookName} = () => {`;
        yield `  const queryClient = ${useQueryClient()}();`;
        yield `  const mutationOptions = ${mutationOptionsName}();`;
        yield `  return ${useMutation()}({`;
        yield `    ...mutationOptions,`;
        yield `    onSuccess: (data, variables, context) => {`;
        yield `      queryClient.invalidateQueries({ queryKey: ['${this.int.name.value}'] });`;
        yield `      mutationOptions.onSuccess?.(data, variables, context);`;
        yield `    },`;
        yield `  });`;
        yield `};`;
      }

      if (isGet && this.isRelayPaginated(method)) {
        const infiniteQueryOptions = () =>
          this.tanstack.fn('infiniteQueryOptions');
        const methodExpression = `${serviceName}.${camel(method.name.value)}`;
        const paramsCallsite = method.parameters.length
          ? `${applyPageParam()}(params${q ? '?? {}' : ''}, pageParam)`
          : '';
        const serviceGetterName = camel(`get_${this.int.name.value}_service`);

        const infiniteOptionsName = camel(
          `${method.name.value}_infinite_query_options`,
        );

        yield* buildDescription(
          method.description,
          undefined,
          method.deprecated?.value,
        );
        yield `export const ${infiniteOptionsName} = (${paramsExpression}) => {`;
        yield `  const ${serviceName} = ${this.context.fn(
          serviceGetterName,
        )}();`;
        yield `  return ${infiniteQueryOptions()}({`;
        yield `    queryKey: ${this.buildQueryKey(method, {
          includeRelayParams: false,
          infinite: true,
        })},`;
        yield `    queryFn: async ({ pageParam }: ${PageParam()}) => {`;
        yield `      const res = await ${methodExpression}(${paramsCallsite});`;
        yield `      if (res.errors.length) { throw new ${CompositeError()}(res.errors); }`;
        yield `      return res;`;
        yield `    },`;
        yield* this.buildInfiniteSelectFn(method);
        yield `    initialPageParam: ${getInitialPageParam()}(params${
          q ? '?? {}' : ''
        }),`;
        yield `    ${getNextPageParam()},`;
        yield `    ${getPreviousPageParam()},`;
        yield `  });`;
        yield `}`;

        // Generate deprecated infinite query hook wrapper
        const useInfiniteQuery = () => this.tanstack.fn('useInfiniteQuery');
        const infiniteHookName = this.nameFactory.getInfiniteHookName(method);
        const fileName = camel(this.int.name.value);

        yield '';
        yield* this.buildDeprecationMessage(
          'infinite',
          method.name.value,
          infiniteHookName,
          fileName,
        );
        yield `export const ${infiniteHookName} = (${paramsExpression}) => {`;
        yield `  return ${useInfiniteQuery()}(${infiniteOptionsName}(${paramsCallsite}));`;
        yield `};`;

        // Generate deprecated suspense infinite query hook wrapper
        const useSuspenseInfiniteQuery = () =>
          this.tanstack.fn('useSuspenseInfiniteQuery');
        const suspenseInfiniteHookName =
          this.nameFactory.getSuspenseInfiniteHookName(method);

        yield '';
        yield* this.buildDeprecationMessage(
          'suspenseInfinite',
          method.name.value,
          suspenseInfiniteHookName,
          fileName,
        );
        yield `export const ${suspenseInfiniteHookName} = (${paramsExpression}) => {`;
        yield `  return ${useSuspenseInfiniteQuery()}(${infiniteOptionsName}(${paramsCallsite}));`;
        yield `};`;
      }

      yield '';
    }
  }

  private *buildInfiniteSelectFn(method: Method): Iterable<string> {
    const InfiniteData = () => this.tanstack.type('InfiniteData');
    const type = (t: string) => this.types.type(t);

    const returnType = getTypeByName(
      this.service,
      method.returnType?.typeName.value,
    );

    const returnTypeName = returnType ? buildTypeName(returnType) : 'void';

    const optional = returnType?.properties.some(
      (prop) => prop.name.value.toLowerCase() === 'data' && !isRequired(prop),
    );

    yield `    select: (data: ${InfiniteData()}<${type(
      returnTypeName,
    )}, string | undefined>) => data.pages.flatMap((page) => page.data${
      optional ? ' ?? []' : ''
    }),`;
  }

  private *generateQueryOptions(method: Method): Iterable<string> {
    const queryOptions = () => this.tanstack.fn('queryOptions');
    const CompositeError = () => this.runtime.fn('CompositeError');
    const type = (t: string) => this.types.type(t);

    const serviceName = camel(`${this.int.name.value}_service`);
    const serviceGetterName = camel(`get_${this.int.name.value}_service`);
    const name = this.nameFactory.buildQueryOptionsName(method);
    const paramsType = from(buildParamsType(method));
    const q = method.parameters.every((param) => !isRequired(param)) ? '?' : '';
    const paramsExpression = method.parameters.length
      ? `params${q}: ${type(paramsType)}`
      : '';
    const paramsCallsite = method.parameters.length ? 'params' : '';

    const returnType = getTypeByName(
      this.service,
      method.returnType?.typeName.value,
    );

    const skipSelect =
      returnType &&
      returnType.properties.some(
        (prop) => prop.name.value !== 'data' && prop.name.value !== 'errors',
      );

    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export const ${name} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceGetterName)}()`;
    yield `  return ${queryOptions()}({`;
    yield `    queryKey: ['${this.int.name.value}', '${method.name.value}', ${
      method.parameters.length ? 'params || {}' : '{}'
    }] as const,`;
    yield `    queryFn: async () => {`;
    yield `      const res = await ${serviceName}.${camel(
      method.name.value,
    )}(${paramsCallsite});`;
    yield `      if (res.errors.length) { throw new ${CompositeError()}(res.errors); }`;
    yield `      else if (!res.data) { throw new Error('Unexpected data error: Failed to get example'); }`;
    yield `      return res;`;
    yield `    },`;
    if (!skipSelect) {
      yield `    select: (data) => data.data,`;
    }
    yield `  });`;
    yield `};`;

    // Generate deprecated hook wrapper
    const useQuery = () => this.tanstack.fn('useQuery');
    const hookName = this.nameFactory.getHookName(method);
    const fileName = camel(this.int.name.value);

    yield '';
    yield* this.buildDeprecationMessage(
      'query',
      method.name.value,
      hookName,
      fileName,
    );
    yield `export const ${hookName} = (${paramsExpression}) => {`;
    yield `  return ${useQuery()}(${name}(${paramsCallsite}));`;
    yield `};`;

    // Generate deprecated suspense hook wrapper
    const useSuspenseQuery = () => this.tanstack.fn('useSuspenseQuery');
    const suspenseHookName = this.nameFactory.getSuspenseHookName(method);

    yield '';
    yield* this.buildDeprecationMessage(
      'suspenseQuery',
      method.name.value,
      suspenseHookName,
      fileName,
    );
    yield `export const ${suspenseHookName} = (${paramsExpression}) => {`;
    yield `  return ${useSuspenseQuery()}(${name}(${paramsCallsite}));`;
    yield `};`;
  }

  private getHttpPath(
    httpMethod: HttpMethod | undefined,
  ): HttpPath | undefined {
    if (!httpMethod) return undefined;

    for (const int of this.service.interfaces) {
      for (const httpPath of int.protocols.http) {
        for (const method of httpPath.methods) {
          if (method.name.value === httpMethod.name.value) {
            return httpPath;
          }
        }
      }
    }

    return undefined;
  }

  private buildQueryKey(
    method: Method,
    options?: { includeRelayParams?: boolean; infinite?: boolean },
  ): string {
    const q = method.parameters.every((param) => !isRequired(param)) ? '?' : '';

    const queryKey = [
      `'${this.int.name.value}'`,
      `'${method.name.value}'`,
      method.parameters.length ? `params${q} || {}` : '{}',
    ];

    if (options?.infinite) {
      queryKey.push(`{ infinite: true }`);
    }

    return `[${queryKey.join(', ')}] as const`;
  }

  private isRelayPaginated(method: Method): boolean {
    if (!method.returnType || method.returnType.isPrimitive) return false;

    const returnType = getTypeByName(
      this.service,
      method.returnType.typeName.value,
    );
    if (!returnType) return false;

    if (
      !returnType.properties.some(
        (prop) => camel(prop.name.value) === 'pageInfo',
      )
    ) {
      return false;
    }

    if (
      !method.parameters.some(
        (param) =>
          camel(param.name.value) === 'first' &&
          param.isPrimitive &&
          param.typeName.value === 'integer',
      )
    ) {
      return false;
    }

    if (
      !method.parameters.some(
        (param) =>
          camel(param.name.value) === 'after' &&
          param.isPrimitive &&
          param.typeName.value === 'string',
      )
    ) {
      return false;
    }

    if (
      !method.parameters.some(
        (param) =>
          camel(param.name.value) === 'last' &&
          param.isPrimitive &&
          param.typeName.value === 'integer',
      )
    ) {
      return false;
    }

    if (
      !method.parameters.some(
        (param) =>
          camel(param.name.value) === 'before' &&
          param.isPrimitive &&
          param.typeName.value === 'string',
      )
    ) {
      return false;
    }

    return true;
  }

  private buildDeprecationMessage(
    hookType:
      | 'query'
      | 'suspenseQuery'
      | 'mutation'
      | 'infinite'
      | 'suspenseInfinite',
    methodName: string,
    hookName: string,
    fileName: string,
  ): string[] {
    const pluralize = require('pluralize');
    const pluralFileName = pluralize(fileName);
    const lines: string[] = [];
    lines.push('/**');

    // Use appropriate deprecation message based on hook type
    if (hookType === 'mutation') {
      lines.push(
        ' * @deprecated This mutation hook is deprecated and will be removed in a future version.',
      );
    } else if (hookType === 'infinite' || hookType === 'suspenseInfinite') {
      lines.push(
        ' * @deprecated This infinite query hook is deprecated and will be removed in a future version.',
      );
    } else {
      lines.push(
        ' * @deprecated This hook is deprecated and will be removed in a future version.',
      );
    }

    lines.push(' * Please use the new query options pattern instead:');
    lines.push(' * ');
    lines.push(' * ```typescript');

    switch (hookType) {
      case 'query':
        lines.push(" * import { useQuery } from '@tanstack/react-query';");
        lines.push(
          ` * import { ${methodName}QueryOptions } from './hooks/${pluralFileName}';`,
        );
        lines.push(' * ');
        lines.push(' * // Old pattern (deprecated)');
        lines.push(` * const result = ${hookName}(params);`);
        lines.push(' * ');
        lines.push(' * // New pattern');
        lines.push(
          ` * const result = useQuery(${methodName}QueryOptions(params));`,
        );
        break;
      case 'suspenseQuery':
        lines.push(
          " * import { useSuspenseQuery } from '@tanstack/react-query';",
        );
        lines.push(
          ` * import { ${methodName}QueryOptions } from './hooks/${pluralFileName}';`,
        );
        lines.push(' * ');
        lines.push(' * // Old pattern (deprecated)');
        lines.push(` * const result = ${hookName}(params);`);
        lines.push(' * ');
        lines.push(' * // New pattern');
        lines.push(
          ` * const result = useSuspenseQuery(${methodName}QueryOptions(params));`,
        );
        break;
      case 'mutation':
        lines.push(" * import { useMutation } from '@tanstack/react-query';");
        lines.push(
          ` * import { ${methodName}MutationOptions } from './hooks/${pluralFileName}';`,
        );
        lines.push(' * ');
        lines.push(' * // Old pattern (deprecated)');
        lines.push(` * const mutation = ${hookName}();`);
        lines.push(' * ');
        lines.push(' * // New pattern');
        lines.push(
          ` * const mutation = useMutation(${methodName}MutationOptions());`,
        );
        break;
      case 'infinite':
        lines.push(
          " * import { useInfiniteQuery } from '@tanstack/react-query';",
        );
        lines.push(
          ` * import { ${methodName}InfiniteQueryOptions } from './hooks/${pluralFileName}';`,
        );
        lines.push(' * ');
        lines.push(' * // Old pattern (deprecated)');
        lines.push(` * const result = ${hookName}(params);`);
        lines.push(' * ');
        lines.push(' * // New pattern');
        lines.push(
          ` * const result = useInfiniteQuery(${methodName}InfiniteQueryOptions(params));`,
        );
        break;
      case 'suspenseInfinite':
        lines.push(
          " * import { useSuspenseInfiniteQuery } from '@tanstack/react-query';",
        );
        lines.push(
          ` * import { ${methodName}InfiniteQueryOptions } from './hooks/${pluralFileName}';`,
        );
        lines.push(' * ');
        lines.push(' * // Old pattern (deprecated)');
        lines.push(` * const result = ${hookName}(params);`);
        lines.push(' * ');
        lines.push(' * // New pattern');
        lines.push(
          ` * const result = useSuspenseInfiniteQuery(${methodName}InfiniteQueryOptions(params));`,
        );
        break;
    }

    lines.push(' * ```');
    lines.push(' */');
    return lines;
  }
}
