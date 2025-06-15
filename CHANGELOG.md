# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-06-14

### Changed

- **BREAKING**: Migrated from wrapper hooks to queryOptions/mutationOptions export pattern
  - Changed from `useWidgets()` to `widgetsQueryOptions()`
  - Changed from `useCreateWidget()` to `createWidgetMutationOptions()`
  - Changed from `useInfiniteWidgets()` to `widgetsInfiniteQueryOptions()`
- **BREAKING**: Updated query key structure for better cache management
  - From: `['/widgets', compact({ status: params?.status })].filter(Boolean)`
  - To: `['widget', 'getWidgets', params || {}] as const`
- Added non-hook service getters in context for use in queryOptions
- Simplified runtime utilities by removing complex filtering logic

### Added

- Type-safe `matchQueryKey` function for building query keys with IntelliSense support
  - Supports partial query matching at service, operation, or full parameter levels
  - Provides compile-time type safety and autocomplete for all query operations
  - Enables flexible cache invalidation patterns
- Comprehensive migration guide (MIGRATION.md)
- Support for direct composition with React Query hooks
- Better TypeScript inference with queryOptions pattern

### Removed

- Wrapper hook functions (use queryOptions with React Query hooks directly)
- Complex query key filtering logic

## [0.1.x] - Previous versions

Initial implementation with wrapper hooks pattern.
