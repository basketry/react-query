import {
  Enum,
  getEnumByName,
  getHttpMethodByName,
  getTypeByName,
  getUnionByName,
  HttpMethod,
  HttpParameter,
  HttpRoute,
  Interface,
  isRequired,
  Method,
  Property,
  Service,
  Type,
  Union,
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
import {
  buildServiceName,
  buildServiceHookName,
  buildHookName,
  buildQueryOptionsName,
  buildMutationOptionsName,
  buildInfiniteQueryOptionsName,
  buildServiceGetterName,
} from './name-helpers';
import { isRelayPaginaged } from './utils';

type Envelope = {
  dataProp: Property;
  dataType: Type | Enum | Union;
  errorProp: Property;
  errorType: Type | Enum | Union;
};

export class HookFile extends ModuleBuilder {
  constructor(
    service: Service,
    options: NamespacedReactQueryOptions | undefined,
    private readonly int: Interface,
  ) {
    super(service, options);
  }
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
    // === LEGACY HOOKS (deprecated) ===
    yield '// Legacy hooks - deprecated, use query/mutation options exports instead';
    yield '';

    const useMutation = () => this.tanstack.fn('useMutation');
    const useQuery = () => this.tanstack.fn('useQuery');
    const useQueryClient = () => this.tanstack.fn('useQueryClient');
    const useInfiniteQuery = () => this.tanstack.fn('useInfiniteQuery');
    const useSuspenseInfiniteQuery = () =>
      this.tanstack.fn('useSuspenseInfiniteQuery');
    const useSuspenseQuery = () => this.tanstack.fn('useSuspenseQuery');
    const UndefinedInitialDataOptions = () =>
      this.tanstack.type('UndefinedInitialDataOptions');

    const applyPageParam = () => this.runtime.fn('applyPageParam');
    const getInitialPageParam = () => this.runtime.fn('getInitialPageParam');
    const getNextPageParam = () => this.runtime.fn('getNextPageParam');
    const getPreviousPageParam = () => this.runtime.fn('getPreviousPageParam');
    const PageParam = () => this.runtime.type('PageParam');
    const QueryError = () => this.runtime.type('QueryError');
    const assert = () => this.runtime.fn('assert');

    const type = (t: string) => this.types.type(t);

    const serviceName = buildServiceName(this.int);
    const serviceHookName = buildServiceHookName(this.int);

    for (const method of [...this.int.methods].sort((a, b) =>
      buildHookName(a, this.service)
        .localeCompare(buildHookName(b, this.service)),
    )) {
      const name = buildHookName(method, this.service);
      const suspenseName = buildHookName(method, this.service, {
        suspense: true,
      });
      const paramsType = from(buildParamsType(method));
      const httpMethod = getHttpMethodByName(this.service, method.name.value);
      const httpRoute = this.getHttpRoute(httpMethod);
      const q = method.parameters.every((param) => !isRequired(param.value))
        ? '?'
        : '';

      const paramsExpression = method.parameters.length
        ? `params${q}: ${type(paramsType)}`
        : '';

      const isGet = httpMethod?.verb.value === 'get' && !!httpRoute;

      if (isGet) {
        yield* this.generateQueryOptions(method, httpRoute);
      }

      if (isGet) {
        const queryOptionsName = buildQueryOptionsName(method);
        const paramsCallsite = method.parameters.length ? 'params' : '';

        const genericTypes = this.buildGenericTypes(method).join(',');

        const optionsExpression = `options?: Omit<${UndefinedInitialDataOptions()}<${genericTypes}>,'queryKey' | 'queryFn' | 'select'>`;

        yield* buildDescription(method.description, true); // Mark as deprecated
        yield `/** @deprecated Use ${queryOptionsName} with useQuery instead */`;
        yield `export function ${name}(${[
          paramsExpression,
          optionsExpression,
        ].filter(Boolean)}) {`;
        yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
        yield `  return ${useQuery()}({...defaultOptions, ...options});`;
        yield `}`;
        yield '';
        yield* buildDescription(method.description, true); // Mark as deprecated
        yield `/** @deprecated Use ${queryOptionsName} with useSuspenseQuery instead */`;
        yield `export function ${suspenseName}(${[
          paramsExpression,
          optionsExpression,
        ].filter(Boolean)}) {`;
        yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
        yield `  return ${useSuspenseQuery()}({...defaultOptions, ...options});`;
        yield `}`;
      } else if (httpRoute) {
        const paramsCallsite = method.parameters.length ? 'params' : '';

        const { envelope } = this.unwrapEnvelop(method);
        const dataProp = envelope?.dataProp;

        const guard = () => this.runtime.fn('guard');

        const mutationOptions = this.buildMutationOptionsType(method);

        const optionsExpression = `options?: Omit<${mutationOptions()}, 'mutationFn'>`;

        yield* buildDescription(method.description, true); // Mark as deprecated
        yield `/** @deprecated Use ${buildMutationOptionsName(method)} with useMutation instead */`;
        yield `export function ${name}(${optionsExpression}) {`;
        yield `  const queryClient = ${useQueryClient()}();`;
        yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}()`;
        yield `  return ${useMutation()}({`;
        yield `    mutationFn: async (${paramsExpression}) => {`;
        yield `      const res = await ${guard()}(${serviceName}.${camel(
          method.name.value,
        )}(${paramsCallsite}));`;
        yield `      if (res.errors.length) {`;
        yield `        const handled: ${QueryError()}<${type(
          'Error',
        )}[]> = { kind: 'handled', payload: res.errors };`;
        yield `        throw handled`;
        yield `      }`;

        // Invalidate all queries for this interface using the simpler pattern
        const interfaceName = camel(this.int.name.value);
        yield `      queryClient.invalidateQueries({ queryKey: ['${interfaceName}'] });`;
        if (dataProp && !isRequired(dataProp.value)) {
          yield `      ${assert()}(res.data);`;
        }
        yield `      return res.data;`;
        yield `    },`;
        yield `    ...options,`;
        yield `  });`;
        yield `}`;
      }

      if (isGet && this.isRelayPaginated(method)) {
        const methodExpression = `${serviceName}.${camel(method.name.value)}`;
        const paramsCallsite = method.parameters.length
          ? `${applyPageParam()}(params${q ? '?? {}' : ''}, pageParam)`
          : '';

        const infiniteOptionsHook = camel(
          `${buildHookName(method, this.service, {
            infinite: true,
          })}_query_options`,
        );

        const guard = () => this.runtime.fn('guard');

        yield `function ${infiniteOptionsHook}(${paramsExpression}) {`;
        yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}();`;
        yield `  return {`;
        yield `    queryKey: ${this.buildQueryKey(method, {
          infinite: true,
        })},`;
        yield `    queryFn: async ({ pageParam }: ${PageParam()}) => {`;
        yield `      const res = await ${guard()}(${methodExpression}(${paramsCallsite}));`;
        yield `      if (res.errors.length) {`;
        yield `        const handled: ${QueryError()}<${type(
          'Error',
        )}[]> = { kind: 'handled', payload: res.errors };`;
        yield `        throw handled`;
        yield `      }`;
        yield `      return res;`;
        yield `    },`;
        yield* this.buildInfiniteSelectFn(method);
        yield `    initialPageParam: ${getInitialPageParam()}(params${q ? '?? {}' : ''
          }),`;
        yield `    ${getNextPageParam()},`;
        yield `    ${getPreviousPageParam()},`;
        yield `  };`;
        yield `}`;

        yield* buildDescription(method.description, true); // Mark as deprecated
        yield `/** @deprecated Use ${buildInfiniteQueryOptionsName(method)} with useInfiniteQuery instead */`;
        yield `export const ${buildHookName(method, this.service, {
          suspense: false,
          infinite: true,
        })} = (${paramsExpression}) => {`;
        yield `  const options = ${infiniteOptionsHook}(params);`;
        yield `  return ${useInfiniteQuery()}(options);`;
        yield `}`;

        yield* buildDescription(method.description, true); // Mark as deprecated
        yield `/** @deprecated Use ${buildInfiniteQueryOptionsName(method)} with useSuspenseInfiniteQuery instead */`;
        yield `export const ${buildHookName(method, this.service, {
          suspense: true,
          infinite: true,
        })} = (${paramsExpression}) => {`;
        yield `  const options = ${infiniteOptionsHook}(params);`;
        yield `  return ${useSuspenseInfiniteQuery()}(options);`;
        yield `}`;
      }

      yield '';
    }

    // === NEW QUERY/MUTATION OPTIONS EXPORTS ===
    yield '';
    yield '// Query and mutation options exports for React Query v5';
    yield '';

    for (const method of this.int.methods) {
      const httpMethod = getHttpMethodByName(this.service, method.name.value);
      const httpRoute = this.getHttpRoute(httpMethod);
      yield* this.generateAllOptionsExports(method, httpMethod, httpRoute);
    }
  }

  private buildMutationOptionsType(method: Method): () => string {
    return () => {
      const UseMutationOptions = () => this.tanstack.type('UseMutationOptions');
      const type = (t: string) => this.types.type(t);
      const QueryError = () => this.runtime.type('QueryError');

      const { envelope } = this.unwrapEnvelop(method);

      const dataType = envelope?.dataType;
      const paramsType = from(buildParamsType(method));
      const typeName = dataType ? buildTypeName(dataType) : 'void';

      const genericTypes: string[] = [];

      genericTypes.push(type(typeName));
      genericTypes.push(`${QueryError()}<${type('Error')}[]>`);
      if (method.parameters.length) {
        genericTypes.push(type(paramsType));
      }

      return `${UseMutationOptions()}<${genericTypes.join(',')}>`;
    };
  }

  // TODO: remove or rename this method
  private xxxx(method: Method) {
    const { envelope, returnType } = this.unwrapEnvelop(method);

    const dataProp = envelope?.dataProp;

    const dataType = envelope?.dataType;

    const skipSelect =
      returnType?.kind === 'Type' &&
      returnType.properties.some(
        // TODO: move to unwrapEnvelop ... something like "hasAdditionalProperties"
        (prop) => prop.name.value !== 'data' && prop.name.value !== 'errors',
      );

    const returnTypeName = returnType ? buildTypeName(returnType) : 'void';
    let dataTypeName: string;
    if (skipSelect) {
      dataTypeName = returnTypeName;
    } else {
      dataTypeName = dataProp && dataType ? buildTypeName(dataType) : 'void';
    }

    const dataTypeArray = (!skipSelect && dataProp?.value.isArray) ?? false;

    return {
      returnTypeName,
      dataTypeName,
      array: dataTypeArray ? '[]' : '',
      dataProp,
      skipSelect,
    };
  }

  private *buildInfiniteSelectFn(method: Method): Iterable<string> {
    const InfiniteData = () => this.tanstack.type('InfiniteData');
    const type = (t: string) => this.types.type(t);

    const returnType = getTypeByName(
      this.service,
      method.returns?.value.typeName.value,
    );

    const returnTypeName = returnType ? buildTypeName(returnType) : 'void';

    const optional = returnType?.properties.some(
      (prop) =>
        prop.name.value.toLowerCase() === 'data' && !isRequired(prop.value),
    );

    yield `    select: (data: ${InfiniteData()}<${type(
      returnTypeName,
    )}, string | undefined>) => data.pages.flatMap((page) => page.data${optional ? ' ?? []' : ''
      }),`;
  }

  private buildQueryOptions(method: Method): () => string {
    const queryOptions = () => this.tanstack.fn('queryOptions');

    return () =>
      `${queryOptions()}<${this.buildGenericTypes(method).join(',')}>`;
  }

  private buildGenericTypes(method: Method): string[] {
    const genericTypes: string[] = [];

    const QueryError = () => this.runtime.type('QueryError');
    const type = (t: string) => this.types.type(t);

    const { returnTypeName, dataTypeName, array, skipSelect } =
      this.xxxx(method);

    // This is the type returned by the queryFn
    genericTypes.push(type(returnTypeName));

    // This is the type of the error returned by the hook if the query fails
    genericTypes.push(`${QueryError()}<${type('Error')}[]>`);

    // This is the type returned by the select function (if it exists)
    if (!skipSelect) {
      genericTypes.push(`${type(dataTypeName)}${array}`);
    }
    return genericTypes;
  }

  private *generateQueryOptions(
    method: Method,
    httpRoute: HttpRoute,
  ): Iterable<string> {
    const queryOptions = this.buildQueryOptions(method);
    const QueryError = () => this.runtime.type('QueryError');
    const assert = () => this.runtime.fn('assert');
    const type = (t: string) => this.types.type(t);

    const serviceName = buildServiceName(this.int);
    const serviceHookName = buildServiceHookName(this.int);
    const name = buildQueryOptionsName(method);
    const paramsType = from(buildParamsType(method));
    const q = method.parameters.every((param) => !isRequired(param.value))
      ? '?'
      : '';
    const paramsExpression = method.parameters.length
      ? `params${q}: ${type(paramsType)}`
      : '';
    const paramsCallsite = method.parameters.length ? 'params' : '';

    const { skipSelect, dataProp } = this.xxxx(method);

    const guard = () => this.runtime.fn('guard');

    yield `const ${name} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}()`;
    yield `  return ${queryOptions()}({`;
    yield `    queryKey: ${this.buildQueryKey(method)},`;
    yield `    queryFn: async () => {`;
    yield `      const res = await ${guard()}(${serviceName}.${camel(
      method.name.value,
    )}(${paramsCallsite}));`;
    yield `      if (res.errors.length) {`;
    yield `        const handled: ${QueryError()}<${type(
      'Error',
    )}[]> = { kind: 'handled', payload: res.errors };`;
    yield `        throw handled`;
    yield `      }`;
    yield `      return res;`;
    yield `    },`;
    if (!skipSelect) {
      if (dataProp && !isRequired(dataProp.value)) {
        yield `    select: (data) => { ${assert()}(data.data); return data.data},`;
      } else {
        yield `    select: (data) => data.data,`;
      }
    }
    yield `  });`;
    yield `};`;
  }

  private getHttpRoute(
    httpMethod: HttpMethod | undefined,
  ): HttpRoute | undefined {
    if (!httpMethod) return undefined;

    for (const int of this.service.interfaces) {
      for (const httpRoute of int.protocols?.http ?? []) {
        for (const method of httpRoute.methods) {
          if (method.name.value === httpMethod.name.value) {
            return httpRoute;
          }
        }
      }
    }

    return undefined;
  }

  private isRelayPaginated(method: Method): boolean {
    return isRelayPaginaged(method, this.service);
  }

  private unwrapEnvelop(method: Method): {
    envelope: Envelope | undefined;
    returnType: Type | Enum | Union | undefined;
  } {
    const returnType =
      getTypeByName(this.service, method.returns?.value.typeName.value) ??
      getEnumByName(this.service, method.returns?.value.typeName.value) ??
      getUnionByName(this.service, method.returns?.value.typeName.value);
    if (!returnType) return { envelope: undefined, returnType: undefined };

    const dataProp =
      returnType.kind === 'Type'
        ? returnType.properties.find(
          (p) =>
            p.name.value.toLocaleLowerCase() === 'data' ||
            p.name.value.toLocaleLowerCase() === 'value' ||
            p.name.value.toLocaleLowerCase() === 'values',
        )
        : undefined;
    if (!dataProp) return { envelope: undefined, returnType };

    const errorProp =
      returnType.kind === 'Type'
        ? returnType.properties.find(
          (p) =>
            p.name.value.toLocaleLowerCase() === 'error' ||
            p.name.value.toLocaleLowerCase() === 'errors',
        )
        : undefined;
    if (!errorProp) return { envelope: undefined, returnType };

    const dataType =
      getTypeByName(this.service, dataProp?.value.typeName.value) ??
      getEnumByName(this.service, dataProp?.value.typeName.value) ??
      getUnionByName(this.service, dataProp?.value.typeName.value);
    if (!dataType) return { envelope: undefined, returnType };

    const errorType =
      getTypeByName(this.service, errorProp?.value.typeName.value) ??
      getEnumByName(this.service, errorProp?.value.typeName.value) ??
      getUnionByName(this.service, errorProp?.value.typeName.value);
    if (!errorType) return { envelope: undefined, returnType };

    return {
      envelope: { dataProp, dataType, errorProp, errorType },
      returnType,
    };
  }

  private *generateAllOptionsExports(
    method: Method,
    httpMethod: HttpMethod | undefined,
    httpRoute: HttpRoute | undefined,
  ): Iterable<string> {
    if (!httpRoute) return;

    const isGet = httpMethod?.verb.value === 'get';

    if (isGet) {
      yield* this.generateQueryOptionsExport(method, httpRoute);

      if (this.isRelayPaginated(method)) {
        yield* this.generateInfiniteQueryOptionsExport(method, httpRoute);
      }
    } else {
      yield* this.generateMutationOptionsExport(method);
    }
  }

  private *generateQueryOptionsExport(
    method: Method,
    httpRoute: HttpRoute,
  ): Iterable<string> {
    const queryOptions = () => this.tanstack.fn('queryOptions');
    const QueryError = () => this.runtime.type('QueryError');
    const assert = () => this.runtime.fn('assert');
    const type = (t: string) => this.types.type(t);
    const guard = () => this.runtime.fn('guard');

    const serviceName = buildServiceName(this.int);
    const serviceGetterName = buildServiceGetterName(this.int);
    const exportedName = buildQueryOptionsName(method);

    const paramsType = from(buildParamsType(method));
    const q = method.parameters.every((param) => !isRequired(param.value))
      ? '?'
      : '';
    const paramsExpression = method.parameters.length
      ? `params${q}: ${type(paramsType)}`
      : '';
    const paramsCallsite = method.parameters.length ? 'params' : '';

    const { skipSelect, dataProp } = this.xxxx(method);

    yield '';
    yield* buildDescription(
      method.description,
      method.deprecated?.value,
    );
    yield `export const ${exportedName} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceGetterName)}()`;
    yield `  return ${queryOptions()}({`;
    yield `    queryKey: ${this.buildQueryKey(method)},`;
    yield `    queryFn: async () => {`;
    yield `      const res = await ${guard()}(${serviceName}.${camel(
      method.name.value,
    )}(${paramsCallsite}));`;
    yield `      if (res.errors.length) {`;
    yield `        const handled: ${QueryError()}<${type(
      'Error',
    )}[]> = { kind: 'handled', payload: res.errors };`;
    yield `        throw handled`;
    yield `      }`;
    yield `      return res;`;
    yield `    },`;
    if (!skipSelect) {
      if (dataProp && !isRequired(dataProp.value)) {
        yield `    select: (data) => { ${assert()}(data.data); return data.data},`;
      } else {
        yield `    select: (data) => data.data,`;
      }
    }
    yield `  });`;
    yield `};`;
  }

  private *generateMutationOptionsExport(method: Method): Iterable<string> {
    const mutationOptions = () => this.tanstack.fn('mutationOptions');
    const QueryError = () => this.runtime.type('QueryError');
    const type = (t: string) => this.types.type(t);
    const guard = () => this.runtime.fn('guard');
    const assert = () => this.runtime.fn('assert');

    const serviceName = buildServiceName(this.int);
    const serviceGetterName = buildServiceGetterName(this.int);
    const mutationOptionsName = buildMutationOptionsName(method);

    const paramsType = from(buildParamsType(method));
    const paramsExpression = method.parameters.length
      ? `params: ${type(paramsType)}`
      : '';
    const paramsCallsite = method.parameters.length ? 'params' : '';

    const { envelope } = this.unwrapEnvelop(method);
    const dataProp = envelope?.dataProp;

    yield '';
    yield* buildDescription(
      method.description,
      method.deprecated?.value,
    );
    yield `export const ${mutationOptionsName} = () => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceGetterName)}()`;
    yield `  return ${mutationOptions()}({`;
    yield `    mutationFn: async (${paramsExpression}) => {`;
    yield `      const res = await ${guard()}(${serviceName}.${camel(
      method.name.value,
    )}(${paramsCallsite});`;
    yield `      if (res.errors.length) {`;
    yield `        const handled: ${QueryError()}<${type(
      'Error',
    )}[]> = { kind: 'handled', payload: res.errors };`;
    yield `        throw handled`;
    yield `      }`;
    if (dataProp && !isRequired(dataProp.value)) {
      yield `      ${assert()}(res.data);`;
    }
    yield `      return res.data;`;
    yield `    },`;
    yield `  });`;
    yield `};`;
  }

  private *generateInfiniteQueryOptionsExport(
    method: Method,
    httpRoute: HttpRoute,
  ): Iterable<string> {
    const infiniteQueryOptions = () => this.tanstack.fn('infiniteQueryOptions');
    const QueryError = () => this.runtime.type('QueryError');
    const type = (t: string) => this.types.type(t);
    const applyPageParam = () => this.runtime.fn('applyPageParam');
    const getInitialPageParam = () => this.runtime.fn('getInitialPageParam');
    const getNextPageParam = () => this.runtime.fn('getNextPageParam');
    const getPreviousPageParam = () => this.runtime.fn('getPreviousPageParam');
    const PageParam = () => this.runtime.type('PageParam');
    const guard = () => this.runtime.fn('guard');

    const serviceName = buildServiceName(this.int);
    const serviceGetterName = buildServiceGetterName(this.int);
    const infiniteOptionsName = buildInfiniteQueryOptionsName(method);

    const paramsType = from(buildParamsType(method));
    const q = method.parameters.every((param) => !isRequired(param.value))
      ? '?'
      : '';
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
      method.deprecated?.value,
    );
    yield `export const ${infiniteOptionsName} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceGetterName)}();`;
    yield `  return ${infiniteQueryOptions()}({`;
    yield `    queryKey: ${this.buildQueryKey(method, {
      infinite: true,
    })},`;
    yield `    queryFn: async ({ pageParam }: ${PageParam()}) => {`;
    yield `      const res = await ${guard()}(${methodExpression}(${paramsCallsite}));`;
    yield `      if (res.errors.length) {`;
    yield `        const handled: ${QueryError()}<${type(
      'Error',
    )}[]> = { kind: 'handled', payload: res.errors };`;
    yield `        throw handled`;
    yield `      }`;
    yield `      return res;`;
    yield `    },`;
    yield* this.buildInfiniteSelectFn(method);
    yield `    initialPageParam: ${getInitialPageParam()}(params${q ? '?? {}' : ''
      }),`;
    yield `    ${getNextPageParam()},`;
    yield `    ${getPreviousPageParam()},`;
    yield `  });`;
    yield `};`;
  }

  private buildQueryKey(
    method: Method,
    options?: { infinite?: boolean },
  ): string {
    const interfaceName = camel(this.int.name.value);
    const methodName = camel(method.name.value);

    const queryKey = [`'${interfaceName}'`, `'${methodName}'`];

    if (method.parameters.length) {
      queryKey.push(`params || {}`);
    } else {
      queryKey.push('{}');
    }

    if (options?.infinite) {
      queryKey.push('{infinite: true}');
    }

    return `[${queryKey.join(', ')}]`;
  }
}

