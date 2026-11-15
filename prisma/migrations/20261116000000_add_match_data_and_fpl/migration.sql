-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "fpl_id" INTEGER;

-- CreateTable
CREATE TABLE "fpl_player_maps" (
    "id" TEXT NOT NULL,
    "fpl_id" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fpl_player_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fpl_player_map_rejections" (
    "fpl_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fpl_player_map_rejections_pkey" PRIMARY KEY ("fpl_id")
);

-- CreateTable
CREATE TABLE "fpl_events" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "is_next" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fpl_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fpl_game_settings" (
    "season_year" INTEGER NOT NULL,
    "squad_size" INTEGER NOT NULL,
    "starting_size" INTEGER NOT NULL,
    "budget_tenths" INTEGER NOT NULL,
    "team_limit" INTEGER NOT NULL,
    "positions" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fpl_game_settings_pkey" PRIMARY KEY ("season_year")
);

-- CreateTable
CREATE TABLE "fpl_event_points" (
    "id" TEXT NOT NULL,
    "fpl_player_id" INTEGER NOT NULL,
    "event" INTEGER NOT NULL,
    "total_points" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fpl_event_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixtures" (
    "id" TEXT NOT NULL,
    "external_id" INTEGER NOT NULL,
    "league_season_id" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "round_number" INTEGER,
    "kickoff" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "home_goals" INTEGER,
    "away_goals" INTEGER,
    "fpl_fixture_id" INTEGER,
    "fpl_event" INTEGER,
    "stats_synced_at" TIMESTAMP(3),
    "stats_attempts" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_stats" (
    "id" TEXT NOT NULL,
    "fixture_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "position" "PlayerPosition",
    "is_substitute" BOOLEAN NOT NULL DEFAULT false,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "shots_total" INTEGER NOT NULL DEFAULT 0,
    "shots_on" INTEGER NOT NULL DEFAULT 0,
    "passes_total" INTEGER NOT NULL DEFAULT 0,
    "passes_key" INTEGER NOT NULL DEFAULT 0,
    "pass_accuracy" INTEGER,
    "tackles" INTEGER NOT NULL DEFAULT 0,
    "blocks" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "duels_total" INTEGER NOT NULL DEFAULT 0,
    "duels_won" INTEGER NOT NULL DEFAULT 0,
    "dribbles_attempts" INTEGER NOT NULL DEFAULT 0,
    "dribbles_success" INTEGER NOT NULL DEFAULT 0,
    "fouls_drawn" INTEGER NOT NULL DEFAULT 0,
    "fouls_committed" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "goals_conceded" INTEGER NOT NULL DEFAULT 0,
    "penalty_won" INTEGER NOT NULL DEFAULT 0,
    "penalty_committed" INTEGER NOT NULL DEFAULT 0,
    "penalty_scored" INTEGER NOT NULL DEFAULT 0,
    "penalty_missed" INTEGER NOT NULL DEFAULT 0,
    "penalty_saved" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "stats" JSONB,
    "error" TEXT,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fpl_player_maps_fpl_id_key" ON "fpl_player_maps"("fpl_id");

-- CreateIndex
CREATE UNIQUE INDEX "fpl_player_maps_player_id_key" ON "fpl_player_maps"("player_id");

-- CreateIndex
CREATE INDEX "fpl_event_points_event_idx" ON "fpl_event_points"("event");

-- CreateIndex
CREATE UNIQUE INDEX "fpl_event_points_fpl_player_id_event_key" ON "fpl_event_points"("fpl_player_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_external_id_key" ON "fixtures"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_fpl_fixture_id_key" ON "fixtures"("fpl_fixture_id");

-- CreateIndex
CREATE INDEX "fixtures_league_season_id_kickoff_idx" ON "fixtures"("league_season_id", "kickoff");

-- CreateIndex
CREATE INDEX "fixtures_fpl_event_idx" ON "fixtures"("fpl_event");

-- CreateIndex
CREATE INDEX "fixtures_status_stats_synced_at_idx" ON "fixtures"("status", "stats_synced_at");

-- CreateIndex
CREATE INDEX "player_match_stats_player_id_idx" ON "player_match_stats"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_stats_fixture_id_player_id_key" ON "player_match_stats"("fixture_id", "player_id");

-- CreateIndex
CREATE INDEX "sync_runs_job_started_at_idx" ON "sync_runs"("job", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_fpl_id_key" ON "teams"("fpl_id");

-- AddForeignKey
ALTER TABLE "fpl_player_maps" ADD CONSTRAINT "fpl_player_maps_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_league_season_id_fkey" FOREIGN KEY ("league_season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

