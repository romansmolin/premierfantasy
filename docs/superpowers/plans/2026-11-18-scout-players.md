# Scout Players Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрытый раздел `/scout` (список с треем сравнения, профиль игрока, сравнение 2–3 игроков одной позиции) с radar, очками за £m и xG/xA.

**Architecture:** Новый серверный слайс `src/server/scout` (Controller → Service → Repository-расширение), поверх `IStatsService` и `IStatsRepository`, как `BuilderService`. Клиент: `entities/scout` (API и типы) и `views/scout-view` (страницы). Общие графики и карточка вероятностей выносятся из `views/stats` в `widgets/player-stats`, потому что view не может импортировать другой view.

**Tech Stack:** Next.js 16 App Router, Prisma, Zod, SWR, recharts (`RadarChart`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-scout-players-design.md`. Прочитать вместе с планом. Архитектура сервера: `docs/server-architecture.md`.

## Global Constraints

- Только залогиненные: `/scout*` не попадает в `PUBLIC_PATHS` (`src/proxy.ts`); API через `requireUserId`.
- Публичные `/players`, `/players/[id]`, sitemap и SEO не меняются.
- Сравнение: от 2 до 3 игроков, только одной позиции.
- Radar: перцентиль среди игроков той же позиции; `MIN_RADAR_MINUTES = 450`, `MIN_RADAR_PEERS = 10`.
- Закрытое gate-ом число остаётся `null` и показывается как «—» с причиной, никогда не 0. Цена: только свежая (`StatsPlayer.price`, иначе `null`). Очки: расчётные, без бонусных.
- Нет итогового балла и вердикта «бери этого». Нет графика истории цены, нет новых зависимостей, нет изменений схемы БД.
- Графики на `ChartFrame` (вопрос, легенда, различимость не только цветом, таблица для скринридера), читаемо на 375 px.
- Код: `import type` для типов, без `any`, без `console.log`, путь `@/*`, отступы в 4 пробела (как в репо).
- Ветка `feat/scout-players` от текущего HEAD.

## Review Focus

1. Игрок с минутами ниже порога: radar не рисуется, вместо него «мало данных», нулей нет (тест Task 2, 3).
2. Позиция, где игроков с достаточными минутами меньше `MIN_RADAR_PEERS`: перцентилей нет (Task 2).
3. Цена `null` (устарела): очки за £m `null`, не `Infinity` и не 0 (Task 3).
4. `compare` с одним id, четырьмя, дубликатом, неизвестным id, смешанными позициями: 400 / 404 / 422, UI показывает причину (Task 3, 4, 7).
5. Строка сравнения с `null` у одного игрока и ничьёй: `null` не подсвечивается как лучший, при равенстве подсвечены все равные (Task 2).

---

### Task 1: Ветка и вынос общих графиков в widget

Чистый рефакторинг без изменения поведения: view не может импортировать view.

**Files:**

- Move: `src/views/stats/ui/charts/*` → `src/widgets/player-stats/ui/charts/*` (включая `chart-data.test.ts`)
- Move: `src/views/stats/ui/probability-card.tsx` и `probability-card.test.tsx` → `src/widgets/player-stats/ui/`
- Move: `src/views/stats/ui/format.ts` и `format.test.ts` → `src/shared/utils/format-stats.ts` и `format-stats.test.ts`
- Create: `src/widgets/player-stats/index.ts`
- Modify: импорты в `src/views/stats/ui/{player-profile-view,players-list-view,fixtures-view,method-view}.tsx`

**Interfaces:**

- Produces: `@/widgets/player-stats` экспортирует `ChartFrame`, `Swatch`, `RowTooltip`, `AngledTick`, `HatchPattern`, `percentAxis`, `FormChart`, `MinutesChart`, `ProbabilityCard`. `@/shared/utils/format-stats` экспортирует `formatPrice`, `formatPoints`, `formatMinutes`, `formatDate` (те же сигнатуры).

- [ ] **Step 1:** `git switch -c feat/scout-players`, затем `git mv` перечисленных файлов; поправить относительные импорты внутри перенесённых файлов; в `index.ts` реэкспортировать публичный список выше.
- [ ] **Step 2:** Заменить импорты в четырёх файлах `views/stats` на `@/widgets/player-stats` и `@/shared/utils/format-stats`.
- [ ] **Step 3:** Run: `npm test && npm run lint && npx tsc --noEmit`. Expected: всё зелёное, число тестов то же, что до переноса.
- [ ] **Step 4:** Commit `refactor: move shared stat charts to widgets/player-stats`.

---

### Task 2: Чистая логика radar, очков за £m и сравнения

**Files:**

- Create: `src/server/scout/lib/params.ts`, `src/server/scout/lib/radar.ts`, `src/server/scout/lib/compare.ts`
- Test: `src/server/scout/lib/radar.test.ts`, `src/server/scout/lib/compare.test.ts`

**Interfaces:**

- Produces (`params.ts`): `MIN_RADAR_MINUTES = 450`, `MIN_RADAR_PEERS = 10`, `MAX_COMPARE = 3`, `MIN_COMPARE = 2`.
- Produces (`radar.ts`):
    - `interface SeasonLine { playerId: string; minutes: number; goals: number; assists: number; shotsOn: number; passesKey: number; defActions: number; duelsTotal: number; duelsWon: number; saves: number; goalsConceded: number; penaltySaved: number; cleanSheet: boolean }`
    - `interface SeasonMetrics { minutes: number; appearances: number; per90: Record<AxisKey, number | null> }` где `AxisKey = 'goals' | 'xg' | 'assists' | 'xa' | 'shotsOn' | 'keyPasses' | 'defActions' | 'duelWinRate' | 'cleanSheetRate' | 'goalInvolvements' | 'saves' | 'goalsConceded' | 'penaltySaved'`
    - `RADAR_AXES: Record<Position, { key: AxisKey; label: string; lowerIsBetter?: boolean }[]>` (FWD и MID: goals, xg, assists, xa, shotsOn, keyPasses; DEF: defActions, duelWinRate, cleanSheetRate, keyPasses, goalInvolvements; GK: saves, goalsConceded (`lowerIsBetter`), cleanSheetRate, penaltySaved)
    - `seasonMetrics(lines: SeasonLine[], fpl: { xg: number | null; xa: number | null } | null): SeasonMetrics` (per-90 = сумма × 90 / минуты; `duelWinRate` = выигранные / все, `null` при 0 единоборств; `cleanSheetRate` = доля строк с `cleanSheet` среди строк с минутами ≥ 60, `null` без таких строк; xG/xA per-90 = `null`, когда `fpl` `null` или значение `null`)
    - `interface RadarProfile { lowData: boolean; reason: string | null; axes: { key: AxisKey; label: string; value: number | null; percentile: number | null }[] }`
    - `radarProfiles(players: { id: string; position: Position; metrics: SeasonMetrics }[]): Map<string, RadarProfile>`
- Produces (`compare.ts`):
    - `bestIndexes(values: (number | null)[], higherIsBetter: boolean): number[]`
    - `canCompare(selected: { id: string; position: Position }[], candidate: { id: string; position: Position }): { ok: true } | { ok: false; reason: string }`

- [ ] **Step 1: Тесты `radar.test.ts`.** Перцентиль включает самого игрока и половину равных: для 10 игроков с per-90 голов 1..10 игрок со значением 10 получает 95, со значением 1 получает 5. Для `lowerIsBetter` значения инвертируются (меньше пропущенных = выше). Игрок с минутами 449 получает `lowData: true`, `reason` непустой, все `percentile` `null`, и он не входит в выборку peers других игроков. Позиция с 9 допустимыми игроками: у всех `percentile` `null`, `reason` называет нехватку peers. `seasonMetrics`: 180 минут и 2 гола дают goals per90 = 1; 0 единоборств дают `duelWinRate` `null`; `fpl: null` даёт `xg` `null`.
- [ ] **Step 2: Тесты `compare.test.ts`.** `bestIndexes([3, null, 5, 5], true)` = `[2, 3]`; `bestIndexes([null, 4], true)` = `[]` (меньше двух значений); `bestIndexes([2, 2], true)` = `[]` (все равны); при `higherIsBetter: false` минимум. `canCompare`: четвёртый игрок отклонён с причиной про максимум 3; игрок другой позиции отклонён с причиной про одну позицию; повтор того же id отклонён; допустимый добавляется.
- [ ] **Step 3:** Run: `npx vitest run src/server/scout/lib`. Expected: FAIL (модулей нет).
- [ ] **Step 4:** Реализовать три файла по сигнатурам выше. Перцентиль: `100 * (меньше + 0.5 * равных) / n`, округление до целого.
- [ ] **Step 5:** Run: `npx vitest run src/server/scout/lib && npm run lint`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(scout): radar percentiles and compare rules`.

---

### Task 3: Репозиторий статистики и ScoutService

**Files:**

- Modify: `src/server/stats/repository/stats.repository.interface.ts`, `src/server/stats/repository/stats.repository.ts`
- Create: `src/server/scout/service/scout.service.interface.ts`, `src/server/scout/service/scout.service.ts`
- Test: `src/server/scout/service/scout.service.test.ts`
- Modify (fakes): `src/server/stats/service/stats.service.test.ts` и любые другие фейки `IStatsRepository`, которые перестанут компилироваться (`npx tsc --noEmit` покажет)

**Interfaces:**

- Consumes: `SeasonLine`, `seasonMetrics`, `radarProfiles`, `RadarProfile`, `MIN_COMPARE`, `MAX_COMPARE` (Task 2); `IStatsService.getAllPlayers()`, `IStatsService.getPlayer(id)`; `IStatsRepository.findLines(playerId?)`, `linePoints` из `@/server/stats/lib/player-form`.
- Produces в `IStatsRepository`: `findSeasonLines(): Promise<SeasonLine[]>` (все строки текущего сезона из `playerMatchStats`: `shotsOn`, `duelsTotal`, `duelsWon`, `goalsConceded`, `cleanSheet = minutes >= 60 && goalsConceded === 0`, `defActions = tackles + blocks + interceptions`) и `findFplSeasonTotals(): Promise<Map<string, { xg: number | null; xa: number | null }>>` (по `playerId` через `fplPlayerMap`; сумма `fplPlayerMatch.xg` / `xa` за сезон, `null`, если ни у одной строки нет значения).
- Produces (`scout.service.interface.ts`):
    - `interface ScoutListItem extends PlayerListItem { pointsPerMillion: number | null }`
    - `interface ScoutList { items: ScoutListItem[]; clubs: ClubRef[]; forecastEnabled: boolean; nextEvent: number | null }`
    - `interface ScoutValue { points: number; pointsPerMillion: number | null; rank: number | null; of: number }`
    - `interface ScoutProfile { profile: PlayerProfile; radar: RadarProfile; value: ScoutValue; season: { xg: number | null; xa: number | null } }`
    - `interface ScoutCompare { position: Position; players: ScoutProfile[] }`
    - `interface IScoutService { getList(): Promise<ScoutList>; getProfile(id: string): Promise<ScoutProfile>; compare(ids: string[]): Promise<ScoutCompare> }`

- [ ] **Step 1: Тесты `scout.service.test.ts`** с фейковыми `IStatsService` и `IStatsRepository` (стиль `stats.service.test.ts`). Проверить: `getProfile` для игрока с ценой `null` возвращает `pointsPerMillion: null`, `rank: null`, при этом `points` посчитаны; `getProfile` неизвестного id бросает `Errors.notFound` (статус 404); `getList` содержит `pointsPerMillion` = очки / цена; `compare(['a'])` и `compare` из 4 id бросают 400, `compare(['a','a'])` бросает 400, `compare` с игроками разных позиций бросает 422 с причиной про одну позицию, неизвестный id бросает 404; успешный `compare` возвращает игроков в порядке запрошенных id и `position`.
- [ ] **Step 2:** Run: `npx vitest run src/server/scout/service`. Expected: FAIL.
- [ ] **Step 3:** Добавить два метода в интерфейс и реализацию репозитория (Prisma, одним `findMany` на метод, как `findLines`). Реализовать `ScoutService(stats: IStatsService, repo: IStatsRepository)`: радар строится по всем игрокам (`radarProfiles` на всех `getAllPlayers().items` + `findSeasonLines` + `findFplSeasonTotals`); `rank` считается среди игроков той же позиции с ненулевым `pointsPerMillion`, 1 = лучший; ошибки через `Errors` из `@/shared/lib/http`.
- [ ] **Step 4:** Run: `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(scout): scout service and repository queries`.

---

### Task 4: Контроллер, роуты, контейнер, клиент

**Files:**

- Create: `src/server/scout/controller/scout.controller.ts`, `src/app/api/scout/players/route.ts`, `src/app/api/scout/players/[id]/route.ts`, `src/app/api/scout/compare/route.ts`
- Modify: `src/shared/lib/container.ts` (создать `ScoutService(statsService, statsRepository)`, где `StatsRepository` создаётся один раз и передаётся и в `StatsService`, и сюда; `ScoutController`; добавить `scoutController` в экспорт)
- Create: `src/shared/lib/revive-dates.ts` + `revive-dates.test.ts`
- Create: `src/entities/scout/index.ts`, `src/entities/scout/api/scout.service.ts`, `src/entities/scout/model/scout.types.ts`
- Test: `src/server/scout/controller/scout.controller.test.ts`

**Interfaces:**

- Consumes: `IScoutService` (Task 3).
- Produces: `GET /api/scout/players` → `ScoutList`; `GET /api/scout/players/[id]` → `ScoutProfile`; `GET /api/scout/compare?ids=a,b,c` → `ScoutCompare`. Все три: 401 без сессии.
- Produces: `reviveDates<T>(value: unknown): T` (рекурсивно превращает строки вида `YYYY-MM-DDTHH:mm:ss(.sss)Z` в `Date`).
- Produces: `scoutService = { getList(): Promise<ScoutList>; getProfile(id: string): Promise<ScoutProfile>; compare(ids: string[]): Promise<ScoutCompare> }` из `@/entities/scout`, ответы проходят через `reviveDates`; типы реэкспортируются из `@/server/scout/service/scout.service.interface`.

- [ ] **Step 1: Тесты.** `revive-dates.test.ts`: ISO-строка в глубине массива и объекта становится `Date`; обычная строка, число и `null` остаются прежними. `scout.controller.test.ts` (фейковый `IScoutService`, запрос собирается как `new NextRequest(url)`; сессию подменить через `vi.mock('@/shared/lib/auth-helpers')`): 401 без сессии; `compare` с `ids=a` отвечает 400, с `ids=a,b,c,d` 400, с `ids=a,a` 400; `ids=a,b` вызывает сервис один раз с `['a','b']`.
- [ ] **Step 2:** Run: `npx vitest run src/shared/lib src/server/scout/controller`. Expected: FAIL.
- [ ] **Step 3:** Реализовать контроллер (поля-стрелки в `withController`, auth через `requireUserId`, `parseQuery` со схемой `ids`: строка, разбиваемая по запятой, 2–3 элемента, без повторов), три однострочных роута по шаблону `src/app/api/builder/pool/route.ts`, проводку в `container.ts`, `revive-dates.ts` и клиент по образцу `entities/squad/api/squad.service.ts` (`wrap` + `httpClient`).
- [ ] **Step 4:** Run: `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(scout): api routes, container wiring and client`.

---

### Task 5: Страница списка `/scout` с треем сравнения

**Files:**

- Create: `src/views/scout-view/index.ts`, `src/views/scout-view/ui/scout-list-view.tsx`, `src/views/scout-view/ui/compare-tray.tsx`
- Create: `src/app/(platform)/scout/page.tsx` (metadata `title: 'Scout'`, рендерит `ScoutListView`)
- Test: `src/views/scout-view/ui/compare-tray.test.tsx`

**Interfaces:**

- Consumes: `scoutService.getList`, `ScoutListItem` (Task 4); `canCompare`, `MAX_COMPARE` (Task 2); `formatPrice`, `formatPoints` из `@/shared/utils/format-stats`; `Table`, `Input`, `SelectField`, `Checkbox`, `Button`, `Badge`, `Skeleton` из `@/shared/ui`.
- Produces: `ScoutListView(): JSX` (клиентский; SWR-ключ `'scout-list'`); `CompareTray({ players, onRemove, onClear }: { players: { id: string; name: string; position: Position }[]; onRemove(id: string): void; onClear(): void })` с кнопкой-ссылкой «Compare» на `/scout/compare?ids=...`, отключённой при менее чем двух игроках.

- [ ] **Step 1: Тест `compare-tray.test.tsx`** (`renderToStaticMarkup`): с одним игроком кнопка «Compare» отключена; с двумя это ссылка с `href="/scout/compare?ids=a,b"`; имена выбранных видны.
- [ ] **Step 2:** Run: `npx vitest run src/views/scout-view`. Expected: FAIL.
- [ ] **Step 3:** Реализовать `CompareTray` и `ScoutListView`: поиск по имени (без учёта диакритики), фильтры позиции, клуба и цены, сортировка (forecast, form, price, minutes, goals, assists, pGoal, pAssist, pStart, очки за £m, name), клиентская пагинация по 50. Чекбокс использует `canCompare`; при отказе показать причину (`toast` из `sonner` или строка под таблицей). Имя строки ведёт на `/scout/[id]`. Пустые числа «—» с `title`-причиной, как в публичной таблице.
- [ ] **Step 4:** Run: `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(scout): players list with compare tray`.

---

### Task 6: Профиль `/scout/[id]`

**Files:**

- Create: `src/views/scout-view/ui/scout-profile-view.tsx`, `src/views/scout-view/ui/radar-chart.tsx`, `src/views/scout-view/ui/value-and-xg-chart.tsx`
- Create: `src/app/(platform)/scout/[id]/page.tsx`
- Test: `src/views/scout-view/ui/radar-chart.test.ts` (чистая функция данных)

**Interfaces:**

- Consumes: `scoutService.getProfile`, `ScoutProfile` (Task 4); из `@/widgets/player-stats`: `ProbabilityCard`, `FormChart`, `MinutesChart`, `ChartFrame`, `RowTooltip`; `PlayerAiAnalysis` из `@/features/ai`.
- Produces: `radarRows(series: { name: string; radar: RadarProfile }[]): { rows: { axis: string; [seriesName: string]: number | string }[]; skipped: string[] }` в `radar-chart.tsx`: оставляет только оси, где у всех серий `percentile` не `null`; названия пропущенных осей идут в `skipped`; если осталось меньше 3 осей, `rows` пустой. `RadarChart({ series }: { series: { name: string; radar: RadarProfile }[] })` рисует recharts `RadarChart` на `ChartFrame` (серии различаются цветом `--chart-1..3` и стилем линии: сплошная, штриховая, штрих-пунктир), под ним строка «Hidden: …» для `skipped`. `ScoutProfileView({ id }: { id: string })`.

- [ ] **Step 1: Тест `radar-chart.test.ts`.** Две серии, у одной `percentile` `null` на оси `xg`: `rows` не содержит `xg`, `skipped` = `['xG per 90']` (или фактическая подпись оси). Серия с `lowData: true` не попадает в `rows` вообще, `skipped` пустой, для неё вызывающий код показывает `reason`. Осей осталось 2: `rows` пустой.
- [ ] **Step 2:** Run: `npx vitest run src/views/scout-view/ui/radar-chart.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Реализовать `radarRows`, `RadarChart`, `ValueAndXgChart` (карточка «очки за £m и место среди позиции» + столбцы xG против голов и xA против ассистов за сезон; `null` в «—») и `ScoutProfileView`: шапка (клуб, позиция, цена, доступность, кнопка «Add to compare», ведущая на `/scout/compare?ids=<id>` только после выбора второго игрока: если нечего выбрать, ссылка на список `/scout`), затем `ProbabilityCard`, radar, `ValueAndXgChart`, `FormChart`, `MinutesChart`, таблица последних матчей (как в публичном профиле), `PlayerAiAnalysis`. Состояния загрузки (`Skeleton`) и 404 («Player not found», ссылка в `/scout`).
- [ ] **Step 4:** Run: `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(scout): player profile with radar, value and xG`.

---

### Task 7: Страница сравнения `/scout/compare`

**Files:**

- Create: `src/views/scout-view/ui/scout-compare-view.tsx`, `src/views/scout-view/ui/compare-table.tsx`
- Create: `src/app/(platform)/scout/compare/page.tsx` (читает `searchParams: Promise<{ ids?: string }>`, передаёт `ids` строкой)
- Test: `src/views/scout-view/ui/compare-table.test.tsx`

**Interfaces:**

- Consumes: `scoutService.compare`, `ScoutCompare` (Task 4); `bestIndexes` (Task 2); `radarRows`/`RadarChart` (Task 6); `FormChart` и графики из `@/widgets/player-stats`.
- Produces: `compareRows(players: ScoutProfile[]): { key: string; label: string; values: (number | null)[]; best: number[]; format: 'price' | 'points' | 'int' | 'chance' }[]` в `compare-table.tsx` (строки: price без подсветки, form, pointsPerMillion, goals, assists, xG, xA, minutes без подсветки, pGoal, pAssist, pStart, xPts; значения вероятностей и xPts берутся из первого матча `profile.probabilities.matches`, `null` когда блока нет). `CompareTable({ players }: { players: ScoutProfile[] })`. `ScoutCompareView({ ids }: { ids: string })`.

- [ ] **Step 1: Тест `compare-table.test.tsx`.** `compareRows`: для строки goals `[3, 5]` `best` = `[1]`; для pGoal `[null, 0.2]` `best` = `[]`; для price `best` всегда `[]`. `CompareTable` в разметке помечает лучшую ячейку не только цветом (текст «Best» для скринридера и маркер ★ в ячейке) и показывает «—» для `null`, без «0%».
- [ ] **Step 2:** Run: `npx vitest run src/views/scout-view/ui/compare-table.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Реализовать `compareRows`, `CompareTable` (на телефоне горизонтальный скролл внутри контейнера, первая колонка липкая) и `ScoutCompareView`: заголовки-карточки, `RadarChart` с наложением, `CompareTable`, форма за 10 матчей по игрокам (по одному `FormChart` на игрока, колонка на десктопе). Если сервер отвечает 400/404/422, показать текст ошибки из `ApiError` и ссылку «Back to players». В `ids` меньше двух: пояснение «Pick 2–3 players of one position».
- [ ] **Step 4:** Run: `npx vitest run && npx tsc --noEmit && npm run lint`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(scout): compare page`.

---

### Task 8: Навигация, закрытый доступ, e2e и итоговая проверка

**Files:**

- Modify: `src/widgets/sidebar/ui/app-sidebar.tsx` (пункт «Players» ведёт на `/scout`)
- Create: `e2e/scout.spec.ts`
- Verify (без правок): `src/proxy.ts` не содержит `/scout`; `src/app/sitemap.ts` не содержит `/scout`

**Interfaces:**

- Consumes: все страницы и API задач 4–7; помощники `e2e/users.ts` (`RICH_STATE`).

- [ ] **Step 1:** В `app-sidebar.tsx` заменить `href: '/players'` на `href: '/scout'` у пункта «Players».
- [ ] **Step 2: `e2e/scout.spec.ts`.** Без сессии (`test.use({ storageState: { cookies: [], origins: [] } })`): `/scout`, `/scout/compare?ids=a,b` редиректят на `/sign-in`; `request.get('/api/scout/players')` отвечает 401; публичный `/players` открывается без входа и содержит заголовок списка. С сессией (`RICH_STATE`): из сайдбара «Players» → `/scout`; отметить двух игроков одной позиции (фильтр позиции MID) → в трее «Compare» → URL содержит `/scout/compare?ids=`; видны radar, таблица со словом «Best» и ссылка «Back to players». Карточки другой позиции в трее добавить нельзя: показано сообщение про одну позицию.
- [ ] **Step 3:** Run: `npm run lint && npm test && npx tsc --noEmit`. Expected: всё зелёное.
- [ ] **Step 4:** Run: `npm run e2e -- scout.spec.ts` (нужен `E2E_DATABASE_URL` на локальный Postgres с данными). Expected: PASS. Без локальной БД шаг не выполнять и записать это в итоговый отчёт.
- [ ] **Step 5:** Проверить в браузере (dev-сервер, залогиненный пользователь): список, профиль, сравнение на ширине 375 px, без горизонтального скролла страницы; гостем `/scout` уходит на `/sign-in`.
- [ ] **Step 6:** Commit `feat(scout): sidebar entry and e2e for the scout section`.
