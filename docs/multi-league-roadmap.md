# Multi-League Roadmap

This doc plans the platform's transition from a Premier-League-only fantasy app into a year-round, multi-league, tournament-capable platform. It is the source of truth for that work — sibling to [`server-architecture.md`](./server-architecture.md).

## Why

Premier League runs Aug–May. June–July is dead inventory. The platform needs real-football competitions running in those months, plus mid-week inventory during PL season, plus event-driven tournament moments. Locked-in product decisions (2026-05-01):

1. We are on a paid API-Football tier — quota is not a blocker.
2. Player pricing needs an explicit model — it's currently undefined and gates everything else.
3. Competitions are strictly one-league — no cross-league fantasy teams.
4. Real-football leagues take priority over synthetic off-season formats. Off-season formats become a _secondary_ engagement layer, not a gap filler.

## Calendar coverage

| Window                   | Source                   | API-Football `league` id | Rationale                                      |
| ------------------------ | ------------------------ | ------------------------ | ---------------------------------------------- |
| Aug–May (weekend)        | Premier League           | `39`                     | Existing                                       |
| Sep–May (midweek)        | UEFA Champions Lge       | `2`                      | Adds inventory without disrupting PL habit     |
| Feb–Dec                  | MLS                      | `253`                    | **Counter-seasonal flagship** — covers Jun/Jul |
| Jun–Jul (every other yr) | World Cup / Euros / Copa | `1` / `4` / `9`          | Spike events, big marketing moment             |
| Jan–Feb                  | AFCON                    | `6`                      | Bonus inventory; PL is still on                |

PL ↔ MLS overlap (Feb–May) is a feature: users can enter both in separate competitions.

---

## Execution order (locked)

| #   | Phase                              | Goal                                                                                                 | Est.                     |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | **Phase 2a — Pricing model**       | Add `PlayerSeasonPrice` + admin CSV import                                                           | 1 wk                     |
| 2   | **Phase 2b — Multi-league schema** | `League`, `LeagueSeason`, scope existing tables                                                      | 1 wk                     |
| 3   | **Phase 2c — Code refactor**       | Remove `LEAGUE_ID/SEASON` constants, per-league round strategy, mapper centralization, cached client | 1 wk                     |
| 4   | **Phase 2d — MLS onboarding**      | Admin flow + first league import                                                                     | 1 wk                     |
| 5   | **Phase 2e — UCL onboarding**      | Second league, mostly admin                                                                          | 3 days                   |
| 6   | **Phase 3 — World Cup 2026**       | Tournament-shaped competition for Jun 2026                                                           | 2–4 wks, starts Feb 2026 |
| 7   | **Phase 1 (deferred)**             | Retro comps, pre-season draft                                                                        | 1–2 wks, opportunistic   |

Total to MLS live: **~4–5 weeks**. World Cup is a separate sprint timed for ~3 months before kickoff.

---

## Phase 2a — Player pricing model (gating)

> **Status (2026-05-01): shipped.** `PlayerSeasonPrice` table created via raw SQL (the project's `db push` flow blocks on a pre-existing migration drift, so the table was applied with `prisma db execute`). Backfill script seeded PL 2025 from the legacy hash. Frontend reads via `usePrices()` SWR hook. Server validates client-supplied prices in `FantasyTeamService.saveSquad` and `makeTransfer`. CSV upload guarded by `ADMIN_SECRET`.

Player prices are a fantasy concept; API-Football doesn't carry them. Without a canonical price store, every fantasy team mutation is broken for any new league.

### Schema

```prisma
model PlayerSeasonPrice {
    id             String   @id @default(uuid())
    playerId       String   @map("player_id")
    leagueSeasonId String   @map("league_season_id")
    basePrice      Float    @map("base_price")           // season-start price, immutable
    currentPrice   Float    @map("current_price")        // mutable, updated by admin or rule
    priceSource    String   @default("MANUAL") @map("price_source")  // "MANUAL" | "DERIVED"
    updatedAt      DateTime @updatedAt @map("updated_at")

    player       Player        @relation(fields: [playerId], references: [id])
    leagueSeason LeagueSeason  @relation(fields: [leagueSeasonId], references: [id])

    @@unique([playerId, leagueSeasonId])
    @@index([leagueSeasonId])
    @@map("player_season_prices")
}
```

### Two strategies, configurable per `League`

- **`MANUAL`** — admin uploads a CSV at season start. Schema: `external_id, base_price`. The default for **MLS launch** because it's predictable and matches FPL's effective behavior.
- **`DERIVED`** — formula over API-Football `/players?league=N&season=Y` rating + position, clamped to `[4.0, 14.0]`. Reserved as a v2 — too easy to ship a buggy formula and break the meta.

### Code changes

- New: `src/server/pricing/{repository,service,controller}/` following the standard pattern.
- New: admin route `POST /api/admin/leagues/:leagueId/prices` — CSV upload, validates every `external_id` exists, writes `PlayerSeasonPrice` rows.
- Existing `FantasyTeamPlayer.purchasePrice` keeps its current meaning ("price the user paid when they bought the player") — that's the snapshot. The list price is the new `PlayerSeasonPrice.currentPrice`.
- `BUDGET_TOTAL` from [src/entities/players](../src/entities/players) becomes per-league config (PL = £100m, MLS = TBD).

### Validation

- A team's `FantasyTeamPlayer.player.leagueId` must equal the team's `competition.leagueSeasonId.leagueId`. Enforced in service layer (the schema-level `unique` doesn't help).
- Squad price sum ≤ `League.budgetTotal` is already enforced; just needs to read from `PlayerSeasonPrice.currentPrice` instead of nothing.

---

## Phase 2b — Multi-league schema

### New models

```prisma
model League {
    id              String   @id @default(uuid())
    externalId      Int      @unique @map("external_id")     // API-Football league id
    name            String
    country         String
    logo            String?
    type            String                                    // "League" | "Cup" | "Tournament"
    seasonStartMonth Int     @map("season_start_month")       // 8 = PL, 2 = MLS
    budgetTotal     Float    @default(100) @map("budget_total")
    pricingStrategy String   @default("MANUAL") @map("pricing_strategy")  // "MANUAL" | "DERIVED"
    isActive        Boolean  @default(true) @map("is_active")

    seasons      LeagueSeason[]
    teams        Team[]
    @@map("leagues")
}

model LeagueSeason {
    id        String   @id @default(uuid())
    leagueId  String   @map("league_id")
    year      Int                                              // API-Football "season" param
    startDate DateTime @map("start_date")
    endDate   DateTime @map("end_date")
    isCurrent Boolean  @default(false) @map("is_current")

    league         League                @relation(fields: [leagueId], references: [id])
    competitions   Competition[]
    gameweeks      Gameweek[]
    playerStats    PlayerGameweekStats[]
    playerPrices   PlayerSeasonPrice[]

    @@unique([leagueId, year])
    @@index([leagueId])
    @@map("league_seasons")
}
```

### Existing tables get scoped

| Table                 | New column                | Notes                                                                                                                             |
| --------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Team`                | `leagueId` (FK, not null) | Remove `Team.externalId @unique` — same player can exist across leagues across seasons; scope uniqueness `(externalId, leagueId)` |
| `Player`              | `leagueId` (FK, not null) | Same caveat                                                                                                                       |
| `Gameweek`            | `leagueSeasonId` (FK)     | Drop the global `number @unique`; scope to `(leagueSeasonId, number)`                                                             |
| `Competition`         | `leagueSeasonId` (FK)     | Add `type` enum: `LEAGUE_SEASON \| TOURNAMENT \| RETRO \| DRAFT`                                                                  |
| `PlayerGameweekStats` | `leagueSeasonId` (FK)     | Or derive via `gameweek.leagueSeasonId` — pick one denormalization                                                                |

### Migration plan

1. Migration creates `League`, `LeagueSeason`, `PlayerSeasonPrice` (empty).
2. Backfill script:
    - Seed `League(id=PL, externalId=39, …)` and `LeagueSeason(leagueId=PL, year=2025, …)`.
    - `UPDATE teams SET league_id = <PL>;`, same for `players`.
    - `UPDATE gameweeks SET league_season_id = <PL-2025>;`, same for `competitions`, `player_gameweek_stats`.
3. Migration drops old global uniques and adds scoped uniques.
4. Delete [src/shared/config/league.ts](../src/shared/config/league.ts) — every reader resolves leagueId/season from a `Competition` or admin selection instead.

---

## Phase 2c — Code refactor

### Touch list

| File                                                                                                                  | Change                                                                               |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [src/shared/config/league.ts](../src/shared/config/league.ts)                                                         | Delete                                                                               |
| [src/server/gameweek/service/gameweek.service.ts](../src/server/gameweek/service/gameweek.service.ts)                 | `syncFromApi(season, leagueId)` already takes them — wire to `LeagueSeason`          |
| [src/server/scoring/service/scoring.service.ts](../src/server/scoring/service/scoring.service.ts)                     | Same — service signature stays, callers (cron) resolve from `LeagueSeason.isCurrent` |
| [src/server/scoring/lib/match-data-fetcher.ts](../src/server/scoring/lib/match-data-fetcher.ts)                       | Take `leagueId, season` as args; no global constants                                 |
| [src/server/teams/repository/team.repository.ts](../src/server/teams/repository/team.repository.ts)                   | Take `leagueId, season` as args on every call                                        |
| [src/server/ai/service/ai-transfer.service.ts](../src/server/ai/service/ai-transfer.service.ts)                       | Resolve from team's `leagueId`                                                       |
| [src/app/api/fixtures/upcoming/route.ts](../src/app/api/fixtures/upcoming/route.ts)                                   | Take `?leagueSeasonId=` from query                                                   |
| [src/server/orchestrator/service/orchestrator.service.ts](../src/server/orchestrator/service/orchestrator.service.ts) | Iterate over all `LeagueSeason` where `isCurrent = true`                             |

### Per-league round strategy

API-Football `/fixtures/rounds` returns strings like:

- PL: `"Regular Season - 1"` … `"Regular Season - 38"`
- MLS regular season: `"Regular Season - 1"` … `"Regular Season - 34"`
- MLS playoffs: `"Wild Card"`, `"Conference Semifinals - 1"`, `"Conference Finals"`, `"MLS Cup"`
- World Cup: `"Group Stage - 1"`, `"Round of 16"`, `"Quarter-finals"`, `"Semi-finals"`, `"Final"`

Replace [`parseRoundNumber`](../src/server/gameweek/service/gameweek.service.ts) (currently `/\d+$/`) with a strategy table:

```ts
// src/server/gameweek/lib/round-strategies.ts
type RoundStrategy = (apiRound: string) => { number: number; label: string } | null

export const roundStrategies: Record<string, RoundStrategy> = {
    REGULAR_SEASON: (r) => (/Regular Season - (\d+)/.exec(r)?.[1] ? { number: +RegExp.$1, label: r } : null),
    MLS_PLAYOFFS: (r) =>
        MLS_BRACKET_ORDER.indexOf(r) >= 0 ? { number: 35 + MLS_BRACKET_ORDER.indexOf(r), label: r } : null,
    TOURNAMENT: (r) =>
        TOURNAMENT_ORDER.indexOf(r) >= 0 ? { number: TOURNAMENT_ORDER.indexOf(r) + 1, label: r } : null,
}
```

`League` carries a `roundStrategies: string[]` (in priority order); the importer tries each.

### API-Football mapper centralization

Create `src/shared/api/api-football-mappers.ts`:

```ts
export const POSITION_MAP = {
    Goalkeeper: 'GK',
    Defender:   'DEF',
    Midfielder: 'MID',
    Attacker:   'FWD',
} as const

export function mapPosition(api: string): PlayerPosition | null { … }
export function mapFixtureStatus(api: string): 'SCHEDULED' | 'LIVE' | 'FINISHED' { … }
```

Every direct ad-hoc string mapping in services moves here. Required because each new league surfaces edge cases (e.g. MLS uses the same labels but tournaments add `"Group Stage"` round-types).

### Cached API-Football client

Add `src/shared/api/cached-api-football.ts` wrapping `apiFootballClient`:

| Cache key                             | TTL                                         | Storage            |
| ------------------------------------- | ------------------------------------------- | ------------------ |
| `/teams?league=N&season=Y`            | 24h                                         | Prisma row store   |
| `/players/squads?team=T`              | 24h                                         | Prisma row store   |
| `/players?league=N&season=Y&page=P`   | 24h                                         | Prisma row store   |
| `/fixtures/rounds?league=N&season=Y`  | 12h                                         | Prisma row store   |
| `/fixtures?league=N&season=Y&round=R` | 6h normally, 30s when round is current      | Prisma + in-memory |
| `/fixtures/players?fixture=F`         | 30s during fixture, 24h after final whistle | Prisma + in-memory |
| `/standings?league=N&season=Y`        | 6h                                          | Prisma row store   |

In-memory cache is per cold start — Vercel functions can't share. The Prisma backing store is the cross-instance source of truth.

---

## Phase 2d — MLS onboarding flow

Admin runs through this in `/admin/leagues/onboard`:

1. **Pick league** — `GET /leagues?country=USA&type=League` → admin selects MLS (id 253).
2. **Pick season** — response includes `seasons[]` with start/end dates; admin picks `current = true`.
3. **Import teams** — `GET /teams?league=253&season=2026` → 30 teams. Insert into `Team` with `leagueId=MLS`.
4. **Import squads** — for each team `GET /players/squads?team=T` → upsert into `Player` with `leagueId=MLS`.
5. **Import player metadata** — `GET /players?league=253&season=2026&page=P` until empty (~30 pages × 20 players). Used for ratings, photos, ages. Backgrounded — runs as a job, not blocking.
6. **Upload prices CSV** — admin uploads `prices.csv` (`external_id, base_price`). Service writes `PlayerSeasonPrice`.
7. **Import rounds** — `GET /fixtures/rounds?league=253&season=2026` → create `Gameweek` rows scoped to `LeagueSeason`. Pick round strategy.
8. **Import fixtures** — `GET /fixtures?league=253&season=2026` (paginated by date if needed) → store fixture records.
9. **Activate** — flip `LeagueSeason.isCurrent = true`. Cron picks it up automatically next run.

Make every step **idempotent and resumable** — if step 5 fails halfway through 30 pages, re-running picks up from the next missing page.

### API-Football quota math (paid tier, 7,500/day)

| Phase                          | Requests                                                                |
| ------------------------------ | ----------------------------------------------------------------------- |
| One-time MLS onboard           | 1 + 1 + 30 + 30 + 1 + 1 = **~63**                                       |
| Daily ongoing (PL + MLS + UCL) | ~3 fixtures × 10 player-stat calls × 3 leagues = **~90/day** worst case |
| Live scoring during a matchday | 10 fixtures × 1 every 30s × 90 mins = ~1,800 over the match window      |

Plenty of headroom. The cached wrapper makes the steady-state cost dominated by live fixtures, not catalogue refreshes.

---

## Phase 2e — UCL onboarding

Mostly identical to MLS but:

- `League.type = 'Cup'` (UEFA continues to be modeled as `League` in the API but it's bracket-style).
- Round strategy: tournament-shaped from group stage on.
- **Players reuse domestic squads** — a player imported as `Player(externalId=X, leagueId=PL)` already exists. UCL gets its own `Player` row with `leagueId=UCL` so prices and stats don't collide. Yes, it's denormalized; yes, it's worth it for one-league-per-competition simplicity.
- Fixtures need timezone handling (`/fixtures` accepts `&timezone=`) more than PL did because matches span European zones.

≈ 3 days once Phase 2d is shipped.

---

## Phase 3 — World Cup 2026

Same plumbing as Phase 2; differences:

- `League.type = 'Tournament'`, `League.externalId = 1`.
- 32 national teams import via `/teams?league=1&season=2026` — these are different `Team` rows from club teams.
- Squads import is **manual-triggered** ~1 month before kickoff (FIFA squad announcements are late) — admin clicks "refresh squads" on every group team.
- Round strategy: `["Group Stage - 1", …, "Group Stage - 3", "Round of 16", "Quarter-finals", "Semi-finals", "Final"]`.
- Pricing: `MANUAL` only. Admin sets prices once squads are confirmed.
- Competition shape: special UI for group standings + bracket. Out of scope for the multi-league plumbing — handled in a Phase 3-specific UI sprint.

Start ~Feb 2026 to ship by mid-May for marketing runup.

---

## Phase 1 (deferred) — Off-season formats

Demoted from gap filler to _additional_ engagement layer. Ship when bandwidth allows; in priority order:

1. **Retro competitions** — "best XI of last GW17," scored against existing `PlayerGameweekStats`. New `Competition.type = 'RETRO'`. ~3 days.
2. **Pre-season draft** — snake draft over confirmed-for-next-season squads (`/transfers` + `/players/squads`). New `Competition.type = 'DRAFT'`. ~1 week.

Skip prediction markets and quizzes for now — more product than engineering.

---

## Open questions blocking start

None gating Phase 2a. Phase 2d ("activate MLS") needs:

1. **MLS budget** — what's the per-team cap in MLS currency? Default to keeping `£100m` budget for visual continuity, with prices set on the same scale as PL? Confirm with product.
2. **Round-strategy tests** — write tests for MLS playoff strings _before_ importing real fixtures. The strategy table is the most likely place to silently miscount gameweeks.
3. **Admin auth** — the new `/api/admin/*` routes need a role check. Currently the `User` model has no `role` field. Either add one or guard with the cron-secret pattern (acceptable for early admin tooling).

---

## Verification checklist (per phase)

**Phase 2a**: CSV upload route accepts a valid file; rejects rows with unknown `external_id`; `currentPrice` updates idempotently; PL prices visible in the existing UI without code changes.

**Phase 2b**: Schema migration applies cleanly to a copy of prod; backfill script leaves PL data untouched; old `LEAGUE_ID` constant deleted, `npx tsc --noEmit` clean.

**Phase 2c**: `grep -rn "LEAGUE_ID\|SEASON =" src/` returns nothing. Round strategy unit tests cover PL regular, MLS regular, MLS playoffs, World Cup group + bracket.

**Phase 2d**: Admin onboards MLS end-to-end without hand-editing the DB. Importing the same league twice is a no-op. Daily cron run produces zero errors with PL + MLS active.

**Phase 2e**: UCL competition can be created; users can build a UCL fantasy team; PL fantasy team is unaffected by UCL changes.

**Phase 3**: World Cup competition created from `/admin/leagues/onboard?id=1&season=2026`; fixture imports succeed for all three group rounds plus knockout; bracket UI displays correctly.
