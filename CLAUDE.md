# Fantasy Football — Project Guidelines

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict, no `any`)
- **Database:** PostgreSQL with Prisma ORM (modular schema in `prisma/schema/`)
- **Auth:** Better Auth (email/password, session-based)
- **Validation:** Zod
- **Forms:** React Hook Form + `@hookform/resolvers`
- **UI:** shadcn/ui + Tailwind CSS v4 + Hugeicons
- **Architecture:** Feature-Sliced Design (FSD) with Clean Architecture for server-side

## FSD Layer Rules

Layers (top → bottom): `app → views → widgets → features → entities → shared`

Each layer may only import from layers **below** it. This is enforced by `eslint-plugin-boundaries`.

## Clean Architecture (Server-Side API)

Every entity that exposes server-side logic **must** follow the Controller → Service → Repository pattern with dependency injection via constructor parameters.

**Full guide:** [docs/server-architecture.md](./docs/server-architecture.md). Read it before adding a new entity, route, or controller — it defines the conventions for auth, errors, validation, webhooks, and the new-entity checklist.

### File Structure per Entity

Server-side entity code lives under `src/server/<entity>/`. Frontend types and schemas live under `src/entities/<entity>/`.

```
src/server/<entity>/
├── controller/
│   └── <entity>.controller.ts
├── service/
│   ├── <entity>.service.ts             # implementation (EntityService)
│   └── <entity>.service.interface.ts   # IEntityService
├── repository/
│   ├── <entity>.repository.ts             # implementation (EntityRepository)
│   └── <entity>.repository.interface.ts   # IEntityRepository
└── lib/                                # entity-only helpers, optional
```

### Layer Responsibilities

**Repository** — `<entity>.repository.ts` + `<entity>.repository.interface.ts`

- Interface defines data access methods (CRUD operations)
- Implementation uses Prisma client from `@/shared/lib/prisma`
- Never contains business logic
- Never aware of HTTP/controllers

**Service** — `<entity>.service.ts` + `<entity>.service.interface.ts`

- Interface defines business operations
- Implementation receives `IEntityRepository` via constructor injection
- Contains all business logic, validation rules, and orchestration
- Never imports Prisma or any DB-specific code
- Never aware of HTTP/controllers

**Controller** — `<entity>.controller.ts`

- Receives `IEntityService` via constructor injection
- Methods are class fields wrapped in `withController(...)` from `@/shared/lib/http`
- Auth via `requireUserId(req)` from `@/shared/lib/auth-helpers`
- Body validation via `parseJson(req, schema)`; query via `parseQuery(req, schema)`
- Throws `Errors.notFound() / forbidden() / badRequest() / unprocessable()` — never builds raw error responses
- Never imports repository or Prisma
- Never contains business logic

### Dependency Injection

All wiring happens in a single composition root:

```
src/shared/lib/container.ts
```

This is the **only file** that imports concrete implementations. It instantiates the dependency chain (each repository instantiated exactly once and shared) and exports ready-to-use controllers.

```typescript
const entityRepository = new EntityRepository()
const entityService = new EntityService(entityRepository)
const entityController = new EntityController(entityService)

export const container = {
    entityController,
} as const
```

### API Route Wiring

API routes in `src/app/api/` are one-line delegators:

```typescript
// src/app/api/<entities>/route.ts
import { container } from '@/shared/lib/container'

export const GET = container.entityController.getAll
export const POST = container.entityController.create
```

Routes do not import controllers, services, repositories, or `auth.api.getSession` — only `container`.

### Interface Naming Convention

- Repository interface: `IEntityRepository` (in `<entity>.repository.interface.ts`)
- Service interface: `IEntityService` (in `<entity>.service.interface.ts`)
- No `I` prefix for types/models — only for DI interfaces

### Rules

1. **Never skip layers.** API routes must not call services or repositories directly.
2. **Never import concrete implementations** outside of `container.ts`.
3. **Services must not import from `@prisma/client`** or any DB-specific module.
4. **Controllers must not import repositories.**
5. **Never call `auth.api.getSession` directly** — use `requireUserId` from `@/shared/lib/auth-helpers`.
6. **Each new entity** must follow this exact file structure — no exceptions.
7. **Zod validation** happens in the controller layer via `parseJson` / `parseQuery`.
8. When adding a new entity, also register it in `container.ts`.

## Code Style

- Use `import type` for type-only imports
- Follow existing `import/order` rules (builtin → external → internal by FSD layer → type)
- Blank lines between logical sections (enforced by `@stylistic/padding-line-between-statements`)
- No `console.log` — use `console.warn` or `console.error` if necessary
- Path alias: `@/*` maps to `src/*`

## Commands

- `npm run dev` — start dev server
- `npx prisma generate --schema prisma/schema` — regenerate Prisma client
- `npx prisma db push` — push schema to DB
- `npm run lint` — run ESLint
