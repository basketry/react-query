# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **New query/mutation/infinite options exports** for React Query v5 compatibility
  - `{methodName}QueryOptions` functions that return `queryOptions` for use with `useQuery`/`useSuspenseQuery`
  - `{methodName}MutationOptions` functions that return `mutationOptions` for use with `useMutation`
  - `{methodName}InfiniteQueryOptions` functions that return `infiniteQueryOptions` for use with `useInfiniteQuery`/`useSuspenseInfiniteQuery`
  - These exports enable better tree-shaking and composability
  - Full TypeScript support with proper generic types
- **Service getter functions** for non-React contexts
  - `get{ServiceName}Service()` functions that return service instances without React hooks
  - Enables use of API clients outside React components (e.g., in server-side code, scripts, tests)
- **Query key builder utility** (`query-key-builder.ts`) for type-safe cache operations
  - `matchQueryKey()` function for building type-safe query keys
  - `QueryKeyMap`, `ServiceKeys`, `OperationKeys`, and `OperationParams` types for full type safety
  - Enables precise cache invalidation and query matching

### Changed

- **Query key structure completely redesigned** for simplicity and consistency
  - Changed from complex URL-based patterns (e.g., `` `/widgets/${id}` ``) to simple arrays: `['serviceName', 'methodName', params || {}, metadata?]`
  - Infinite queries now differentiated by metadata (`{infinite: true}`) instead of key structure
  - All queries for an interface can now be invalidated with just `['interfaceName']`
  - Removed `buildResourceKey()`, `isCacheParam()`, and complex path parsing logic
- **Mutations now invalidate at the interface level** instead of specific resource paths
  - Simplified from invalidating multiple specific query keys to just `queryClient.invalidateQueries({ queryKey: ['interfaceName'] })`
  - More predictable cache invalidation behavior
- **Refactored naming system** from class-based to function-based
  - Replaced `NameFactory` class with standalone functions in `name-helpers.ts`
  - Functions: `buildHookName()`, `buildQueryOptionsName()`, `buildMutationOptionsName()`, `buildInfiniteQueryOptionsName()`, `buildServiceName()`, `buildServiceHookName()`, `buildServiceGetterName()`, `buildContextName()`, `buildProviderName()`
  - `buildHookName()` now requires `service` parameter for proper context
- **Context file enhanced** with new capabilities
  - Added `currentContext` variable for non-hook access to context
  - Service getter functions exported alongside hooks for flexibility
  - Interfaces sorted alphabetically for consistent output
  - Props interface now extends options type with optional fetch
- **Error handling improved** with `QueryError` type
  - Changed from `CompositeError` throws to structured `QueryError<Error[]>` type
  - Enables better error discrimination in error handlers

### Fixed

- **TypeScript compilation errors** in generated code
  - Fixed `isRequired()` parameter access in `query-key-builder.ts` (accessing `p.value` instead of `p`)
  - Removed unused `includeRelayParams` parameter that was being passed but ignored
  - Fixed duplicate imports and missing function exports
- **Test and snapshot generation issues**
  - Updated test utilities to use `@basketry/ir` parser instead of inline JSON parsing
  - Fixed snapshot file generation that was silently failing
  - Cleaned up debug `console.log` statements from test utilities

### Deprecated

- **All wrapped hook exports** are now marked as `@deprecated`
  - `use{MethodName}()` - query hooks
  - `useSuspense{MethodName}()` - suspense query hooks
  - `useInfinite{MethodName}()` - infinite query hooks
  - `useSuspenseInfinite{MethodName}()` - suspense infinite query hooks
  - Hooks remain functional for backward compatibility but display deprecation warnings
  - Each deprecation notice includes migration guidance to the new pattern
  - Will be removed in the next major version (v1.0.0)

### Internal

- Added `xxxx()` method in `hook-file.ts` that needs renaming (analyzes return types for select function generation)
- Removed complex relay parameter handling from query key generation
- Simplified infinite query differentiation using metadata instead of key manipulation
