import {
  Enum,
  getEnumByName,
  getHttpMethodByName,
  getTypeByName,
  getUnionByName,
  HttpMethod,
  HttpParameter,
  HttpPath,
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
import { getQueryOptionsName } from './name-factory';

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

    const serviceName = camel(`${this.int.name.value}_service`);
    const serviceHookName = camel(`use_${this.int.name.value}_service`);

    for (const method of [...this.int.methods].sort((a, b) =>
      this.getHookName(a).localeCompare(this.getHookName(b)),
    )) {
      const name = this.getHookName(method);
      const suspenseName = this.getHookName(method, { suspense: true });
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
        yield* this.generateQueryOptions(method, httpPath);
      }

      if (isGet) {
        const queryOptionsName = getQueryOptionsName(method);
        const paramsCallsite = method.parameters.length ? 'params' : '';

        const genericTypes = this.buildGenericTypes(method).join(',');

        const optionsExpression = `options?: Omit<${UndefinedInitialDataOptions()}<${genericTypes}>,'queryKey' | 'queryFn' | 'select'>`;

        yield* buildDescription(
          method.description,
          undefined,
          method.deprecated?.value,
        );
        yield `export function ${name}(${[
          paramsExpression,
          optionsExpression,
        ].filter(Boolean)}) {`;
        yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
        yield `  return ${useQuery()}({...defaultOptions, ...options});`;
        yield `}`;
        yield '';
        yield* buildDescription(
          method.description,
          undefined,
          method.deprecated?.value,
        );
        yield `export function ${suspenseName}(${[
          paramsExpression,
          optionsExpression,
        ].filter(Boolean)}) {`;
        yield `  const defaultOptions = ${queryOptionsName}(${paramsCallsite});`;
        yield `  return ${useSuspenseQuery()}({...defaultOptions, ...options});`;
        yield `}`;
      } else if (httpPath) {
        const paramsCallsite = method.parameters.length ? 'params' : '';

        const { envelope } = this.unwrapEnvelop(method);
        const dataProp = envelope?.dataProp;

        const guard = () => this.runtime.fn('guard');

        const mutationOptions = this.buildMutationOptionsType(method);

        const optionsExpression = `options?: Omit<${mutationOptions()}, 'mutationFn'>`;

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
        yield `      const res = await ${guard()}(${serviceName}.${camel(
          method.name.value,
        )}(${paramsCallsite}));`;
        yield `      if (res.errors.length) {`;
        yield `        const handled: ${QueryError()}<${type(
          'Error',
        )}[]> = { kind: 'handled', payload: res.errors };`;
        yield `        throw handled`;
        yield `      }`;

        const queryKeys = new Set<string>();
        queryKeys.add(this.buildResourceKey(httpPath, method)); // Invalidate this resource
        queryKeys.add(
          this.buildResourceKey(httpPath, method, { skipTerminalParams: true }), // Invalidate the parent resource group
        );

        for (const queryKey of Array.from(queryKeys)) {
          yield `      queryClient.invalidateQueries({ queryKey: [${queryKey}] });`;
        }
        if (dataProp && !isRequired(dataProp)) {
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
          `${this.getHookName(method, { infinite: true })}_query_options`,
        );

        const guard = () => this.runtime.fn('guard');

        yield `function ${infiniteOptionsHook}(${paramsExpression}) {`;
        yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}();`;
        yield `  return {`;
        yield `    queryKey: ${this.buildQueryKey(httpPath, method, {
          includeRelayParams: false,
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
        yield `    initialPageParam: ${getInitialPageParam()}(params${
          q ? '?? {}' : ''
        }),`;
        yield `    ${getNextPageParam()},`;
        yield `    ${getPreviousPageParam()},`;
        yield `  };`;
        yield `}`;

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

      yield '';
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

    const dataTypeArray = (!skipSelect && dataProp?.isArray) ?? false;

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
    httpPath: HttpPath,
  ): Iterable<string> {
    const queryOptions = this.buildQueryOptions(method);
    const QueryError = () => this.runtime.type('QueryError');
    const assert = () => this.runtime.fn('assert');
    const type = (t: string) => this.types.type(t);

    const serviceName = camel(`${this.int.name.value}_service`);
    const serviceHookName = camel(`use_${this.int.name.value}_service`);
    const name = getQueryOptionsName(method);
    const paramsType = from(buildParamsType(method));
    const q = method.parameters.every((param) => !isRequired(param)) ? '?' : '';
    const paramsExpression = method.parameters.length
      ? `params${q}: ${type(paramsType)}`
      : '';
    const paramsCallsite = method.parameters.length ? 'params' : '';

    const { skipSelect, dataProp } = this.xxxx(method);

    const guard = () => this.runtime.fn('guard');

    yield `const ${name} = (${paramsExpression}) => {`;
    yield `  const ${serviceName} = ${this.context.fn(serviceHookName)}()`;
    yield `  return ${queryOptions()}({`;
    yield `    queryKey: ${this.buildQueryKey(httpPath, method, {
      includeRelayParams: true,
    })},`;
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
      if (dataProp && !isRequired(dataProp)) {
        yield `    select: (data) => { ${assert()}(data.data); return data.data},`;
      } else {
        yield `    select: (data) => data.data,`;
      }
    }
    yield `  });`;
    yield `};`;
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
      couldHaveNullQueryParams = true;
      queryKey.push(
        `${compact()}({${queryParams
          .map((p) => {
            const param = method.parameters.find(
              (mp) => camel(mp.name.value) === camel(p.name.value),
            );
            const isArray = param?.isArray ?? false;
            return `${p.name.value}: params${q}.${p.name.value}${
              isArray ? ".join(',')" : ''
            }`;
          })
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

  private unwrapEnvelop(method: Method): {
    envelope: Envelope | undefined;
    returnType: Type | Enum | Union | undefined;
  } {
    const returnType =
      getTypeByName(this.service, method.returnType?.typeName.value) ??
      getEnumByName(this.service, method.returnType?.typeName.value) ??
      getUnionByName(this.service, method.returnType?.typeName.value);
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
      getTypeByName(this.service, dataProp?.typeName.value) ??
      getEnumByName(this.service, dataProp?.typeName.value) ??
      getUnionByName(this.service, dataProp?.typeName.value);
    if (!dataType) return { envelope: undefined, returnType };

    const errorType =
      getTypeByName(this.service, errorProp?.typeName.value) ??
      getEnumByName(this.service, errorProp?.typeName.value) ??
      getUnionByName(this.service, errorProp?.typeName.value);
    if (!errorType) return { envelope: undefined, returnType };

    return {
      envelope: { dataProp, dataType, errorProp, errorType },
      returnType,
    };
  }
}

function brakets(member: { isArray: boolean }): '[]' | '' {
  return member.isArray ? '[]' : '';
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
