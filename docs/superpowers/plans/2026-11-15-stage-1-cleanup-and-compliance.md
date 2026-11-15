# Stage 1 — Cleanup and Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the fantasy-game app into a clean base for the analytics product: no games, no open endpoints, AI features that really charge credits, and site copy that describes the new product.

**Architecture:** Delete every game module (server, routes, UI, crons, tables). Make credit spending atomic and server-side, and wrap the two surviving AI features (player analysis, match prediction) in a billing + cache service. Rewrite landing and legal copy. Data model for leagues (`League`, `LeagueSeason`, `LeagueSeasonTeam`), players, teams, gameweeks, stats, prices, users and payments stays.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma 7 (PostgreSQL, modular schema in `prisma/schema/`), Better Auth, Zod, SWR, Vitest, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-11-15-analytics-pivot-design.md` (section «Этапы», item 1). Read it first.

## Global Constraints

- Follow `CLAUDE.md` and `docs/server-architecture.md`: Controller → Service → Repository, DI only in `src/shared/lib/container.ts`, routes are one-line delegators, `import type` for types, no `console.log`, no `any`.
- Credit prices (spec): player analysis **10**, match prediction **10**, squad review **30**, auto-build **300**. Defined once in `src/entities/ai/model/ai-pricing.ts`.
- Credit packs unchanged: `src/server/wallet/lib/coin-pricing.ts` (100 = €2, 500 = €8, 1000 = €14).
- User-facing word is **Credits** (capitalised like «Coins» was). DB names (`coinBalance`, `CoinTransaction`, `coin_*`) are **not** renamed.
- Credits never expire. Unused purchased credits are refundable on request within 14 days of purchase; spent credits are not refundable.
- Never delete or modify rows in `users` (except demo users), `coin_transactions`, `payment_tokens`. Balances, including ones earned as `COMPETITION_REWARD`, stay as they are.
- `TransactionType.COMPETITION_REWARD` stays in the enum for old rows; no code creates it any more.
- User-visible text must not contain: competition, contest, prize, leaderboard, entry fee, «win»/«winnings», «compete», «league» in the sense of a user league, «gameweek points» for user squads. Real football leagues («Premier League») are fine.
- Site language: English.
- Never commit `premierfantasy.net_v3.docx` (contains passport and bank data).
- Work on a branch, not `main`.

## Review Focus

1. **Double click / two tabs on a paid AI button** — balance never goes below 0 and each successful generation charges exactly once. Test in Task 2 (`spendOnFeature` throws 402 when the conditional spend fails) and Task 3 (insights service charges after generation only).
2. **OpenAI fails or times out** — user is not charged and nothing is cached. Test in Task 3.
3. **User re-opens the same analysis** — no second charge within the cache window (7 days for a player, forever for a fixture); charged again after the window. Test in Task 3.
4. **Existing balances after the table drop** — `coin_balance`, `coin_transactions`, `payment_tokens` untouched. Check in Task 5 (grep the migration SQL).
5. **Old bookmarked/indexed URLs** (`/competitions`, `/competitions/*`, `/leagues`, `/fantasy-team-builder`) — permanent redirect to `/dashboard`, not a 404. Check in Task 6.

---

### Task 1: Close open endpoints

The seed/debug route deletions (`src/app/api/seed/**`, `src/app/api/debug/**`) are already staged in git; commit them with this task.

**Files:**

- Delete: `src/app/api/wallet/purchase/route.ts`, `src/app/api/wallet/spend/route.ts`
- Delete: `src/app/api/gameweeks/route.ts` `POST` export and `src/app/api/gameweeks/active/route.ts` `PATCH` export (keep the `GET` exports)
- Modify: `src/server/wallet/controller/wallet.controller.ts` (remove `purchase`, `spend`, their schemas)
- Modify: `src/server/wallet/service/wallet.service.ts` + `.interface.ts` (remove `purchaseCoins`)
- Modify: `src/server/gameweek/controller/gameweek.controller.ts` (remove `activate`, `sync`)
- Modify: `src/entities/wallet/api/wallet.service.ts` (remove `purchaseCoins`, `spendCoins`)

Why: `POST /api/wallet/purchase` credits any amount to any signed-in user without payment. `POST /api/wallet/spend` lets the client decide what to charge. `POST /api/gameweeks` and `PATCH /api/gameweeks/active` have no auth and burn API-Football quota / change state.

- [ ] **Step 1:** Create branch `git switch -c stage-1-cleanup`.
- [ ] **Step 2:** Delete/modify the files above. The client hooks that call `spendCoins` (`src/features/ai/*/model/use-*.ts`) will break; in this task replace the `walletService.spendCoins(...)` line with nothing (Task 3 rewrites these hooks properly).
- [ ] **Step 3:** Verify nothing references removed members.
      Run: `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → no output.
      Run: `grep -rn "purchaseCoins\|spendCoins\|wallet/purchase\|wallet/spend\|gameweekController.activate\|gameweekController.sync" src` → no output.
- [ ] **Step 4:** `npm run lint && npm test` → pass.
- [ ] **Step 5:** Commit: `fix(security): remove unauthenticated seed, debug, wallet and gameweek mutation endpoints`.

---

### Task 2: Atomic server-side credit spend

**Files:**

- Modify: `src/shared/lib/http.ts` — add `paymentRequired: (message = 'Not enough credits') => new AppError(402, message)` to `Errors`.
- Modify: `src/server/wallet/repository/wallet.repository.interface.ts` + `wallet.repository.ts`
- Modify: `src/server/wallet/service/wallet.service.interface.ts` + `wallet.service.ts`
- Test: `src/server/wallet/service/wallet.service.test.ts` (new)

**Interfaces:**

- Produces (repository): `spendIfSufficient(userId: string, amount: number, description: string): Promise<boolean>` — one `prisma.$transaction(async (tx) => …)`: `tx.user.updateMany({ where: { id: userId, coinBalance: { gte: amount } }, data: { coinBalance: { decrement: amount } } })`; if `count === 0` return `false`; else create `CoinTransaction { amount: -amount, type: 'AI_FEATURE_SPEND', description }` and return `true`.
- Produces (service): `getBalance(userId: string): Promise<number>`; `spendOnFeature(userId: string, amount: number, featureName: string): Promise<void>` — throws `Errors.badRequest` if `amount <= 0`, `Errors.paymentRequired()` if `spendIfSufficient` returns `false`. Description: `` `Spent ${amount} credits on ${featureName}` ``.
- Leave `awardCompetitionReward` in place; Task 4 removes it together with its only caller (`CompetitionService`).

- [ ] **Step 1: Write failing tests** with a fake `IWalletRepository`:
    - `spendOnFeature charges via spendIfSufficient` → fake returns `true`; expect it was called with `('u1', 10, 'Spent 10 credits on Player analysis')`.
    - `spendOnFeature throws 402 when balance is insufficient` → fake returns `false`; expect rejection with `AppError` whose `statusCode === 402`.
    - `spendOnFeature rejects non-positive amounts` → `amount = 0` → `statusCode === 400`, repository not called.
- [ ] **Step 2:** `npx vitest run src/server/wallet` → FAIL.
- [ ] **Step 3:** Implement the interfaces above. Remove the old read-then-write path.
- [ ] **Step 4:** `npx vitest run src/server/wallet` → PASS; `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → empty.
- [ ] **Step 5:** Commit: `feat(wallet): atomic server-side credit spending`.

---

### Task 3: AI billing and result cache

**Files:**

- Create: `src/entities/ai/model/ai-pricing.ts` (export from `src/entities/ai/index.ts`)
- Create: `prisma/schema/ai.prisma`; add `aiReports AiReport[]` to `User` in `prisma/schema/user.prisma`
- Create: `prisma/migrations/20261115000000_add_ai_reports/migration.sql`
- Create: `src/server/ai/repository/ai-report.repository.interface.ts`, `ai-report.repository.ts`
- Rename: `src/server/ai/service/ai-transfer.service.ts` → `ai-generator.service.ts`, class `AITransferService` → `AIGeneratorService`; delete `analyzeSquad`, `fetchSquadStats`, `fetchTopPerformers`, `callAI` and the `fantasyTeamRepository` constructor param if only they use it
- Create: `src/server/ai/service/ai-generator.service.interface.ts`, `ai-insights.service.interface.ts`, `ai-insights.service.ts`
- Test: `src/server/ai/service/ai-insights.service.test.ts`
- Modify: `src/server/ai/controller/ai.controller.ts`, `src/shared/lib/container.ts`
- Delete: `src/app/api/ai/transfer-suggestions/route.ts` (the client side — `src/features/ai/transfer-suggestions/`, `getTransferSuggestions` in `src/entities/ai/api/ai.service.ts` — is still imported by builder UI and goes in Task 4)
- Modify: `src/features/ai/player-analytics/model/use-player-analytics.ts`, `src/features/ai/match-prediction/model/use-match-prediction.ts`

**Interfaces:**

- `ai-pricing.ts`:
    ```ts
    export type AiFeature = 'PLAYER_ANALYSIS' | 'MATCH_PREDICTION' | 'SQUAD_REVIEW' | 'AUTO_BUILD'
    export const AI_FEATURE_PRICES: Record<AiFeature, number> = {
        PLAYER_ANALYSIS: 10,
        MATCH_PREDICTION: 10,
        SQUAD_REVIEW: 30,
        AUTO_BUILD: 300,
    }
    export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
        PLAYER_ANALYSIS: 'Player analysis',
        MATCH_PREDICTION: 'Match prediction',
        SQUAD_REVIEW: 'Squad review',
        AUTO_BUILD: 'Auto-build',
    }
    ```
- Prisma:
    ```prisma
    model AiReport {
      id         String   @id @default(cuid())
      userId     String   @map("user_id")
      kind       String   // AiFeature
      subjectKey String   @map("subject_key")
      payload    Json
      createdAt  DateTime @default(now()) @map("created_at")
      user User @relation(fields: [userId], references: [id], onDelete: Cascade)
      @@index([userId, kind, subjectKey, createdAt])
      @@map("ai_reports")
    }
    ```
    Migration SQL: hand-written `CREATE TABLE "ai_reports" (...)` + index + FK to `users(id) ON DELETE CASCADE`, matching the model. Do not run `prisma migrate dev` (known drift, see spec); regenerate the client with `npx prisma generate --schema prisma/schema`.
- `IAiReportRepository`: `findLatest(userId: string, kind: AiFeature, subjectKey: string, notBefore: Date | null): Promise<unknown | null>` (newest payload with `createdAt >= notBefore`, or any when `null`); `save(userId: string, kind: AiFeature, subjectKey: string, payload: unknown): Promise<void>`.
- `IAIGenerator` (implemented by `AIGeneratorService`): `analyzePlayer(playerExternalId: number): Promise<PlayerAnalysis>`; `predictMatch(fixtureId: number): Promise<MatchPrediction>`.
- `IAIInsightsService` / `AIInsightsService(generator: IAIGenerator, reports: IAiReportRepository, wallet: IWalletService, now: () => Date = () => new Date())`:
    - `getPlayerAnalysis(userId: string, playerExternalId: number): Promise<PlayerAnalysis>` — kind `PLAYER_ANALYSIS`, key `` `player:${playerExternalId}` ``, cache window 7 days.
    - `getMatchPrediction(userId: string, fixtureId: number): Promise<MatchPrediction>` — kind `MATCH_PREDICTION`, key `` `fixture:${fixtureId}` ``, no window (`notBefore = null`).
    - Order for both: cache hit → return it, no charge. Miss → `wallet.getBalance` < price → `Errors.paymentRequired()` without calling the generator. Generate → `wallet.spendOnFeature(userId, price, AI_FEATURE_LABELS[kind])` → `reports.save` → return. Generator throws → rethrow, no charge, no save.
    - (Cache window approximates the spec's «same gameweek»; gameweek activation dies with the crons in Task 4.)
- Controller: `AIController(insights: IAIInsightsService)`; `getPlayerAnalysis` / `getMatchPrediction` pass `userId`. Remove `getTransferSuggestions`.
- Client hooks: no client-side spending. Use `AI_FEATURE_PRICES` for `cost`; on `ApiError` with status 402 show toast `Not enough credits. You need ${cost} credits.` with a link/action to `/wallet`; after a successful call `mutateWallet()`.

- [ ] **Step 1: Write failing tests** (fakes for all three deps, fixed `now`):
    - `returns cached player analysis without charging` → `findLatest` returns payload; generator and `spendOnFeature` not called.
    - `charges 10 credits and caches on a miss` → `spendOnFeature('u1', 10, 'Player analysis')` called once, `save('u1', 'PLAYER_ANALYSIS', 'player:7', result)` called once.
    - `looks up player cache 7 days back` → `findLatest` called with `notBefore = now - 7*24h`.
    - `match prediction cache has no window` → `findLatest(..., 'fixture:99', null)`.
    - `throws 402 before generating when balance is too low` → `getBalance` returns 9; rejection `statusCode === 402`; generator not called.
    - `does not charge or cache when generation fails` → generator rejects; `spendOnFeature` and `save` not called.
    - `does not cache when the charge fails` → `spendOnFeature` rejects with 402; `save` not called; rejection propagates.
- [ ] **Step 2:** `npx vitest run src/server/ai` → FAIL.
- [ ] **Step 3:** Implement everything in Files/Interfaces, wire it in `container.ts` (one `AiReportRepository`, `AIGeneratorService`, `AIInsightsService(aiGeneratorService, aiReportRepository, walletService)`).
- [ ] **Step 4:** `npx vitest run` → PASS; `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → empty; `npm run lint` → pass.
- [ ] **Step 5:** Commit: `feat(ai): charge credits server-side and cache AI insights`.

---

### Task 4: Remove the fantasy game code

**Delete (whole paths):**

- Server: `src/server/competition`, `src/server/demo`, `src/server/fantasy-team`, `src/server/league-membership`, `src/server/league`, `src/server/orchestrator`, `src/server/scoring`
- API: `src/app/api/competitions`, `src/app/api/cron`, `src/app/api/fantasy-teams`, `src/app/api/leagues`, `src/app/api/scoring`
- Pages: `src/app/(platform)/competitions`, `src/app/(platform)/leagues`, `src/app/(platform)/fantasy-team-builder`
- Views: `competition-detail-view`, `competitions-view`, `fantasy-team-builder-view`, `gameweek-detail-view`, `leagues-browser`, `live-gameweek-view`
- Widgets: `src/widgets/fantasy-team`
- Features: `src/features/competition`, `src/features/fantasy-team`, `src/features/league`, `src/features/player/select-player`, `src/features/player/selection-summary`, `src/features/player/transfer`, `src/features/ai/transfer-suggestions` (+ `getTransferSuggestions` in `src/entities/ai/api/ai.service.ts`)
- Wallet: `awardCompetitionReward` and `REWARD_MAP` in `src/server/wallet/service/wallet.service.ts` + interface
- Entities: `src/entities/competition`, `src/entities/fantasy-team`, `src/entities/league`; in `src/entities/gameweek` delete `gameweek-live.types.ts` and anything only the deleted code used
- Shared: `src/shared/config/demo.ts`, `src/shared/lib/cron-auth.ts` + its test
- Scripts: `scripts/seed-demo-competitors.ts`, `process-demo-competitions.ts`, `recalculate-demo-scores.ts`, `ensure-competitions.ts`, `repair-competitions.ts`, `backfill-player-prices-pl-2025.ts`; `prisma/seed.ts`
- `package.json` scripts `seed:demo`, `demo:process`, `demo:recalc` (and a `prisma.seed` entry if present)
- `vercel.json` (all three crons are game crons; the file has nothing else)

**Modify:**

- `src/shared/lib/container.ts` — drop every removed import, instance and export.
- `scripts/seed-leagues.ts` — remove the block that links legacy competitions (`prisma.competition.updateMany`, ~line 578–594).
- `src/features/player/explore-players/ui/players-explorer.tsx` — remove `SelectPlayerCheckbox` and the price display (`usePrices`, `getFallbackPrice`); prices are fake until stage 2.
- Keep: `src/server/pricing`, `src/server/gameweek` (GET only), `src/server/player-gameweek-stats`, `src/server/teams`, `src/server/fixtures`, `scripts/seed-leagues.ts`, `scripts/sync-league-squads.ts`.

Rule: when `tsc` flags a reference into deleted code, delete the referencing code too (or the reference) — never stub the deleted module. Builder UI can be restored from git history in stage 2 if needed.

- [ ] **Step 1:** Delete and modify as listed.
- [ ] **Step 2:** `npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → fix until empty.
- [ ] **Step 3:** `grep -rniE "competition|fantasyTeam|leagueMembership|scoring|isDemo|demo" src scripts --include='*.ts' --include='*.tsx' -l` → only expected hits (e.g. API-Football `league` params, `docs/`); review each.
- [ ] **Step 4:** `npm run lint && npm test && npm run build` → pass.
- [ ] **Step 5:** Commit: `refactor!: remove fantasy game modules, routes, crons and scripts`.

---

### Task 5: Drop game tables

**Files:**

- Delete: `prisma/schema/fantasy-team.prisma`
- Modify: `prisma/schema/competition.prisma` — delete `Competition`, `LeagueMembership`; remove `competitions`, `memberships` relations from `League`, `LeagueSeason`. Keep `League`, `LeagueSeason`, `LeagueSeasonTeam`.
- Modify: `prisma/schema/user.prisma` — remove `fantasyTeams`, `leagueMemberships`, `isDemo`.
- Modify: `prisma/schema/football-data.prisma` — remove `fantasyTeamSlots`, `transfersIn`, `transfersOut` from `Player`; `points`, `transfers` from `Gameweek`.
- Create: `prisma/migrations/20261115010000_remove_fantasy_game/migration.sql`

Migration SQL (in this order):

```sql
DROP TABLE IF EXISTS "gameweek_points", "transfers", "fantasy_team_players", "fantasy_teams", "league_memberships", "competitions" CASCADE;
DELETE FROM "users" WHERE "is_demo" = true;
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_demo";
```

- [ ] **Step 1:** Edit schema files; `npx prisma validate --schema prisma/schema` → valid; `npx prisma generate --schema prisma/schema`.
- [ ] **Step 2:** Write the migration SQL above.
- [ ] **Step 3:** Safety check: `grep -niE "coin|payment|accounts|sessions" prisma/migrations/20261115010000_remove_fantasy_game/migration.sql` → no output.
- [ ] **Step 4:** Apply both new migrations to a **local/dev database only** (`npx prisma db execute --file <path>` then `npx prisma migrate resolve --applied <name>`, or `psql "$STORAGE_DATABASE_URL" -f <path>`), then `npm run build` and smoke-test `/dashboard` and `/wallet`. Production: hand to the user with «take a backup first» — the executor does not run it.
- [ ] **Step 5:** Commit: `refactor(db)!: drop fantasy game tables and demo users`.

---

### Task 6: Platform navigation, dashboard, players page, redirects

**Files:**

- Modify: `src/widgets/sidebar/ui/app-sidebar.tsx` — items: Dashboard `/dashboard`, Players `/players`, Profile `/profile`, Credits `/wallet` (label only; route stays).
- Modify: `src/views/dashboard-view/ui/dashboard-view.tsx` — remove leagues/competition content; show greeting, credit balance card linking to `/wallet`, and `<UpcomingFixtures />` (defaults to Premier League). Delete `league-fixtures-panel.tsx`.
- Create: `src/app/(platform)/players/page.tsx` + `src/views/players-view/` rendering `PlayersExplorer` (player details + paid AI analysis).
- Modify: `next.config.*` — permanent redirects to `/dashboard` for `/competitions`, `/competitions/:path*`, `/leagues`, `/fantasy-team-builder`.
- Modify: `src/views/wallet-view/ui/wallet-view.tsx` — remove reward/competition wording; list AI features with prices from `AI_FEATURE_PRICES`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm run dev`; signed in, open `/dashboard`, `/players` (open a player, run AI analysis with and without enough credits), `/wallet`. `curl -sI localhost:3000/competitions/abc | grep -i location` → `/dashboard`, status 308.
- [ ] **Step 3:** `npm run lint && npx tsc --noEmit -p . 2>&1 | grep -v '^\.next/'` → clean.
- [ ] **Step 4:** Commit: `feat(platform): stats-first navigation, players page and legacy redirects`.

---

### Task 7: Coins → Credits in all user-facing text

**Files:** every UI string, toast, label, description and email/receipt text containing «Coin»/«coins» — find with `grep -rn "[Cc]oins\?\b" src --include='*.tsx' --include='*.ts'`. Includes `src/server/wallet/lib/coin-pricing.ts` labels (`'100 Credits — €2.00'`), `src/entities/wallet/model/withdrawal-consent.ts` («purchased Credits»), payment descriptions (`Purchased ${amount} credits`), `src/entities/wallet/model/coin-pricing.test.ts` expectations. Identifiers and DB names stay.

- [ ] **Step 1:** Update tests that assert labels first (`coin-pricing.test.ts`, payment service tests) → run → FAIL.
- [ ] **Step 2:** Replace the strings.
- [ ] **Step 3:** `npm test` → PASS. `grep -rn "Coins\?\b" src --include='*.tsx'` and string literals in `.ts` → no user-visible hits left.
- [ ] **Step 4:** Commit: `refactor(copy): rename Coins to Credits in user-facing text`.

---

### Task 8: Landing and legal pages for the new product

**Files:** `src/shared/config/site.ts`, `src/app/(marketing)/page.tsx` (metadata), all of `src/widgets/sections/*` (hero, feature, feature-tabs, about, faq, cta, signup = «How it works», pricing), `src/widgets/header/ui/header.tsx`, `src/widgets/footer/ui/footer.tsx`, `src/app/(marketing)/terms-of-service/page.tsx`, `return-policy/page.tsx`, `private-policy/page.tsx`, `cookies-policy/page.tsx`.

Fixed copy:

- `SITE.tagline`: `Advanced Football Stats & AI Squad Assistant`
- `SITE.description` and landing `metadata.description`: `Premier Fantasy is an analytics tool for fantasy football managers. Explore advanced player and team statistics and use AI-powered insights, paid with Credits, to plan the squad you enter on your favourite fantasy platform. Premier Fantasy does not run fantasy games, contests or prizes.`
- Footer disclaimer (new line): `Premier Fantasy is an independent analytics tool and is not affiliated with, endorsed by, or connected to the Premier League, Fantasy Premier League, UEFA or any fantasy game operator.`

Content requirements (writer chooses wording):

- Landing: product = stats + squad planning help + paid AI. «How it works» (`#how-it-works`): 1) explore stats, 2) plan your squad, 3) use AI insights with Credits, 4) enter the squad on your fantasy platform yourself. Pricing (`#pricing`): packs from `coin-pricing`, per-feature prices from `AI_FEATURE_PRICES` (show only Player analysis and Match prediction as available; Squad review and Auto-build as «coming soon»). FAQ: no games/prizes; Credits never expire; refund rule; AI is informational.
- Footer: remove «Competitions» link; «AI Insights» → `/players`.
- Terms: service description as above; Credits are a prepaid unit for AI features only, have no cash value, are not transferable, never expire; AI output is informational, no guarantee of results on any platform; no games, contests, prizes or wagering; operator details stay as now (DIGIDROP Sp. z o.o.).
- Return policy: unused purchased Credits refundable on request to `support@premierfantasy.net` within 14 days of purchase; spent Credits not refundable; keep the withdrawal-consent paragraph (lawyer reconciles it with the refund rule).
- Privacy/Cookies: remove game data mentions (squads in competitions, leaderboards); add AI request history (`ai_reports`) as processed data.

- [ ] **Step 1:** Rewrite as above.
- [ ] **Step 2:** Forbidden-words check: `grep -rniE "competition|contest|prize|leaderboard|entry fee|winnings|\bwin\b|compete|private league|gameweek points" src/app src/widgets src/views src/shared/config` → only hits inside the fixed copy sentences («does not run fantasy games, contests or prizes», Terms «no games, contests, prizes»). Review each.
- [ ] **Step 3:** `npm run build`; open `/`, click header «How It Works» and «Pricing» (both scroll to their sections), open each legal page.
- [ ] **Step 4:** Commit: `feat(marketing): describe the analytics product in landing and legal pages`.

---

### Task 9: Docs and repo hygiene

**Files:**

- Delete: `docs/demo-competitors.md`, `docs/multi-league-roadmap.md`
- Modify: `CLAUDE.md` — remove the `npm run seed:demo` line.
- Modify: `docs/server-architecture.md` — remove examples that reference deleted modules (fantasy-team prices, `cron-auth`), add the AI billing rule: «paid features charge via `IWalletService.spendOnFeature` inside the service after successful generation; never from the client».
- Modify: `.gitignore` — add `*.docx`.

- [ ] **Step 1:** Edit.
- [ ] **Step 2:** `git status --short | grep docx` → no output.
- [ ] **Step 3:** Commit: `docs: drop game docs, document AI billing rule`.

---

## Done when

- `npm run lint`, `npm test`, `npm run build` pass on the branch.
- No route, page, cron, table or text describes a game.
- Player analysis and match prediction charge 10 Credits server-side, once per cache window, never below zero.
- The user has the two migration files and an explicit «back up, then apply» instruction for production.
