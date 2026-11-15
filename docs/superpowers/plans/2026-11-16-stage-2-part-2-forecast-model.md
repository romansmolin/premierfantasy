# Stage 2, Part 2 — Forecast Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Predict each Premier League player's FPL points for the next gameweek with our own model, check it honestly against FPL's actual points (walk-forward), and publish forecasts only while the model beats a naive baseline.

**Architecture:** Pure functions (rules, math, team strength, per-player model, calibration, evaluation) under `src/server/prediction/lib/`, fed by one repository that loads match stats, fixtures, FPL mappings/status/points into memory. A `forecast` sync job (new, last in `short`/`full`) evaluates the model over the finished events, stores a `ModelEvaluation`, and stores `Prediction` rows for the next event. "Forecast enabled" is derived from the latest stored evaluation.

**Tech Stack:** TypeScript, Prisma 7, Vitest. No new dependencies (math is small and written in-house).

**Spec:** `docs/superpowers/specs/2026-11-15-stage-2-epl-analytics-design.md` (section «Прогноз очков» and «Как измеряется планка»). Part 1 data is in the database (fixtures, `player_match_stats`, FPL maps/points/events).

## Global Constraints

- Own algorithm: expected minutes × per-90 rates × opponent/venue difficulty, converted to points by **current FPL rules** (below). One upcoming event only.
- FPL rules verified against FPL live data on 2026-11-16 (`explain` of events 8–10): minutes 1 pt (1–59) / 2 pts (60+); goals GK/DEF 6, MID 5, FWD 4; assist 3; clean sheet (60+ min) GK/DEF 4, MID 1, FWD 0; goals conceded −1 per 2 (GK/DEF); saves 1 per 3 (GK); penalty save 5, penalty miss −2; own goal −2; yellow −1, red −3; bonus 1–3; defensive contribution: DEF ≥ 10 actions = 2 pts, MID/FWD ≥ 12 = 2 pts (FPL counts clearances/blocks/interceptions/tackles, + recoveries for MID/FWD; API-Football has tackles, blocks, interceptions only, so the model undercounts them and calibration absorbs the gap). GK get no DC points.
- Match statistics only from API-Football data already stored (`player_match_stats`, `fixtures`); FPL is used for: actual points (evaluation only), mapping, player availability (status, chance of playing, FPL team) — never FPL statistics or `ep_next`.
- **Bar (spec):** model beats the baseline «average FPL points of the player's last 5 appearances» on **both** pooled MAE and mean within-position rank correlation, judged only on FPL actuals of the current season, at least **8 evaluated events** (and ≥ 500 player-events); evaluated players are those mapped to FPL with model expected minutes ≥ 30 and at least one prior appearance. Evaluation is recomputed on every run; «enabled» = the latest evaluation passed.
- No leakage: a forecast for event N may only use matches with kickoff before the first kickoff of event N, FPL points of events < N, and availability as stored now only for the _upcoming_ event (past events assume availability 1).
- Follow `CLAUDE.md` / `docs/server-architecture.md` (§6.7 sync jobs): job services in `src/server/<entity>/`, wired in `src/server/sync/sync.container.ts`; no `console.log`; `import type`; no `any`; commit subjects start lower-case (commitlint).
- Production database is remote and slow; never run writes against it from tests. Experiments (Task 8) are read-only against production or run on a throwaway Postgres in Docker.
- Work on branch `stage-2-part-2` (already created from `main`).

## Review Focus

1. **Future leaks into the past:** inputs for event N must exclude matches with kickoff ≥ cutoff. Test: Task 5 (`buildInputs ignores matches at or after the cutoff`).
2. **Newcomer with no history / unknown position data:** no crash, expected minutes from availability only, excluded from evaluation. Test: Task 4 (`a player with no history`), Task 6.
3. **Unavailable player (status injured/suspended/unavailable or chance 0):** expected minutes and points 0. Test: Task 4.
4. **Double and blank gameweeks:** two fixtures add up; no fixture → 0 and the player is not evaluated. Test: Task 4 (`double gameweek`, `blank gameweek`).
5. **Too little data or a failing model:** evaluation never throws, reports `passed = false` and why; consumers read `enabled`. Test: Task 6.
6. **No upcoming event / FPL data missing:** the job fails with a clear message instead of writing nothing silently. Test: Task 7.

---

### Task 1: FPL points rules and points calculator

**Files:** Create `src/server/prediction/lib/scoring-rules.ts`, test `scoring-rules.test.ts`.

**Interfaces — Produces:**

```ts
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD'
export const FPL_RULES: { goal: Record<Position, number>; assist: 3; cleanSheet: Record<Position, number>; dcThreshold: Record<Position, number | null>; dcPoints: 2; ... }
export interface PointsInput { position: Position; minutes: number; goals: number; assists: number; cleanSheet: boolean; goalsConceded: number; saves: number; penaltiesSaved: number; penaltiesMissed: number; ownGoals: number; yellowCards: number; redCards: number; defensiveActions: number }
/** Points without bonus. */
export function pointsFromStats(input: PointsInput): number
```

- [ ] **Step 1: Write failing tests** (`scoring-rules.test.ts`): `0 minutes scores 0`; `30 minutes scores 1, 60 minutes scores 2`; `goal is 6/6/5/4 by position`; `assist is 3`; `clean sheet needs 60 minutes: GK/DEF 4, MID 1, FWD 0`; `goals conceded cost 1 per 2 for GK/DEF only` (3 conceded → −1, 4 → −2, MID 4 → 0); `saves: 5 saves → 1, 6 → 2 (GK only)`; `cards and own goal and penalties` (yellow −1, red −3, OG −2, pen miss −2, pen save 5); `defensive contribution: DEF 10 actions → 2, 9 → 0; MID 12 → 2, 11 → 0; GK never`; a combined realistic line (DEF, 90 min, clean sheet, 1 goal, 11 actions → 2+4+6+2 = 14).
- [ ] **Step 2:** `npx vitest run src/server/prediction/lib/scoring-rules.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `FPL_RULES` and `pointsFromStats`.
- [ ] **Step 4:** tests PASS; `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` empty.
- [ ] **Step 5:** Commit `feat(prediction): fpl points rules and calculator`.

---

### Task 2: Math helpers

**Files:** Create `src/server/prediction/lib/math.ts`, test `math.test.ts`.

**Interfaces — Produces:**

```ts
export const clamp: (x: number, lo: number, hi: number) => number
export function weightedMean(values: number[], weights: number[]): number // 0 when weights sum to 0
export function decayWeights(n: number, decay: number): number[] // [1, d, d², …], newest first
export function shrunkRate(sum: number, exposure: number, priorRate: number, priorExposure: number): number // (sum + prior*priorExposure)/(exposure + priorExposure)
export function poissonPmf(k: number, lambda: number): number
export function poissonAtLeast(k: number, lambda: number): number // P(X >= k)
export function expectedHalfConceded(lambda: number): number // E[floor(G/2)], G ~ Poisson(lambda)
export function mean(xs: number[]): number
export function mae(predicted: number[], actual: number[]): number
export function spearman(xs: number[], ys: number[]): number // average ranks for ties; NaN-safe: 0 when fewer than 2 points or no variance
export function fitLinear(xs: number[], ys: number[]): { intercept: number; slope: number }
```

- [ ] **Step 1: Write failing tests:** `poissonPmf(0, 1.5) ≈ 0.2231`, `poissonPmf(2, 2) ≈ 0.2707`; `poissonAtLeast(0, x) = 1`, `poissonAtLeast(1, 1) ≈ 0.6321`; `expectedHalfConceded(0) = 0`, and for λ=1.2 equals the direct sum over g=0..20 of pmf·floor(g/2) within 1e-9; `shrunkRate` with exposure 0 returns the prior, with huge exposure returns sum/exposure; `weightedMean([1,3],[1,1]) = 2`, empty/zero weights → 0; `decayWeights(3, 0.5) = [1, 0.5, 0.25]`; `mae([1,2],[2,4]) = 1.5`; `spearman` of identical order = 1, reversed = −1, ties use average ranks (`spearman([1,1,2],[1,2,3])` ≈ 0.866), constant input → 0; `fitLinear` of y = 2x + 1 gives slope 2, intercept 1, and constant x gives slope 0 with intercept = mean(y); `clamp`.
- [ ] **Step 2–5:** run → FAIL; implement; PASS + tsc; commit `feat(prediction): math helpers`.

---

### Task 3: Schema, migration, FPL availability

**Files:**

- Create: `prisma/schema/forecast.prisma` (`Prediction`, `ModelEvaluation`), add `FplPlayerStatus` to `prisma/schema/fpl.prisma`, `prisma/migrations/20261116010000_add_forecast/migration.sql` (generate with `prisma migrate diff` against a throwaway Postgres where earlier migrations were applied — never the configured DB).
- Modify: `src/server/fpl/repository/fpl.repository.interface.ts` + `.ts` (`saveAvailability`), `src/server/fpl/service/fpl-sync.service.ts` (call it in `syncBootstrap`), `src/server/fpl/lib/fpl.types.ts` if a field is missing.
- Test: extend `src/server/fpl/service/fpl-sync.service.test.ts`.

**Models:**

- `FplPlayerStatus`: `fplId` Int pk, `teamId` String? (our `Team.id` of the player's current FPL team), `status` String (`a` available, `d` doubtful, `i` injured, `s` suspended, `u` unavailable, `n` not in squad), `chanceOfPlaying` Int? (next round, null = no info), `news` String, `updatedAt`.
- `Prediction`: `id` uuid, `fplEvent` Int, `playerId` → Player (cascade), `modelVersion` String, `expectedMinutes` Float, `expectedPoints` Float (calibrated), `rawPoints` Float, `components` Json, `createdAt`; unique `(fplEvent, playerId, modelVersion)`, index `fplEvent`.
- `ModelEvaluation`: `id` cuid, `modelVersion` String, `createdAt`, `eventsEvaluated` Int, `playerEvents` Int, `mae`, `baselineMae`, `rankCorr`, `baselineRankCorr` Float, `passed` Boolean, `details` Json; index `(modelVersion, createdAt)`.

**Interfaces — Produces:** `IFplRepository.saveAvailability(rows: { fplId: number; teamId: string | null; status: string; chanceOfPlaying: number | null; news: string }[]): Promise<void>` (upsert in chunks of `WRITE_CHUNK_SIZE`, from `src/server/sync/lib/chunk.ts`).

- [ ] **Step 1: Write failing tests** in `fpl-sync.service.test.ts`: `syncBootstrap saves availability for every FPL player` (status/chance/news copied, `teamId` = the matched club's id via the team map) and `availability of unmapped players is saved too` (it is keyed by FPL id); add `saveAvailability: vi.fn()` to the fake repo.
- [ ] **Step 2:** run → FAIL. **Step 3:** schema + migration (docker throwaway: apply all migrations, `migrate diff … --script`, verify empty diff after applying), `prisma generate`, prettier on `generated/prisma`, implement repository + service call (after `setTeamFplIds`, before prices; one extra write, no failure of price logic).
- [ ] **Step 4:** `npm test`, tsc, lint. **Step 5:** commit `feat(db): forecast tables and fpl availability`. List the migration for the user.

---

### Task 4: Team strength and the per-player model (pure)

**Files:** Create `src/server/prediction/lib/team-strength.ts`, `model.ts`, tests `team-strength.test.ts`, `model.test.ts`.

**Interfaces — Produces:**

```ts
// team-strength.ts
export interface FinishedMatch {
    kickoff: Date
    homeTeamId: string
    awayTeamId: string
    homeGoals: number
    awayGoals: number
}
export interface TeamStrengths {
    leagueGoalsPerTeam: number
    attack: Map<string, number>
    defence: Map<string, number>
} // 1 = league average
export function computeTeamStrengths(
    matches: FinishedMatch[],
    cutoff: Date,
    opts?: { lastN?: number; priorMatches?: number },
): TeamStrengths // last 8 matches before cutoff, shrunk with 4 prior matches
export function expectedGoals(
    s: TeamStrengths,
    teamId: string,
    opponentId: string,
    isHome: boolean,
): { for: number; against: number } // league mean × attack × opp defence × venue (home 1.15 / away 0.87), strengths default 1 for unknown teams

// model.ts
export const MODEL_VERSION = 'ewma-poisson-v1'
export interface MatchLine {
    minutes: number
    goals: number
    assists: number
    saves: number
    yellowCards: number
    redCards: number
    defensiveActions: number
}
export interface PositionPrior {
    goals: number
    assists: number
    saves: number
    yellowCards: number
    redCards: number
    defensiveActions: number
} // per 90
export interface FixtureContext {
    isHome: boolean
    teamGoalsFor: number
    teamGoalsAgainst: number
    teamBaselineGoals: number
}
export interface PlayerInput {
    position: Position
    appearances: MatchLine[] // newest first, only minutes > 0, at most 10
    teamMatchMinutes: number[] // minutes in the team's last 6 matches, newest first, 0 when absent
    availability: number // 0..1; 0 = out
    fixtures: FixtureContext[] // empty in a blank gameweek
    prior: PositionPrior
}
export interface ModelParams {
    decay: number
    minutesDecay: number
    priorMinutes90: number
    attackClamp: [number, number]
}
export const DEFAULT_PARAMS: ModelParams
export interface PlayerForecast {
    expectedMinutes: number
    rawPoints: number
    components: Record<string, number>
}
export function predictPlayer(input: PlayerInput, params?: ModelParams): PlayerForecast
```

**Model definition (the algorithm the tests do not determine):** per fixture: `pPlay = availability × decay-weighted share of team matches with minutes > 0`, `p60` likewise for ≥ 60, `expMin = availability × decay-weighted mean of teamMatchMinutes`; rates per 90 = `shrunkRate(Σ w·stat, Σ w·minutes/90, prior, priorMinutes90)` with weights `decay^k` and exposure in 90s; `attack = clamp(teamGoalsFor / teamBaselineGoals, attackClamp)`; points = `pPlay·1 + p60·1 + rateGoals·expMin/90·attack·goalPts + rateAssists·expMin/90·attack·3 + P(cs)·p60·csPts + (−expectedHalfConceded(teamGoalsAgainst))·expMin/90 [GK/DEF] + rateSaves·expMin/90/3 [GK] − (rateYellow + 3·rateRed)·expMin/90 + P(Poisson(rateDC·expMin/90) ≥ threshold)·2 [not GK]` with `P(cs) = exp(−teamGoalsAgainst)`; sum over fixtures; `components` holds each term. Defaults: `decay 0.85`, `minutesDecay 0.8`, `priorMinutes90 3`, `attackClamp [0.6, 1.8]`.

- [ ] **Step 1: Write failing tests.** team-strength: `a team that scores twice the league average gets attack ≈ 2 shrunk toward 1`, `matches at or after the cutoff are ignored`, `unknown team defaults to 1`, `home team expects more goals than the same fixture away`. model: `a player with no history and full availability still returns finite numbers` (Review Focus 2); `unavailable (availability 0) gives 0 minutes and 0 points` (3); `double gameweek is about twice a single fixture for the same player` (4, within 1e-9 when both fixtures are identical); `blank gameweek (no fixtures) gives 0 points` (4); `a defender with a strong defence and a weak opponent attack scores more than the reverse`; `a striker with a higher goals-per-90 history scores more`; `more minutes in recent team matches means more expected points`; `GK gets no goals/DC terms and saves points; MID/FWD get no goals-conceded penalty`; `components sum equals rawPoints`.
- [ ] **Step 2–5:** run → FAIL; implement; PASS + tsc + lint; commit `feat(prediction): team strength and per-player points model`.

---

### Task 5: Building model inputs from stored data (pure) and the data repository

**Files:**

- Create: `src/server/prediction/lib/inputs.ts` + `inputs.test.ts`, `src/server/prediction/repository/forecast-data.repository.interface.ts` + `forecast-data.repository.ts`.

**Interfaces — Produces:**

```ts
// inputs.ts
export interface StoredMatch {
    kickoff: Date
    fixtureId: string
    teamId: string
    playerId: string
    minutes: number
    goals: number
    assists: number
    saves: number
    yellowCards: number
    redCards: number
    tackles: number
    blocks: number
    interceptions: number
    position: Position | null
}
export interface UpcomingFixture {
    fixtureId: string
    kickoff: Date
    homeTeamId: string
    awayTeamId: string
}
export interface ForecastDataset {
    matches: StoredMatch[] // all player lines, any order
    fixtures: (FinishedMatch & { fixtureId: string; fplEvent: number | null; status: string })[] // all fixtures of the current + previous season
    players: { playerId: string; fplId: number; position: Position; currentTeamId: string | null }[] // FPL-mapped players
    fplPoints: Map<string, Map<number, { totalPoints: number; minutes: number }>> // playerId → event → points
    availability: Map<string, { status: string; chanceOfPlaying: number | null }> // playerId → latest availability
    events: { id: number; finished: boolean; isNext: boolean; isCurrent: boolean }[]
}
export function availabilityFactor(a?: { status: string; chanceOfPlaying: number | null }): number // a → 1; d with chance c → c/100; i,s,u,n → 0 unless chance > 0 then chance/100; null chance with d → 0.75
export function positionPriors(
    matches: StoredMatch[],
    positionOf: Map<string, Position>,
    cutoff: Date,
): Record<Position, PositionPrior> // minutes-weighted per-90 league rates by position from lines before cutoff
export function buildInputsForEvent(
    data: ForecastDataset,
    event: number | 'next',
    opts: { useAvailability: boolean },
): { cutoff: Date; inputs: { playerId: string; input: PlayerInput }[] }
```

`buildInputsForEvent`: cutoff = earliest kickoff among fixtures with `fplEvent === event` (for `'next'`, the event with `isNext`; if none, the lowest event that is not finished); a player's team = team of the player's latest stored match before the cutoff, else `currentTeamId`; when `useAvailability`, availability from the map, else 1; `appearances`/`teamMatchMinutes` come only from lines with kickoff < cutoff (**no leakage**); team matches = the team's last 6 finished fixtures before the cutoff (player minutes 0 when no line); fixtures of the event involving the player's team become `FixtureContext` using `computeTeamStrengths(..., cutoff)` + `expectedGoals`, `teamBaselineGoals` = the team's shrunk average goals scored before the cutoff.

Repository `IForecastDataRepository.loadDataset(): Promise<ForecastDataset>` — Prisma reads: `player_match_stats` ⨝ `fixtures` (kickoff, team ids), fixtures of the two newest league seasons with goals, `fpl_player_maps` ⨝ players, `fpl_event_points`, `fpl_player_status`, `fpl_events`. One query each, no N+1; stats rows ~19k.

- [ ] **Step 1: Write failing tests** (`inputs.test.ts`, small hand-made dataset): `buildInputs ignores matches at or after the cutoff` (a goal in a match after the cutoff must not change the input) (Review Focus 1); `uses the player's latest team before the cutoff`; `double gameweek yields two fixture contexts, blank gameweek none`; `availability is only applied when useAvailability is set`; `availabilityFactor`: available → 1, injured → 0, doubtful 50 → 0.5, doubtful without chance → 0.75, injured with 25 → 0.25; `positionPriors uses only lines before the cutoff`; `a newcomer with no lines gets empty appearances and the position prior`.
- [ ] **Step 2–5:** FAIL → implement `inputs.ts`; implement the repository (not unit-tested, covered by Task 8); tsc, lint; commit `feat(prediction): build model inputs from stored data`.

---

### Task 6: Calibration, baseline and walk-forward evaluation (pure)

**Files:** Create `src/server/prediction/lib/evaluation.ts` + `evaluation.test.ts`.

**Interfaces — Produces:**

```ts
export interface Calibration {
    intercept: number
    slope: number
} // per position; identity = { 0, 1 }
export function fitCalibration(
    rows: { position: Position; raw: number; actual: number }[],
    minRows?: number,
): Record<Position, Calibration> // identity when a position has fewer than minRows (default 200); slope clamped to [0.5, 1.5]
export interface Evaluation {
    modelVersion: string
    eventsEvaluated: number
    playerEvents: number
    mae: number
    baselineMae: number
    rankCorr: number
    baselineRankCorr: number
    passed: boolean
    reasons: string[]
    details: Record<string, unknown>
}
export function evaluateWalkForward(
    data: ForecastDataset,
    opts?: { lastEvents?: number },
): { evaluation: Evaluation; calibration: Record<Position, Calibration> }
export function passesBar(
    e: Pick<
        Evaluation,
        'eventsEvaluated' | 'playerEvents' | 'mae' | 'baselineMae' | 'rankCorr' | 'baselineRankCorr'
    >,
): { passed: boolean; reasons: string[] }
```

`evaluateWalkForward`: take the last `lastEvents` (default 10) finished events that have stored FPL points; for event N build inputs with `useAvailability: false`, predict raw points, calibrate with `fitCalibration` fitted on rows of events < N only; keep players with `expectedMinutes ≥ 30` and ≥ 1 prior appearance in `fplPoints` (baseline = mean of the player's last 5 stored event point totals before N where minutes > 0); actual = FPL `totalPoints` of event N. MAE pooled over all kept player-events; rank correlation = mean of per-(event, position) Spearman over groups with ≥ 10 players. `passesBar`: model MAE < baseline MAE **and** model rankCorr > baseline rankCorr **and** `eventsEvaluated ≥ 8` **and** `playerEvents ≥ 500`; `reasons` lists every failed condition in words.

- [ ] **Step 1: Write failing tests:** `fitCalibration` recovers y = 2x + 1 for ≥ minRows rows and returns identity below minRows; slope clamp; `passesBar` all four conditions separately (each failing alone gives passed=false and one reason; all good gives passed=true, no reasons); `evaluateWalkForward on a dataset with fewer than 8 finished events returns passed=false with a reason and does not throw` (Review Focus 5); `a model prediction for event N does not use FPL points of event N or later` (put a huge actual in event N and check the baseline for N is unchanged); `players expected to play under 30 minutes are not evaluated`; `a blank-gameweek player is not evaluated` (Review Focus 4).
- [ ] **Step 2–5:** FAIL → implement; PASS + tsc + lint; commit `feat(prediction): walk-forward evaluation and accuracy bar`.

---

### Task 7: Forecast service, storage, job

**Files:**

- Create: `src/server/prediction/repository/forecast.repository.interface.ts` + `forecast.repository.ts`, `src/server/prediction/service/forecast.service.interface.ts` + `forecast.service.ts`, test `forecast.service.test.ts`.
- Modify: `src/server/sync/sync.container.ts` (wire), `src/server/sync/jobs.ts` (`forecast` job; append `'forecast'` to `SHORT_JOBS` and `FULL_JOBS`), `src/server/sync/controller/sync-cron.controller.test.ts` (job list now includes `forecast`).

**Interfaces — Produces:**

```ts
export interface IForecastRepository {
    saveEvaluation(e: Evaluation): Promise<void>
    replacePredictions(fplEvent: number, modelVersion: string, rows: PredictionRow[]): Promise<void> // delete + createMany in one transaction, chunked inserts
    findLatestEvaluation(modelVersion: string): Promise<(Evaluation & { createdAt: Date }) | null>
    findPredictions(fplEvent: number, modelVersion: string): Promise<PredictionRow[]>
}
export interface PredictionRow {
    playerId: string
    expectedMinutes: number
    expectedPoints: number
    rawPoints: number
    components: Record<string, number>
}
export interface IForecastService {
    /** Evaluates the model, stores the evaluation and the predictions of the next event. */
    run(): Promise<JobOutcome>
    /** enabled = the latest stored evaluation of the current model version passed. */
    getStatus(): Promise<{ enabled: boolean; nextEvent: number | null; evaluation: Evaluation | null }>
}
```

`run()`: load dataset (`IForecastDataRepository`), throw `Error('No FPL events stored: run fpl-bootstrap first')` when `events` is empty and `Error('No upcoming FPL event')` when there is none; evaluate; save the evaluation; predict the next event (`useAvailability: true`) with the calibration from the evaluation; store predictions (also when the bar failed — consumers must check `enabled`); stats `{ eventsEvaluated, playerEvents, passed: 0|1, predictions, mae×100 (rounded), baselineMae×100 }`.

- [ ] **Step 1: Write failing tests** (fake repos): `run stores an evaluation and predictions for the next event`; `run stores predictions even when the bar failed and reports passed 0`; `run fails with a clear message when no FPL events are stored` and `…no upcoming event` (Review Focus 6); `getStatus is enabled only when the latest evaluation passed`; `getStatus is disabled when there is no evaluation yet`; `predictions of an unavailable player are 0`.
- [ ] **Step 2–5:** FAIL → implement; register the job; update the cron controller test; `npm test`, tsc, lint; commit `feat(prediction): forecast service and sync job`.

---

### Task 8: Run it on real data and tune (read-only), record the result

**Files:** Create `scripts/forecast-eval.ts` (prints the evaluation as text; **writes nothing**); possibly tweak `DEFAULT_PARAMS` and the constants in Tasks 4–6.

- [ ] **Step 1:** `scripts/forecast-eval.ts`: loads the dataset with `ForecastDataRepository` (reads the production DB through `STORAGE_DATABASE_URL`; read-only queries), runs `evaluateWalkForward`, prints events evaluated, player-events, model vs baseline MAE and rank correlation, per-position MAE, and the calibration; exit 0 always. Never imports a write method.
- [ ] **Step 2:** Run `npx tsx -r dotenv/config scripts/forecast-eval.ts`. Record the numbers in the ledger.
- [ ] **Step 3:** If the bar is not passed, tune within the model's structure (parameters `decay`, `minutesDecay`, `priorMinutes90`, `attackClamp`, venue factors, calibration `minRows`) using **only** the first half of the evaluated events for decisions and report the final numbers on all events; do not add features outside the spec (no FPL `ep_next`, no FPL statistics). Stop after a reasonable effort: an honest `passed = false` is an acceptable outcome and must be reported as such.
- [ ] **Step 4:** Commit `chore(prediction): evaluation script and tuned parameters` (only if code changed).

---

### Task 9: Docs and migration hand-off

**Files:** `docs/server-architecture.md` (§6.7: the `forecast` job, `Prediction`/`ModelEvaluation`, the «enabled» rule), `docs/superpowers/specs/2026-11-15-stage-2-epl-analytics-design.md` (note the measured bar outcome).

- [ ] **Step 1:** write the docs; **Step 2:** commit `docs: forecast model and accuracy bar`.

## Done when

- `npm test`, `npm run lint`, `npx tsc --noEmit -p .` (ignoring `.next/`) pass.
- Task 8 numbers are recorded (pass or honest fail with the reasons).
- The migration `20261116010000_add_forecast` is applied to production by the user's explicit go-ahead (the executor does not apply it unprompted).
