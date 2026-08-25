-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PlayerPosition" AS ENUM ('GK', 'DEF', 'MID', 'FWD');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('COMPETITION_REWARD', 'PURCHASE', 'AI_FEATURE_SPEND');

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coin_transactions" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."competitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_gameweek" INTEGER NOT NULL,
    "end_gameweek" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "join_deadline" TIMESTAMP(3),
    "league_season_id" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fantasy_team_players" (
    "id" TEXT NOT NULL,
    "fantasy_team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "position" "public"."PlayerPosition" NOT NULL,
    "purchase_price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_team_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fantasy_teams" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budget_total" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "budget_left" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "free_transfers" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "fantasy_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gameweek_points" (
    "id" TEXT NOT NULL,
    "fantasy_team_id" TEXT NOT NULL,
    "gameweek_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gameweek_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gameweeks" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "is_finished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "gameweeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."league_seasons" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leagues" (
    "id" TEXT NOT NULL,
    "external_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "logo" TEXT,
    "type" TEXT NOT NULL,
    "season_start_month" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "gateway_uid" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "coin_amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."player_gameweek_stats" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "gameweek_id" TEXT NOT NULL,
    "minutes_played" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "clean_sheet" BOOLEAN NOT NULL DEFAULT false,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "penalty_saved" INTEGER NOT NULL DEFAULT 0,
    "penalty_missed" INTEGER NOT NULL DEFAULT 0,
    "goals_conceded" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "own_goals" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_gameweek_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."player_season_prices" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "season_year" INTEGER NOT NULL,
    "base_price" DOUBLE PRECISION NOT NULL,
    "current_price" DOUBLE PRECISION NOT NULL,
    "price_source" TEXT NOT NULL DEFAULT 'MANUAL',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_season_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."players" (
    "id" TEXT NOT NULL,
    "external_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" "public"."PlayerPosition" NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."teams" (
    "id" TEXT NOT NULL,
    "external_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transfers" (
    "id" TEXT NOT NULL,
    "fantasy_team_id" TEXT NOT NULL,
    "gameweek_id" TEXT NOT NULL,
    "player_in_id" TEXT NOT NULL,
    "player_out_id" TEXT NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "coin_balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "public"."accounts"("user_id" ASC);

-- CreateIndex
CREATE INDEX "coin_transactions_user_id_idx" ON "public"."coin_transactions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "competitions_status_league_season_id_idx" ON "public"."competitions"("status" ASC, "league_season_id" ASC);

-- CreateIndex
CREATE INDEX "fantasy_team_players_fantasy_team_id_idx" ON "public"."fantasy_team_players"("fantasy_team_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_team_players_fantasy_team_id_player_id_key" ON "public"."fantasy_team_players"("fantasy_team_id" ASC, "player_id" ASC);

-- CreateIndex
CREATE INDEX "fantasy_team_players_player_id_idx" ON "public"."fantasy_team_players"("player_id" ASC);

-- CreateIndex
CREATE INDEX "fantasy_teams_competition_id_idx" ON "public"."fantasy_teams"("competition_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_teams_user_id_competition_id_key" ON "public"."fantasy_teams"("user_id" ASC, "competition_id" ASC);

-- CreateIndex
CREATE INDEX "fantasy_teams_user_id_idx" ON "public"."fantasy_teams"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "gameweek_points_fantasy_team_id_gameweek_id_key" ON "public"."gameweek_points"("fantasy_team_id" ASC, "gameweek_id" ASC);

-- CreateIndex
CREATE INDEX "gameweek_points_fantasy_team_id_idx" ON "public"."gameweek_points"("fantasy_team_id" ASC);

-- CreateIndex
CREATE INDEX "gameweek_points_gameweek_id_idx" ON "public"."gameweek_points"("gameweek_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "gameweeks_number_key" ON "public"."gameweeks"("number" ASC);

-- CreateIndex
CREATE INDEX "league_seasons_league_id_idx" ON "public"."league_seasons"("league_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "league_seasons_league_id_year_key" ON "public"."league_seasons"("league_id" ASC, "year" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "leagues_external_id_key" ON "public"."leagues"("external_id" ASC);

-- CreateIndex
CREATE INDEX "payment_tokens_token_idx" ON "public"."payment_tokens"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_tokens_token_key" ON "public"."payment_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "payment_tokens_user_id_idx" ON "public"."payment_tokens"("user_id" ASC);

-- CreateIndex
CREATE INDEX "player_gameweek_stats_gameweek_id_idx" ON "public"."player_gameweek_stats"("gameweek_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "player_gameweek_stats_player_id_gameweek_id_key" ON "public"."player_gameweek_stats"("player_id" ASC, "gameweek_id" ASC);

-- CreateIndex
CREATE INDEX "player_gameweek_stats_player_id_idx" ON "public"."player_gameweek_stats"("player_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "player_season_prices_player_id_season_year_key" ON "public"."player_season_prices"("player_id" ASC, "season_year" ASC);

-- CreateIndex
CREATE INDEX "player_season_prices_season_year_idx" ON "public"."player_season_prices"("season_year" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "players_external_id_key" ON "public"."players"("external_id" ASC);

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "public"."players"("team_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token" ASC);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "teams_external_id_key" ON "public"."teams"("external_id" ASC);

-- CreateIndex
CREATE INDEX "transfers_fantasy_team_id_idx" ON "public"."transfers"("fantasy_team_id" ASC);

-- CreateIndex
CREATE INDEX "transfers_gameweek_id_idx" ON "public"."transfers"("gameweek_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "public"."verifications"("identifier" ASC);

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."competitions" ADD CONSTRAINT "competitions_league_season_id_fkey" FOREIGN KEY ("league_season_id") REFERENCES "public"."league_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fantasy_team_players" ADD CONSTRAINT "fantasy_team_players_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "public"."fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fantasy_team_players" ADD CONSTRAINT "fantasy_team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fantasy_teams" ADD CONSTRAINT "fantasy_teams_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fantasy_teams" ADD CONSTRAINT "fantasy_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gameweek_points" ADD CONSTRAINT "gameweek_points_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "public"."fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gameweek_points" ADD CONSTRAINT "gameweek_points_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "public"."gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."league_seasons" ADD CONSTRAINT "league_seasons_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_tokens" ADD CONSTRAINT "payment_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."player_gameweek_stats" ADD CONSTRAINT "player_gameweek_stats_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "public"."gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."player_gameweek_stats" ADD CONSTRAINT "player_gameweek_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."player_season_prices" ADD CONSTRAINT "player_season_prices_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfers" ADD CONSTRAINT "transfers_fantasy_team_id_fkey" FOREIGN KEY ("fantasy_team_id") REFERENCES "public"."fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfers" ADD CONSTRAINT "transfers_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "public"."gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfers" ADD CONSTRAINT "transfers_player_in_id_fkey" FOREIGN KEY ("player_in_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfers" ADD CONSTRAINT "transfers_player_out_id_fkey" FOREIGN KEY ("player_out_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

