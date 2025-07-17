# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-alpha.1] - 2025-07-17

### Added

- Backwards compatibility layer with deprecated hook wrappers
  - All existing `useXxx()` hooks continue to work but are marked as deprecated
  - Hooks include migration instructions in JSDoc comments
  - Mutation hooks maintain automatic query invalidation behavior

### Changed

- Re-added deprecated hooks alongside new queryOptions exports for smoother migration path

## [0.2.0-alpha.0] - 2025-07-17

### Changed

- **BREAKING**: Migrated from wrapper hooks to queryOptions/mutationOptions export pattern
  - Changed from `useWidgets()` to `getWidgetsQueryOptions()`
  - Changed from `useCreateWidget()` to `createWidgetMutationOptions()`
  - Changed from `useInfiniteWidgets()` to `getWidgetsInfiniteQueryOptions()`
- **BREAKING**: Updated query key structure for better cache management
  - From: `['/widgets', compact({ status: params?.status })].filter(Boolean)`
  - To: `['widget', 'getWidgets', params || {}] as const`
- Added non-hook service getters in context for use in queryOptions

### Added

- Type-safe `matchQueryKey` function for building query keys with IntelliSense support
  - Supports partial query matching at service, operation, or full parameter levels
  - Provides compile-time type safety and autocomplete for all query operations
  - Enables flexible cache invalidation patterns
- Test coverage for infinite query options generation
- Support for direct composition with React Query hooks
- Better TypeScript inference with queryOptions pattern

### Removed

- Wrapper hook functions (use queryOptions with React Query hooks directly)
- Complex query key filtering logic

## [0.1.x] - Previous versions

Initial implementation with wrapper hooks pattern.
