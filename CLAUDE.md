# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in `lib/` directory
- **Clean**: `npm run clean` - Removes build artifacts and coverage reports
- **Start**: `npm start` - Runs the compiled JavaScript entry point

### Testing

- **Run all tests**: `npm test` - Runs Jest test suite with coverage
- **Run specific test**: `npm test <filename>` - Example: `npm test hook-generator.test.ts`
- **Test configuration**: Uses ts-jest preset, coverage enabled by default

### Code Quality

- **Lint**: `npm run lint` - Runs ESLint and Prettier checks
- **Fix linting issues**: `npm run fix` - Auto-fixes ESLint and Prettier issues
- **Create snapshot**: `npm run create-snapshot` - Generates test snapshots

## Architecture Overview

This is a Basketry generator plugin that creates React Query hooks from service definitions. The architecture follows a modular pattern:

### Core Components

1. **Generator Entry Point** (`src/index.ts`, `src/hook-generator.ts`):

   - Main generator that produces React Query hook files
   - Generates three types of files: runtime utilities, context providers, and service-specific hooks

2. **File Builders**:

   - **HookFile** (`src/hook-file.ts`): Generates React Query hooks for each service interface
   - **ContextFile** (`src/context-file.ts`): Creates React Context providers for dependency injection
   - **RuntimeFile** (`src/runtime-file.ts`): Provides runtime utilities for pagination and error handling

3. **Support Modules**:
   - **ModuleBuilder** (`src/module-builder.ts`): Base class for file generation with import management
   - **ImportBuilder** (`src/import-builder.ts`): Manages TypeScript imports and prevents duplicates
   - **NameFactory** (`src/name-factory.ts`): Generates consistent naming for hooks and functions

### Key Design Patterns

- **Service-Interface Pattern**: Each service interface gets its own hook file with query and mutation hooks
- **Context-Based DI**: Uses React Context for injecting HTTP client and configuration
- **Type Safety**: Integrates with @basketry/typescript for type generation
- **Relay-Style Pagination**: Built-in support for cursor-based pagination patterns

### Dependencies

- **basketry**: Core framework for service definition parsing
- **@basketry/typescript**: TypeScript code generation utilities
- **@tanstack/react-query**: React Query library for data fetching
- **pluralize** & **case**: String manipulation for consistent naming
