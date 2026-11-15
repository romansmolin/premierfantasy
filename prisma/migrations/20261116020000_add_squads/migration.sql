-- CreateTable
CREATE TABLE "squads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captain_player_id" TEXT NOT NULL,
    "vice_captain_player_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_players" (
    "id" TEXT NOT NULL,
    "squad_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "price_tenths_at_save" INTEGER,

    CONSTRAINT "squad_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "squads_user_id_idx" ON "squads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "squad_players_squad_id_player_id_key" ON "squad_players"("squad_id", "player_id");

-- AddForeignKey
ALTER TABLE "squads" ADD CONSTRAINT "squads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_players" ADD CONSTRAINT "squad_players_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_players" ADD CONSTRAINT "squad_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

