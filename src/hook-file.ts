import {
  getHttpMethodByName,
  getTypeByName,
  HttpMethod,
  HttpParameter,
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
    const useMutation = () => this.tanstack.fn('useMutation');
    const useQuery = () => this.tanstack.fn('useQuery');
    const useQueryClient = () => this.tanstack.fn('useQueryClient');
    const useInfiniteQuery = () => this.tanstack.fn('useInfiniteQuery');
    const useSuspenseInfiniteQuery = () =>
      this.tanstack.fn('useSuspenseInfiniteQuery');
    const useSuspenseQuery = () => this.tanstack.fn('useSuspenseQuery');
    const UseMutationOptions = () => this.tanstack.type('UseMutationOptions');
    const UndefinedInitialDataOptions = () =>
      this.tanstack.type('UndefinedInitialDataOptions');

    const applyPageParam = () => this.runtime.fn('applyPageParam');
    const CompositeError = () => this.runtime.fn('CompositeError');
    const getInitialPageParam = () => this.runtime.fn('getInitialPageParam');
    const getNextPageParam = () => this.runtime.fn('getNextPageParam');
    const getPreviousPageParam = () => this.runtime.fn('getPreviousPageParam');
    const PageParam = () => this.runtime.type('PageParam');

    const type = (t: string) => this.types.type(t);

    const serviceName = camel(`${this.int.name.value}_service`);
    const serviceHookName = camel(`use_${this.int.name.value}_service`);

    for (const method of [...this.int.methods].sort((a, b) =>
      this.getHookName(a).localeCompare(this.getHookName(b)),
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

      // Generate new query options exports (v0.2.0 feature)
      if (isGet) {
        yield* this.generateQueryOptions(method, httpPath);
      }

      // Generate original hooks with options parameters (v0.1.0 compatibility)
      if (isGet) {
        const name = this.getHookName(method);
        const suspenseName = this.getHookName(method, { suspense: true });
        const queryOptionsName = this.nameFactory.buildQueryOptionsName(method);
        const paramsCallsite = method.parameters.length ? 'params' : '';

        const returnType = getTypeByName(
          this.service,
          method.returnType?.typeName.value,
        );
        const dataType = getTypeByName(
          this.service,
          returnType?.properties.find((p) => p.name.value === 'data')?.typeName
            .value,
        );

        const skipSelect =
          returnType &&
          returnType.properties.some(
            (prop) =>
              prop.name.value !== 'data' && prop.name.value !== 'errors',
          );

        const returnTypeName = returnType ? buildTypeName(returnType) : 'void';
        let dataTypeName: string;
        if (skipSelect) {
          dataTypeName = returnTypeName;
        } else {
          dataTypeName = dataType ? buildTypeName(dataType) : 'void';
        }

        const queryParams = httpMethod?.parameters.filter((p) =>
          isCacheParam(p, true),
        );
        const queryParamsType = queryParams.length
          ? 'string | Record<string, string | number | boolean>'
          : 'string';

        const optionsExpression = `options?: Omit<${UndefinedInitialDataOptions()}<${type(
          returnTypeName,
        )}, Error, ${type(
          dataTypeName,
        )} | undefined, (${queryParamsType})[]>,'queryKey' | 'queryFn' | 'select'>`;

        // Generate the regular hook
        yield '';
        yield* this.buildDeprecationMessage(
          'query',
          method.name.value,
          name,
          camel(this.int.name.value),
        );
        yield `export const ${name} = (${[
          paramsExpression,
          optionsExpression,
        ].filter(Boolean).join(', ')}) => {`;
        yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
        yield `  return ${useQuery()}({...defaultOptions, ...options});`;
        yield `};`;

        // Generate the suspense hook
        yield '';
        yield* this.buildDeprecationMessage(
          'suspenseQuery',
          method.name.value,
          suspenseName,
          camel(this.int.name.value),
        );
        yield `export const ${suspenseName} = (${[
          paramsExpression,
          optionsExpression,
        ].filter(Boolean).join(', ')}) => {`;
        yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
        yield `  return ${useSuspenseQuery()}({...defaultOptions, ...options});`;
        yield `};`;
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

        // Generate original mutation hook with options parameter
        const hookName = this.getHookName(method);
        const returnType = getTypeByName(
          this.service,
          method.returnType?.typeName.value,
        );
        const dataType = getTypeByName(
          this.service,
          returnType?.properties.find((p) => p.name.value === 'data')?.typeName
            .value,
        );

        const typeName = dataType ? buildTypeName(dataType) : 'void';

        const optionsExpression = `options?: Omit<${UseMutationOptions()}<${type(
          typeName,
        )}, Error, ${type(paramsType)}, unknown>, 'mutationFn'>`;

        yield '';
        yield* this.buildDeprecationMessage(
          'mutation',
          method.name.value,
          hookName,
          camel(this.int.name.value),
        );
        yield `export const ${hookName} = (${optionsExpression}) => {`;
        yield `  const queryClient = ${useQueryClient()}();`;
        yield `  const mutationOptions = ${mutationOptionsName}();`;
        yield `  return ${useMutation()}({`;
        yield `    ...mutationOptions,`;
        yield `    onSuccess: (data, variables, context) => {`;
        yield `      queryClient.invalidateQueries({ queryKey: ['${this.int.name.value}'] });`;
        yield `      mutationOptions.onSuccess?.(data, variables, context);`;
        yield `    },`;
        yield `    ...options,`;
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
        const infiniteName = this.getHookName(method, { infinite: true });
        const serviceGetterName = camel(`get_${this.int.name.value}_service`);

        // Export the infinite query options (v0.2.0 feature)
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
        yield `    queryKey: ['${this.int.name.value}', '${method.name.value}', ${
          method.parameters.length ? 'params || {}' : '{}'
        }, {infinite: true}] as const,`;
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

        // Generate private infinite options hook for backward compatibility
        const infiniteOptionsHook = camel(
          `${this.getHookName(method, { infinite: true })}_query_options`,
        );

        yield '';
        yield `function ${infiniteOptionsHook}(${paramsExpression}) {`;
        yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}();`;
        yield `  return {`;
        yield `    queryKey: ['${this.int.name.value}', '${method.name.value}', ${
          method.parameters.length ? 'params || {}' : '{}'
        }, {infinite: true}] as const,`;
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
        yield `  };`;
        yield `}`;

        // Generate deprecated infinite query hook
        yield '';
        yield* this.buildDeprecationMessage(
          'infinite',
          method.name.value,
          infiniteName,
          camel(this.int.name.value),
        );
        yield `export const ${infiniteName} = (${paramsExpression}) => {`;
        yield `  const options = ${infiniteOptionsHook}(params);`;
        yield `  return ${useInfiniteQuery()}(options);`;
        yield `}`;

        // Generate deprecated suspense infinite query hook
        const suspenseInfiniteName = this.getHookName(method, {
          suspense: true,
          infinite: true,
        });

        yield '';
        yield* this.buildDeprecationMessage(
          'suspenseInfinite',
          method.name.value,
          suspenseInfiniteName,
          camel(this.int.name.value),
        );
        yield `export const ${suspenseInfiniteName} = (${paramsExpression}) => {`;
        yield `  const options = ${infiniteOptionsHook}(params);`;
        yield `  return ${useSuspenseInfiniteQuery()}(options);`;
        yield `}`;
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

  private *generateQueryOptions(
    method: Method,
    httpPath: HttpPath,
  ): Iterable<string> {
    const queryOptions = () => this.tanstack.fn('queryOptions');
    const CompositeError = () => this.runtime.fn('CompositeError');
    const type = (t: string) => this.types.type(t);
    const httpMethod = getHttpMethodByName(this.service, method.name.value);

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
    httpPath: HttpPath,
    method: Method,
    options?: { includeRelayParams?: boolean; infinite?: boolean },
  ): string {
    const compact = () => this.runtime.fn('compact');
    const resourceKey = this.buildResourceKey(httpPath, method);
    const q = method.parameters.every((param) => !isRequired(param)) ? '?' : '';

    const httpMethod = getHttpMethodByName(this.service, method.name.value);
    const queryParams = httpMethod?.parameters.filter((p) =>
      isCacheParam(p, options?.includeRelayParams ?? false),
    );

    const queryKey = [resourceKey];

    let couldHaveNullQueryParams = false;
    if (queryParams?.length) {
      couldHaveNullQueryParams = queryParams.every((hp) => {
        const param = method.parameters.find(
          (p) => camel(p.name.value) === camel(hp.name.value),
        );
        return param ? !isRequired(param) : true;
      });
      queryKey.push(
        `${compact()}({${queryParams
          .map((p) => `${p.name.value}: params${q}.${p.name.value}`)
          .join(',')}})`,
      );
    }

    if (options?.infinite) {
      queryKey.push('{infinite: true}');
    }

    return `[${queryKey.join(', ')}]${
      couldHaveNullQueryParams ? '.filter(Boolean)' : ''
    }`;
  }

  private buildResourceKey(
    httpPath: HttpPath,
    method: Method,
    options?: { skipTerminalParams: boolean },
  ): string {
    const q = method.parameters.every((param) => !isRequired(param)) ? '?' : '';

    const parts = httpPath.path.value.split('/');

    if (options?.skipTerminalParams) {
      while (isPathParam(parts[parts.length - 1])) {
        parts.pop();
      }
    }

    const path = parts.filter(Boolean).map((part) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        const param = part.slice(1, -1);
        return `\${params${q}.${camel(param)}}`;
      }

      return part;
    });

    return `\`/${path.join('/')}\``;
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

  // Private method to generate hook names with same logic as v0.1.0
  private getHookName(
    method: Method,
    options?: { infinite?: boolean; suspense?: boolean },
  ): string {
    const name = method.name.value;
    const httpMethod = getHttpMethodByName(this.service, name);

    if (
      httpMethod?.verb.value === 'get' &&
      name.toLocaleLowerCase().startsWith('get')
    ) {
      return camel(
        `use_${options?.suspense ? 'suspense_' : ''}${name.slice(3)}${
          options?.infinite ? '_infinite' : ''
        }`,
      );
    }

    return camel(`use_${name}`);
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

function isPathParam(part: string): boolean {
  return part.startsWith('{') && part.endsWith('}');
}

function isCacheParam(
  param: HttpParameter,
  includeRelayParams: boolean,
): boolean {
  if (param.in.value !== 'query') return false;

  if (!includeRelayParams) {
    return (
      camel(param.name.value.toLowerCase()) !== 'first' &&
      camel(param.name.value.toLowerCase()) !== 'after' &&
      camel(param.name.value.toLowerCase()) !== 'last' &&
      camel(param.name.value.toLowerCase()) !== 'before'
    );
  }

  return true;
}
