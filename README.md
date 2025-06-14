[![main](https://github.com/basketry/react-query/workflows/build/badge.svg?branch=main&event=push)](https://github.com/basketry/react-query/actions?query=workflow%3Abuild+branch%3Amain+event%3Apush)
[![main](https://img.shields.io/npm/v/@basketry/react-query)](https://www.npmjs.com/package/@basketry/react-query)

# React Query

[Basketry generator](https://github.com/basketry/basketry) for generating [React Query](https://tanstack.com/query) (TanStack Query) hooks and query/mutation options. This generator can be coupled with any Basketry parser to automatically generate type-safe React Query integration from your API definitions.

## Features

- Generates type-safe query and mutation options following React Query v5 patterns
- Automatic cache invalidation for mutations
- Support for infinite queries with Relay-style pagination
- React Context integration for dependency injection
- Full TypeScript support with proper type inference

## Quick Start

### Installation

```bash
npm install --save-dev @basketry/react-query
```

### Basic Usage

Add the generator to your `basketry.config.json`:

```json
{
  "source": "path/to/your/api.json",
  "parser": "@basketry/swagger-2",
  "generators": ["@basketry/react-query"],
  "output": "src/api"
}
```

### Generated Code Structure

The generator creates the following structure:

```
src/api/
  hooks/
    runtime.ts         # Shared utilities
    context.tsx        # React Context for services
    widgets.ts         # Query/mutation options for Widget service
    gizmos.ts          # Query/mutation options for Gizmo service
```

### Using the Generated Code

#### 1. Set up the service context:

```tsx
import { ServiceProvider } from './api/hooks/context';
import { WidgetService, GizmoService } from './api/services';

const widgetService = new WidgetService();
const gizmoService = new GizmoService();

function App() {
  return (
    <ServiceProvider widgetService={widgetService} gizmoService={gizmoService}>
      {/* Your app components */}
    </ServiceProvider>
  );
}
```

#### 2. Use query options with React Query hooks:

```tsx
import { useQuery } from '@tanstack/react-query';
import { widgetsQueryOptions } from './api/hooks/widgets';

function WidgetList() {
  const { data, error, isLoading } = useQuery(widgetsQueryOptions());

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map((widget) => (
        <li key={widget.id}>{widget.name}</li>
      ))}
    </ul>
  );
}
```

#### 3. Use mutation options:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWidgetMutationOptions } from './api/hooks/widgets';

function CreateWidget() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    ...createWidgetMutationOptions(),
    onSuccess: () => {
      // Automatically invalidates related queries
      queryClient.invalidateQueries({ queryKey: ['widget'] });
    },
  });

  return (
    <button onClick={() => mutation.mutate({ name: 'New Widget' })}>
      Create Widget
    </button>
  );
}
```

#### 4. Use infinite queries for paginated data:

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { widgetsInfiniteQueryOptions } from './api/hooks/widgets';

function InfiniteWidgetList() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
    widgetsInfiniteQueryOptions(),
  );

  return (
    <>
      {data?.pages.map((page) =>
        page.edges.map((widget) => <div key={widget.id}>{widget.name}</div>),
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </>
  );
}
```

## Configuration Options

The generator accepts the following options in your `basketry.config.json`:

```json
{
  "generators": [
    {
      "rule": "@basketry/react-query",
      "options": {
        "reactQuery": {
          "typesModule": "../types",
          "clientModule": "../http-client",
          "typeImports": true,
          "includeVersion": true,
          "eslintDisable": ["no-unused-vars"],
          "prettierConfig": ".prettierrc.json"
        }
      }
    }
  ]
}
```

## Query Key Structure

The generator creates consistent query keys following this pattern:

```typescript
[serviceName, methodName, params || {}] as const;
```

This structure enables:

- Hierarchical cache invalidation (e.g., invalidate all widget queries)
- Precise cache updates for specific queries
- Better debugging with readable query keys

## Migration from v0.1.x

If you're upgrading from v0.1.x (wrapper hooks pattern) to v0.2.0 (queryOptions pattern), see the [Migration Guide](./MIGRATION.md)

---

## For contributors:

### Run this project

1.  Install packages: `npm ci`
1.  Build the code: `npm run build`
1.  Run it! `npm start`

Note that the `lint` script is run prior to `build`. Auto-fixable linting or formatting errors may be fixed by running `npm run fix`.

### Create and run tests

1.  Add tests by creating files with the `.test.ts` suffix
1.  Run the tests: `npm t`
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
