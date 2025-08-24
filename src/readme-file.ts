import { readFileSync } from 'fs';
import { join } from 'path';

import { Interface, Method, Service, warning } from 'basketry';
import { buildFilePath } from '@basketry/typescript';
import { NamespacedTypescriptOptions } from '@basketry/typescript/lib/types';
import { kebab, lower, pascal, sentence } from 'case';
import { plural } from 'pluralize';
import { format, Options } from 'prettier';

import { NamespacedReactQueryOptions } from './types';
import {
  buildHookName,
  buildProviderName,
  buildServiceName,
  buildServiceHookName,
} from './name-helpers';
import { isRelayPaginaged } from './utils';

type MethodInfo = {
  method: Method;
  interface: Interface;
  hookName: string;
  suspenseHookName: string;
  importPath: string;
  params: string;
};

export class ReadmeFile {
  constructor(
    private readonly service: Service,
    private readonly options: NamespacedReactQueryOptions,
  ) {}

  private import(...path: string[]) {
    return `./${buildFilePath(path, this.service, this.options).join('/')}`;
  }

  private queryMethod(): MethodInfo | undefined {
    for (const int of this.service.interfaces) {
      const httpMethod = (int.protocols?.http ?? [])
        ?.flatMap((http) => http.methods)
        .find((method) => method.verb.value === 'get');

      if (!httpMethod) continue;

      for (const method of int.methods) {
        if (method.name.value === httpMethod.name.value)
          return {
            method,
            interface: int,
            hookName: buildHookName(method, this.service),
            suspenseHookName: buildHookName(method, this.service, {
              suspense: true,
            }),
            importPath: this.import('hooks', kebab(plural(int.name.value))),
            params: '/* params */',
          };
      }
    }

    return;
  }

  private infiniteQueryMethod(): MethodInfo | undefined {
    for (const int of this.service.interfaces) {
      for (const method of int.methods) {
        if (!isRelayPaginaged(method, this.service)) continue;

        const httpMethod = (int.protocols?.http ?? [])
          ?.flatMap((http) => http.methods)
          .find(
            (m) => m.verb.value === 'get' && m.name.value === method.name.value,
          );

        if (!httpMethod) continue;

        return {
          method,
          interface: int,
          hookName: buildHookName(method, this.service, { infinite: true }),
          suspenseHookName: buildHookName(method, this.service, {
            suspense: true,
            infinite: true,
          }),
          importPath: this.import('hooks', kebab(plural(int.name.value))),
          params: '/* params */',
        };
      }
    }

    return;
  }

  private mutationMethod(): MethodInfo | undefined {
    for (const int of this.service.interfaces) {
      const httpMethod = (int.protocols?.http ?? [])
        ?.flatMap((http) => http.methods)
        .find((method) => method.verb.value !== 'get');

      if (!httpMethod) continue;

      for (const method of int.methods) {
        if (method.name.value === httpMethod.name.value)
          return {
            method,
            interface: int,
            hookName: buildHookName(method, this.service),
            suspenseHookName: buildHookName(method, this.service, {
              suspense: true,
            }),
            importPath: this.import('hooks', kebab(plural(int.name.value))),
            params: '/* params */',
          };
      }
    }

    return;
  }

  *build(): Iterable<string> {
    yield* this.buildPreamble();
    yield* this.buildIntro();
    yield* this.buildSetup();
    yield* this.buildQueries();
    yield* this.buildInfiniteQueries();
    yield* this.buildMutations();
    yield* this.buildError();
    yield* this.buildServices();
  }

  private *buildPreamble(): Iterable<string> {
    yield '<!--';
    yield* warning(
      this.service,
      require('../package.json'),
      this.options || {},
    );
    yield '-->';
    yield '';
  }

  private *buildIntro(): Iterable<string> {
    yield `
# React Query Hooks

This directory contains the generated React Query hooks that provide access to the ${pascal(
      this.service.title.value,
    )} v${this.service.majorVersion.value} API.

For more information about React Query, [read the official docs](https://tanstack.com/query/latest/docs/framework/react/overview).`;
  }

  private *buildSetup(): Iterable<string> {
    const contextImportPath = this.import('hooks', 'context');
    const providerName = buildProviderName(this.service);
    yield `
## Setup

Wrap your application in the \`${providerName}\` exported from the \`context\` module. This provides implementations of the interfaces that empower the query and mutation hooks.

\`\`\`tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ${providerName} } from '${contextImportPath}';

export const App = () => {
  const queryClient = new QueryClient();
  
  return (
    <${providerName} root="/v${this.service.majorVersion.value}" >
      <QueryClientProvider client={queryClient}>
        <div>Your app goes here</div>
      </QueryClientProvider>
    </${providerName}>
  );
};
\`\`\`

Note that the \`${providerName}\` _DOES NOT_ automatically service as a Tanstack \`QueryClientProvider\`. You will also need to wrap your component tree in a \`QueryClientProvider\`. It doesn't matter which order you wrap the components, but both are required.`;
  }

  private *buildQueries(): Iterable<string> {
    const queryMethod = this.queryMethod();

    yield `
## Queries

See: [Tanstack Query docs for Queries](https://tanstack.com/query/latest/docs/framework/react/guides/queries)

Each query hook is the equivalent of the general \`useQuery\` hook with the method-specific \`queryFn\`, \`select\`, and \`queryKey\` properties provided.

\`\`\`tsx
import { ${queryMethod?.hookName} } from '${queryMethod?.importPath}';

export const Example = () => {
  const { data, isLoading } = ${queryMethod?.hookName}({ ${queryMethod?.params} });

  // Use \`isLoading\` value to display a loading indicator
  if (isLoading) return <div>Loading ...</div>;

  // Use \`data\` value to display the response
  return (
    <div>
      <h1>Here is your data:</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
\`\`\`

### Suspense

See: [Tanstack Query docs for Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense)

React Query can also be used with React's Suspense for Data Fetching API's. Each generated query hook has a Suspense variant that can be used in place of the standard hook.

\`\`\`tsx
import { ${queryMethod?.suspenseHookName} } from '${queryMethod?.importPath}';

export const ExampleContainer = () => (

  // Use suspense to display a loading indicator
  <React.Suspense fallback={<div>Loading...</div>}>
    <Example />
  </React.Suspense>
);

export const Example = () => {
  const { data } = ${queryMethod?.suspenseHookName}({ ${queryMethod?.params} });

  // Use \`data\` value to display the response
  return (
    <div>
      <h1>Here is your data:</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
\`\`\`

### QueryClient Overrides

Both the standard and suspense hooks can be called with optional client overrides. These options are only applied to the specific query and do not affect the global QueryClient.

\`\`\`tsx

const { data } = ${queryMethod?.hookName}(
  { ${queryMethod?.params} },
  { retry: 5, retryDelay: 1000 },
);

const { data } = ${queryMethod?.suspenseHookName}(
  { ${queryMethod?.params} },
  { retry: 5, retryDelay: 1000 },
);

\`\`\`

`;
  }

  private *buildInfiniteQueries(): Iterable<string> {
    const queryMethod = this.infiniteQueryMethod();

    if (!queryMethod) return;

    yield `### Infinite Queries

See: [Tanstack Query docs for Infinite Queries](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)

Infinite queries are a special type of query that allows you to fetch new pages of data as the user scrolls or as they trigger a "load more" button. The returned \`data\` property is a flattened array of all the data fetched so far.

\`\`\`tsx
import { ${queryMethod?.hookName} } from '${queryMethod?.importPath}';

export const Example = () => {
  const { data, isLoading, fetchNext, isFetchingNext } = ${queryMethod?.hookName}({ ${queryMethod?.params} });

  // Use \`isLoading\` value to display a loading indicator
  if (isLoading) return <div>Loading ...</div>;

  // Use \`data\` value to display the response
  return (
    <div>
      <h1>Here is your data:</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={fetchNext} disabled={isFetchingNext}>Load More</button>
    </div>
  );
};
\`\`\`

Each infinite query has a suspended variant that can be used with React's Suspense for Data Fetching API's. The Suspense variant is used in the same way as the standard infinite query hook.

\`\`\`tsx
const { data, isLoading, fetchNext, isFetchingNext } = ${queryMethod?.suspenseHookName}({ ${queryMethod?.params} });
\`\`\`

`;
  }

  private *buildMutations(): Iterable<string> {
    const mutationMethod = this.mutationMethod();

    yield `
## Mutations

See: [Tanstack Query docs for Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)

\`\`\`tsx
import { ${mutationMethod?.hookName} } from '${mutationMethod?.importPath}';

export const Example = () => {
  const { mutate } = ${mutationMethod?.hookName}({
    onSuccess: (data, variables) => {
      console.log('called with variables', variables);
      console.log('returned data', data);
    },
    onError: console.error,
  });

  const handleClick = useCallback(() => {
    mutate({ ${mutationMethod?.params} });
  }, [mutate]);

  return (
    <div>
      <button onClick={handleClick}>${sentence(
        mutationMethod?.method.name.value ?? '',
      )}</button>
    </div>
  );
};
\`\`\``;
  }

  private *buildError(): Iterable<string> {
    yield `
## Error Handling

React Query returns an \`error\` property from the query and mutation hooks. This value is non-null when an error has been raised.

The generated hooks return an error of type \`QueryError<T>\` where \`T\` is the type of error returned from the API method. This error type is a discriminated union of either a handled or unhandled error.

Handled errors will be of type \`T\` and are generally things like validation errors returned in a structurd format from the API. Unhandled errors are of type \`unknown\` generally represent exceptions thrown during the execution of the API or the processing of the response.`;
  }

  private *buildServices(): Iterable<string> {
    const contextImportPath = this.import('hooks', 'context');

    const queryMethod = this.queryMethod();

    const int = this.service.interfaces[0];
    const serviceName = buildServiceName(int);
    const serviceHookName = buildServiceHookName(int);

    const providerName = buildProviderName(this.service);

    yield `
## Services

The generated hooks make use of the generated HTTP Client service implementations. While hooks provide a React-idiomatic mechanism for interacting with your API, the raw service implmentations provide more precise, fine-gained control.

Using the generated React Query hooks will be sufficient for most use cases; however, the services can be access from within the \`${providerName}\` tree by using the hooks exported from the \`context\` module.

\`\`\`tsx
import { useCallback } from 'react';
import { ${serviceHookName} } from '${contextImportPath}';

export const Example = () => {
  const ${serviceName} = ${serviceHookName}();

  const handleClick = useCallback(() => {
    // Do something directly with the ${lower(serviceName)}
  }, [${serviceName}]);

  return (
    <div>
      <button onClick={handleClick}>Custom action</button>
    </div>
  );
};
\`\`\`

## Server-Side Rendering (SSR) and React Server Components (RSC)

The generated query and mutation options support SSR and RSC environments by accepting an optional configuration parameter. This allows you to pass service configuration directly without requiring the React context provider.

### Using in React Server Components

\`\`\`tsx
// app/page.tsx (Next.js App Router)
import { get${pascal(
      queryMethod?.method.name.value ?? 'Example',
    )}QueryOptions } from '${queryMethod?.importPath}';
import type { ${pascal(
      this.service.title.value,
    )}ServiceConfig } from '${contextImportPath}';

export default async function Page() {
  const config: ${pascal(this.service.title.value)}ServiceConfig = {
    fetch: customFetch, // Optional custom fetch implementation
    root: process.env.API_URL,
    // ... other configuration options
  };
  
  const queryClient = new QueryClient();
  const data = await queryClient.fetchQuery(
    get${pascal(queryMethod?.method.name.value ?? 'Example')}QueryOptions(${
      queryMethod?.params ? `{ ${queryMethod.params} }, config` : 'config'
    })
  );
  
  return <div>{/* Render your data */}</div>;
}
\`\`\`

### Using in SSR (Next.js Pages Router)

\`\`\`tsx
// pages/example.tsx
import { get${pascal(
      queryMethod?.method.name.value ?? 'Example',
    )}QueryOptions } from '${queryMethod?.importPath}';
import type { ${pascal(
      this.service.title.value,
    )}ServiceConfig } from '${contextImportPath}';

export async function getServerSideProps() {
  const config: ${pascal(this.service.title.value)}ServiceConfig = {
    root: process.env.API_URL,
    // ... other configuration options  
  };
  
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(
    get${pascal(queryMethod?.method.name.value ?? 'Example')}QueryOptions(${
      queryMethod?.params ? `{ ${queryMethod.params} }, config` : 'config'
    })
  );
  
  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}
\`\`\`

### Client Components with Config Override

Even in client components, you can override the context configuration by passing a config parameter:

\`\`\`tsx
import { useQuery } from '@tanstack/react-query';
import { get${pascal(
      queryMethod?.method.name.value ?? 'Example',
    )}QueryOptions } from '${queryMethod?.importPath}';
import type { ${pascal(
      this.service.title.value,
    )}ServiceConfig } from '${contextImportPath}';

export const Example = () => {
  // Use a different API endpoint for this specific query
  const specialConfig: ${pascal(this.service.title.value)}ServiceConfig = {
    root: 'https://staging-api.example.com',
  };
  
  const { data } = useQuery(
    get${pascal(queryMethod?.method.name.value ?? 'Example')}QueryOptions(${
      queryMethod?.params
        ? `{ ${queryMethod.params} }, specialConfig`
        : 'specialConfig'
    })
  );
  
  return <div>{/* Render your data */}</div>;
};
\`\`\`

### Configuration Type

The configuration parameter has the same type as the provider props, exported as \`${pascal(
      this.service.title.value,
    )}ServiceConfig\`:

\`\`\`tsx
import type { ${pascal(
      this.service.title.value,
    )}ServiceConfig } from '${contextImportPath}';

const config: ${pascal(this.service.title.value)}ServiceConfig = {
  fetch: customFetch,
  root: '/api/v1',
  // ... other options
};
\`\`\``;
  }
}

/** Formats the source content with Prettier. */
export async function formatMarkdown(
  source: string,
  options: NamespacedTypescriptOptions | undefined,
): Promise<string> {
  try {
    let prettierOptions: Options = {
      parser: 'markdown',
    };

    const { success, config } = tryLoadConfig(
      options?.typescript?.prettierConfig,
    );
    if (success) {
      prettierOptions = { ...prettierOptions, ...config };
    }

    return format(source, prettierOptions);
  } catch (err) {
    return source;
  }
}

function tryLoadConfig(configPath: string | undefined): {
  success: boolean;
  config: any;
} {
  if (!configPath) return tryLoadConfig('.prettierrc');

  try {
    return { success: true, config: require(configPath) };
  } catch {}

  try {
    return { success: true, config: require(join(process.cwd(), configPath)) };
  } catch {}

  try {
    return {
      success: true,
      config: JSON.parse(readFileSync(configPath).toString()),
    };
  } catch {}

  try {
    return {
      success: true,
      config: JSON.parse(
        readFileSync(join(process.cwd(), configPath)).toString(),
      ),
    };
  } catch {}

  return { success: false, config: undefined };
}
