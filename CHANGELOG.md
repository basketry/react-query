# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - TBD

### Changed

- **BREAKING**: Migrated from wrapper hooks to queryOptions/mutationOptions export pattern
  - Changed from `useWidgets()` to `getWidgetsQueryOptions()`
  - Changed from `useCreateWidget()` to `createWidgetMutationOptions()`
  - Changed from `useInfiniteWidgets()` to `getWidgetsInfiniteQueryOptions()`
- **BREAKING**: Updated query key structure for better cache management
  - From: `['/widgets', compact({ status: params?.status })].filter(Boolean)`
  - To: `['widget', 'getWidgets', params || {}] as const`
- **BREAKING**: Context and provider names are now service-specific instead of generic
  - Changed from `ClientContext`/`ClientProvider` to service-specific names (e.g., `WidgetServiceContext`/`WidgetServiceProvider`)
  - Error messages now reference the correct service-specific provider names
- Query and mutation options now preserve full method names (e.g., `getWidgetsQueryOptions` instead of `widgetsQueryOptions`)
- Infinite query options maintain full method names (e.g., `getWidgetsInfiniteQueryOptions` instead of `widgetsInfiniteQueryOptions`)
- Added non-hook service getters in context for use in queryOptions
- Simplified runtime utilities by removing complex filtering logic

### Added

- Type-safe `matchQueryKey` function for building query keys with IntelliSense support
  - Supports partial query matching at service, operation, or full parameter levels
  - Provides compile-time type safety and autocomplete for all query operations
  - Enables flexible cache invalidation patterns
- Test coverage for infinite query options generation
- Support for direct composition with React Query hooks
- Better TypeScript inference with queryOptions pattern

### Fixed

- Context hooks now correctly reference the service-specific context instead of generic `ClientContext`
- Provider error messages now show the correct service-specific provider name

### Removed

- Wrapper hook functions (use queryOptions with React Query hooks directly)
- Complex query key filtering logic
- Logic that stripped 'get' prefix from method names

## [0.1.x] - Previous versions

Initial implementation with wrapper hooks pattern.