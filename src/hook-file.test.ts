import { File, Service } from 'basketry';
import { generateHooks } from './hook-generator';
import { NamespacedReactQueryOptions } from './types';

describe('HookFile', () => {
  describe('Infinite Query Options', () => {
    it('generates infinite query options for relay-paginated methods', async () => {
      const service: Service = {
        basketry: '1.1-rc',
        kind: 'Service',
        title: { value: 'TestService' },
        majorVersion: { value: 1 },
        sourcePath: 'test.json',
        loc: 'test.json',
        interfaces: [
          {
            kind: 'Interface',
            name: { value: 'widget' },
            methods: [
              {
                kind: 'Method',
                name: { value: 'getWidgets' },
                security: [],
                parameters: [
                  {
                    kind: 'Parameter',
                    name: { value: 'first' },
                    typeName: { value: 'integer' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                  {
                    kind: 'Parameter',
                    name: { value: 'after' },
                    typeName: { value: 'string' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                  {
                    kind: 'Parameter',
                    name: { value: 'last' },
                    typeName: { value: 'integer' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                  {
                    kind: 'Parameter',
                    name: { value: 'before' },
                    typeName: { value: 'string' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                ],
                returnType: {
                  kind: 'ReturnType',
                  typeName: { value: 'WidgetConnection' },
                  isPrimitive: false,
                  isArray: false,
                  rules: [],
                },
              },
            ],
            protocols: {
              http: [
                {
                  kind: 'HttpPath',
                  path: { value: '/widgets' },
                  methods: [
                    {
                      kind: 'HttpMethod',
                      name: { value: 'getWidgets' },
                      verb: { value: 'get' },
                      parameters: [],
                      successCode: { value: 200 },
                      requestMediaTypes: [],
                      responseMediaTypes: [],
                    },
                  ],
                },
              ],
            },
          },
        ],
        types: [
          {
            kind: 'Type',
            name: { value: 'WidgetConnection' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'pageInfo' },
                typeName: { value: 'PageInfo' },
                isPrimitive: false,
                isArray: false,
                rules: [],
              },
              {
                kind: 'Property',
                name: { value: 'data' },
                typeName: { value: 'Widget' },
                isPrimitive: false,
                isArray: true,
                rules: [],
              },
            ],
            rules: [],
          },
          {
            kind: 'Type',
            name: { value: 'PageInfo' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'startCursor' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
              {
                kind: 'Property',
                name: { value: 'endCursor' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
              {
                kind: 'Property',
                name: { value: 'hasNextPage' },
                typeName: { value: 'boolean' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
              {
                kind: 'Property',
                name: { value: 'hasPreviousPage' },
                typeName: { value: 'boolean' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
          {
            kind: 'Type',
            name: { value: 'Widget' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'id' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
              {
                kind: 'Property',
                name: { value: 'name' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
        ],
        enums: [],
        unions: [],
        meta: [],
      };

      const options: NamespacedReactQueryOptions = {
        reactQuery: {
          typesModule: '../types',
          clientModule: '../http-client',
        },
      };

      const files: File[] = [];
      for await (const file of generateHooks(service, options)) {
        files.push(file);
      }

      const widgetsFile = files.find(
        (f) => f.path[f.path.length - 1] === 'widgets.ts',
      );
      expect(widgetsFile).toBeDefined();

      const content = widgetsFile!.contents;

      // Check that infinite query options are generated with full method names
      expect(content).toContain('export const getWidgetsInfiniteQueryOptions');

      // Verify the query key includes the infinite flag
      expect(content).toMatch(
        /queryKey:\s*\['widget',\s*'getWidgets',[^,]+,\s*\{\s*infinite:\s*true\s*\}/,
      );

      // Check that regular query options are also generated
      expect(content).toContain('export const getWidgetsQueryOptions');

      // Verify relay pagination utilities are used
      expect(content).toContain('getNextPageParam');
      expect(content).toContain('getPreviousPageParam');
      expect(content).toContain('getInitialPageParam');
      expect(content).toContain('applyPageParam');
    });

    it('does not generate infinite query options for non-relay-paginated methods', async () => {
      const service: Service = {
        basketry: '1.1-rc',
        kind: 'Service',
        title: { value: 'TestService' },
        majorVersion: { value: 1 },
        sourcePath: 'test.json',
        loc: 'test.json',
        interfaces: [
          {
            kind: 'Interface',
            name: { value: 'widget' },
            methods: [
              {
                kind: 'Method',
                name: { value: 'getWidget' },
                security: [],
                parameters: [
                  {
                    kind: 'Parameter',
                    name: { value: 'id' },
                    typeName: { value: 'string' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                ],
                returnType: {
                  kind: 'ReturnType',
                  typeName: { value: 'WidgetResponse' },
                  isPrimitive: false,
                  isArray: false,
                  rules: [],
                },
              },
            ],
            protocols: {
              http: [
                {
                  kind: 'HttpPath',
                  path: { value: '/widgets/{id}' },
                  methods: [
                    {
                      kind: 'HttpMethod',
                      name: { value: 'getWidget' },
                      verb: { value: 'get' },
                      parameters: [],
                      successCode: { value: 200 },
                      requestMediaTypes: [],
                      responseMediaTypes: [],
                    },
                  ],
                },
              ],
            },
          },
        ],
        types: [
          {
            kind: 'Type',
            name: { value: 'WidgetResponse' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'data' },
                typeName: { value: 'Widget' },
                isPrimitive: false,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
          {
            kind: 'Type',
            name: { value: 'Widget' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'id' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
        ],
        enums: [],
        unions: [],
        meta: [],
      };

      const options: NamespacedReactQueryOptions = {};

      const files: File[] = [];
      for await (const file of generateHooks(service, options)) {
        files.push(file);
      }

      const widgetsFile = files.find(
        (f) => f.path[f.path.length - 1] === 'widgets.ts',
      );
      expect(widgetsFile).toBeDefined();

      const content = widgetsFile!.contents;

      expect(content).toContain('export const getWidgetQueryOptions');
      expect(content).not.toContain('InfiniteQueryOptions');
      expect(content).not.toContain('infiniteQueryOptions');
    });
  });

  describe('Deprecated Hook Generation', () => {
    it('generates deprecated query hooks with proper deprecation messages', async () => {
      const service: Service = {
        basketry: '1.1-rc',
        kind: 'Service',
        title: { value: 'TestService' },
        majorVersion: { value: 1 },
        sourcePath: 'test.json',
        loc: 'test.json',
        interfaces: [
          {
            kind: 'Interface',
            name: { value: 'widget' },
            methods: [
              {
                kind: 'Method',
                name: { value: 'getWidget' },
                security: [],
                parameters: [
                  {
                    kind: 'Parameter',
                    name: { value: 'id' },
                    typeName: { value: 'string' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                ],
                returnType: {
                  kind: 'ReturnType',
                  typeName: { value: 'Widget' },
                  isPrimitive: false,
                  isArray: false,
                  rules: [],
                },
              },
            ],
            protocols: {
              http: [
                {
                  kind: 'HttpPath',
                  path: { value: '/widgets/{id}' },
                  methods: [
                    {
                      kind: 'HttpMethod',
                      name: { value: 'getWidget' },
                      verb: { value: 'get' },
                      parameters: [],
                      successCode: { value: 200 },
                      requestMediaTypes: [],
                      responseMediaTypes: [],
                    },
                  ],
                },
              ],
            },
          },
        ],
        types: [
          {
            kind: 'Type',
            name: { value: 'Widget' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'id' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
        ],
        enums: [],
        unions: [],
        meta: [],
      };

      const options: NamespacedReactQueryOptions = {};

      const files: File[] = [];
      for await (const file of generateHooks(service, options)) {
        files.push(file);
      }

      const widgetsFile = files.find(
        (f) => f.path[f.path.length - 1] === 'widgets.ts',
      );
      expect(widgetsFile).toBeDefined();

      const content = widgetsFile!.contents;

      // Check that deprecated hooks are generated
      expect(content).toContain('export const useGetWidget');
      expect(content).toContain('export const useSuspenseGetWidget');

      // Check for deprecation messages
      expect(content).toContain('@deprecated');
      expect(content).toContain(
        'This hook is deprecated and will be removed in a future version',
      );
      expect(content).toContain('// Old pattern (deprecated)');
      expect(content).toContain('// New pattern');
      expect(content).toContain('const result = useGetWidget');
      expect(content).toContain(
        'const result = useQuery(getWidgetQueryOptions',
      );

      // Check that hooks use the query options
      expect(content).toMatch(
        /useGetWidget[^}]+useQuery\(getWidgetQueryOptions/s,
      );
      expect(content).toMatch(
        /useSuspenseGetWidget[^}]+useSuspenseQuery\(getWidgetQueryOptions/s,
      );
    });

    it('generates deprecated mutation hooks with query invalidation', async () => {
      const service: Service = {
        basketry: '1.1-rc',
        kind: 'Service',
        title: { value: 'TestService' },
        majorVersion: { value: 1 },
        sourcePath: 'test.json',
        loc: 'test.json',
        interfaces: [
          {
            kind: 'Interface',
            name: { value: 'widget' },
            methods: [
              {
                kind: 'Method',
                name: { value: 'createWidget' },
                security: [],
                parameters: [
                  {
                    kind: 'Parameter',
                    name: { value: 'widget' },
                    typeName: { value: 'CreateWidgetInput' },
                    isPrimitive: false,
                    isArray: false,
                    rules: [],
                  },
                ],
                returnType: {
                  kind: 'ReturnType',
                  typeName: { value: 'Widget' },
                  isPrimitive: false,
                  isArray: false,
                  rules: [],
                },
              },
            ],
            protocols: {
              http: [
                {
                  kind: 'HttpPath',
                  path: { value: '/widgets' },
                  methods: [
                    {
                      kind: 'HttpMethod',
                      name: { value: 'createWidget' },
                      verb: { value: 'post' },
                      parameters: [],
                      successCode: { value: 201 },
                      requestMediaTypes: [],
                      responseMediaTypes: [],
                    },
                  ],
                },
              ],
            },
          },
        ],
        types: [
          {
            kind: 'Type',
            name: { value: 'CreateWidgetInput' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'name' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
          {
            kind: 'Type',
            name: { value: 'Widget' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'id' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
        ],
        enums: [],
        unions: [],
        meta: [],
      };

      const options: NamespacedReactQueryOptions = {};

      const files: File[] = [];
      for await (const file of generateHooks(service, options)) {
        files.push(file);
      }

      const widgetsFile = files.find(
        (f) => f.path[f.path.length - 1] === 'widgets.ts',
      );
      expect(widgetsFile).toBeDefined();

      const content = widgetsFile!.contents;

      // Check that deprecated mutation hook is generated
      expect(content).toContain('export const useCreateWidget');

      // Check for deprecation message
      expect(content).toContain('@deprecated');
      expect(content).toContain('mutation hook is deprecated');

      // Check that hook uses useQueryClient for invalidation
      expect(content).toContain('const queryClient = useQueryClient()');
      expect(content).toContain('useMutation({');
      expect(content).toContain('...mutationOptions');
      expect(content).toContain('onSuccess:');
      expect(content).toContain(
        "queryClient.invalidateQueries({ queryKey: ['widget'] })",
      );

      // Check that it preserves existing onSuccess
      expect(content).toContain(
        'mutationOptions.onSuccess?.(data, variables, context)',
      );
    });

    it('generates deprecated infinite query hooks for paginated endpoints', async () => {
      const service: Service = {
        basketry: '1.1-rc',
        kind: 'Service',
        title: { value: 'TestService' },
        majorVersion: { value: 1 },
        sourcePath: 'test.json',
        loc: 'test.json',
        interfaces: [
          {
            kind: 'Interface',
            name: { value: 'widget' },
            methods: [
              {
                kind: 'Method',
                name: { value: 'getWidgets' },
                security: [],
                parameters: [
                  {
                    kind: 'Parameter',
                    name: { value: 'first' },
                    typeName: { value: 'integer' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                  {
                    kind: 'Parameter',
                    name: { value: 'after' },
                    typeName: { value: 'string' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                  {
                    kind: 'Parameter',
                    name: { value: 'last' },
                    typeName: { value: 'integer' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                  {
                    kind: 'Parameter',
                    name: { value: 'before' },
                    typeName: { value: 'string' },
                    isPrimitive: true,
                    isArray: false,
                    rules: [],
                  },
                ],
                returnType: {
                  kind: 'ReturnType',
                  typeName: { value: 'WidgetConnection' },
                  isPrimitive: false,
                  isArray: false,
                  rules: [],
                },
              },
            ],
            protocols: {
              http: [
                {
                  kind: 'HttpPath',
                  path: { value: '/widgets' },
                  methods: [
                    {
                      kind: 'HttpMethod',
                      name: { value: 'getWidgets' },
                      verb: { value: 'get' },
                      parameters: [],
                      successCode: { value: 200 },
                      requestMediaTypes: [],
                      responseMediaTypes: [],
                    },
                  ],
                },
              ],
            },
          },
        ],
        types: [
          {
            kind: 'Type',
            name: { value: 'WidgetConnection' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'pageInfo' },
                typeName: { value: 'PageInfo' },
                isPrimitive: false,
                isArray: false,
                rules: [],
              },
              {
                kind: 'Property',
                name: { value: 'data' },
                typeName: { value: 'Widget' },
                isPrimitive: false,
                isArray: true,
                rules: [],
              },
            ],
            rules: [],
          },
          {
            kind: 'Type',
            name: { value: 'PageInfo' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'endCursor' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
              {
                kind: 'Property',
                name: { value: 'hasNextPage' },
                typeName: { value: 'boolean' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
          {
            kind: 'Type',
            name: { value: 'Widget' },
            properties: [
              {
                kind: 'Property',
                name: { value: 'id' },
                typeName: { value: 'string' },
                isPrimitive: true,
                isArray: false,
                rules: [],
              },
            ],
            rules: [],
          },
        ],
        enums: [],
        unions: [],
        meta: [],
      };

      const options: NamespacedReactQueryOptions = {};

      const files: File[] = [];
      for await (const file of generateHooks(service, options)) {
        files.push(file);
      }

      const widgetsFile = files.find(
        (f) => f.path[f.path.length - 1] === 'widgets.ts',
      );
      expect(widgetsFile).toBeDefined();

      const content = widgetsFile!.contents;

      // Check that deprecated infinite hooks are generated
      expect(content).toContain('export const useGetWidgetsInfinite');
      expect(content).toContain('export const useSuspenseGetWidgetsInfinite');

      // Check for deprecation messages
      expect(content).toContain('@deprecated');
      expect(content).toContain('infinite query hook is deprecated');

      // Check that hooks use the infinite query options
      expect(content).toMatch(
        /useGetWidgetsInfinite[^}]+useInfiniteQuery\(getWidgetsInfiniteQueryOptions/s,
      );
      expect(content).toMatch(
        /useSuspenseGetWidgetsInfinite[^}]+useSuspenseInfiniteQuery\(getWidgetsInfiniteQueryOptions/s,
      );
    });

    it('verifies deprecation message format is consistent', async () => {
      const service: Service = {
        basketry: '1.1-rc',
        kind: 'Service',
        title: { value: 'TestService' },
        majorVersion: { value: 1 },
        sourcePath: 'test.json',
        loc: 'test.json',
        interfaces: [
          {
            kind: 'Interface',
            name: { value: 'widget' },
            methods: [
              {
                kind: 'Method',
                name: { value: 'getWidget' },
                security: [],
                parameters: [],
                returnType: {
                  kind: 'ReturnType',
                  typeName: { value: 'Widget' },
                  isPrimitive: false,
                  isArray: false,
                  rules: [],
                },
              },
            ],
            protocols: {
              http: [
                {
                  kind: 'HttpPath',
                  path: { value: '/widgets/{id}' },
                  methods: [
                    {
                      kind: 'HttpMethod',
                      name: { value: 'getWidget' },
                      verb: { value: 'get' },
                      parameters: [],
                      successCode: { value: 200 },
                      requestMediaTypes: [],
                      responseMediaTypes: [],
                    },
                  ],
                },
              ],
            },
          },
        ],
        types: [
          {
            kind: 'Type',
            name: { value: 'Widget' },
            properties: [],
            rules: [],
          },
        ],
        enums: [],
        unions: [],
        meta: [],
      };

      const options: NamespacedReactQueryOptions = {};

      const files: File[] = [];
      for await (const file of generateHooks(service, options)) {
        files.push(file);
      }

      const widgetsFile = files.find(
        (f) => f.path[f.path.length - 1] === 'widgets.ts',
      );
      const content = widgetsFile!.contents;

      // Check deprecation message includes proper imports
      expect(content).toMatch(
        /import \{ useQuery \} from '@tanstack\/react-query'/,
      );
      expect(content).toMatch(
        /import \{ getWidgetQueryOptions \} from '\.\/hooks\/widgets'/,
      );

      // Check code blocks are properly formatted
      expect(content).toContain('```typescript');
      expect(content).toContain('```');

      // Verify migration example structure
      const deprecationBlocks = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
      const queryDeprecation = deprecationBlocks.find(
        (block) =>
          block.includes('useGetWidget') && !block.includes('Suspense'),
      );

      expect(queryDeprecation).toBeDefined();
      expect(queryDeprecation).toContain('Old pattern (deprecated)');
      expect(queryDeprecation).toContain('New pattern');
    });
  });
});
