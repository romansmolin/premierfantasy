-- AlterTable
ALTER TABLE "fpl_player_status" ADD COLUMN "penalties_order" INTEGER;

-- CreateTable
CREATE TABLE "fpl_player_matches" (
    "id" TEXT NOT NULL,
    "fpl_player_id" INTEGER NOT NULL,
    "fpl_fixture_id" INTEGER NOT NULL,
    "event" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "starts" INTEGER NOT NULL,
    "goals" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "xg" DOUBLE PRECISION,
    "xa" DOUBLE PRECISION,
    "total_points" INTEGER NOT NULL,
    "was_home" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fpl_player_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_probabilities" (
    "id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "fixture_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "horizon" INTEGER NOT NULL,
    "p_goal" DOUBLE PRECISION NOT NULL,
    "p_assist" DOUBLE PRECISION NOT NULL,
    "p_start" DOUBLE PRECISION NOT NULL,
    "expected_minutes" DOUBLE PRECISION NOT NULL,
    "expected_points" DOUBLE PRECISION NOT NULL,
    "points_buckets" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_probabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixture_probabilities" (
    "id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "fixture_id" TEXT NOT NULL,
    "p_home" DOUBLE PRECISION NOT NULL,
    "p_draw" DOUBLE PRECISION NOT NULL,
    "p_away" DOUBLE PRECISION NOT NULL,
    "xg_home" DOUBLE PRECISION NOT NULL,
    "xg_away" DOUBLE PRECISION NOT NULL,
    "league_goals" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixture_probabilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fpl_player_matches_event_idx" ON "fpl_player_matches"("event");

-- CreateIndex
CREATE UNIQUE INDEX "fpl_player_matches_fpl_player_id_fpl_fixture_id_key" ON "fpl_player_matches"("fpl_player_id", "fpl_fixture_id");

-- CreateIndex
CREATE INDEX "match_probabilities_player_id_idx" ON "match_probabilities"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_probabilities_model_version_fixture_id_player_id_key" ON "match_probabilities"("model_version", "fixture_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixture_probabilities_model_version_fixture_id_key" ON "fixture_probabilities"("model_version", "fixture_id");

-- AddForeignKey
ALTER TABLE "match_probabilities" ADD CONSTRAINT "match_probabilities_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixture_probabilities" ADD CONSTRAINT "fixture_probabilities_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
