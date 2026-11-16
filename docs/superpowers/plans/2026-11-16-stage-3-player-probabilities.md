# Stage 3 — Player Probabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player card that shows, for the next match and the next five, the probability of a goal, an assist and a start, expected minutes and points, the points distribution and the team's win chance, each gated by a published accuracy check, plus interactive charts, the same numbers in the players table and on the fixtures page, and a dark theme.

**Architecture:** Model `ewma-poisson-v2` is added next to v1 (v1 keeps producing expected points and is untouched). Pure model, outcome and evaluation code lives in `src/server/prediction/lib/v2/`; a new `ProbabilityService` runs it as the `probability` sync job and stores per-match rows; `StatsService` merges stored rows with a per-metric gate decision read from the latest stored evaluation. FPL per-match xG/xA/starts come from a new `fpl-matches` job (`element-summary/{id}/`).

**Tech Stack:** Next.js 16, TypeScript strict, Prisma/Postgres, Vitest, shadcn `chart` (recharts), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-11-16-stage-3-player-probabilities-design.md` (read it first; the plan only restates what tasks need).

## Global Constraints

- Site language is **English**; numbers use a dot (`5.8`); percentages are whole numbers, and values under 1% or over 99% render as `<1%` / `>99%`, never `0%` / `100%`.
- Horizon is the team's **next 5 matches** (not gameweeks): a double gameweek gives two matches, a blank gameweek none, fewer than 5 scheduled matches means fewer rows, never padding.
- A missing value is `null` and renders as `—` (or a stated reason), never `0`. A missing FPL row is unknown, not a zero-minute match.
- Facts and forecasts are visibly separated: forecast blocks carry a "Forecast" label, source, method link (`/how-we-calculate`), model version and update time; forecast chart marks are dashed or hatched, fact marks solid; meaning is never carried by colour alone.
- Gate (per metric × horizon `next` / `later` (matches 2–5) × position, outcome has no position): walk-forward only, judged on FPL current-season actuals (`FplPlayerMatch`, `FplEventPoints`), **≥ 8 evaluated events**; passes only if Brier beats the baseline and no calibration bucket with enough rows is off. A failed or missing gate hides that number (`—` + "switched off: not better than a simple baseline"), never shows it.
- No bookmaker odds anywhere. xG/xA are FPL's own; we do not model xG.
- v2 points replace v1 points only if v2 passes the stage 2 points bar **and** is not worse than v1 on MAE and rank correlation on the same records; otherwise v1 points stay and the v2-only point outputs (distribution, points for matches 2–5) are hidden.
- Project rules (`CLAUDE.md`, `docs/server-architecture.md`): Controller → Service → Repository, DI only in `src/shared/lib/container.ts` and `src/server/sync/sync.container.ts`, no `any`, `import type`, no `console.log`, FSD layer imports, lower-case conventional commit subjects, the session's `Co-Authored-By` trailer on every commit.
- Never run sync jobs against the production database (`.env.prod`) without the user's explicit yes.

## Review Focus

1. Double gameweek: two matches of one team in one gameweek yield two rows, two chart bars, two heatmap values in one cell, never one summed match (Tasks 5, 10, 12).
2. Missing xG (last season, no FPL row, unparseable string) stays `null`: the blend falls back to goals and the chart shows a gap with "no xG data" (Tasks 2, 5, 10).
3. Cold start: a player with fewer than 3 appearances gets "Not enough data", not percentages; an unavailable player (availability 0) shows 0 chance with the injury news, not an error (Tasks 5, 8, 11).
4. Gate off or no evaluation yet: the card shows facts only, the table shows `—` with a tooltip, nothing renders `0%` by accident; percentages near 0/100 render `<1%`/`>99%` (Tasks 7, 8, 11, 12).
5. Partial or failing FPL responses: one player's failed `element-summary` is skipped and nothing stored for it; over half failing aborts the job with `SuspiciousResponseError`; a capped run resumes next run (Task 2).

---

### Task 1: Schema and migration

**Files:**

- Modify: `prisma/schema/fpl.prisma`, `prisma/schema/forecast.prisma`
- Create: `prisma/migrations/20261116030000_add_probabilities/migration.sql`

**Interfaces:**

- Produces (Prisma models, table names snake_case via `@map` like existing ones):
    - `FplPlayerMatch` (`fpl_player_matches`): `id` uuid, `fplPlayerId Int`, `fplFixtureId Int`, `event Int`, `minutes Int`, `starts Int` (0/1), `goals Int`, `assists Int`, `xg Float?`, `xa Float?`, `totalPoints Int`, `wasHome Boolean`, `updatedAt @updatedAt`; `@@unique([fplPlayerId, fplFixtureId])`, `@@index([event])`.
    - `FplPlayerStatus.penaltiesOrder Int?` (FPL `penalties_order`, 1 = first taker).
    - `MatchProbability` (`match_probabilities`): `id` uuid, `modelVersion String`, `fixtureId String`, `playerId String` (relation to `Player`, cascade), `horizon Int` (1..5), `pGoal`, `pAssist`, `pStart`, `expectedMinutes`, `expectedPoints` (all `Float`), `pointsBuckets Json` (4 numbers: 0–2, 3–5, 6–9, 10+), `createdAt`; `@@unique([modelVersion, fixtureId, playerId])`, `@@index([playerId])`.
    - `FixtureProbability` (`fixture_probabilities`): `id` uuid, `modelVersion String`, `fixtureId String` (relation to `Fixture`, cascade), `pHome pDraw pAway xgHome xgAway leagueGoals` (`Float`), `createdAt`; `@@unique([modelVersion, fixtureId])`.

- [ ] **Step 1:** Add the models; add the back-relations on `Player` and `Fixture`.
- [ ] **Step 2:** Write the migration SQL by hand in the style of `20261116010000_add_forecast/migration.sql` (CreateTable, unique indexes, foreign keys, `ALTER TABLE "fpl_player_status" ADD COLUMN "penalties_order" INTEGER`).
- [ ] **Step 3:** Run `npx prisma generate --schema prisma/schema` and `npx prisma validate --schema prisma/schema`. Expected: both succeed. If a local Postgres is available, `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema --script` must print nothing.
- [ ] **Step 4:** Commit `feat(db): add fpl player matches and probability tables`.

### Task 2: FPL per-match data sync (`fpl-matches` job)

**Files:**

- Modify: `src/server/fpl/lib/fpl.types.ts`, `src/server/fpl/lib/fpl-client.ts`, `src/server/fpl/repository/fpl.repository.interface.ts`, `src/server/fpl/repository/fpl.repository.ts`, `src/server/fpl/service/fpl-sync.service.interface.ts`, `src/server/fpl/service/fpl-sync.service.ts`, `src/server/sync/jobs.ts`, `src/server/sync/cli.test.ts` (group lists)
- Test: `src/server/fpl/service/fpl-sync.service.test.ts`, `src/server/fpl/lib/fpl-client.test.ts`

**Interfaces:**

- Consumes: existing `IFplClient`, `IFplRepository`, `SuspiciousResponseError`, `FplNotFoundError`.
- Produces:
    - `FplElementSummary { history: { fixture: number; round: number; minutes: number; starts: number; goals_scored: number; assists: number; expected_goals: string; expected_assists: string; total_points: number; was_home: boolean }[] }`; `IFplClient.getElementSummary(fplId: number): Promise<FplElementSummary>`.
    - `FplPlayerMatchRow { fplPlayerId: number; fplFixtureId: number; event: number; minutes: number; starts: number; goals: number; assists: number; xg: number | null; xa: number | null; totalPoints: number; wasHome: boolean }`.
    - `IFplRepository.findPlayersNeedingMatches(limit: number, now: Date): Promise<number[]>` (FPL ids) and `savePlayerMatches(rows: FplPlayerMatchRow[]): Promise<void>` (upsert on the unique key, small transactions like `saveEventPoints`); `saveAvailability` rows gain `penaltiesOrder: number | null`.
    - `IFplSyncService.syncPlayerMatches(maxPlayers?: number): Promise<JobOutcome>`; default `MAX_PLAYERS_PER_RUN = 350`.
    - Job `'fpl-matches'` in `buildJobs`; `SHORT_JOBS` order: `fixtures, match-stats, fpl-fixtures, fpl-points, fpl-matches, forecast, probability` (the `probability` job is registered in Task 7; keep the group list consistent when it lands).

- [ ] **Step 1: Write failing tests** in `fpl-sync.service.test.ts` with the existing fake client/repo style:
    - `stores one row per fixture, two for a double gameweek`: a summary with two history rows of round 12 yields two saved rows with `event: 12`.
    - `parses xG strings and keeps null for unparseable`: `'0.45'` → `0.45`, `''` and `'abc'` → `null`.
    - `skips a player whose summary fails and stores nothing for them`: client throws for fplId 2; rows of fplId 1 saved; stats `failed: 1`.
    - `throws SuspiciousResponseError when more than half of the attempted players fail`.
    - `passes maxPlayers to the repository and resumes where it stopped`: `findPlayersNeedingMatches` called with `(maxPlayers, now)`.
- [ ] **Step 2:** Run `npx vitest run src/server/fpl` — expect the new tests FAIL.
- [ ] **Step 3: Implement.** `findPlayersNeedingMatches` rule: FPL-mapped players with minutes > 0 in a finished event that has no `FplPlayerMatch` row, **or** minutes > 0 in the current or previous event whose newest `FplPlayerMatch.updatedAt` is older than 12 hours; missing-first, then by season minutes descending. Rows with `minutes = 0` are stored. Persist `penalties_order` in the existing bootstrap availability save.
- [ ] **Step 4:** Run `npx vitest run src/server/fpl src/server/sync` — expect PASS.
- [ ] **Step 5:** Commit `feat(fpl): sync per-match xg, xa and starts`.

### Task 3: Dataset extension and shared event preparation

**Files:**

- Modify: `src/server/prediction/lib/inputs.ts`, `src/server/prediction/repository/forecast-data.repository.ts`, existing fixtures in `src/server/prediction/lib/*.test.ts` that build `StoredMatch` / `ForecastDataset`
- Test: `src/server/prediction/lib/inputs.test.ts`

**Interfaces:**

- Produces:
    - `StoredMatch.isStarter: boolean` (from `PlayerMatchStats.isSubstitute`, inverted).
    - `FplMatchRow { fixtureId: string; event: number; minutes: number; started: boolean; goals: number; assists: number; xg: number | null; xa: number | null; totalPoints: number; wasHome: boolean }` and `ForecastDataset.fplMatches: Map<string, FplMatchRow[]>` (playerId → rows, any order; `fixtureId` is our `Fixture.id` found through `Fixture.fplFixtureId`; rows whose FPL fixture has no match in our table are dropped).
    - `ForecastDataset.fixtureEvents` is not added; use `fixtures[].fplEvent`.
    - `prepareEvent(data: ForecastDataset, event: number | 'next'): { event: number | null; prepared: PreparedEvent | null }` where `PreparedEvent { cutoff: Date; strengths: TeamStrengths; finished: DatasetFixture[] (newest first); before: StoredMatch[]; priors: Record<Position, PositionPrior>; byPlayer: Map<string, StoredMatch[]>; eventFixtures: DatasetFixture[] }`. `prepared` is `null` when the event has no fixtures. `buildInputsForEvent` is refactored to call it; its output must not change.

- [ ] **Step 1: Write failing tests:** `prepareEvent returns null prepared for an event without fixtures`, `prepareEvent cutoff is the earliest kickoff of the event`, `prepareEvent resolves 'next' to the event flagged isNext`. Keep every existing `inputs.test.ts` and `evaluation.test.ts` test green unchanged (they guard the refactor); fix their fixtures for the new required fields.
- [ ] **Step 2:** Run `npx vitest run src/server/prediction` — new tests FAIL.
- [ ] **Step 3:** Extract `prepareEvent`; extend the repository's select and mapping (`FplPlayerMatch` joined to `Fixture.fplFixtureId`, `isStarter`).
- [ ] **Step 4:** Run `npx vitest run src/server/prediction` — all PASS. Run `npx tsc --noEmit`.
- [ ] **Step 5:** Commit `refactor(prediction): share event preparation, load fpl per-match data`.

### Task 4: Probability maths and the match-outcome model

**Files:**

- Create: `src/server/prediction/lib/v2/metrics.ts`, `src/server/prediction/lib/v2/outcome.ts`, `src/server/prediction/lib/v2/params.ts`
- Test: `src/server/prediction/lib/v2/metrics.test.ts`, `src/server/prediction/lib/v2/outcome.test.ts`

**Interfaces:**

- Produces (`params.ts`): `MODEL_VERSION_V2 = 'ewma-poisson-v2'`, `HORIZON_MATCHES = 5`, `MIN_APPEARANCES = 3`, `POINT_BUCKETS` = labels `['0–2', '3–5', '6–9', '10+']` with `bucketOfPoints(points: number): 0 | 1 | 2 | 3` (≤ 2 → 0), `GATE = { minEvents: 8, minRecords: 300, minBucketN: 30, maxBucketGap: 0.07, minBrierEdge: 0.001 }` (one object, values are the initial defaults), `interface V2Params extends ModelParams { xgWeight: number; sims: number; seed: number }`, `DEFAULT_V2: V2Params = { ...DEFAULT_PARAMS, xgWeight: 0.5, sims: 2000, seed: 20261116 }`.
- Produces (`metrics.ts`): `brier(p: number[], hit: boolean[]): number`, `brierMulti(p: number[][], actual: number[]): number`, `calibrationBuckets(p: number[], hit: boolean[], width?: number): { lo: number; hi: number; n: number; predicted: number; observed: number }[]` (default width 0.1, empty buckets omitted), `mulberry32(seed: number): () => number`, `samplePoisson(lambda: number, rng: () => number): number`.
- Produces (`outcome.ts`): `outcomeProbabilities(xgHome: number, xgAway: number, maxGoals?: number): { home: number; draw: number; away: number }` — independent Poissons, scores summed to `maxGoals = 10`, result renormalised to sum 1.

- [ ] **Step 1: Write failing tests:**
    - `outcomeProbabilities`: `(1, 1)` gives `home === away` (`toBeCloseTo(…, 12)`) and `draw` `toBeCloseTo(0.3085, 3)`; `(2.5, 0.5)` has `home > 0.7`; sums to 1 within `1e-12`.
    - `brier([1, 0], [true, false])` is `0`; `brier([0.5, 0.5], [true, false])` is `0.25`.
    - `calibrationBuckets` puts `0.05` and `0.08` in the `[0, 0.1)` bucket with `n: 2`; `0.95` goes in `[0.9, 1]`.
    - `mulberry32(1)` twice gives identical sequences; values in `[0, 1)`; `samplePoisson(0, rng)` is `0`; the mean of 20 000 draws at `λ = 2` is within `0.05` of `2`.
    - `bucketOfPoints`: `-1, 2 → 0`, `3, 5 → 1`, `6, 9 → 2`, `10, 14 → 3`.
- [ ] **Step 2:** Run `npx vitest run src/server/prediction/lib/v2` — FAIL.
- [ ] **Step 3:** Implement per the signatures (reuse `poissonPmf` from `../math`).
- [ ] **Step 4:** Run the same command — PASS.
- [ ] **Step 5:** Commit `feat(prediction): probability maths and match outcome model`.

### Task 5: Player-match model v2

**Files:**

- Modify: `src/server/prediction/lib/model.ts` (export `rates` and `RateKey` only)
- Create: `src/server/prediction/lib/v2/model.ts`, `src/server/prediction/lib/v2/inputs.ts`
- Test: `src/server/prediction/lib/v2/model.test.ts`, `src/server/prediction/lib/v2/inputs.test.ts`

**Interfaces:**

- Consumes: `prepareEvent`, `FplMatchRow`, `availabilityFactor`, `expectedGoals` (`team-strength.ts`), `FixtureContext`, `PositionPrior`, `pointsFromStats` (`scoring-rules.ts`), `fitCalibration`, `Calibration`, `V2Params`, `samplePoisson`, `mulberry32`, `bucketOfPoints`.
- Produces (`v2/model.ts`):
    - `V2Line extends MatchLine { xg: number | null; xa: number | null; started: boolean }` (newest first, minutes > 0, at most 10).
    - `V2Fixture extends FixtureContext { fixtureId: string; kickoff: Date; opponentTeamId: string }`.
    - `PlayerInputV2 { position: Position; appearances: V2Line[]; teamMatches: { minutes: number; started: boolean }[] (newest first, up to 6); availability: number; fixtures: V2Fixture[] (≤ 5, in kickoff order); prior: PositionPrior }`.
    - `MatchForecastV2 { fixtureId: string; horizon: number; pStart: number; pPlay: number; expectedMinutes: number; pGoal: number; pAssist: number; rawPoints: number; pointsSamples: number[] | null }`.
    - `predictPlayerMatches(input: PlayerInputV2, params: V2Params, opts: { withDistribution: boolean; seed: number }): MatchForecastV2[] | null` — `null` when `appearances.length < MIN_APPEARANCES` (cold start).
    - `bucketDistribution(samples: number[], shift: number): [number, number, number, number]` — adds `shift` to each sample, rounds, buckets, returns shares summing to 1.
- Produces (`v2/inputs.ts`): `BuiltInputV2 { playerId: string; teamId: string; input: PlayerInputV2 }` and `buildInputsV2(data: ForecastDataset, event: number | 'next', opts: { useAvailability: boolean }): { event: number | null; cutoff: Date | null; inputs: BuiltInputV2[]; strengths: TeamStrengths | null }`. A player's fixtures are the team's first `HORIZON_MATCHES` fixtures with `kickoff >= cutoff`, any status and event.

Model rules: `pStart` = availability × decay-weighted share of the team's last matches in which the player started (`minutesDecay`); `pPlay` as v1; minutes if starting = mean minutes of own starts (default 80), if a substitute = mean of own sub minutes (default 20); `expectedMinutes = pStart·startMin + (pPlay − pStart)·subMin`. Goal/assist rate per 90: v1's `rates` over appearances whose `goals`/`assists` are replaced by `xgWeight·xg + (1 − xgWeight)·goals` when `xg` is non-null (goals otherwise; same for assists with `xa`). `λ = rate · expectedMinutes/90 · attack` (attack multiplier as in v1); `pGoal = 1 − exp(−λ)`. Distribution: `sims` draws per match — role by `pStart`/`pPlay`, Poisson goals and assists, team goals against `~ Poisson(teamGoalsAgainst)` for clean sheet and conceded, Poisson saves/defensive actions, Bernoulli cards, scored with `pointsFromStats`.

- [ ] **Step 1: Write failing tests** (`model.test.ts`):
    - `returns null below MIN_APPEARANCES`.
    - `pGoal equals 1 - exp(-lambda)`: a player with 3 identical 90-minute appearances, `xgWeight: 1`, `xg: 0.9`, goals 0, `availability: 1`, prior equal to his own rate and neutral fixture — assert `pGoal` is within `0.05` of `1 - Math.exp(-0.9 · …)` computed in the test from the returned `expectedMinutes` (state the formula in the test).
    - `falls back to goals when xg is null`: identical inputs with `xg: null`/goals `1` and with `xg: 1` give equal `pGoal` (`toBeCloseTo(…, 12)`).
    - `availability 0 gives pStart 0 and pGoal 0`.
    - `a double gameweek returns two forecasts with horizons 1 and 2`; `a team with 3 scheduled matches returns 3`.
    - `pStart is higher for a player who started 6 of 6 than 3 of 6`.
    - `bucketDistribution sums to 1 and a +20 shift puts all mass in bucket 3`.
    - `same seed gives identical samples`.
    - `inputs.test.ts`: `buildInputsV2 never uses a match at or after the cutoff` (a goal in a later match does not change `appearances`), `horizon fixtures are the next five after cutoff`, `xg null for a match without an FPL row` (never `0`).
- [ ] **Step 2:** Run `npx vitest run src/server/prediction/lib/v2` — FAIL.
- [ ] **Step 3:** Implement. Reuse v1's `rates`, `decayWeights`, `weightedMean`; do not copy them.
- [ ] **Step 4:** Run `npx vitest run src/server/prediction` — all PASS.
- [ ] **Step 5:** Commit `feat(prediction): ewma-poisson-v2 player match model`.

### Task 6: Walk-forward evaluation and gates for v2

**Files:**

- Create: `src/server/prediction/lib/v2/evaluation.ts`
- Test: `src/server/prediction/lib/v2/evaluation.test.ts`

**Interfaces:**

- Consumes: `buildInputsV2`, `predictPlayerMatches`, `prepareEvent`, `outcomeProbabilities`, `evaluateWalkForward` (v1, for the points comparison), `fitCalibration`, `brier`, `brierMulti`, `calibrationBuckets`, `GATE`, `DEFAULT_V2`.
- Produces:
    - `type Metric = 'goal' | 'assist' | 'start' | 'outcome' | 'points'`; `type Horizon = 'next' | 'later'`.
    - `GateResult { metric: Metric; horizon: Horizon; position: Position | 'ALL'; n: number; brier: number; baselineBrier: number; buckets: ReturnType<typeof calibrationBuckets>; passed: boolean; reasons: string[] }`.
    - `ProbabilityEvaluation { modelVersion: string; eventsEvaluated: number; gates: GateResult[]; pointsMean: { passed: boolean; maeV2: number; maeV1: number; rankCorrV2: number; rankCorrV1: number; n: number; reasons: string[] }; calibration: Record<Position, Calibration> }`.
    - `evaluateProbabilities(data: ForecastDataset, opts?: { lastEvents?: number; params?: V2Params }): ProbabilityEvaluation` (default last 10 finished events with FPL match rows; distribution sims reduced to 400 inside the backtest).
    - `isGateOn(gates: GateResult[], metric: Metric, horizon: Horizon, position?: Position): boolean`.
    - `passesGate(g: Pick<GateResult, 'n' | 'brier' | 'baselineBrier' | 'buckets'>, eventsEvaluated: number): { passed: boolean; reasons: string[] }`.

Rules: for each finished event N, build inputs from data before N's first kickoff; a player-match is a record only if the model's `expectedMinutes ≥ 30` and the FPL row of that fixture exists (else skipped, not zero). Horizon `next` = team match 1, `later` = matches 2–5, only matches already finished. Actuals: goal/assist = `goals ≥ 1` / `assists ≥ 1`, start = `started`, points = `totalPoints` of that match. Baselines on the same record set: player's own frequency over his last 10 `fplMatches` rows before the cutoff (≥ 5 rows needed, else skip the record for model and baseline); points distribution = his last 10 matches bucketed; outcome baseline = league home/draw/away frequencies before the cutoff, one record per finished fixture, `next` when `fplEvent === N`, `later` when `N + 1 … N + 4`. Points-mean check: sum of v2 calibrated expected points per player per event vs v1 `predictPlayer` + calibration on identical records.

- [ ] **Step 1: Write failing tests** with synthetic datasets:
    - `passesGate fails with fewer than 8 events` (reason mentions `8`).
    - `passesGate fails when Brier is not better than baseline by minBrierEdge`.
    - `passesGate fails when a bucket with n ≥ 30 is more than 0.07 off, even if Brier is better`.
    - `passesGate ignores a badly off bucket with n < 30`.
    - `isGateOn is false for a missing gate and for a failed one, true for a passed one`.
    - `evaluateProbabilities skips a record when the FPL row is missing instead of counting a non-goal` (a dataset where the only actual rows are absent yields `n: 0`, no gate passes).
    - `evaluateProbabilities uses only data before each event` (changing a result after event N's cutoff leaves event N's predictions unchanged).
- [ ] **Step 2:** Run `npx vitest run src/server/prediction/lib/v2/evaluation.test.ts` — FAIL.
- [ ] **Step 3:** Implement; gate decision keyed on `GateResult.position` per metric × horizon.
- [ ] **Step 4:** Run `npx vitest run src/server/prediction` — PASS.
- [ ] **Step 5:** Commit `feat(prediction): walk-forward gates for probabilities`.

### Task 7: ProbabilityService, repository and `probability` job

**Files:**

- Create: `src/server/prediction/service/probability.service.interface.ts`, `src/server/prediction/service/probability.service.ts`, `src/server/prediction/repository/probability.repository.interface.ts`, `src/server/prediction/repository/probability.repository.ts`
- Modify: `src/server/sync/jobs.ts`, `src/server/sync/sync.container.ts`, `src/shared/lib/container.ts`
- Test: `src/server/prediction/service/probability.service.test.ts`

**Interfaces:**

- Consumes: `IForecastDataRepository`, `evaluateProbabilities`, `buildInputsV2`, `predictPlayerMatches`, `bucketDistribution`, `outcomeProbabilities`, `expectedGoals`, `isGateOn`, `JobOutcome`.
- Produces:
    - `PlayerMatchProbability { fixtureId: string; playerId: string; horizon: number; pGoal: number; pAssist: number; pStart: number; expectedMinutes: number; expectedPoints: number; pointsBuckets: number[] }`; `FixtureProbabilityRow { fixtureId: string; pHome: number; pDraw: number; pAway: number; xgHome: number; xgAway: number; leagueGoals: number }`.
    - `IProbabilityRepository`: `saveEvaluation(e: ProbabilityEvaluation): Promise<void>` (a `ModelEvaluation` row, `modelVersion = MODEL_VERSION_V2`, `details = { gates, pointsMean, calibration }`, the v1-shaped columns filled from `pointsMean`, `passed = pointsMean.passed`); `findLatestEvaluation(): Promise<(ProbabilityEvaluation & { createdAt: Date }) | null>`; `replaceMatchProbabilities(rows: PlayerMatchProbability[]): Promise<void>` and `replaceFixtureProbabilities(rows: FixtureProbabilityRow[]): Promise<void>` (one transaction each, chunked like `replacePredictions`, replacing all rows of `MODEL_VERSION_V2`); `findMatchProbabilities(playerId?: string): Promise<(PlayerMatchProbability & { createdAt: Date })[]>`; `findFixtureProbabilities(fixtureIds?: string[]): Promise<FixtureProbabilityRow[]>`.
    - `IProbabilityService`: `run(): Promise<JobOutcome>` (evaluate → save evaluation → predict the next five matches of every FPL-mapped player with `useAvailability: true` → store; also store outcomes for every fixture of the next 8 events whose kickoff is ahead; no upcoming event is `OK` with zero rows, not an error); `getStatus(): Promise<{ evaluatedAt: Date | null; eventsEvaluated: number; gates: GateResult[]; pointsMeanOn: boolean; updatedAt: Date | null }>`; plus pass-through readers `getPlayerMatches(playerId)`, `getNextMatchForAll()` (horizon 1, `Map<playerId, PlayerMatchProbability>`), `getFixtureProbabilities(fixtureIds?)`.
    - Stored `expectedPoints` is v2 calibrated mean; `pointsBuckets` from `bucketDistribution` with `shift = calibratedMean − rawMean`.

- [ ] **Step 1: Write failing tests** with fake repos: `stores at most 5 matches per player`, `stores two rows for a double gameweek`, `no upcoming event stores nothing and returns OK`, `evaluation is saved before predictions`, `a failing evaluation keeps the old predictions` (repository `replace…` not called when evaluation throws), `getStatus reports pointsMeanOn from the latest evaluation and false without one`.
- [ ] **Step 2:** Run `npx vitest run src/server/prediction/service` — FAIL.
- [ ] **Step 3:** Implement; register `probabilityService` in both containers; add job `probability: () => container.probabilityService.run()` to `buildJobs` and append `'probability'` after `'forecast'` in `SHORT_JOBS`; update `cli.test.ts` group expectations if they list names.
- [ ] **Step 4:** Run `npx vitest run src/server` and `npx tsc --noEmit` — PASS.
- [ ] **Step 5:** Commit `feat(prediction): probability job, storage and status`.

### Task 8: Stats service integration and explanations

**Files:**

- Create: `src/server/stats/lib/explain.ts`, `src/server/stats/lib/gating.ts`
- Modify: `src/server/stats/service/stats.service.interface.ts`, `src/server/stats/service/stats.service.ts`, `src/server/stats/repository/stats.repository.interface.ts`, `src/server/stats/repository/stats.repository.ts`, `src/shared/lib/container.ts`
- Test: `src/server/stats/lib/explain.test.ts`, `src/server/stats/lib/gating.test.ts`, `src/server/stats/service/stats.service.test.ts`

**Interfaces:**

- Consumes: `IProbabilityService`, `isGateOn`, `MIN_APPEARANCES`.
- Produces:
    - `gating.ts`: `gated(value: number | null, on: boolean): number | null`; `formatChance(p: number | null): string` (`—` for null, `<1%`, `>99%`, else rounded `NN%`).
    - `explain.ts`: `ExplainFacts { startsOfLast: { started: number; of: number } | null; penaltyOrder: number | null; goalsLast10: number | null; xgLast10: number | null; expectedTeamGoals: number | null; leagueGoals: number | null; unavailable: string | null }` and `explainForecast(f: ExplainFacts): string[]` — at most 3 English sentences, each with a number, in priority order: unavailable (`Unavailable: <news>`); `Started 9 of the last 10 team matches`; `First-choice penalty taker` (`penaltyOrder === 1`); `Team is expected to score 1.9 goals here (league average 1.4)` (only when ≥ 0.3 above or below average, worded high/low accordingly); `Scored 4 goals from 3.1 xG in the last 10` (only when `xgLast10` is not null and the gap is ≥ 1). Empty facts give `[]`.
    - `PlayerProfile` gains `facts: { form: FormMatch[]; penaltyOrder: number | null }` (the playing-time chart is derived from `form` in Task 10) and `probabilities: PlayerProbabilityCard | null`, with `FormMatch { fixtureId; kickoff: Date; opponentName: string; isHome: boolean; minutes: number; started: boolean; goals: number; xg: number | null; assists: number; xa: number | null }` (last 10 FPL rows, kickoff order) and `PlayerProbabilityCard { modelVersion: string; updatedAt: Date; lowData: boolean; matches: { fixtureId: string; kickoff: Date; opponentName: string; isHome: boolean; horizon: number; pGoal: number | null; pAssist: number | null; pStart: number | null; expectedMinutes: number | null; expectedPoints: number | null; pointsBuckets: number[] | null; pWin: number | null; pDraw: number | null; pLose: number | null }[]; explanation: string[]; offReasons: string[] }`. `null` means gated off or missing; `expectedPoints` for horizon 1 is v1's when `pointsMeanOn` is false, and `expectedPoints` for horizons ≥ 2 and `pointsBuckets` are `null` in that case.
    - `PlayerListItem.next: { pGoal: number | null; pAssist: number | null; pStart: number | null } | null`; `PlayerSort` adds `'pGoal' | 'pAssist' | 'pStart'`.
    - `IStatsService.getFixtures()` result gains, on each fixture, `probabilities: { pHome: number | null; pDraw: number | null; pAway: number | null } | null`, and `getHeatmap(): Promise<{ events: number[]; clubs: { clubId: string; name: string; cells: { event: number; matches: { opponent: string; isHome: boolean; xgFor: number; pCleanSheet: number }[] }[] }[] }>` for the next 8 events (a club without a match in an event has `matches: []`).

- [ ] **Step 1: Write failing tests:**
    - `formatChance`: `null → '—'`, `0.004 → '<1%'`, `0.996 → '>99%'`, `0.424 → '42%'`.
    - `gated(0.4, false)` is `null`.
    - `explainForecast` returns at most 3 sentences; `[]` for all-null facts; unavailable comes first; `penaltyOrder: 2` produces no penalty sentence; no xG sentence when `xgLast10` is `null`.
    - Service: `profile.probabilities is null without any stored rows`; `a gated-off metric is null while others stay`; `lowData true and all numbers null below 3 appearances`; `pointsBuckets null when pointsMeanOn is false`; `double gameweek gives two matches with horizons 1 and 2`; `form uses null xg, never 0, for rows without xG`; `list sort by pGoal puts null last`.
- [ ] **Step 2:** Run `npx vitest run src/server/stats` — FAIL.
- [ ] **Step 3:** Implement; `StatsService` constructor takes `IProbabilityService` as a third argument; the repository adds `findFplMatches(playerId)` and `findPenaltyOrder`/availability read.
- [ ] **Step 4:** Run `npx vitest run src/server` and `npx tsc --noEmit` — PASS.
- [ ] **Step 5:** Commit `feat(stats): probability card data, gating and explanations`.

### Task 9: Dark theme

**Files:**

- Modify: `src/app/globals.css`, `src/app/(marketing)/layout.tsx`, `src/app/(platform)/layout.tsx`, `src/app/(auth)/layout.tsx`, hard-coded light utility classes found by `grep -rnE "bg-white|text-black|bg-gray-|text-gray-|border-gray-" src`
- Test: `src/shared/lib/theme-contrast.test.ts`

**Interfaces:** no new exports; the test reads `src/app/globals.css`.

- [ ] **Step 1: Write the failing test:** parse the `.dark { … }` token block and assert WCAG contrast ≥ 4.5 for `foreground/background`, `card-foreground/card`, `muted-foreground/background`, `primary-foreground/primary`, `accent-foreground/accent`, and ≥ 3 for each `--chart-N` against `--card`. Also assert there are five distinct chart colours.
- [ ] **Step 2:** Run `npx vitest run src/shared/lib/theme-contrast.test.ts` — FAIL on the current amber palette.
- [ ] **Step 3:** Rework the `.dark` tokens: near-black blue-grey background, `--primary` green, `--accent`/violet as the second accent, `--chart-1` green, `--chart-2` violet, three further hues distinguishable from both (series also differ by marker/dash). Make the site always dark: add `className="dark"` on `<html>` in all three layouts and `forcedTheme="dark"` on both `ThemeProvider`s; drop the `:root` light tokens' use by copying the dark values into `:root` as well so shadcn components render dark without the class. Replace hard-coded light classes with tokens.
- [ ] **Step 4:** Run the test — PASS. Start the dev server (`npm run dev`), open `/`, `/players`, `/fixtures`, `/how-we-calculate`, `/sign-in`, and (with a test login from the project's seed/e2e setup, local DB only) `/builder`, `/dashboard`, `/wallet`, `/profile`; screenshot each in the built-in browser and fix unreadable text, white panels and invisible borders.
- [ ] **Step 5:** Commit `style: dark theme with green and violet accents`.

### Task 10: Chart primitives and chart data helpers

**Files:**

- Create: `src/shared/ui/chart.tsx` (via `npx shadcn@latest add chart`, which adds `recharts`), `src/views/stats/ui/charts/chart-data.ts`, `form-chart.tsx`, `goal-outlook-chart.tsx`, `points-distribution-chart.tsx`, `minutes-chart.tsx`
- Test: `src/views/stats/ui/charts/chart-data.test.ts`

**Interfaces:**

- Consumes: `FormMatch`, `PlayerProbabilityCard['matches']`.
- Produces (`chart-data.ts`, pure):
    - `type FormPeriod = 5 | 10`; `formSeries(matches: FormMatch[], period: FormPeriod): { label: string; goals: number; xg: number | null; assists: number; xa: number | null; hasXg: boolean }[]` — last `period` matches in kickoff order, label `"vs ARS (H)"` / `"at ARS (A)"`; a double gameweek stays two entries.
    - `goalOutlookSeries(matches: PlayerProbabilityCard['matches']): { label: string; horizon: number; pGoal: number | null }[]`.
    - `bucketBars(buckets: number[] | null): { label: '0–2' | '3–5' | '6–9' | '10+'; share: number }[] | null`.
    - `minutesSeries(matches: FormMatch[]): { label: string; minutes: number; role: 'start' | 'sub' | 'unused' }[]` — `role` by `started` and `minutes`.
- Chart components are `'use client'`; each takes the matching series, renders a titled card with the question it answers, axis titles with units (`Goals per match`, `Probability, %`, `Share of simulations, %`, `Minutes`), a tooltip, a visually hidden data table fallback, and the forecast/fact styling from Global Constraints. `FormChart` has a 5 / 10 toggle (buttons, `aria-pressed`) and draws xG/xA as dashed lines over solid goal/assist bars; `minutesSeries` roles use different marker shapes (filled bar = start, hatched = sub, outline = unused) in addition to colour.

- [ ] **Step 1: Write failing tests** for the helpers: `formSeries keeps both matches of a double gameweek`, `formSeries last 5 of 10 keeps kickoff order`, `formSeries marks hasXg false when xg is null and never substitutes 0`, `goalOutlookSeries keeps null as null`, `bucketBars is null for null input and sums to 1 otherwise`, `minutesSeries marks a 0-minute row unused and started=false with minutes > 0 as sub`.
- [ ] **Step 2:** Run `npx vitest run src/views/stats/ui/charts` — FAIL.
- [ ] **Step 3:** Run `npx shadcn@latest add chart`, confirm it pins a recharts version in `package.json`; implement helpers, then components.
- [ ] **Step 4:** Run the tests — PASS; `npx tsc --noEmit` and `npm run lint` clean for the new files.
- [ ] **Step 5:** Commit `feat(ui): chart primitives and player charts`.

### Task 11: Player card page

**Files:**

- Modify: `src/views/stats/ui/player-profile-view.tsx`, `src/views/stats/ui/format.ts`, `src/app/(marketing)/players/[id]/page.tsx` (metadata text)
- Create: `src/views/stats/ui/probability-card.tsx`
- Test: `src/views/stats/ui/format.test.ts`

**Interfaces:**

- Consumes: `PlayerProfile.probabilities`, `formatChance`, the four charts.
- Produces: `ProbabilityCard({ card: PlayerProbabilityCard | null; status: 'off' | 'lowData' | 'ok' })`.

Layout, top to bottom: header (existing) → **Forecast · next match** card (opponent and home/away, the six figures: goal, assist, start, minutes, points, team win/draw/lose; footer line `Forecast · model ewma-poisson-v2 · updated <date> · How we calculate`; a gated-off figure shows `—` with the off reason as tooltip text) → 1–3 explanation sentences → `Next 5 matches: goal chance` chart → `Points distribution` chart (hidden when `pointsBuckets` is null) → **Facts** section: `Form, last 10` chart, `Playing time` chart, existing season totals and recent matches table. `lowData` shows `Not enough data yet: fewer than 3 appearances` instead of figures; no evaluation or all gates off shows facts only with a one-line reason linking to `/how-we-calculate`. Remove the old `Next gameweek forecast` component-breakdown card; keep the v1 expected points as the points figure when `pointsMeanOn` is false.

- [ ] **Step 1: Write failing tests** for the format helpers (`format.ts`): `formatChance` re-export cases from Task 8 if not already exported there, `formatMinutes(78.4) === '78'`, `formatPoints(5.84) === '5.8'`, `formatPoints(null) === '—'`.
- [ ] **Step 2:** Run `npx vitest run src/views/stats` — FAIL.
- [ ] **Step 3:** Implement the view; update the page metadata description to mention chances.
- [ ] **Step 4:** Run tests; then `npm run dev` and open a player page for (a) a regular starter, (b) a player with fewer than 3 appearances, (c) an injured player, (d) a double-gameweek player if one exists; screenshot desktop and a 375px viewport; confirm no horizontal scroll, readable charts, and the fact/forecast separation.
- [ ] **Step 5:** Commit `feat(stats): player probability card`.

### Task 12: Players table and fixtures page

**Files:**

- Modify: `src/views/stats/ui/players-list-view.tsx`, `src/views/stats/ui/fixtures-view.tsx`, `src/app/(marketing)/players/page.tsx`, `src/app/(marketing)/fixtures/page.tsx`, `src/app/(marketing)/_lib/stats-cache.ts`
- Create: `src/views/stats/ui/fixture-heatmap.tsx`

**Interfaces:**

- Consumes: `PlayerListItem.next`, `IStatsService.getFixtures()`, `IStatsService.getHeatmap()`; add `getHeatmapCached` (same `unstable_cache` pattern).
- Produces: `FixtureHeatmap({ data: Awaited<ReturnType<IStatsService['getHeatmap']>>; metric: 'xg' | 'cs' })`; the metric comes from the `?metric=` search param (server-rendered links, no client state).

Table: new columns `Goal %`, `Assist %`, `Start %` for the next match (`—` with tooltip when gated off), sort options for them (`—` last), position/club filters unchanged. Fixtures page: each match shows `Home win / Draw / Away win` percentages (omitted when the outcome gate is off) and the heatmap below: rows clubs, columns the next 8 gameweeks, each cell prints the number (`1.9` expected goals, or `31%` clean-sheet chance) plus `H`/`A`, shade from one sequential hue; a double gameweek stacks two values in one cell, a blank gameweek prints `–` with `title="No match"`; the toggle links switch metric; a caption states what the number means and that it is a forecast.

- [ ] **Step 1:** Implement the table columns, sort and fixtures/heatmap views.
- [ ] **Step 2:** Run `npx tsc --noEmit` and `npm run lint` — clean.
- [ ] **Step 3:** Run the dev server; check `/players?sort=pGoal`, `/fixtures`, `/fixtures?metric=cs` at desktop and 375px; verify a blank and a double gameweek cell if present in data; screenshot.
- [ ] **Step 4:** Commit `feat(stats): probabilities in the players table and fixtures heatmap`.

### Task 13: "How we calculate" page

**Files:**

- Modify: `src/views/stats/ui/method-view.tsx`, `src/app/(marketing)/how-we-calculate/page.tsx`, `src/app/(marketing)/_lib/stats-cache.ts`

**Interfaces:**

- Consumes: `IProbabilityService.getStatus()` (expose through `IStatsService.getProbabilityStatus()` + cached reader).

Content: model v2 description in plain English (inputs: recent form blended with FPL xG/xA at weight `xgWeight`, expected minutes and start chance, opponent strength, home/away; outputs; Monte Carlo for the points distribution), the documented parameters (`decay`, `minutesDecay`, `priorMinutes90`, `xgWeight`, `sims`, gate constants from `GATE`), a gate table (metric × horizon × position: records, Brier vs baseline, `On` / `Off` with reason), a calibration table per gated metric (bucket, predicted %, observed %, n) with the sentence "when we say 40%, it happened N% of the time", the baseline definitions, data sources and update times, and the disclaimer that forecasts are not betting advice or guarantees. Keep the existing v1 accuracy section.

- [ ] **Step 1:** Implement the page content and the cached reader.
- [ ] **Step 2:** Run `npx tsc --noEmit`, `npm run lint`; open `/how-we-calculate` in the dev server with and without evaluation rows (empty state: "The first accuracy check has not run yet, so probabilities are off"); screenshot.
- [ ] **Step 3:** Commit `feat(stats): method page for probabilities`.

### Task 14: Real-data run and verification

**Files:**

- Modify: `docs/superpowers/specs/2026-11-16-stage-3-player-probabilities-design.md` (append "Результат проверки модели v2" with the measured numbers)

- [ ] **Step 1:** Ask the user which database to use (local, not `.env.prod`); with it set, run `npm run sync -- fpl-matches` repeatedly until the stats show `failed: 0` and no remaining players (each run is capped at 350 players).
- [ ] **Step 2:** Run `npm run sync -- probability`. Record, from `model_evaluations` (`model_version = 'ewma-poisson-v2'`): events evaluated, every gate's n, Brier vs baseline and pass/fail, and the points-mean check.
- [ ] **Step 3:** Open a regular player, a rotation player and a goalkeeper in the dev server; confirm every gated-off figure shows `—`, calibration tables on `/how-we-calculate` match the stored rows, and the numbers on the card equal the stored `match_probabilities` rows.
- [ ] **Step 4:** Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Expected: all pass. Report honestly any gate that failed and what that hides on the site.
- [ ] **Step 5:** Append the measured results to the spec and commit `docs: stage 3 model check results`.
