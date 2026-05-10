# Server Architecture

This document is the source of truth for how server-side code is organized in this project. Read it before adding a new entity, route, or controller. It supersedes ad-hoc patterns in older code.

## 1. Layering rules

Three layers, top-down:

```
Route (src/app/api/**/route.ts)
  └─> Controller (src/server/<entity>/controller/*.controller.ts)
        └─> Service (src/server/<entity>/service/*.service.ts)
              └─> Repository (src/server/<entity>/repository/*.repository.ts)
                    └─> Prisma (src/shared/lib/prisma.ts)
```

| Layer          | May import                                                                   | Must NOT import                                      |
| -------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Route**      | `@/shared/lib/container`, `next/server` types                                | repositories, services, prisma, concrete controllers |
| **Controller** | service interface, schemas, `@/shared/lib/http`, `@/shared/lib/auth-helpers` | repositories, prisma                                 |
| **Service**    | repository interfaces, other service interfaces, `@/shared/lib/http`         | prisma, `@prisma/client`, `next/server`              |
| **Repository** | `@/shared/lib/prisma`, generated prisma types                                | `next/server`, services, controllers                 |

Boundaries are enforced by `eslint-plugin-boundaries`. If you find yourself fighting it, you're probably skipping a layer.

## 2. File layout

```
src/server/<entity>/
├── controller/
│   └── <entity>.controller.ts
├── service/
│   ├── <entity>.service.ts             # implementation
│   └── <entity>.service.interface.ts   # IEntityService
├── repository/
│   ├── <entity>.repository.ts             # implementation
│   └── <entity>.repository.interface.ts   # IEntityRepository
└── lib/                                # entity-only helpers, optional
```

Naming:

- Repository impl: `*.repository.ts` exporting `EntityRepository`
- Repository interface: `*.repository.interface.ts` exporting `IEntityRepository`
- Service impl: `*.service.ts` exporting `EntityService`
- Service interface: `*.service.interface.ts` exporting `IEntityService`
- Controller: `*.controller.ts` exporting `EntityController`
- Schemas: co-located in the controller file or `<entity>.schema.ts` if shared

The `I` prefix is reserved for DI interfaces. Do not use it on plain types or models.

## 3. Composition root

The **only** file that instantiates concrete classes is:

```
src/shared/lib/container.ts
```

It builds the whole DI graph once, at module-load time, and exports a `container` object containing every controller (and any service that's used directly, e.g. orchestrator from cron).

```ts
const userRepository = new UserRepository()
const userService = new UserService(userRepository)
const userController = new UserController(userService)

export const container = {
    userController,
    /* …other controllers… */
} as const
```

Shared dependencies (e.g. `walletRepository` used by both `WalletController` and `PaymentService`) are instantiated **once** and reused. Do not create duplicate repositories.

## 4. Route file template

Every route file is a thin delegator. No DI, no business logic.

```ts
import { container } from '@/shared/lib/container'

import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    return container.fantasyTeamController.getById(req, ctx)
}

export async function POST(req: NextRequest) {
    return container.fantasyTeamController.create(req)
}
```

Routes that need `runtime = 'nodejs'` or `dynamic = 'force-dynamic'` may declare those at the top, but nothing else.

## 5. Auth

Every protected handler calls `requireUserId(req)` from `@/shared/lib/auth-helpers`. It returns either the user id or a `NextResponse` with a 401. The pattern:

```ts
import { requireUserId, isAuthError } from '@/shared/lib/auth-helpers'

async getWallet(req: NextRequest) {
    const userId = await requireUserId(req)
    if (isAuthError(userId)) return userId

    // userId is now a string
    return this.walletService.getWallet(userId)
}
```

Do **not** call `auth.api.getSession` directly anywhere except inside `auth-helpers.ts` and the Better Auth catch-all route (`src/app/api/auth/[...all]/route.ts`).

For ownership checks (e.g. user A trying to mutate user B's resource), throw `Errors.forbidden()` from `@/shared/lib/http`.

## 6. Errors

All controller methods are wrapped in `withController` from `@/shared/lib/http`. The wrapper catches:

| Thrown        | Status         | Notes                                   |
| ------------- | -------------- | --------------------------------------- |
| `AppError`    | `e.statusCode` | Use `Errors.*` factories                |
| `ZodError`    | 400            | From schema parsing outside `parseJson` |
| `SyntaxError` | 400            | Bad JSON body                           |
| anything else | 500            | Logged via `console.error`              |

Status code conventions:

- `400` — malformed input (bad JSON, invalid query/body shape)
- `401` — no/invalid session
- `403` — authenticated but not allowed (ownership, role)
- `404` — resource doesn't exist
- `409` — write conflict (unique constraint, optimistic lock)
- `422` — semantically invalid (e.g. webhook amount mismatch)
- `500` — unexpected server failure

Never return 400 for an internal failure. Never swallow errors silently.

> Future TODO: replace `console.error` in `withController` with a structured logger once one is added.

## 6.5. Pricing

Player list prices live in `PlayerSeasonPrice` (table `player_season_prices`), keyed by `(playerId, seasonYear)`. Read via `GET /api/pricing/{seasonYear}` — returns `{ externalId, currentPrice }[]`. The frontend SWR hook `usePrices()` from `@/entities/players` caches the response for 5 minutes.

Admin upload: `POST /api/admin/pricing/{seasonYear}` with `Authorization: Bearer ${ADMIN_SECRET}` and a CSV body (`external_id,base_price` headers). Idempotent — the same CSV uploaded twice is a no-op. Unknown `external_id`s reject the entire upload.

Server-side: any client-supplied price (e.g. on `saveSquad`, `makeTransfer`) is validated against `PlayerSeasonPrice.currentPrice` for the active season. Drift > 0.01 → `Errors.unprocessable('Price mismatch — refresh and retry')`. Never trust prices that came in on the request.

Phase 2a interim: `PlayerSeasonPrice.seasonYear` is an `Int`. Phase 2b replaces it with `leagueSeasonId` (FK) so prices become league-scoped.

## 7. Validation

Zod schemas live next to the controller (top of file, or in `<entity>.schema.ts` if reused). Body parsing always goes through `parseJson`:

```ts
const schema = z.object({ amount: z.number().int().positive() })

async spend(req: NextRequest) {
    const userId = await requireUserId(req)
    if (isAuthError(userId)) return userId

    const { amount } = await parseJson(req, schema)

    return this.walletService.spend(userId, amount)
}
```

Query string parsing uses `parseQuery(req, schema)`. Both throw `AppError(400)` on failure, which `withController` translates to a 400 response automatically.

## 8. Webhooks

External webhook handlers map errors to status codes deliberately so the gateway retries the right things:

| Failure                                          | Status | Why                                   |
| ------------------------------------------------ | ------ | ------------------------------------- |
| Auth header / signature invalid                  | 401    | Signal the caller to fix its keys     |
| Body unparseable / required field missing        | 400    | Don't retry — payload is broken       |
| Business mismatch (amount, currency, unknown id) | 422    | Don't retry — gateway sent wrong data |
| DB / downstream failure                          | 500    | **Do** retry — transient              |

Encode this by throwing `Errors.unauthorized()`, `Errors.badRequest()`, `Errors.unprocessable()`, or letting the original error bubble (→ 500). See `PaymentService.handleWebhook` for the canonical example.

## 9. Adding a new entity (checklist)

1. Create `src/server/<entity>/{controller,service,repository}/` folders.
2. Write `IEntityRepository` interface + `EntityRepository` impl (Prisma calls only).
3. Write `IEntityService` interface + `EntityService` impl (constructor takes the repo interface).
4. Write `EntityController` (constructor takes the service interface).
5. Register everything in `src/shared/lib/container.ts`.
6. Add the route file(s) under `src/app/api/<entity>/` — three-line delegators only.
7. Add Zod schemas at the top of the controller (or in `<entity>.schema.ts`).
8. Wrap every controller method with `withController`.
9. Add `requireUserId` to every handler that needs auth.
10. If the entity has non-obvious behavior (state machines, external integrations, ownership rules), add a section to this doc.

## 10. Anti-patterns (what was fixed and must not regress)

- **Inline DI in route files** — every `route.ts` must only import `container`. No `new XRepository()` / `new XService()` / `new XController()` outside `container.ts`.
- **Inline `auth.api.getSession`** — only `auth-helpers.ts` calls it.
- **Raw `try/catch` in controllers** — `withController` owns the envelope.
- **`req.json() + safeParse`** by hand — use `parseJson`.
- **`return NextResponse.json({ error: 'Failed to X' }, { status: 400 })`** for internal failures — that's a 500, throw and let the wrapper handle it.
- **`console.log`** anywhere in server code — use `console.warn` or `console.error`.
- **Repositories called from controllers** — always go through the service.
- **Services importing `@prisma/client` or `prisma`** — only repositories touch Prisma.
- **Multiple instances of the same repository** — instantiate once in `container.ts`.

If you see any of these in code, fix them in the same PR you're already touching. The goal is for new code to look identical regardless of who wrote it.
