-- Season-long league enrolment, independent of squad creation.
CREATE TABLE "league_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "league_season_id" TEXT NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "league_memberships_user_id_league_season_id_key"
    ON "league_memberships"("user_id", "league_season_id");
CREATE INDEX "league_memberships_user_id_idx" ON "league_memberships"("user_id");
CREATE INDEX "league_memberships_league_season_id_idx" ON "league_memberships"("league_season_id");

ALTER TABLE "league_memberships"
    ADD CONSTRAINT "league_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_memberships"
    ADD CONSTRAINT "league_memberships_league_id_fkey"
    FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "league_memberships"
    ADD CONSTRAINT "league_memberships_league_season_id_fkey"
    FOREIGN KEY ("league_season_id") REFERENCES "league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Demo participants: seeded managers and their squads, never real accounts.
ALTER TABLE "users" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "fantasy_teams" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- Backfill memberships for users who already have a squad in a league competition.
INSERT INTO "league_memberships" ("id", "user_id", "league_id", "league_season_id", "is_demo", "joined_at")
SELECT
    gen_random_uuid()::text,
    ft."user_id",
    ls."league_id",
    ls."id",
    false,
    MIN(ft."created_at")
FROM "fantasy_teams" ft
JOIN "competitions" c ON c."id" = ft."competition_id"
JOIN "league_seasons" ls ON ls."id" = c."league_season_id"
GROUP BY ft."user_id", ls."league_id", ls."id"
ON CONFLICT ("user_id", "league_season_id") DO NOTHING;
