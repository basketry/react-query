# React Query v0.2 Migration Codemod

This codemod helps automatically migrate your codebase from `@basketry/react-query` v0.1.x to v0.2.x by transforming deprecated hook patterns to the new queryOptions pattern.

## What it does

The codemod will transform:

### Query Hooks

```typescript
// Before
import { useGetWidgets } from '../hooks/widgets';
const { data } = useGetWidgets({ status: 'active' });

// After
import { useQuery } from '@tanstack/react-query';
import { getWidgetsQueryOptions } from '../hooks/widgets';
const { data } = useQuery(getWidgetsQueryOptions({ status: 'active' }));
```

### Mutation Hooks

```typescript
// Before
import { useCreateWidget } from '../hooks/widgets';
const mutation = useCreateWidget({ onSuccess: handleSuccess });

// After
import { useMutation } from '@tanstack/react-query';
import { createWidgetMutationOptions } from '../hooks/widgets';
const mutation = useMutation(
  createWidgetMutationOptions({ onSuccess: handleSuccess }),
);
```

### Infinite Query Hooks

```typescript
// Before
import { useGetWidgetsInfinite } from '../hooks/widgets';
const { data, fetchNextPage } = useGetWidgetsInfinite({ limit: 20 });

// After
import { useInfiniteQuery } from '@tanstack/react-query';
import { getWidgetsInfiniteQueryOptions } from '../hooks/widgets';
const { data, fetchNextPage } = useInfiniteQuery(
  getWidgetsInfiniteQueryOptions({ limit: 20 }),
);
```

### Suspense Hooks

```typescript
// Before
import { useSuspenseGetWidgets } from '../hooks/widgets';
const { data } = useSuspenseGetWidgets();

// After
import { useSuspenseQuery } from '@tanstack/react-query';
import { getWidgetsQueryOptions } from '../hooks/widgets';
const { data } = useSuspenseQuery(getWidgetsQueryOptions());
```

## Installation

```bash
# Install jscodeshift globally
npm install -g jscodeshift

# Or use npx (no installation needed)
npx jscodeshift ...
```

## Usage

### Basic Usage

```bash
# Dry run (preview changes without modifying files)
jscodeshift -t codemod/react-query-v0.2-migration.js src/ --extensions=ts,tsx --parser=tsx --dry

# Run the transformation
jscodeshift -t codemod/react-query-v0.2-migration.js src/ --extensions=ts,tsx --parser=tsx
```

### Specific Files or Directories

```bash
# Transform a single file
jscodeshift -t codemod/react-query-v0.2-migration.js src/components/WidgetList.tsx --parser=tsx

# Transform a specific directory
jscodeshift -t codemod/react-query-v0.2-migration.js src/features/widgets/ --extensions=ts,tsx --parser=tsx
```

### With Git

```bash
# See what would change
jscodeshift -t codemod/react-query-v0.2-migration.js src/ --extensions=ts,tsx --parser=tsx --dry

# Run and see the diff
jscodeshift -t codemod/react-query-v0.2-migration.js src/ --extensions=ts,tsx --parser=tsx
git diff

# If something went wrong, revert
git checkout -- .
```

## Features

- ✅ Transforms all deprecated hook types (query, mutation, infinite, suspense)
- ✅ Preserves TypeScript type parameters
- ✅ Updates imports correctly
- ✅ Handles multiple hooks from the same module
- ✅ Adds React Query imports only when needed
- ✅ Preserves existing React Query imports
- ✅ Maintains code formatting
- ✅ Only transforms hooks from generated `hooks/` modules

## Limitations

1. **Hooks in Dynamic Contexts**: The codemod may not handle hooks called in complex dynamic contexts (e.g., inside conditional logic or loops).

2. **Custom Wrappers**: If you've created custom wrappers around the generated hooks, those won't be automatically migrated.

3. **Import Aliases**: If you're using import aliases or renamed imports, you may need to update those manually:

   ```typescript
   // This won't be transformed automatically
   import { useGetWidgets as useWidgets } from '../hooks/widgets';
   ```

4. **Side Effects**: The old mutation hooks automatically invalidated queries on success. The new pattern requires you to handle this in your mutationOptions if needed.

## Testing the Codemod

### Run Tests

```bash
# Install dependencies
npm install

# Run the test suite
npm test codemod/__tests__/react-query-v0.2-migration.test.js
```

### Test on a Single File

```bash
# Create a test file
echo "import { useGetWidgets } from './hooks/widgets';
const Component = () => {
  const { data } = useGetWidgets();
  return <div>{data?.length}</div>;
};" > test-migration.tsx

# Run the codemod
jscodeshift -t codemod/react-query-v0.2-migration.js test-migration.tsx --parser=tsx --print
```

## Manual Review Checklist

After running the codemod, review:

1. **Build**: Run `npm run build` to ensure no TypeScript errors
2. **Tests**: Run your test suite to ensure functionality is preserved
3. **Mutations**: Check that mutation success handlers still invalidate queries if needed
4. **Imports**: Verify all imports are correct and no duplicates exist
5. **Runtime**: Test your application to ensure everything works as expected

## Troubleshooting

### "Cannot find module" errors

Make sure you're running the codemod from your project root where `node_modules` is located.

### Parser errors

Ensure you're using the `--parser=tsx` flag for TypeScript files.

### Nothing is transformed

Check that your imports match the expected pattern (from `'../hooks/[service]'` modules).

### Formatting issues

The codemod tries to preserve formatting, but you may want to run your formatter after:

```bash
npm run prettier -- --write src/
# or
npm run eslint -- --fix src/
```

## Need Help?

If you encounter issues:

1. Check the [migration guide](../README.md#migration-guide-v01x-to-v02x) in the main README
2. Look at the generated hooks to understand the new pattern
3. Open an issue with a code sample that isn't working correctly
