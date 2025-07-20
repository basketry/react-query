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
import { getQueryOptionsName, NameFactory } from './name-factory';

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
    for (const method of [...this.int.methods].sort((a, b) =>
      this.getHookName(a).localeCompare(this.getHookName(b)),
    )) {
      const httpMethod = getHttpMethodByName(this.service, method.name.value);
      const httpPath = this.getHttpPath(httpMethod);
      const isGet = httpMethod?.verb.value === 'get' && !!httpPath;

      // === NEW QUERY OPTIONS EXPORTS (v0.2.0) ===
      yield* this.generateAllQueryOptions(method, httpMethod, httpPath);

      // === LEGACY HOOKS (v0.1.0) ===
      yield* this.generateAllLegacyHooks(method, httpMethod, httpPath);

      yield '';
    }
  }

  private *generateAllQueryOptions(
    method: Method,
    httpMethod: HttpMethod | undefined,
    httpPath: HttpPath | undefined,
  ): Iterable<string> {
    if (!httpPath) return;

    const isGet = httpMethod?.verb.value === 'get';

    if (isGet) {
      yield* this.generateQueryOptions(method, httpPath);
      
      if (this.isRelayPaginated(method)) {
        yield* this.generateInfiniteQueryOptions(method, httpPath);
      }
    } else {
      yield* this.generateMutationOptions(method, httpPath);
    }
  }

  private *generateAllLegacyHooks(
    method: Method,
    httpMethod: HttpMethod | undefined,
    httpPath: HttpPath | undefined,
  ): Iterable<string> {
    if (!httpPath) return;

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

    const isGet = httpMethod?.verb.value === 'get';

    const name = this.getHookName(method);
    const suspenseName = this.getHookName(method, { suspense: true });
    const infiniteName = this.getHookName(method, { infinite: true });
    const paramsType = from(buildParamsType(method));
    const q = method.parameters.every((param) => !isRequired(param))
      ? '?'
      : '';

    const paramsExpression = method.parameters.length
      ? `params${q}: ${type(paramsType)}`
      : '';

    if (isGet) {
      // Generate legacy query hooks
      yield* this.generateLegacyQueryHooks(
        method,
        httpPath,
        {
          name,
          suspenseName,
          paramsType,
          paramsExpression,
          q,
          serviceName,
          serviceHookName,
          type,
          useQuery,
          useSuspenseQuery,
          UndefinedInitialDataOptions,
        }
      );
    } else {
      // Generate legacy mutation hook
      yield* this.generateLegacyMutationHook(
        method,
        httpPath,
        {
          name,
          paramsType,
          paramsExpression,
          serviceName,
          serviceHookName,
          type,
          useMutation,
          useQueryClient,
          UseMutationOptions,
          CompositeError,
        }
      );
    }

    if (isGet && this.isRelayPaginated(method)) {
      // Generate legacy infinite hooks
      yield* this.generateLegacyInfiniteHooks(
        method,
        httpPath,
        {
          infiniteName,
          paramsExpression,
          q,
          serviceName,
          serviceHookName,
          applyPageParam,
          useInfiniteQuery,
          useSuspenseInfiniteQuery,
          CompositeError,
          getInitialPageParam,
          getNextPageParam,
          getPreviousPageParam,
          PageParam,
        }
      );
    }
  }

  private *generateLegacyQueryHooks(
    method: Method,
    httpPath: HttpPath,
    context: any,
  ): Iterable<string> {
    const {
      name,
      suspenseName,
      paramsExpression,
      type,
      useQuery,
      useSuspenseQuery,
      UndefinedInitialDataOptions,
    } = context;

    const queryOptionsName = getQueryOptionsName(method);
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

    const httpMethod = getHttpMethodByName(this.service, method.name.value);
    const queryParams = httpMethod?.parameters.filter((p) =>
      isCacheParam(p, true),
    );
    const queryParamsType = queryParams?.length
      ? 'string | Record<string, string | number | boolean>'
      : 'string';

    const optionsExpression = `options?: Omit<${UndefinedInitialDataOptions()}<${type(
      returnTypeName,
    )}, Error, ${type(
      dataTypeName,
    )} | undefined, (${queryParamsType})[]>,'queryKey' | 'queryFn' | 'select'>`;

    // Add deprecation comment for regular query hook
    yield* this.buildDeprecationComment('query', method);
    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export function ${name}(${[
      paramsExpression,
      optionsExpression,
    ].filter(Boolean).join(', ')}) {`;
    yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
    yield `  return ${useQuery()}({...defaultOptions, ...options});`;
    yield `}`;
    yield '';
    
    // Add deprecation comment for suspense query hook
    yield* this.buildDeprecationComment('suspenseQuery', method);
    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export function ${suspenseName}(${[
      paramsExpression,
      optionsExpression,
    ].filter(Boolean).join(', ')}) {`;
    yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
    yield `  return ${useSuspenseQuery()}({...defaultOptions, ...options});`;
    yield `}`;
  }

  private *generateLegacyMutationHook(
    method: Method,
    httpPath: HttpPath,
    context: any,
  ): Iterable<string> {
    const {
      name,
      paramsType,
      paramsExpression,
      serviceName,
      serviceHookName,
      type,
      useMutation,
      useQueryClient,
      UseMutationOptions,
      CompositeError,
    } = context;

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

    const typeName = dataType ? buildTypeName(dataType) : 'void';

    const optionsExpression = `options?: Omit<${UseMutationOptions()}<${type(
      typeName,
    )}, Error, ${type(paramsType)}, unknown>, 'mutationFn'>`;

    // Add deprecation comment for mutation hook
    yield* this.buildDeprecationComment('mutation', method);
    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export function ${name}(${optionsExpression}) {`;
    yield `  const queryClient = ${useQueryClient()}();`;
    yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}()`;
    yield `  return ${useMutation()}({`;
    yield `    mutationFn: async (${paramsExpression}) => {`;
    yield `      const res = await ${serviceName}.${camel(
      method.name.value,
    )}(${paramsCallsite});`;
    yield `      if (res.errors.length) { throw new ${CompositeError()}(res.errors); }`;
    yield `      else if (!res.data) { throw new Error('Unexpected data error: Failed to get example'); }`;

    const queryKeys = new Set<string>();
    queryKeys.add(this.buildResourceKey(httpPath, method));
    queryKeys.add(
      this.buildResourceKey(httpPath, method, { skipTerminalParams: true }),
    );

    for (const queryKey of Array.from(queryKeys)) {
      yield `      queryClient.invalidateQueries({ queryKey: [${queryKey}] });`;
    }
    yield `      return res.data;`;
    yield `    },`;
    yield `    ...options,`;
    yield `  });`;
    yield `}`;
  }

  private *generateLegacyInfiniteHooks(
    method: Method,
    httpPath: HttpPath,
    context: any,
  ): Iterable<string> {
    const {
      infiniteName,
      paramsExpression,
      q,
      serviceName,
      serviceHookName,
      applyPageParam,
      useInfiniteQuery,
      useSuspenseInfiniteQuery,
      CompositeError,
      getInitialPageParam,
      getNextPageParam,
      getPreviousPageParam,
      PageParam,
    } = context;

    const methodExpression = `${serviceName}.${camel(method.name.value)}`;
    const paramsCallsite = method.parameters.length
      ? `${applyPageParam()}(params${q ? '?? {}' : ''}, pageParam)`
      : '';

    const infiniteOptionsHook = camel(
      `${this.getHookName(method, { infinite: true })}_query_options`,
    );

    yield `function ${infiniteOptionsHook}(${paramsExpression}) {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}();`;
    yield `  return {`;
    yield `    queryKey: ${this.buildQueryKey(httpPath, method, {
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
    yield `  };`;
    yield `}`;

    // Add deprecation comment for infinite query hook
    yield '';
    yield* this.buildDeprecationComment('infinite', method);
    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export const ${this.getHookName(method, {
      suspense: false,
      infinite: true,
    })} = (${paramsExpression}) => {`;
    yield `  const options = ${infiniteOptionsHook}(params);`;
    yield `  return ${useInfiniteQuery()}(options);`;
    yield `}`;

    // Add deprecation comment for suspense infinite query hook
    yield '';
    yield* this.buildDeprecationComment('suspenseInfinite', method);
    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export const ${this.getHookName(method, {
      suspense: true,
      infinite: true,
    })} = (${paramsExpression}) => {`;
    yield `  const options = ${infiniteOptionsHook}(params);`;
    yield `  return ${useSuspenseInfiniteQuery()}(options);`;
    yield `}`;
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

  private *generateMutationOptions(
    method: Method,
    httpPath: HttpPath,
  ): Iterable<string> {
    const mutationOptions = () => this.tanstack.fn('mutationOptions');
    const CompositeError = () => this.runtime.fn('CompositeError');
    const type = (t: string) => this.types.type(t);

    const serviceName = camel(`${this.int.name.value}_service`);
    const serviceGetterName = this.nameFactory.buildServiceGetterName(this.int);
    const mutationOptionsName = this.nameFactory.buildMutationOptionsName(method);
    
    const paramsType = from(buildParamsType(method));
    const paramsExpression = method.parameters.length
      ? `params: ${type(paramsType)}`
      : '';
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

    const typeName = dataType ? buildTypeName(dataType) : 'void';

    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export const ${mutationOptionsName} = () => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceGetterName)}()`;
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
    yield `};`;
  }

  private *generateInfiniteQueryOptions(
    method: Method,
    httpPath: HttpPath,
  ): Iterable<string> {
    const infiniteQueryOptions = () => this.tanstack.fn('infiniteQueryOptions');
    const CompositeError = () => this.runtime.fn('CompositeError');
    const type = (t: string) => this.types.type(t);
    const applyPageParam = () => this.runtime.fn('applyPageParam');
    const getInitialPageParam = () => this.runtime.fn('getInitialPageParam');
    const getNextPageParam = () => this.runtime.fn('getNextPageParam');
    const getPreviousPageParam = () => this.runtime.fn('getPreviousPageParam');
    const PageParam = () => this.runtime.type('PageParam');

    const serviceName = camel(`${this.int.name.value}_service`);
    const serviceGetterName = this.nameFactory.buildServiceGetterName(this.int);
    const infiniteOptionsName = this.nameFactory.buildInfiniteQueryOptionsName(method);
    
    const paramsType = from(buildParamsType(method));
    const q = method.parameters.every((param) => !isRequired(param)) ? '?' : '';
    const paramsExpression = method.parameters.length
      ? `params${q}: ${type(paramsType)}`
      : '';
    
    const methodExpression = `${serviceName}.${camel(method.name.value)}`;
    const paramsCallsite = method.parameters.length
      ? `${applyPageParam()}(params${q ? '?? {}' : ''}, pageParam)`
      : '';

    yield '';
    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export const ${infiniteOptionsName} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceGetterName)}();`;
    yield `  return ${infiniteQueryOptions()}({`;
    yield `    queryKey: ${this.buildQueryKey(httpPath, method, {
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
    yield `};`;
  }

  private *generateQueryOptions(
    method: Method,
    httpPath: HttpPath,
  ): Iterable<string> {
    const queryOptions = () => this.tanstack.fn('queryOptions');
    const CompositeError = () => this.runtime.fn('CompositeError');
    const type = (t: string) => this.types.type(t);

    const serviceName = camel(`${this.int.name.value}_service`);
    const serviceGetterName = this.nameFactory.buildServiceGetterName(this.int);
    
    // Keep the internal function for backward compatibility
    const internalName = getQueryOptionsName(method);
    // New exported function name
    const exportedName = this.nameFactory.buildQueryOptionsName(method);
    
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

    // Internal function for backward compatibility with hooks
    yield `const ${internalName} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(this.nameFactory.buildServiceHookName(this.int))}()`;
    yield `  return ${queryOptions()}({`;
    yield `    queryKey: ${this.buildQueryKey(httpPath, method, {
      includeRelayParams: true,
    })},`;
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
    
    // New exported query options function (v0.2.0)
    yield '';
    yield* buildDescription(
      method.description,
      undefined,
      method.deprecated?.value,
    );
    yield `export const ${exportedName} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceGetterName)}()`;
    yield `  return ${queryOptions()}({`;
    yield `    queryKey: ${this.buildQueryKey(httpPath, method, {
      includeRelayParams: true,
    })},`;
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

  private *buildDeprecationComment(
    hookType: 'query' | 'suspenseQuery' | 'mutation' | 'infinite' | 'suspenseInfinite',
    method: Method,
  ): Iterable<string> {
    const methodName = method.name.value;
    
    yield '/**';
    yield ' * @deprecated This hook is deprecated and will be removed in a future version.';
    yield ' * Please use the new query options pattern instead:';
    yield ' *';
    yield ' * ```typescript';
    
    switch (hookType) {
      case 'query':
        yield ` * import { useQuery } from '@tanstack/react-query';`;
        yield ` * import { ${this.nameFactory.buildQueryOptionsName(method)} } from './hooks/${this.int.name.value}';`;
        yield ' *';
        yield ` * const result = useQuery(${this.nameFactory.buildQueryOptionsName(method)}(params));`;
        break;
      case 'suspenseQuery':
        yield ` * import { useSuspenseQuery } from '@tanstack/react-query';`;
        yield ` * import { ${this.nameFactory.buildQueryOptionsName(method)} } from './hooks/${this.int.name.value}';`;
        yield ' *';
        yield ` * const result = useSuspenseQuery(${this.nameFactory.buildQueryOptionsName(method)}(params));`;
        break;
      case 'mutation':
        yield ` * import { useMutation } from '@tanstack/react-query';`;
        yield ` * import { ${this.nameFactory.buildMutationOptionsName(method)} } from './hooks/${this.int.name.value}';`;
        yield ' *';
        yield ` * const mutation = useMutation(${this.nameFactory.buildMutationOptionsName(method)}());`;
        break;
      case 'infinite':
        yield ` * import { useInfiniteQuery } from '@tanstack/react-query';`;
        yield ` * import { ${this.nameFactory.buildInfiniteQueryOptionsName(method)} } from './hooks/${this.int.name.value}';`;
        yield ' *';
        yield ` * const result = useInfiniteQuery(${this.nameFactory.buildInfiniteQueryOptionsName(method)}(params));`;
        break;
      case 'suspenseInfinite':
        yield ` * import { useSuspenseInfiniteQuery } from '@tanstack/react-query';`;
        yield ` * import { ${this.nameFactory.buildInfiniteQueryOptionsName(method)} } from './hooks/${this.int.name.value}';`;
        yield ' *';
        yield ` * const result = useSuspenseInfiniteQuery(${this.nameFactory.buildInfiniteQueryOptionsName(method)}(params));`;
        break;
    }
    
    yield ' * ```';
    yield ' */';
  }

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
        `use_${options?.suspense ? 'suspense_' : ''}${
          options?.infinite ? 'infinite_' : ''
        }${name.slice(3)}`,
      );
    }

    return camel(`use_${name}`);
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
      queryKey.push('{inifinite: true}');
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

    // TODO: Check if the return type has a `pageInfo` property
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
