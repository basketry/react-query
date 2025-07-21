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

### Deprecated

- Legacy hook exports (`use{MethodName}`, `useSuspense{MethodName}`, etc.) are now deprecated
  - These hooks will be removed in a future major version
  - Users should migrate to the new query options pattern with React Query's built-in hooks
