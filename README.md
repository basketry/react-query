[![main](https://github.com/basketry/react-query/workflows/build/badge.svg?branch=main&event=push)](https://github.com/basketry/react-query/actions?query=workflow%3Abuild+branch%3Amain+event%3Apush)
[![main](https://img.shields.io/npm/v/@basketry/react-query)](https://www.npmjs.com/package/@basketry/react-query)

# React Query

[Basketry generator](https://basketry.io) for generating [React Query](https://tanstack.com/query) (TanStack Query) hooks and query/mutation options. This generator can be coupled with any Basketry parser to automatically generate type-safe React Query integration from your API definitions.

## Features

- Generates type-safe query and mutation options following React Query v5 patterns
- Type-safe query key builder for cache operations with IntelliSense support
- Support for infinite queries with Relay-style pagination
- Full TypeScript support with proper type inference
- Backwards compatibility with deprecated hook wrappers for smooth migration

## Migration Guide (v0.1.x to v0.2.x)

Starting with v0.2.0, this generator adopts the React Query v5 queryOptions pattern. The old hook wrappers are deprecated but still available for backwards compatibility.

### Query Hooks

```typescript
// Old pattern (deprecated)
import { useGetWidgets } from './hooks/widgets';
const result = useGetWidgets(params);

// New pattern
import { useQuery } from '@tanstack/react-query';
import { getWidgetsQueryOptions } from './hooks/widgets';
const result = useQuery(getWidgetsQueryOptions(params));
```

### Mutation Hooks

```typescript
// Old pattern (deprecated)
import { useCreateWidget } from './hooks/widgets';
const mutation = useCreateWidget();

// New pattern
import { useMutation } from '@tanstack/react-query';
import { createWidgetMutationOptions } from './hooks/widgets';
const mutation = useMutation(createWidgetMutationOptions());
```

### Infinite Query Hooks

```typescript
// Old pattern (deprecated)
import { useGetWidgetsInfinite } from './hooks/widgets';
const result = useGetWidgetsInfinite(params);

// New pattern
import { useInfiniteQuery } from '@tanstack/react-query';
import { getWidgetsInfiniteQueryOptions } from './hooks/widgets';
const result = useInfiniteQuery(getWidgetsInfiniteQueryOptions(params));
```

### Query Key Builder

The new version includes a type-safe query key builder for cache operations:

```typescript
import { matchQueryKey } from './hooks/query-key-builder';

// Invalidate all queries for a service
queryClient.invalidateQueries({ queryKey: matchQueryKey('widgets') });

// Invalidate specific operation
queryClient.invalidateQueries({
  queryKey: matchQueryKey('widgets', 'getWidgets'),
});

// Invalidate with specific parameters
queryClient.invalidateQueries({
  queryKey: matchQueryKey('widgets', 'getWidgets', { status: 'active' }),
});
```

### Benefits of the New Pattern

- Better tree-shaking - only import what you use
- More flexible - compose with any React Query hook
- Better TypeScript inference
- Easier testing - options can be tested without React context
- Consistent with React Query v5 best practices

### Automated Migration

We provide a jscodeshift codemod to automatically migrate your codebase:

```bash
# Preview changes (dry run)
./node_modules/@basketry/react-query/codemod/run-migration.sh

# Apply changes
./node_modules/@basketry/react-query/codemod/run-migration.sh --apply
```

See [codemod documentation](./codemod/README.md) for more details.

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
