-- Which clubs play in a league season, so a league-correct player pool can be
-- resolved without calling the football API.
CREATE TABLE "league_season_teams" (
    "id" TEXT NOT NULL,
    "league_season_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_season_teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "league_season_teams_league_season_id_team_id_key"
    ON "league_season_teams"("league_season_id", "team_id");
CREATE INDEX "league_season_teams_team_id_idx" ON "league_season_teams"("team_id");

ALTER TABLE "league_season_teams"
    ADD CONSTRAINT "league_season_teams_league_season_id_fkey"
    FOREIGN KEY ("league_season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_season_teams"
    ADD CONSTRAINT "league_season_teams_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
