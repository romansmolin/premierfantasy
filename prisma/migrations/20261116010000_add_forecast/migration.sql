-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "fpl_event" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "expected_minutes" DOUBLE PRECISION NOT NULL,
    "expected_points" DOUBLE PRECISION NOT NULL,
    "raw_points" DOUBLE PRECISION NOT NULL,
    "components" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_evaluations" (
    "id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "events_evaluated" INTEGER NOT NULL,
    "player_events" INTEGER NOT NULL,
    "mae" DOUBLE PRECISION NOT NULL,
    "baseline_mae" DOUBLE PRECISION NOT NULL,
    "rank_corr" DOUBLE PRECISION NOT NULL,
    "baseline_rank_corr" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "model_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fpl_player_status" (
    "fpl_id" INTEGER NOT NULL,
    "team_id" TEXT,
    "status" TEXT NOT NULL,
    "chance_of_playing" INTEGER,
    "news" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fpl_player_status_pkey" PRIMARY KEY ("fpl_id")
);

-- CreateIndex
CREATE INDEX "predictions_fpl_event_idx" ON "predictions"("fpl_event");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_fpl_event_player_id_model_version_key" ON "predictions"("fpl_event", "player_id", "model_version");

-- CreateIndex
CREATE INDEX "model_evaluations_model_version_created_at_idx" ON "model_evaluations"("model_version", "created_at");

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

