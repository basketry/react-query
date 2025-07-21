[![main](https://github.com/basketry/react-query/workflows/build/badge.svg?branch=main&event=push)](https://github.com/basketry/react-query/actions?query=workflow%3Abuild+branch%3Amain+event%3Apush)
[![main](https://img.shields.io/npm/v/@basketry/react-query)](https://www.npmjs.com/package/@basketry/react-query)

# React Query

[Basketry generator](https://basketry.io) for generating React Query queryOptions and hooks. This generator can be coupled with any Basketry parser.

## Quick Start

### Installation

```bash
npm install @basketry/react-query
```

### Getting Started

1. **Create a Basketry configuration file** (`basketry.config.json`):
    ```json
    {
      "source": "openapi.json",
      "parser": "@basketry/openapi-3",
      "generators": ["@basketry/react-query"],
      "output": "./src/generated/react-query",
      "options": {
        "basketry": {
          "command": "npx basketry"
        },
        "typescript": {
          "includeVersion": false
        },
        "reactQuery": {
          "typesModule": "@your-api/types",      // Path to generated TypeScript types
          "clientModule": "@your-api/http-client-sdk" // Path to generated HTTP client
        }
      }
    }
    ```

2. **Run Basketry** to generate the React Query hooks:
   ```bash
   npx basketry
   ```

3. **Set up your React Query provider** in your app:
   ```typescript
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   // Name of provider will depend on the name of the API service in your OpenAPI spec.
   import { BasketryExampleProvider } from './src/generated/context';

   const queryClient = new QueryClient();
   const httpClient = fetch; // or your custom fetch implementation

   function App() {
     return (
       <QueryClientProvider client={queryClient}>
         <BasketryExampleProvider httpClient={httpClient}>
           {/* Your app components */}
         </BasketryExampleProvider>
       </QueryClientProvider>
     );
   }
   ```

4. **Use the generated hooks** in your components:
   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { getWidgetsQueryOptions } from './src/generated';

   function WidgetList() {
     const { data, isLoading } = useQuery(getWidgetsQueryOptions());
     
     if (isLoading) return <div>Loading...</div>;
     return <div>{data?.map(widget => <div key={widget.id}>{widget.name}</div>)}</div>;
   }
   ```

### Basic Usage

This generator produces React Query compatible code with queryOptions functions that provide maximum flexibility:

```typescript
// Using query options with React Query hooks
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { getWidgetsQueryOptions } from './petstore'; // generated code

function WidgetList() {
  // Basic usage
  const { data } = useQuery(getWidgetsQueryOptions());
  
  // With parameters
  const { data: filtered } = useQuery(
    getWidgetsQueryOptions({ status: 'active' })
  );
  
  // With custom options
  const { data: cached } = useQuery({
    ...getWidgetsQueryOptions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  return <div>{/* render widgets */}</div>;
}
```

### Mutations

```typescript
import { useMutation } from '@tanstack/react-query';
import { createWidgetMutationOptions } from './petstore'; // generated code

function CreateWidget() {
  const mutation = useMutation(createWidgetMutationOptions());
  
  const handleSubmit = (data: CreateWidgetInput) => {
    mutation.mutate(data, {
      onSuccess: (widget) => {
        console.log('Created widget:', widget);
      },
    });
  };
  
  return <form>{/* form fields */}</form>;
}
```

### Infinite Queries (Pagination)

For services with Relay-style pagination:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { getWidgetsInfiniteQueryOptions } from './petstore'; // generated code

function InfiniteWidgetList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(getWidgetsInfiniteQueryOptions());
  
  return (
    <div>
      {data?.pages.map(page => 
        page.edges.map(({ node }) => (
          <Widget key={node.id} data={node} />
        ))
      )}
      <button onClick={() => fetchNextPage()} disabled={!hasNextPage}>
        Load More
      </button>
    </div>
  );
}
```

## Configuration

Add to your `basketry.config.json`:

```json
```

## Features

- **React Query Compatible**: Generates queryOptions and mutationOptions functions
- **Type-Safe**: Full TypeScript support with proper type inference
- **Flexible**: Use with any React Query hook (useQuery, useSuspenseQuery, etc.)
- **SSR Ready**: Service getters work outside React components
- **Backward Compatible**: Legacy hooks are deprecated but still available
- **Relay Pagination**: Built-in support for cursor-based pagination
- **Error Handling**: Automatic error aggregation with CompositeError

---

## For contributors:

### Run this project

1.  Install packages: `npm ci`
1.  Build the code: `npm run build`
1.  Run it! `npm start`

Note that the `lint` script is run prior to `build`. Auto-fixable linting or formatting errors may be fixed by running `npm run fix`.

### Create and run tests

1.  Add tests by creating files with the `.test.ts` suffix
1.  Run the tests: `npm test`
1.  Test coverage can be viewed at `/coverage/lcov-report/index.html`

### Publish a new package version

1. Create new version
   1. Navigate to the [version workflow](https://github.com/basketry/react-query/actions/workflows/version.yml) from the Actions tab.
   1. Manually dispatch the action with the appropriate inputs
   1. This will create a PR with the new version
1. Publish to NPM
   1. Review and merge the PR
   1. The [publish workflow](https://github.com/basketry/react-query/actions/workflows/publish.yml) will create a git tag and publish the package on NPM

---

Generated with [generator-ts-console](https://www.npmjs.com/package/generator-ts-console)
