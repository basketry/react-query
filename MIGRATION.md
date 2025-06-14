# Migration Guide: v0.1.x to v0.2.0

This guide helps you migrate from the wrapper hooks pattern (v0.1.x) to the queryOptions export pattern (v0.2.0).

## Overview of Changes

### Before (v0.1.x) - Wrapper Hooks

```typescript
import { useWidgets, useCreateWidget } from './api/hooks/widgets';

function MyComponent() {
  const { data } = useWidgets({ status: 'active' });
  const createMutation = useCreateWidget();
}
```

### After (v0.2.0) - Query/Mutation Options

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  widgetsQueryOptions,
  createWidgetMutationOptions,
} from './api/hooks/widgets';

function MyComponent() {
  const { data } = useQuery(widgetsQueryOptions({ status: 'active' }));
  const createMutation = useMutation(createWidgetMutationOptions());
}
```

## Step-by-Step Migration

### 1. Update imports

Replace hook imports with React Query hooks and options imports:

```diff
- import { useWidgets, useCreateWidget } from './api/hooks/widgets';
+ import { useQuery, useMutation } from '@tanstack/react-query';
+ import { widgetsQueryOptions, createWidgetMutationOptions } from './api/hooks/widgets';
```

### 2. Update query usage

Replace wrapper hooks with React Query hooks + options:

```diff
- const { data, error, isLoading } = useWidgets({ status: 'active' });
+ const { data, error, isLoading } = useQuery(widgetsQueryOptions({ status: 'active' }));
```

### 3. Update mutations

Replace mutation hooks with useMutation + options:

```diff
- const createMutation = useCreateWidget();
+ const createMutation = useMutation(createWidgetMutationOptions());
```

### 4. Update infinite queries

For paginated endpoints:

```diff
- import { useInfiniteWidgets } from './api/hooks/widgets';
- const infiniteQuery = useInfiniteWidgets();
+ import { useInfiniteQuery } from '@tanstack/react-query';
+ import { widgetsInfiniteQueryOptions } from './api/hooks/widgets';
+ const infiniteQuery = useInfiniteQuery(widgetsInfiniteQueryOptions());
```

### 5. Custom query options

The new pattern makes it easier to override options:

```typescript
// Before - Limited customization
const { data } = useWidgets(
  { status: 'active' },
  {
    staleTime: 5 * 60 * 1000,
  },
);

// After - Full control
const { data } = useQuery({
  ...widgetsQueryOptions({ status: 'active' }),
  staleTime: 5 * 60 * 1000,
  // Add any React Query option
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
});
```

## Benefits of the New Pattern

1. **Better Tree-Shaking**: Import only what you use
2. **More Flexibility**: Full access to all React Query options
3. **Type Safety**: Better TypeScript inference
4. **Standardization**: Follows React Query team recommendations
5. **Composability**: Easier to create custom hooks on top

## Query Key Changes

The query key structure has been improved for better cache management:

```typescript
// Before
['widgets', { status: 'active' }][
  // After
  ('widget', 'getWidgets', { status: 'active' })
];
```

This enables more precise cache invalidation:

```typescript
// Invalidate all widget queries
queryClient.invalidateQueries({ queryKey: ['widget'] });

// Invalidate specific method
queryClient.invalidateQueries({ queryKey: ['widget', 'getWidgets'] });
```

## Service Access Pattern

The context now provides non-hook getters for use in queryOptions:

```typescript
// The service getter is used internally by queryOptions
import { getWidgetService } from './api/hooks/context';

// You can also use it directly if needed
const widgetService = getWidgetService();
```

## Troubleshooting

### Error: "Service not initialized"

Make sure your app is wrapped with the ServiceProvider:

```tsx
<ServiceProvider widgetService={widgetService}>
  <App />
</ServiceProvider>
```

### TypeScript errors

Ensure you're using React Query v5 or later, as the queryOptions pattern requires v5+.

## Need Help?

- Check the [README](./README.md) for complete examples
- File an issue on [GitHub](https://github.com/basketry/react-query/issues)
