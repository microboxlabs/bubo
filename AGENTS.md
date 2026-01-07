# AGENTS.md

## Conventions

- Use pnpm for everything. Do not use npm or yarn under any circumstances
- TypeScript is mandatory
- Use ESM modules and modern Node.js syntax
- Explicit imports only, never use barrel exports
- Node.js 20+ is required

## Project Setup

- Configure TypeScript in strict mode from the start
- Do not add dependencies until they are actually needed
- All new code must be ESM (`"type": "module"` in package.json)

## Organization

- Keep modules small with a single responsibility
- Prefer composition over complex configurations
- Avoid premature abstractions
- Shared code should live in clearly named folders:
  - `cli/` - Command-line interface and commands
  - `core/` - Core business logic and orchestration
  - `types/` - TypeScript type definitions
  - `utils/` - Shared utilities and helpers

## TypeScript Rules

- Avoid `any` and `unknown` types
- Prefer type inference whenever possible
- If types are unclear, stop and clarify before continuing
- All strict compiler options are enabled - respect them
- Use Zod for runtime validation of external data

## Error Handling

- Use explicit error types, not generic Error
- Provide meaningful error messages with context
- Handle GitHub API errors gracefully with proper user feedback
- Log errors with appropriate severity levels

## Testing and Quality

- Review CI workflows in `.github/workflows/ci.yml`
- Run tests with:
  ```bash
  pnpm test
  ```
- For Vitest with specific test:
  ```bash
  pnpm vitest run -t "<test name>"
  ```
- After moving files or changing imports, run:
  ```bash
  pnpm lint
  ```
- Code with type errors, lint errors, or failing tests is not accepted
- Add or update tests when behavior changes, even if not explicitly requested

## Performance and Technical Decisions

- Do not guess performance, bundle size, or load times: measure them
- If something seems slow, add instrumentation before optimizing
- Validate changes on a small scale before applying them project-wide
- Consider the impact on GitHub API rate limits

## Commits and Pull Requests

- PR title format: `[bubo] Clear and concise description`
- Keep PRs small and focused
- Before committing:
  ```bash
  pnpm lint
  pnpm typecheck
  pnpm test
  ```
- Explain what changed, why, and how it was verified
- If introducing a new constraint ("never X", "always Y"), document it in this file

## Agent Behavior

- If a request is unclear, ask specific questions before executing
- Simple, well-defined tasks can be executed directly
- Complex changes (refactors, new features, architecture decisions) require confirming understanding before acting
- Do not assume implicit requirements. If information is missing, ask for it
- When working with GitHub APIs, verify the expected response format before implementing
