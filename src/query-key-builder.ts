import { isRequired, Method, Service } from 'basketry';

import { buildParamsType } from '@basketry/typescript';
import { from } from '@basketry/typescript/lib/utils';

import { camel } from 'case';
import { NamespacedReactQueryOptions } from './types';
import { ModuleBuilder } from './module-builder';
import { ImportBuilder } from './import-builder';

export class QueryKeyBuilder extends ModuleBuilder {
  constructor(
    service: Service,
    options: NamespacedReactQueryOptions | undefined,
  ) {
    super(service, options);
  }

  private readonly types = new ImportBuilder(
    this.options?.reactQuery?.typesModule ?? '../types',
  );

  protected readonly importBuilders = [this.types];

  *body(): Iterable<string> {
    // Generate QueryKeyMap interface
    yield* this.generateQueryKeyMap();
    yield '';

    // Generate type extraction helpers
    yield* this.generateTypeHelpers();
    yield '';

    // Generate matchQueryKey function
    yield* this.generateMatchQueryKeyFunction();
  }

  private *generateQueryKeyMap(): Iterable<string> {
    yield '/**';
    yield ' * Type mapping for all available query keys in the service';
    yield ' */';
    yield 'export interface QueryKeyMap {';

    for (const int of this.service.interfaces) {
      const serviceName = camel(int.name.value);
      yield `  ${serviceName}: {`;

      for (const method of int.methods) {
        const methodName = camel(method.name.value);
        const paramsType = this.buildMethodParamsType(method);

        yield `    ${methodName}: ${paramsType};`;
      }

      yield '  };';
    }

    yield '}';
  }

  private *generateTypeHelpers(): Iterable<string> {
    // ServiceKeys type
    yield '/**';
    yield ' * Extract all service names from QueryKeyMap';
    yield ' */';
    yield 'export type ServiceKeys = keyof QueryKeyMap;';
    yield '';

    // OperationKeys type
    yield '/**';
    yield ' * Extract operation names for a given service';
    yield ' */';
    yield 'export type OperationKeys<S extends ServiceKeys> = keyof QueryKeyMap[S];';
    yield '';

    // OperationParams type
    yield '/**';
    yield ' * Extract parameter type for a given service and operation';
    yield ' */';
    yield 'export type OperationParams<';
    yield '  S extends ServiceKeys,';
    yield '  O extends OperationKeys<S>';
    yield '> = QueryKeyMap[S][O];';
  }

  private *generateMatchQueryKeyFunction(): Iterable<string> {
    yield '/**';
    yield ' * Build type-safe query keys for React Query cache operations';
    yield ' * ';
    yield ' * @example';
    yield ' * // Match all queries for a service';
    yield ' * matchQueryKey("widget")';
    yield ' * // Returns: ["widget"]';
    yield ' * ';
    yield ' * @example';
    yield ' * // Match all queries for a specific operation';
    yield ' * matchQueryKey("widget", "getWidgets")';
    yield ' * // Returns: ["widget", "getWidgets"]';
    yield ' * ';
    yield ' * @example';
    yield ' * // Match specific query with parameters';
    yield ' * matchQueryKey("widget", "getWidgets", { status: "active" })';
    yield ' * // Returns: ["widget", "getWidgets", { status: "active" }]';
    yield ' */';

    // Function overloads
    yield 'export function matchQueryKey<S extends ServiceKeys>(';
    yield '  service: S';
    yield '): readonly [S];';
    yield '';

    yield 'export function matchQueryKey<';
    yield '  S extends ServiceKeys,';
    yield '  O extends OperationKeys<S>';
    yield '>(';
    yield '  service: S,';
    yield '  operation: O';
    yield '): readonly [S, O];';
    yield '';

    yield 'export function matchQueryKey<';
    yield '  S extends ServiceKeys,';
    yield '  O extends OperationKeys<S>';
    yield '>(';
    yield '  service: S,';
    yield '  operation: O,';
    yield '  params: OperationParams<S, O> extends undefined ? undefined : OperationParams<S, O>';
    yield '): readonly [S, O, OperationParams<S, O> extends undefined ? {} : OperationParams<S, O>];';
    yield '';

    // Implementation
    yield 'export function matchQueryKey<';
    yield '  S extends ServiceKeys,';
    yield '  O extends OperationKeys<S>';
    yield '>(';
    yield '  service: S,';
    yield '  operation?: O,';
    yield '  params?: OperationParams<S, O>';
    yield ') {';
    yield '  if (arguments.length === 3 && operation !== undefined) {';
    yield '    // When called with 3 arguments, always include params (use {} if undefined)';
    yield '    const finalParams = params === undefined ? {} : params;';
    yield '    return [service, operation, finalParams] as const;';
    yield '  }';
    yield '  if (operation !== undefined) {';
    yield '    return [service, operation] as const;';
    yield '  }';
    yield '  return [service] as const;';
    yield '}';
  }

  private buildMethodParamsType(method: Method): string {
    const paramsType = from(buildParamsType(method));

    if (!paramsType) {
      return 'undefined';
    }

    // Register the type with the import builder
    this.types.type(paramsType);

    const hasRequired = method.parameters.some((p) => isRequired(p.value));
    return hasRequired ? paramsType : `${paramsType} | undefined`;
  }
}
