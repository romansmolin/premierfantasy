-- Fantasy game removed: drop game tables and demo users, keep everything else.
DROP TABLE IF EXISTS "gameweek_points", "transfers", "fantasy_team_players", "fantasy_teams", "league_memberships", "competitions" CASCADE;
DELETE FROM "users" WHERE "is_demo" = true;
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_demo";
