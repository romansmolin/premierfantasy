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

### File Structure per Entity

```
src/entities/<entity-name>/
├── model/
│   ├── <entity>.types.ts        # Shared TypeScript interfaces
│   └── <entity>.schema.ts       # Zod validation schemas (if needed)
├── server/
│   ├── <entity>.repository.ts       # Interface (IEntityRepository)
│   ├── <entity>.repository.impl.ts  # Prisma implementation
│   ├── <entity>.service.ts          # Interface (IEntityService)
│   ├── <entity>.service.impl.ts     # Business logic implementation
│   └── <entity>.controller.ts       # HTTP handler (uses NextRequest/NextResponse)
├── ui/                              # Client-side UI components (if any)
└── index.ts                         # Public API exports
```

### Layer Responsibilities

**Repository (`*.repository.ts` + `*.repository.impl.ts`)**

- Interface defines data access methods (CRUD operations)
- Implementation uses Prisma client from `@/shared/lib/prisma`
- Never contains business logic
- Never aware of HTTP/controllers

**Service (`*.service.ts` + `*.service.impl.ts`)**

- Interface defines business operations
- Implementation receives `IEntityRepository` via constructor injection
- Contains all business logic, validation rules, and orchestration
- Never imports Prisma or any DB-specific code
- Never aware of HTTP/controllers

**Controller (`*.controller.ts`)**

- Receives `IEntityService` via constructor injection
- Handles HTTP concerns: parsing request body, returning `NextResponse`, status codes
- Validates input using Zod schemas before passing to service
- Never imports repository or Prisma
- Never contains business logic

### Dependency Injection

All wiring happens in a single composition root:

```
src/shared/lib/container.ts
```

This is the **only file** that imports concrete implementations (`*.impl.ts`). It instantiates the dependency chain and exports ready-to-use controllers.

```typescript
// Example pattern:
const entityRepository = new EntityRepository()
const entityService = new EntityService(entityRepository)
const entityController = new EntityController(entityService)

export const container = {
    entityController,
} as const
```

### API Route Wiring

API routes in `src/app/api/` are thin — they delegate entirely to controllers from the container:

```typescript
// src/app/api/<entities>/route.ts
import { container } from '@/shared/lib/container'

export async function GET() {
    return container.entityController.getAll()
}
```

### Interface Naming Convention

- Repository interfaces: `IEntityRepository` (exported from `<entity>.repository.ts`)
- Service interfaces: `IEntityService` (exported from `<entity>.service.ts`)
- No `I` prefix for types/models — only for DI interfaces

### Rules

1. **Never skip layers.** API routes must not call services or repositories directly.
2. **Never import concrete implementations** outside of `container.ts`.
3. **Services must not import from `@prisma/client`** or any DB-specific module.
4. **Controllers must not import repositories.**
5. **Each new entity** must follow this exact file structure — no exceptions.
6. **Zod validation** happens in the controller layer before data reaches the service.
7. When adding a new entity, also register it in `container.ts`.

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
