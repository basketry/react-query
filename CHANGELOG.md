# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New query options exports for better React Query v5 compatibility
  - `{methodName}QueryOptions` functions for regular queries
  - `{methodName}MutationOptions` functions for mutations
  - `{methodName}InfiniteQueryOptions` functions for infinite queries
- Service getter functions (`get{ServiceName}Service`) for use in non-React contexts
- Query key builder utility for type-safe cache invalidation and queries

### Changed

- Generated hooks now use simplified `@deprecated` JSDoc tags instead of custom deprecation blocks
- Query keys now use a simpler static structure based on interface and method names
  - Changed from URL-based resource keys to pattern: `['interface', 'method', params || {}]`
  - Interface names in query keys now use camelCase for consistency with JavaScript conventions
  - Removed complex URL path parsing logic for cleaner, more predictable keys
- Refactored internal code generation to use helper functions instead of NameFactory class

### Fixed

- Parameter names with special characters (e.g., hyphens) are now properly handled in query keys
  - All parameter access now uses bracket notation for consistency
  - Object keys in query key generation are properly quoted
- Fixed duplicate function declarations for methods not starting with "get"
  - Suspense hooks now correctly generate with `useSuspense` prefix for all method types
  - Prevents TypeScript errors from duplicate function names
- Fixed invalid TypeScript syntax in query keys where optional parameter syntax (`params?`) was incorrectly used in runtime expressions
- Fixed infinite query key typo (`inifinite` → `infinite`)
- Build configuration now properly excludes snapshot directory from TypeScript compilation
- Added README.md to .prettierignore to prevent formatter hanging

### Deprecated

- Legacy hook exports (`use{MethodName}`, `useSuspense{MethodName}`, etc.) are now deprecated
  - These hooks will be removed in a future major version
  - Users should migrate to the new query options pattern with React Query's built-in hooks
