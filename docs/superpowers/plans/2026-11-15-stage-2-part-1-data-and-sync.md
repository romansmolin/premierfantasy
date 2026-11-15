# Stage 2, Part 1 — Data and Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill our database with Premier League fixtures, per-match player statistics (API-Football), FPL prices, FPL squad rules and FPL actual points, keep it fresh with scheduled GitHub Actions jobs, and make player matching between the two sources reviewable.

**Architecture:** Plain Node sync jobs (run by `scripts/sync.ts`, also by GitHub Actions) built from the project's usual Service → Repository classes, wired in a second composition root (`src/server/sync/sync.container.ts`) that never imports Next-only code. Every job writes through idempotent upserts, refuses suspicious responses (empty, short, or API-level errors) before writing anything, and records a `SyncRun` row. FPL code is isolated in `src/server/fpl/` so it can be switched off.

**Tech Stack:** TypeScript, Prisma 7 (PostgreSQL), Vitest, `tsx` (run scripts), GitHub Actions, Next.js 16 (admin API and page only).

**Spec:** `docs/superpowers/specs/2026-11-15-stage-2-epl-analytics-design.md` (sections «Источники данных», «Синхронизация», «Найдено в коде», «Риски»). This is part 1 of 5; parts 2–5 (forecast model, public pages, builder, auto-build) get their own plans and read what this part stores.

## Global Constraints

- League: Premier League only, API-Football `league = 39`; seasons `2026` (current, 2026/27) and `2025` (previous). `src/shared/config/league.ts` already holds `LEAGUE_ID = 39`, `SEASON = 2026`.
- API-Football is the only source of match statistics. FPL is used **only** for: prices, squad rules (`game_settings`, `element_types`), events/deadlines, fixture→event links, and actual points of finished events (accuracy check). Never read FPL statistics, xG or `ep_next`.
- All FPL code lives under `src/server/fpl/` (adapter switch: no other module imports FPL types or URLs).
- Known account facts (checked 2026-11-15 with the free `/status` call): API-Football plan Pro, 7500 requests/day, 300/minute, subscription end date `2026-11-24`. Response headers: `x-ratelimit-requests-remaining` (daily), `x-ratelimit-remaining` (per minute).
- Keep at least `API_DAILY_RESERVE = 1500` daily requests unused for the website itself; sync jobs stop (status `PARTIAL`) when the remaining daily quota would fall below it.
- First backfill is about 800 requests (2 seasons × ~380 fixtures); steady state ~10–20 per day.
- GitHub repository secrets already exist: `STORAGE_DATABASE_URL`, `FOOTBAL_API_KEY`, `FOOTBAL_API_BASE_URL` (the `FOOTBAL_` spelling is the one in the code). FPL needs no secret.
- Prices from FPL are stored in millions (`now_cost / 10`) in `PlayerSeasonPrice` with `priceSource = 'FPL'`. Consumers treat prices with `updatedAt` older than 3 days as missing (parts 4–5), so a successful price sync must touch `updatedAt` of every mapped player each run.
- Sanity thresholds before any FPL write: ≥ 400 elements, exactly 20 teams, ≥ 30 events, `game_settings` present. API-Football fixtures response: non-empty, and not fewer than 50 % of the fixtures already stored for that season.
- Follow `CLAUDE.md` and `docs/server-architecture.md`: Controller → Service → Repository, `import type`, no `any`, no `console.log` (`console.warn`/`console.error` only), blank-line style enforced by lint, path alias `@/*`.
- Exception to «`container.ts` is the only composition root» (documented in Task 11): `src/server/sync/sync.container.ts` wires job services for scripts. It must not import controllers, `next/*`, `server-only`, or `@/shared/lib/http`.
- Never run any command that writes against the configured `STORAGE_DATABASE_URL` (remote, likely production). Local verification uses a throwaway Postgres in Docker with `STORAGE_DATABASE_URL` overridden on the command line.
- Work on a new branch from `main` (`stage-2-part-1`), not on `stage-2-design`'s docs-only branch if it was already merged.

## Review Focus

1. **API answers 200 with an `errors` payload or an empty `response`** (daily quota exhausted, bad parameter). Expected: nothing is written, the job ends `FAILED`/`PARTIAL`, and existing data stays. Tests: Task 1 (`ApiFootballError`), Task 4 (empty fixtures list), Task 5 (empty match stats keep `statsSyncedAt = null`).
2. **Same job run twice or two runs overlapping.** Expected: no duplicate rows, no double counting. Tests: Task 4 and 5 (second run inserts 0), Task 8 (second price sync inserts 0); Task 11 (`concurrency` group in the workflows).
3. **Double and blank gameweeks, postponed matches.** Expected: two fixtures of one team in one FPL event both stored and linked; a postponed fixture with no FPL event stays `fplEvent = null` and is not an error. Test: Task 8.
4. **Unknown or departed players in match data.** Expected: players of clubs we do not have are skipped and counted, newcomers of known clubs are created, nothing crashes. Test: Task 5.
5. **FPL down, changed shape, or returning a partial list.** Expected: job fails loudly, last known prices/rules stay, the fake non-FPL prices are **not** deleted unless the FPL price write succeeded. Tests: Task 6 (sanity guard), Task 8 (delete only after success).
6. **Ambiguous names (two «Gabriel» at one club) and manual overrides.** Expected: ambiguous players are never auto-mapped; a `MANUAL` or `REJECTED` mapping is never overwritten by the next sync. Tests: Task 7, Task 8.

---

### Task 1: Script-safe API-Football client with error and budget handling

**Why:** `src/shared/api/api-football-client.ts` starts with `import 'server-only'` (scripts cannot import it) and ignores the `errors` field API-Football returns with HTTP 200.

**Files:**

- Create: `src/shared/api/api-football-http.ts` (no `server-only`)
- Modify: `src/shared/api/api-football-client.ts` (keep `server-only` and the exported `apiFootballClient.get<T>(endpoint, params): Promise<T>` signature; implement it on top of the new class so the website keeps working)
- Test: `src/shared/api/api-football-http.test.ts`

**Interfaces:**

- Produces:

    ```ts
    export class ApiFootballError extends Error {
        readonly details: unknown
    }
    export interface ApiFootballResult<T> {
        data: T
        dailyRemaining: number | null
    }
    export class ApiFootballHttp {
        constructor(options: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch })
        get<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiFootballResult<T>>
    }
    export function createApiFootballHttpFromEnv(): ApiFootballHttp // reads FOOTBAL_API_BASE_URL, FOOTBAL_API_KEY; throws if missing
    ```

- [ ] **Step 1: Write failing tests** (inject a fake `fetchImpl`). Names and assertions:
    - `returns response data and the daily remaining quota from headers` → header `x-ratelimit-requests-remaining: 7498` → `{ data: [..], dailyRemaining: 7498 }`.
    - `dailyRemaining is null when the header is absent`.
    - `throws ApiFootballError when errors is a non-empty object` (`{ errors: { requests: 'limit reached' }, response: [] }`) and `...non-empty array` (`errors: ['x']`); `errors: []` and `errors: {}` do **not** throw.
    - `throws on a non-2xx status` with the status in the message.
    - `sends the x-apisports-key header and encodes params in the query string`.
- [ ] **Step 2:** `npx vitest run src/shared/api/api-football-http.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement the class and the env factory; make `apiFootballClient` delegate to it (`get` returns `.data`).
- [ ] **Step 4:** `npm test` → PASS (including existing website tests); `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → empty.
- [ ] **Step 5:** Commit `feat(sync): script-safe API-Football client that rejects API-level errors`.

---

### Task 2: Database schema for fixtures, match stats, FPL data and sync runs

**Files:**

- Create: `prisma/schema/match-data.prisma` (`Fixture`, `PlayerMatchStats`), `prisma/schema/fpl.prisma` (`FplPlayerMap`, `FplEvent`, `FplGameSettings`, `FplEventPoints`), `prisma/schema/sync.prisma` (`SyncRun`)
- Modify: `prisma/schema/football-data.prisma` (`Team.fplId Int? @unique @map("fpl_id")`; back-relations on `Team`, `Player`), `prisma/schema/competition.prisma` (`LeagueSeason.fixtures Fixture[]`)
- Create: `prisma/migrations/20261116000000_add_match_data_and_fpl/migration.sql` (hand-written, never `migrate dev`)
- Do not touch: `PlayerGameweekStats` and `Gameweek` (unused leftovers; later parts decide).

**Models (names and meaning; the builder chooses index details):**

- `Fixture`: `id` uuid, `externalId` Int unique (API-Football id), `leagueSeasonId` → `LeagueSeason`, `round` String (`"Regular Season - 11"`), `roundNumber` Int?, `kickoff` DateTime, `status` String (API short code: `NS`, `FT`, `PST`…), `homeTeamId`/`awayTeamId` → `Team` (two named relations), `homeGoals`/`awayGoals` Int?, `fplFixtureId` Int? unique, `fplEvent` Int?, `statsSyncedAt` DateTime?, `statsAttempts` Int default 0, `updatedAt`. Index `(leagueSeasonId, kickoff)`, `(fplEvent)`.
- `PlayerMatchStats`: unique `(fixtureId, playerId)`; `teamId`; `position` PlayerPosition?; `isSubstitute` Boolean; `minutes` Int; `rating` Float?; `goals`, `assists`, `shotsTotal`, `shotsOn`, `passesTotal`, `passesKey`, `passAccuracy` Int?, `tackles`, `blocks`, `interceptions`, `duelsTotal`, `duelsWon`, `dribblesAttempts`, `dribblesSuccess`, `foulsDrawn`, `foulsCommitted`, `yellowCards`, `redCards`, `saves`, `goalsConceded`, `penaltyWon`, `penaltyCommitted`, `penaltyScored`, `penaltyMissed`, `penaltySaved` — all `Int @default(0)` unless stated.
- `FplPlayerMap`: `fplId` Int unique, `playerId` String unique → `Player`, `method` String (`AUTO` | `MANUAL`), `confidence` Float, `createdAt`/`updatedAt`. Rejections: separate rows in the same table are not allowed (unique `playerId`), so store rejections as `FplPlayerMapRejection { fplId unique, createdAt }`.
- `FplEvent`: `id` Int pk (FPL event number), `name`, `deadline` DateTime, `finished`, `isCurrent`, `isNext` Boolean, `updatedAt`.
- `FplGameSettings`: `seasonYear` Int pk, `squadSize`, `startingSize`, `budgetTenths`, `teamLimit` Int, `positions` Json (`[{ position: 'GK', squadSelect: 2, minPlay: 1, maxPlay: 1 }, …]` for GK/DEF/MID/FWD), `fetchedAt`.
- `FplEventPoints`: unique `(fplPlayerId, event)`, `totalPoints` Int, `minutes` Int, `updatedAt`.
- `SyncRun`: `id` cuid, `job` String, `status` String (`RUNNING` | `OK` | `PARTIAL` | `FAILED`), `startedAt`, `finishedAt` DateTime?, `stats` Json?, `error` String?. Index `(job, startedAt)`.

- [ ] **Step 1:** Write the schema and `npx prisma format --schema prisma/schema && npx prisma validate --schema prisma/schema`.
- [ ] **Step 2:** Write the migration SQL (CREATE TABLE/INDEX/FK, `ALTER TABLE "teams" ADD COLUMN "fpl_id" INTEGER` + unique index).
- [ ] **Step 3:** Verify on a throwaway Postgres (never the configured DB):
    ```bash
    docker run -d --name pf-mig -e POSTGRES_PASSWORD=x -p 55432:5432 postgres:16-alpine
    for m in $(ls prisma/migrations | grep -v toml | sort); do docker exec -i pf-mig psql -U postgres -v ON_ERROR_STOP=1 -q < prisma/migrations/$m/migration.sql; done
    STORAGE_DATABASE_URL=postgresql://postgres:x@localhost:55432/postgres npx prisma migrate diff --from-config-datasource --to-schema prisma/schema --script
    ```
    Expected: `-- This is an empty migration.`; `docker rm -f pf-mig` afterwards.
- [ ] **Step 4:** `npx prisma generate --schema prisma/schema && npx prettier --write generated/prisma` (generated files are tracked); `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → empty.
- [ ] **Step 5:** Commit `feat(db): fixtures, match stats, FPL data and sync run tables`. In the final message list both migration files for the user to apply to production after a backup (never applied by the executor).

---

### Task 3: Sync infrastructure (job runner, SyncRun, CLI skeleton, tooling)

**Files:**

- Create: `src/server/sync/lib/errors.ts`, `src/server/sync/lib/request-budget.ts`, `src/server/sync/service/job-runner.ts` (+ `job-runner.test.ts`), `src/server/sync/repository/sync-run.repository.ts` + `.interface.ts`, `src/server/sync/sync.container.ts`, `scripts/sync.ts`
- Modify: `package.json` (devDependencies `tsx`, `dotenv`, pinned to the latest installed major; script `"sync": "tsx -r dotenv/config scripts/sync.ts"`), `.env.example` (remove obsolete `CRON_SECRET` and `DEMO_*` blocks)

**Interfaces:**

- Produces:
    ```ts
    export type JobStatus = 'OK' | 'PARTIAL' | 'FAILED'
    export interface JobOutcome {
        status: 'OK' | 'PARTIAL'
        stats: Record<string, number>
    } // PARTIAL = stopped early (budget/quota), not an error
    export class SuspiciousResponseError extends Error {} // refuse to write: empty/short/changed-shape answers
    export class RequestBudget {
        constructor(max: number, reserveDailyRemaining?: number)
        /** records one call; returns false when the run must stop */ take(
            dailyRemaining: number | null,
        ): boolean
        get used(): number
    }
    export interface ISyncRunRepository {
        start(job: string): Promise<string>
        finish(id: string, status: JobStatus, stats: Record<string, number>, error?: string): Promise<void>
    }
    export async function runJob(
        name: string,
        repo: ISyncRunRepository,
        work: () => Promise<JobOutcome>,
    ): Promise<{ status: JobStatus; stats: Record<string, number>; error?: string }>
    ```
    `runJob` never throws: it records `FAILED` with the error message (never including env values) and returns it.
- `scripts/sync.ts` usage: `npm run sync -- <job|short|full> [--max-requests N]`; jobs: `fixtures`, `match-stats`, `fpl-bootstrap`, `fpl-fixtures`, `fpl-points`; `short` = `fixtures`, `match-stats`, `fpl-fixtures`, `fpl-points`; `full` = `fpl-bootstrap` followed by `short`. Exit code 1 if any job is `FAILED`; `PARTIAL` exits 0 and prints a `console.warn`. Jobs registered in later tasks; this task registers none and prints usage for unknown names.

- [ ] **Step 1: Write failing tests** `job-runner.test.ts` (fake repo): `records OK with stats`; `records PARTIAL and keeps the stats`; `records FAILED and returns the error instead of throwing`; `SuspiciousResponseError is recorded as FAILED with its message`; `RequestBudget stops at max requests`; `RequestBudget stops when dailyRemaining falls to the reserve` (reserve 1500, remaining 1500 → `take` returns false); `RequestBudget ignores a null dailyRemaining`.
- [ ] **Step 2:** `npx vitest run src/server/sync` → FAIL.
- [ ] **Step 3:** Implement. `SyncRunRepository` uses `@/shared/lib/prisma`. `sync.container.ts` exports `createSyncContainer()` returning job services (empty for now).
- [ ] **Step 4:** `npm install` (updates lockfile), `npm test`, `npm run lint`, `npx tsc …` → all clean; `npm run sync -- nope` → prints usage, exit code 2.
- [ ] **Step 5:** Commit `feat(sync): job runner, request budget and CLI skeleton`.

---

### Task 4: Fixtures sync (API-Football)

**Files:**

- Create: `src/server/match-data/repository/match-data.repository.ts` + `.interface.ts` (shared by Tasks 4–5), `src/server/match-data/service/fixture-sync.service.ts` + `.interface.ts`, `src/server/match-data/lib/round.ts`
- Test: `src/server/match-data/lib/round.test.ts`, `src/server/match-data/service/fixture-sync.service.test.ts`
- Modify: `src/server/sync/sync.container.ts`, `scripts/sync.ts` (register `fixtures`)

**Interfaces:**

- Produces:
    ```ts
    export function parseRoundNumber(round: string): number | null // "Regular Season - 11" → 11; "Relegation Play-offs" → null
    export interface IFixtureSyncService {
        syncFixtures(seasons: number[], budget: RequestBudget): Promise<JobOutcome>
    }
    ```
    Repository methods: `findLeagueSeason(leagueExternalId: number, year: number)`, `findTeamIdsByExternalIds(ids: number[]): Promise<Map<number, string>>`, `countFixtures(leagueSeasonId: string): Promise<number>`, `upsertFixtures(rows: FixtureUpsert[]): Promise<{ inserted: number; updated: number }>`. Upserts key on `externalId`, and **must not** overwrite `fplFixtureId`, `fplEvent`, `statsSyncedAt`, `statsAttempts`.
- Behaviour: one `GET /fixtures?league=39&season=Y` per season; missing `LeagueSeason` → throw an error whose message says to run `scripts/seed-leagues.ts`; an unknown team in a fixture → fail the whole season (all-or-nothing), message lists the team ids.

- [ ] **Step 1: Write failing tests:**
    - `parseRoundNumber`: `"Regular Season - 11"` → 11, `"Regular Season - 1"` → 1, `"Quarter-finals"` → `null`.
    - `throws SuspiciousResponseError and writes nothing when the response is empty`.
    - `throws SuspiciousResponseError when the response has fewer than half of the stored fixtures` (stored 380, response 100).
    - `inserts fixtures and a second identical run inserts 0 and updates 0 changes` (fake repo that counts calls).
    - `keeps FPL link fields untouched on update` (repository fake: `upsertFixtures` receives rows without `fplEvent`/`fplFixtureId`).
    - `fails the whole season when a team is unknown`.
    - `stops with PARTIAL before the second season when the budget is exhausted`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; register the job (`budget` from `--max-requests`, default 2000). **Step 4:** `npm test` PASS, tsc and lint clean. **Step 5:** Commit `feat(sync): sync Premier League fixtures into the database`.

---

### Task 5: Match statistics sync (API-Football)

**Files:**

- Create: `src/server/match-data/service/match-stats-sync.service.ts` + `.interface.ts`, `src/server/match-data/lib/match-stats.mapper.ts`
- Modify: `src/server/match-data/repository/match-data.repository.ts` + `.interface.ts`, `src/server/sync/sync.container.ts`, `scripts/sync.ts` (register `match-stats`)
- Test: `src/server/match-data/lib/match-stats.mapper.test.ts`, `src/server/match-data/service/match-stats-sync.service.test.ts`

**Interfaces:**

- Produces:
    ```ts
    export interface IMatchStatsSyncService {
        syncMatchStats(seasons: number[], budget: RequestBudget): Promise<JobOutcome>
    }
    export function mapPlayerMatchStats(entry: ApiFixturePlayers['players'][number]): PlayerMatchStatsInput // pure
    ```
    `ApiFixturePlayers` is the `/fixtures/players?fixture=ID` shape: `[{ team: { id }, players: [{ player: { id, name }, statistics: [{ games: { minutes, position, rating, substitute }, shots: { total, on }, goals: { total, conceded, assists, saves }, passes: { total, key, accuracy }, tackles: { total, blocks, interceptions }, duels: { total, won }, dribbles: { attempts, success }, fouls: { drawn, committed }, cards: { yellow, red }, penalty: { won, commited, scored, missed, saved } }] }] }]`. Note API-Football spells it `commited`; any numeric field may be `null`; `rating` and `passes.accuracy` can arrive as strings.
    Repository additions: `findFixturesNeedingStats(seasonYear: number, limit: number): Promise<FixtureRef[]>` (status in `FT`/`AET`/`PEN`, `statsSyncedAt` null, `statsAttempts < 5`, newest kickoff first), `findPlayersByExternalIds`, `findTeamIdsByExternalIds`, `createPlayers`, `saveFixtureStats(fixtureId: string, rows: PlayerMatchStatsInput[]): Promise<void>` (one transaction: upsert rows on `(fixtureId, playerId)`, set `statsSyncedAt = now`), `incrementStatsAttempts(fixtureId: string)`.
- Behaviour: seasons processed in the order given (current first: `[2026, 2025]`); one request per fixture; before each request `budget.take(...)` using the last `dailyRemaining`; empty `response` → `incrementStatsAttempts`, no `statsSyncedAt`; player of a team we do not have → skipped and counted (`skippedUnknownTeam`); player not in `Player` but team known → created (name from the API, position from `games.position` `G/D/M/F` → `GK/DEF/MID/FWD`; if missing, skip and count `skippedNoPosition`); each fixture saved atomically.

- [ ] **Step 1: Write failing tests:**
    - mapper: `maps all numeric fields and treats null as 0`; `parses rating "7.3" to 7.3 and null rating to null`; `parses passes.accuracy "85" to 85`; `reads penalty.commited into penaltyCommitted`; `an unused substitute has minutes 0`.
    - service: `saves stats and marks the fixture synced`; `an empty response increments attempts and leaves statsSyncedAt null` (Review Focus 1); `a second run requests nothing for already synced fixtures` (Review Focus 2); `creates a newcomer of a known club` and `skips a player of an unknown club and counts it` (Review Focus 4); `stops with PARTIAL when the budget is exhausted and keeps what it saved`; `processes season 2026 before 2025`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement; register the job. **Step 4:** tests, tsc, lint clean. **Step 5:** Commit `feat(sync): sync per-match player statistics`.

---

### Task 6: FPL client with sanity guard

**Files:**

- Create: `src/server/fpl/lib/fpl-client.ts`, `src/server/fpl/lib/fpl.types.ts`, `src/server/fpl/lib/sanity.ts`
- Test: `src/server/fpl/lib/sanity.test.ts`, `src/server/fpl/lib/fpl-client.test.ts`

**Interfaces:**

- Produces:

    ```ts
    export interface IFplClient {
        getBootstrap(): Promise<FplBootstrap> // https://fantasy.premierleague.com/api/bootstrap-static/
        getFixtures(): Promise<FplFixture[]> // /api/fixtures/
        getEventLive(event: number): Promise<FplEventLive> // /api/event/{n}/live/ — 404 for unknown event
    }
    export function createFplClient(fetchImpl?: typeof fetch): IFplClient // sends a browser-like User-Agent, 20 s timeout, 2 retries on 5xx/network error
    export function assertSaneBootstrap(data: FplBootstrap): void // throws SuspiciousResponseError
    ```

    `FplBootstrap` types only the fields we read: `elements[]` (`id`, `code`, `web_name`, `first_name`, `second_name`, `team`, `element_type` 1–4, `now_cost` tenths, `status`, `chance_of_playing_next_round`, `news`), `teams[]` (`id`, `code`, `name`, `short_name`), `events[]` (`id`, `name`, `deadline_time`, `finished`, `is_current`, `is_next`), `game_settings` (`squad_squadsize`, `squad_squadplay`, `squad_total_spend`, `squad_team_limit`), `element_types[]` (`id`, `squad_select`, `squad_min_play`, `squad_max_play`). `FplFixture`: `id`, `event` (nullable), `kickoff_time`, `team_h`, `team_a`, `finished`. `FplEventLive.elements[]`: `{ id, stats: { total_points, minutes } }`.

- [ ] **Step 1: Write failing tests:** `assertSaneBootstrap accepts a valid payload`; `rejects fewer than 400 elements`; `rejects a team count other than 20`; `rejects fewer than 30 events`; `rejects a missing game_settings`; client: `retries a 500 once and then succeeds`; `throws after two retries`; `returns null-safe typed data` (use a trimmed real-shape fixture). Put the trimmed fixture JSON in `src/server/fpl/lib/__fixtures__/bootstrap.sample.json` (a handful of real-shaped players, 20 teams, 38 events, real `game_settings`/`element_types` values: squad 15, play 11, spend 1000, team limit 3; positions 2/5/5/3 with min/max play 1/1, 3/5, 2/5, 1/3).
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** tests, tsc, lint clean. **Step 5:** Commit `feat(fpl): FPL client with response sanity guard`.

---

### Task 7: Team and player matching

**Files:**

- Create: `src/server/fpl/lib/team-matcher.ts`, `src/server/fpl/lib/player-matcher.ts`, `src/server/fpl/lib/normalize-name.ts`
- Test: `src/server/fpl/lib/team-matcher.test.ts`, `src/server/fpl/lib/player-matcher.test.ts`, `normalize-name.test.ts`

**Interfaces:**

- Produces:
    ```ts
    export function normalizeName(s: string): string // lowercase, strip accents/punctuation, ø→o, collapse spaces
    export interface OurTeam {
        id: string
        name: string
        shortName: string
    }
    export function matchTeams(
        fplTeams: FplTeam[],
        ours: OurTeam[],
    ): { map: Map<number, string>; unmatched: FplTeam[] } // fplId → our Team.id
    export interface OurPlayer {
        id: string
        name: string
        position: PlayerPosition
        teamId: string
    }
    export interface PlayerMatch {
        fplId: number
        playerId: string
        confidence: number
    }
    export interface PlayerCandidates {
        fplId: number
        candidates: { playerId: string; score: number }[]
    }
    export function matchPlayers(
        fpl: FplElement[],
        ours: OurPlayer[],
        teamMap: Map<number, string>,
    ): { matched: PlayerMatch[]; ambiguous: PlayerCandidates[]; unmatched: number[] } // unmatched = fplIds
    ```
- Rules the tests pin: teams match on normalized name, then on an explicit alias table (`Man City`/`Manchester City`, `Man Utd`/`Manchester United`, `Spurs`/`Tottenham`, `Nott'm Forest`/`Nottingham Forest`, `Wolves`/`Wolverhampton Wanderers`, `Newcastle`/`Newcastle United`, `Brighton`/`Brighton & Hove Albion`, `Leeds`/`Leeds United`, `West Ham`/`West Ham United`); players are only compared inside the same team and same position; exact normalized full-name match = confidence 1; unique surname + team + position = confidence 0.8; more than one equally good candidate → `ambiguous`, never `matched`; each of our players is matched at most once.

- [ ] **Step 1: Write failing tests:** `normalizeName("Ødegaard")` → `"odegaard"`, `"N'Golo Kanté"` → `"ngolo kante"`; teams: all alias pairs above match, an unknown club is returned in `unmatched`; players: `matches "David Raya Martín" to "D. Raya"` (same team, GK) with confidence 0.8; `matches identical full names with confidence 1`; `two Gabriels at one club and position are ambiguous, not matched` (Review Focus 6); `the same surname at different clubs is not confused`; `a player of an unmapped team is unmatched`; `one of our players is never matched to two FPL players`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** tests, tsc, lint clean. **Step 5:** Commit `feat(fpl): team and player matching between FPL and API-Football`.

---

### Task 8: FPL sync service (bootstrap, prices, fixture links, points)

**Files:**

- Create: `src/server/fpl/repository/fpl.repository.ts` + `.interface.ts`, `src/server/fpl/service/fpl-sync.service.ts` + `.interface.ts`
- Modify: `src/server/pricing/repository/pricing.repository.interface.ts` (extend `priceSource` union with `'FPL'`), `src/server/sync/sync.container.ts`, `scripts/sync.ts` (register `fpl-bootstrap`, `fpl-fixtures`, `fpl-points`)
- Test: `src/server/fpl/service/fpl-sync.service.test.ts`

**Interfaces:**

- Produces:
    ```ts
    export interface IFplSyncService {
        syncBootstrap(seasonYear: number): Promise<JobOutcome> // events, settings, team ids, player map, prices
        linkFixtures(seasonYear: number): Promise<JobOutcome> // Fixture.fplFixtureId / fplEvent
        syncPoints(): Promise<JobOutcome> // FplEventPoints of finished events (+ the current one)
    }
    ```
    Repository (names indicative): `saveEvents`, `saveGameSettings`, `setTeamFplIds`, `loadMappingState(): { mappings, rejectedFplIds }`, `insertAutoMappings`, `upsertFplPrices(rows)` (only sets `basePrice` on insert; touches `updatedAt`), `deleteNonFplPrices(seasonYear)`, `findFixturesWithTeamFplIds(seasonYear)`, `setFixtureFplLinks`, `saveEventPoints`, `findStoredEventPointCounts`.
- Behaviour:
    - `syncBootstrap`: `assertSaneBootstrap` first; all 20 FPL teams must match ours or the job fails (message lists them); mappings with `method = 'MANUAL'` and rejected FPL ids are never touched; only `matched` players get `AUTO` mappings; prices written only for mapped players (`now_cost / 10`); `deleteNonFplPrices(seasonYear)` runs **only after** the price write succeeded; stats include `mapped`, `ambiguous`, `unmatched`, `priced`.
    - `linkFixtures`: link an FPL fixture to ours when both team pairs agree and kickoff differs by ≤ 36 h; a pair played twice in a season is resolved by the closest kickoff; an FPL fixture with `event = null` (postponed) leaves `fplEvent` null; both fixtures of a double gameweek get the same `fplEvent`.
    - `syncPoints`: fetch `event/{n}/live/` for every finished event that has no stored points yet, plus the current event every run; a `404` event is skipped; counts in stats.

- [ ] **Step 1: Write failing tests** (fake client + fake repo): `writes nothing when the bootstrap is not sane` (Review Focus 5); `fails when a team cannot be matched and writes nothing`; `does not overwrite a MANUAL mapping or map a rejected fplId`; `maps unambiguous players and reports ambiguous ones without mapping them`; `converts now_cost tenths to millions` (62 → 6.2); `does not delete non-FPL prices when the price write fails` (Review Focus 5); `deletes non-FPL prices after a successful price write`; `a second bootstrap run inserts 0 new mappings and 0 new prices` (Review Focus 2); `linkFixtures gives both fixtures of a double gameweek the same fplEvent` and `leaves a postponed fixture unlinked without failing` (Review Focus 3); `syncPoints skips events already stored and always refreshes the current one`; `syncPoints skips a 404 event`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** tests, tsc, lint clean. **Step 5:** Commit `feat(fpl): sync prices, rules, fixture links and actual points from FPL`.

---

### Task 9: Admin API for reviewing FPL ↔ player matches

**Files:**

- Create: `src/server/fpl/controller/fpl-mapping.controller.ts`, `src/server/fpl/service/fpl-mapping.service.ts` + `.interface.ts`; routes `src/app/api/admin/fpl/mapping/route.ts` (`GET`, `POST`)
- Modify: `src/server/fpl/repository/fpl.repository.ts` + `.interface.ts`, `src/shared/lib/container.ts`
- Test: `src/server/fpl/service/fpl-mapping.service.test.ts`, `src/server/fpl/controller/fpl-mapping.controller.test.ts`

**Interfaces:**

- Auth: `Authorization: Bearer ${ADMIN_SECRET}` exactly like `PricingController.uploadCsv` (500 if `ADMIN_SECRET` unset, 401 otherwise on mismatch).
- `GET /api/admin/fpl/mapping` → `{ unmapped: { fplId, name, team, position, now_cost, candidates: { playerId, name, score }[] }[], counts: { mapped, ambiguous, unmatched, rejected } }` (only FPL players with at least 90 minutes this season are listed, others are noise).
- `POST /api/admin/fpl/mapping` body (zod): `{ fplId: number, playerId: string }` creates a `MANUAL` mapping (409 if either side is already mapped); `{ fplId: number, reject: true }` creates a rejection; both are idempotent for identical repeats.
- Service uses `Errors.*` from `@/shared/lib/http`; it is **not** part of the sync container.

- [ ] **Step 1: Write failing tests:** service: `creates a MANUAL mapping`; `refuses a player that is already mapped with 409`; `rejecting an fplId removes it from the unmapped list`; `lists only players with at least 90 minutes`; controller: `401 without the bearer token`, `500 when ADMIN_SECRET is not set`, `rejects an invalid body with 400`.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement and register in `container.ts`. **Step 4:** tests, tsc, lint clean. **Step 5:** Commit `feat(fpl): admin API to confirm or reject player matches`.

---

### Task 10: Admin page for player matching

**Files:**

- Create: `src/app/(platform)/admin/fpl-mapping/page.tsx`, `src/views/fpl-mapping-view/` (`index.ts`, `ui/fpl-mapping-view.tsx`), `src/entities/fpl-mapping/` (`api/fpl-mapping.service.ts`, `model/fpl-mapping.types.ts`, `index.ts`)
- Reuse: shadcn `Card`, `Table`, `Button`, `Input`, `Select`/`Badge` already in `src/shared/ui`.

**Behaviour:** a single page, `robots: noindex`, that asks for the admin secret in a password input held **only in component state** (never in localStorage, URL or logs), loads `GET /api/admin/fpl/mapping`, shows counts and a table with each unmapped FPL player and a select of candidates, with «Confirm» and «Reject» buttons that call `POST`. On 401 show «Wrong secret». Pages under `(platform)` already require a signed-in session (`src/proxy.ts`); the secret is a second factor.

- [ ] **Step 1:** Implement the page, view and entity API (one request helper that sets the `Authorization` header).
- [ ] **Step 2:** `npm run lint && npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → clean; `npm run build` → page `/admin/fpl-mapping` listed.
- [ ] **Step 3:** Manual check on the throwaway DB in Task 12 (state in the ledger that UI was or was not clicked).
- [ ] **Step 4:** Commit `feat(admin): page to review FPL player matches`.

---

### Task 11: GitHub Actions workflows and docs

**Files:**

- Create: `.github/workflows/sync-short.yml`, `.github/workflows/sync-full.yml`, `.github/workflows/sync-backfill.yml`
- Modify: `docs/server-architecture.md` (new section «Sync jobs and their composition root»), `CLAUDE.md` (commands: `npm run sync -- <job>`), the spec's «Открытое» (`docs/superpowers/specs/2026-11-15-stage-2-epl-analytics-design.md`: API-Football limit answered — Pro, 7500/day, 300/min; subscription end `2026-11-24` must be renewed)

**Workflows (all):** `ubuntu-latest`; `actions/checkout`, `actions/setup-node` (Node 22, `cache: npm`), `npm ci`; env from secrets `STORAGE_DATABASE_URL`, `FOOTBAL_API_KEY`, `FOOTBAL_API_BASE_URL`; `permissions: contents: read`; `concurrency: { group: sync, cancel-in-progress: false }` (one run at a time, Review Focus 2); `timeout-minutes: 30`; pin action versions by major tag.

- `sync-short.yml`: `schedule: '0 */3 * * *'` + `workflow_dispatch`; runs `npm run sync -- short`.
- `sync-full.yml`: `schedule: '0 6 * * *'` + `workflow_dispatch`; runs `npm run sync -- full`.
- `sync-backfill.yml`: `workflow_dispatch` only with input `max_requests` (default `2000`); runs `npm run sync -- full --max-requests ${{ inputs.max_requests }}`.
- The workflow never echoes secrets and never uses `pull_request` triggers (secrets must not run on forks).

- [ ] **Step 1:** Write the three workflows and the docs.
- [ ] **Step 2:** Validate YAML (`npx --yes yaml valid .github/workflows/*.yml` or equivalent) and read each file back for the secret names above.
- [ ] **Step 3:** Commit `ci: scheduled sync workflows and docs`. State in the final message: the user must protect `main` from direct pushes and keep write access small, because the DB secret is readable by anyone who can edit workflows.

---

### Task 12: Rehearsal on a throwaway database

**Purpose:** prove the whole chain against the real APIs without touching production.

- [ ] **Step 1:** Start Postgres 16 in Docker on port 55432, apply all migrations in order (as Task 2, Step 3). Export `STORAGE_DATABASE_URL=postgresql://postgres:x@localhost:55432/postgres` **in the command only**; confirm with `echo` of the host part that it is `localhost`.
- [ ] **Step 2:** `npx tsx -r dotenv/config scripts/seed-leagues.ts` then `npx tsx -r dotenv/config scripts/sync-league-squads.ts 39 --season 2026` and again with `--season 2025` (about 40 API requests). `FOOTBAL_*` come from `.env`; the DB URL override must win over the one in `.env` (check order: command-line variable beats dotenv; if not, unset it in a temporary env file).
- [ ] **Step 3:** `npm run sync -- full --max-requests 1000`. Expected: `fixtures` OK (≈380 per season), `match-stats` OK or PARTIAL with counts, `fpl-bootstrap` OK, `fpl-fixtures` OK, `fpl-points` OK; exit 0.
- [ ] **Step 4:** Check by SQL (via `docker exec … psql`): fixtures per season ≈ 380; `player_match_stats` rows > 5000 for 2026; every `fixtures` row with `status = 'FT'` in 2026 has `fpl_event` set; `fpl_player_map` covers ≥ 90 % of FPL players with ≥ 90 minutes (record the exact number); `player_season_prices` has only `price_source = 'FPL'` rows for 2026; `fpl_event_points` has 10 finished events (the current season has played 10 events on 2026-11-15); `fpl_game_settings` row has squad 15, spend 1000, limit 3.
- [ ] **Step 5:** Run `npm run sync -- short` a second time → every job OK, inserted counts 0. Record the daily remaining quota printed by the job.
- [ ] **Step 6:** `docker rm -f` the container. Write the measured numbers into the ledger and into the final message: requests used, run time, mapping coverage, list of unmapped players with ≥ 90 minutes (this feeds the admin work), and any API shape surprises.

## Done when

- `npm test`, `npm run lint`, `npx tsc --noEmit -p .` (ignoring `.next/`), `npm run build` pass.
- The rehearsal numbers in Task 12 are recorded.
- The user has: the two new migration files (apply after a backup), the three workflow files, and the reminder that the API-Football subscription ends on 2026-11-24.
