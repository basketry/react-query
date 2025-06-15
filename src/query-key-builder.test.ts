import { Service } from 'basketry';
import { QueryKeyBuilderFile } from './query-key-builder';
import { NamespacedReactQueryOptions } from './types';

describe('QueryKeyBuilderFile', () => {
  const createService = (interfaces: any[]): Service => ({
    kind: 'Service',
    basketry: '1.1-rc',
    title: { value: 'TestService' },
    majorVersion: { value: 1 },
    sourcePath: '',
    interfaces,
    types: [],
    enums: [],
    unions: [],
  });

  const createInterface = (name: string, methods: any[]) => ({
    kind: 'Interface' as const,
    name: { value: name },
    methods,
    protocols: {
      http: [],
    },
  });

  const createMethod = (
    name: string,
    parameters: any[] = [],
    httpMethod: string = 'GET',
  ) => ({
    kind: 'Method' as const,
    name: { value: name },
    parameters,
    returnType: undefined,
    security: [],
  });

  const createParameter = (name: string, required = true) => ({
    kind: 'Parameter' as const,
    name: { value: name },
    typeName: { value: 'string' },
    isArray: false,
    isPrimitive: true,
    description: null,
    deprecated: null,
    errors: [],
    warnings: [],
    sourcePath: '',
    rules: [
      ...(required
        ? [
            {
              kind: 'Rule' as const,
              id: 'required',
              value: null,
              errors: [],
              warnings: [],
              sourcePath: '',
            },
          ]
        : []),
    ],
  });

  describe('QueryKeyMap generation', () => {
    it('generates correct interface structure', () => {
      const service = createService([
        createInterface('Widget', [
          createMethod('getWidgets', [createParameter('status', false)]),
          createMethod('getWidgetById', [createParameter('id')]),
        ]),
        createInterface('Gizmo', [createMethod('getGizmos')]),
      ]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain('export interface QueryKeyMap {');
      expect(output).toContain('widget: {');
      expect(output).toContain('getWidgets: GetWidgetsParams | undefined;');
      expect(output).toContain('getWidgetById: GetWidgetByIdParams;');
      expect(output).toContain('gizmo: {');
      expect(output).toContain('getGizmos: GetGizmosParams | undefined;');
    });

    it('handles methods with no parameters', () => {
      const service = createService([
        createInterface('Widget', [createMethod('getAllWidgets')]),
      ]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain(
        'getAllWidgets: GetAllWidgetsParams | undefined;',
      );
    });

    it('handles methods with required parameters', () => {
      const service = createService([
        createInterface('Widget', [
          createMethod('getWidget', [
            createParameter('id', true),
            createParameter('version', true),
          ]),
        ]),
      ]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain('getWidget: GetWidgetParams;');
    });

    it('handles methods with optional parameters', () => {
      const service = createService([
        createInterface('Widget', [
          createMethod('searchWidgets', [
            createParameter('query', false),
            createParameter('limit', false),
          ]),
        ]),
      ]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain(
        'searchWidgets: SearchWidgetsParams | undefined;',
      );
    });
  });

  describe('Type helpers generation', () => {
    it('generates ServiceKeys type', () => {
      const service = createService([
        createInterface('Widget', []),
        createInterface('Gizmo', []),
      ]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain('export type ServiceKeys = keyof QueryKeyMap;');
    });

    it('generates OperationKeys type', () => {
      const service = createService([createInterface('Widget', [])]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain(
        'export type OperationKeys<S extends ServiceKeys> = keyof QueryKeyMap[S];',
      );
    });

    it('generates OperationParams type', () => {
      const service = createService([createInterface('Widget', [])]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain('export type OperationParams<');
      expect(output).toContain('S extends ServiceKeys,');
      expect(output).toContain('O extends OperationKeys<S>');
      expect(output).toContain('> = QueryKeyMap[S][O];');
    });
  });

  describe('matchQueryKey function generation', () => {
    it('generates function with three overloads', () => {
      const service = createService([createInterface('Widget', [])]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      // Service-only overload
      expect(output).toContain(
        'export function matchQueryKey<S extends ServiceKeys>(',
      );
      expect(output).toContain('service: S');
      expect(output).toContain('): readonly [S];');

      // Service + operation overload
      expect(output).toMatch(
        /export function matchQueryKey<[\s\S]*?S extends ServiceKeys,[\s\S]*?O extends OperationKeys<S>[\s\S]*?>/,
      );

      // Full overload with params
      expect(output).toContain(
        'params: OperationParams<S, O> extends undefined ? undefined : OperationParams<S, O>',
      );
    });

    it('generates correct implementation', () => {
      const service = createService([createInterface('Widget', [])]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      // Check implementation logic
      expect(output).toContain('if (arguments.length === 3 && operation !== undefined) {');
      expect(output).toContain(
        'const finalParams = params === undefined ? {} : params;',
      );
      expect(output).toContain(
        'return [service, operation, finalParams] as const;',
      );
      expect(output).toContain('if (operation !== undefined) {');
      expect(output).toContain('return [service, operation] as const;');
      expect(output).toContain('return [service] as const;');
    });

    it('includes comprehensive JSDoc examples', () => {
      const service = createService([createInterface('Widget', [])]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain('@example');
      expect(output).toContain('// Match all queries for a service');
      expect(output).toContain('matchQueryKey("widget")');
      expect(output).toContain('// Returns: ["widget"]');
      expect(output).toContain('// Match all queries for a specific operation');
      expect(output).toContain('matchQueryKey("widget", "getWidgets")');
      expect(output).toContain('// Match specific query with parameters');
    });
  });

  describe('import management', () => {
    it('imports types module correctly', () => {
      const service = createService([
        createInterface('Widget', [
          createMethod('getWidget', [createParameter('id')]),
        ]),
      ]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toMatch(
        /import type \{ GetWidgetParams \} from '\.\.\/types'/,
      );
    });

    it('respects custom types module path', () => {
      const service = createService([
        createInterface('Widget', [
          createMethod('getWidget', [createParameter('id')]),
        ]),
      ]);

      const options: NamespacedReactQueryOptions = {
        reactQuery: {
          typesModule: '../../custom-types',
        },
      };

      const builder = new QueryKeyBuilderFile(service, options);
      const output = Array.from(builder.build()).join('\n');

      expect(output).toMatch(
        /import type \{ GetWidgetParams \} from '\.\.\/\.\.\/custom-types'/,
      );
    });

    it('handles type imports setting', () => {
      const service = createService([
        createInterface('Widget', [
          createMethod('getWidget', [createParameter('id')]),
        ]),
      ]);

      const options: NamespacedReactQueryOptions = {
        typescript: {
          typeImports: true,
        },
      };

      const builder = new QueryKeyBuilderFile(service, options);
      const output = Array.from(builder.build()).join('\n');

      expect(output).toMatch(
        /import type \{ GetWidgetParams \} from '\.\.\/types'/,
      );
    });
  });

  describe('edge cases', () => {
    it('handles multiple interfaces with multiple methods', () => {
      const service = createService([
        createInterface('Widget', [
          createMethod('getWidgets'),
          createMethod('createWidget', [], 'POST'),
          createMethod('updateWidget', [createParameter('id')], 'PUT'),
        ]),
        createInterface('Gizmo', [
          createMethod('getGizmos', [createParameter('type', false)]),
          createMethod('deleteGizmo', [createParameter('id')], 'DELETE'),
        ]),
      ]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      // Check all methods are included
      expect(output).toContain('getWidgets: GetWidgetsParams | undefined;');
      expect(output).toContain('createWidget: CreateWidgetParams | undefined;');
      expect(output).toContain('updateWidget: UpdateWidgetParams;');
      expect(output).toContain('getGizmos: GetGizmosParams | undefined;');
      expect(output).toContain('deleteGizmo: DeleteGizmoParams;');
    });

    it('handles empty service', () => {
      const service = createService([]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain('export interface QueryKeyMap {');
      expect(output).toContain('}'); // Empty interface
      expect(output).toContain('export function matchQueryKey');
    });

    it('handles interface with no methods', () => {
      const service = createService([createInterface('Widget', [])]);

      const builder = new QueryKeyBuilderFile(service, {});
      const output = Array.from(builder.build()).join('\n');

      expect(output).toContain('widget: {');
      expect(output).toContain('};'); // Empty methods object
    });
  });
});
