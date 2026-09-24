# Repository Guidelines

## Project Structure & Module Organization

This Next.js App Router project keeps pages and server actions in `src/app/`, including the protected `admin`, `aluno`, `responsavel`, and `menor` areas. Feature-specific code lives in `src/features/`; reusable components are in `src/components/`, with primitives under `src/components/ui/`. Appwrite clients and IDs live in `src/lib/appwrite/`, infrastructure scripts in `scripts/appwrite/`, and Functions in `appwrite/functions/`. Static assets are in `public/`; implementation plans and operational documentation are in `plan/` and `docs/`.

## Build, Test, and Development Commands

- `npm run dev` — start the local development server.
- `npm run build` — produce the optimized Next.js build.
- `npm run lint` — run ESLint across the repository.
- `npm run typecheck` — validate TypeScript without emitting files.
- `npm test` — run the Vitest suite once.
- `npm run infra:plan` / `npm run infra:apply` — preview or apply additive Appwrite resources.
- `npm run infra:smoke` — test database and private-storage access.
- `npm run appwrite:seed-test-users` — create or reset development accounts.
- `npm run appwrite:validate-test-users` — verify each account against its protected route.

Copy `.env.example` to `.env.local` before server or infrastructure work. Never commit API keys, session secrets, private VAPID keys, Drive tokens, or backup keys.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, double quotes, and the existing ESLint rules. Prefer the `@/` alias for `src/` imports. Name React components in PascalCase and hooks with a `use-` prefix. Keep privileged Appwrite access in server-only modules and authorize by capability, not URL alone.

## Testing Guidelines

Place Vitest tests beside implementations with `.test.ts` or `.test.tsx`. Cover changed domain behavior, authorization boundaries, and visible interactions. Run tests, lint, typecheck, and build before handoff.

## Commit & Pull Request Guidelines

Use concise conventional subjects such as `feat:`, `fix:`, `test:`, `docs:`, or `refactor:`. Keep commits scoped and independently reviewable. Pull requests should explain user impact, implementation decisions, validation commands, migrations, environment changes, and include UI evidence when relevant.

## Infrastructure & Security

Declare schema changes in `scripts/appwrite/schema.ts` before applying them. Keep permissions deny-by-default and `.env.local` private. Never log credentials, tokens, or personal data.
