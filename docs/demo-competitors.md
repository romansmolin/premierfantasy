# Demo Competitors

Competitions look dead before real users arrive. The demo system fills them with
fictional managers that behave like real ones everywhere it matters — they hold a
`LeagueMembership`, own a `FantasyTeam` with a legal squad, and are scored and
ranked by the same `GameweekPoints` rows and leaderboard queries.

## Automatic processing (production path)

`DemoCompetitionService` (`src/server/demo/service/`) does everything on a schedule:

1. **Seeding** — every public `active`/`upcoming` competition is topped up to
   `DEMO_TARGET_PARTICIPANTS` total participants (real + demo). Which managers appear is a
   seeded shuffle per competition, so different competitions field different line-ups.
2. **Scoring** — active competitions get one persisted `GameweekPoints` row per demo team per
   elapsed gameweek. Scores are deterministic in `(teamId, gameweekId)`, bell-shaped 12–92,
   with a stable per-team skill bias. Existing rows are never updated.
3. **Finalization** — a `completed` competition gets any missing gameweeks scored, then
   `competitions.demo_scoring_finalized_at` is stamped. Finalized competitions are skipped by
   every later run, so final standings never change.

Triggers:

- **Vercel Cron** — `GET /api/cron/competitions` every 6 hours (see `vercel.json`), authorized
  via `Authorization: Bearer ${CRON_SECRET}`.
- **On join** — creating a fantasy team also runs `ensureDemoParticipants` for that
  competition (best-effort), so a new joiner never lands in an empty room.
- **Manually** — `npm run demo:process` (all competitions) or
  `npm run demo:process -- --competition <uuid>`.

Config (server-only env, see `.env.example`): `DEMO_PARTICIPANTS_ENABLED` (default on),
`DEMO_TARGET_PARTICIPANTS` (default 10, max 24). Demo teams are never deleted when real users
overfill a competition — removing them would invalidate historical standings.

The real scoring pipeline skips `isDemo` teams, and the demo scorer only ever reads
`isDemo: true` teams — the two can never touch each other's rows.

## Manual seeding script (dev variant)

```bash
npm run seed:demo
```

| Flag                   | Default            | Meaning                                                      |
| ---------------------- | ------------------ | ------------------------------------------------------------ |
| `--count N`            | `5`                | Demo competitors per competition (max 12 — the roster size). |
| `--league 39,140`      | all active leagues | Restrict by API-Football league external id.                 |
| `--competition <uuid>` | active + upcoming  | Seed exactly these competitions.                             |
| `--teams 33,40`        | every local player | Restrict the player pool to these club external ids.         |
| `--season 2026`        | `SEASON`           | Season year used to look up player prices.                   |

Examples:

```bash
npx tsx -r dotenv/config scripts/seed-demo-competitors.ts --league 39 --count 8
```

## Safety properties

- **Cannot authenticate.** Demo managers are `User` rows with `isDemo = true` and a
  `@demo.invalid` address, created _without_ an `Account` row. Better Auth has no
  credential to match, so sign-in is impossible. A `databaseHooks.user.create.before`
  hook additionally rejects sign-ups on that domain, so nobody can claim a seeded
  identity.
- **Never runs in production by accident.** The script aborts when `NODE_ENV=production`
  unless `ALLOW_DEMO_SEED=true` is set explicitly.
- **Idempotent.** Users upsert by email, memberships by `(user, season)`, teams by
  `(user, competition)`. Re-running tops a competition up to `--count`; a demo team that
  already has a squad is left alone. Squads are generated from a seed derived from
  `(competitionId, managerSlug)`, so regeneration is byte-for-byte stable.

## Squad generation

`src/server/demo/lib/demo-roster.ts` holds the pure logic: a fixed manager roster and
`buildDemoSquad`, which picks a 1-4-4-2 inside `BUDGET_TOTAL`, respecting `MAX_PER_CLUB`,
then trades the priciest picks down until the squad fits. It returns `null` rather than
seeding something invalid when the pool is too thin — the script skips that competitor
and reports it.

## Player pool

The pool is scoped to the clubs registered against the competition's league season via
`LeagueSeasonTeam`, so a Serie A demo team fields Serie A players. Those links are written
by `scripts/sync-league-squads.ts`, which imports each league's clubs and squads from
API-Football:

```bash
npx tsx -r dotenv/config scripts/sync-league-squads.ts 135 --season 2026
```

If a league season has no clubs linked yet, the seeder warns and falls back to every local
player rather than skipping the competition. `--teams` overrides the scoping entirely.
Pools are built once per league season and reused across that season's rounds.

## Limitations

- Demo teams do not make transfers between gameweeks; their squad is fixed once seeded.
- Player prices come from `PlayerSeasonPrice` for the target season, falling back to the
  deterministic `generatePlayerPrice` when a season price is missing.
