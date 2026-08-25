-- Marks a finished competition whose demo scores have been locked in.
-- Once set, cron runs skip the competition entirely, so results stay stable.
ALTER TABLE "competitions" ADD COLUMN "demo_scoring_finalized_at" TIMESTAMP(3);
