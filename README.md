# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Install dependencies:

```bash
pnpm install
pnpm codegen
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Testing

Run the test suite:

```bash
pnpm test
```

## Linting

Run the linter and automatically fix issues:

```bash
pnpm run lint --fix
```

## Typecheck

Run TypeScript type checking:

```bash
pnpm run typecheck
```

## Note to Agents — Styleguide

See the agent styleguide in the repository root: [AGENTS.md](AGENTS.md).

The file contains guidance on Vue usage, imports, TypeScript, formatting, DB repository patterns, and other project conventions.

## Codegen

- Generate GraphQL types and helper code used by the app (GraphQL schema -> TypeScript types/helpers):

```bash
pnpm run codegen
```

See `codegen/` for configuration and generated artifacts.

## Migrations

The server performs automatic migrations on startup via `server/plugins/auto-migrate.ts`. Do not run migration scripts manually — the auto-migrate plugin handles applying migrations.

Tests prepare databases with migrations using `tests/helpers/pgliteTestDb.ts`.

Database-related `package.json` scripts (for manual ops only):

- **`pnpm run db:generate` — runs `drizzle-kit generate` to scaffold DB artifacts.**
- `pnpm run db:migrate` — runs `drizzle-kit migrate` to apply migrations manually.
- `pnpm run db:push` — runs `drizzle-kit push` to sync schema to the database.
- `pnpm run db:studio` — runs `drizzle-kit studio` for an interactive DB explorer.

**Warning:** Prefer the automatic migration flows. Manually running or reordering migrations can cause schema conflicts or runtime issues.


