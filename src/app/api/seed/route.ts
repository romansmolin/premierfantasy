import { NextResponse } from 'next/server'

import { prisma } from '@/shared/lib/prisma'

export async function POST() {
    try {
        const existingUsers = await prisma.user.findMany({
            where: { email: { not: { endsWith: '@seed.local' } } },
            select: { id: true, name: true, email: true },
        })

        if (existingUsers.length === 0) {
            return NextResponse.json({ error: 'No users found. Sign up first.' }, { status: 400 })
        }

        const userId = existingUsers[0].id
        const userName = existingUsers[0].name

        // --- 0. Clean up old data ---
        // Delete non-seed competitions and their related data
        const oldComps = await prisma.competition.findMany({
            where: { id: { not: { startsWith: 'seed-comp' } } },
            select: { id: true },
        })

        const oldCompIds = oldComps.map((c) => c.id)

        if (oldCompIds.length > 0) {
            const oldTeams = await prisma.fantasyTeam.findMany({
                where: { competitionId: { in: oldCompIds } },
                select: { id: true },
            })

            const oldTeamIds = oldTeams.map((t) => t.id)

            if (oldTeamIds.length > 0) {
                await prisma.gameweekPoints.deleteMany({ where: { fantasyTeamId: { in: oldTeamIds } } })
                await prisma.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId: { in: oldTeamIds } } })
                await prisma.transfer.deleteMany({ where: { fantasyTeamId: { in: oldTeamIds } } })
                await prisma.fantasyTeam.deleteMany({ where: { id: { in: oldTeamIds } } })
            }

            await prisma.competition.deleteMany({ where: { id: { in: oldCompIds } } })
        }

        // Clean old player stats and gameweek points (will be recalculated by pipeline)
        await prisma.playerGameweekStats.deleteMany({})
        await prisma.gameweekPoints.deleteMany({})

        // --- 1. Teams ---
        const teamsData = [
            {
                externalId: 33,
                name: 'Manchester United',
                shortName: 'MUN',
                logo: 'https://media.api-sports.io/football/teams/33.png',
            },
            {
                externalId: 40,
                name: 'Liverpool',
                shortName: 'LIV',
                logo: 'https://media.api-sports.io/football/teams/40.png',
            },
            {
                externalId: 42,
                name: 'Arsenal',
                shortName: 'ARS',
                logo: 'https://media.api-sports.io/football/teams/42.png',
            },
            {
                externalId: 49,
                name: 'Chelsea',
                shortName: 'CHE',
                logo: 'https://media.api-sports.io/football/teams/49.png',
            },
            {
                externalId: 50,
                name: 'Manchester City',
                shortName: 'MCI',
                logo: 'https://media.api-sports.io/football/teams/50.png',
            },
        ]

        for (const t of teamsData) {
            await prisma.team.upsert({
                where: { externalId: t.externalId },
                create: t,
                update: { name: t.name, shortName: t.shortName, logo: t.logo },
            })
        }

        const teams = await prisma.team.findMany({
            where: { externalId: { in: teamsData.map((t) => t.externalId) } },
        })
        const teamMap = Object.fromEntries(teams.map((t) => [t.externalId, t.id]))

        // --- 2. Players (real API-Football IDs) ---
        const playersData = [
            { externalId: 50132, name: 'A. Bayindir', position: 'GK' as const, teamExtId: 33 },
            { externalId: 2935, name: 'H. Maguire', position: 'DEF' as const, teamExtId: 33 },
            { externalId: 1485, name: 'Bruno Fernandes', position: 'MID' as const, teamExtId: 33 },
            { externalId: 280, name: 'Alisson', position: 'GK' as const, teamExtId: 40 },
            { externalId: 290, name: 'V. van Dijk', position: 'DEF' as const, teamExtId: 40 },
            { externalId: 306, name: 'M. Salah', position: 'FWD' as const, teamExtId: 40 },
            { externalId: 1145, name: 'I. Konaté', position: 'DEF' as const, teamExtId: 40 },
            { externalId: 22090, name: 'W. Saliba', position: 'DEF' as const, teamExtId: 42 },
            { externalId: 1460, name: 'B. Saka', position: 'MID' as const, teamExtId: 42 },
            { externalId: 643, name: 'G. Jesus', position: 'FWD' as const, teamExtId: 42 },
            { externalId: 152982, name: 'C. Palmer', position: 'MID' as const, teamExtId: 49 },
            { externalId: 1100, name: 'E. Haaland', position: 'FWD' as const, teamExtId: 50 },
        ]

        for (const p of playersData) {
            await prisma.player.upsert({
                where: { externalId: p.externalId },
                create: {
                    externalId: p.externalId,
                    name: p.name,
                    position: p.position,
                    teamId: teamMap[p.teamExtId],
                },
                update: { name: p.name, position: p.position, teamId: teamMap[p.teamExtId] },
            })
        }

        const players = await prisma.player.findMany({
            where: { externalId: { in: playersData.map((p) => p.externalId) } },
        })
        const playerMap = Object.fromEntries(players.map((p) => [p.externalId, p]))

        // --- 3. Gameweeks (GW1-38, real PL 2025/26 dates) ---
        // Season starts Aug 16 2025, one GW per week
        const seasonStart = new Date('2025-08-16T15:00:00Z')

        for (let i = 1; i <= 38; i++) {
            const start = new Date(seasonStart.getTime() + (i - 1) * 7 * 24 * 60 * 60 * 1000)
            const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000)
            const deadline = new Date(start.getTime() - 60 * 60 * 1000)

            // By March 31, 2026 we're ~32 weeks in → GW31 is active
            await prisma.gameweek.upsert({
                where: { number: i },
                create: {
                    number: i,
                    startDate: start,
                    endDate: end,
                    deadline,
                    isActive: i === 31,
                    isFinished: i <= 30,
                },
                update: { startDate: start, endDate: end, deadline, isActive: i === 31, isFinished: i <= 30 },
            })
        }

        const gameweeks = await prisma.gameweek.findMany({ orderBy: { number: 'asc' } })
        const gwMap = Object.fromEntries(gameweeks.map((gw) => [gw.number, gw.id]))

        // --- 4. Competitions (8 rolling, 5 GW each) ---
        const competitions = [
            { id: 'seed-comp-1', name: 'GW1\u2013GW5', start: 1, end: 5, status: 'completed' },
            { id: 'seed-comp-2', name: 'GW6\u2013GW10', start: 6, end: 10, status: 'completed' },
            { id: 'seed-comp-3', name: 'GW11\u2013GW15', start: 11, end: 15, status: 'completed' },
            { id: 'seed-comp-4', name: 'GW16\u2013GW20', start: 16, end: 20, status: 'completed' },
            { id: 'seed-comp-5', name: 'GW21\u2013GW25', start: 21, end: 25, status: 'completed' },
            { id: 'seed-comp-6', name: 'GW26\u2013GW30', start: 26, end: 30, status: 'completed' },
            { id: 'seed-comp-7', name: 'GW31\u2013GW35', start: 31, end: 35, status: 'active' },
            { id: 'seed-comp-8', name: 'GW36\u2013GW38', start: 36, end: 38, status: 'upcoming' },
        ]

        for (const c of competitions) {
            const gwStart = gameweeks.find((gw) => gw.number === c.start)

            await prisma.competition.upsert({
                where: { id: c.id },
                create: {
                    id: c.id,
                    name: c.name,
                    startGameweek: c.start,
                    endGameweek: c.end,
                    status: c.status,
                    joinDeadline: gwStart ? new Date(gwStart.startDate.getTime() - 60 * 60 * 1000) : null,
                },
                update: { status: c.status, name: c.name },
            })
        }

        // --- 5. Fake users ---
        const user2 = await prisma.user.upsert({
            where: { email: 'alice@seed.local' },
            create: { name: 'Alice Manager', email: 'alice@seed.local', emailVerified: false },
            update: {},
        })

        const user3 = await prisma.user.upsert({
            where: { email: 'bob@seed.local' },
            create: { name: 'Bob Tactician', email: 'bob@seed.local', emailVerified: false },
            update: {},
        })

        // --- 6. Fantasy Teams for completed + active competitions ---
        const allUsers = [
            { id: userId, name: `${userName}'s Team` },
            { id: user2.id, name: "Alice's XI" },
            { id: user3.id, name: "Bob's Squad" },
        ]

        const compIdsWithTeams = competitions.filter((c) => c.status !== 'upcoming').map((c) => c.id)
        const ftMap: Record<string, Record<string, string>> = {}

        for (const compId of compIdsWithTeams) {
            ftMap[compId] = {}

            for (const u of allUsers) {
                const ft = await prisma.fantasyTeam.upsert({
                    where: { userId_competitionId: { userId: u.id, competitionId: compId } },
                    create: { userId: u.id, competitionId: compId, name: u.name, budgetLeft: 12.5 },
                    update: {},
                })

                ftMap[compId][u.id] = ft.id
            }
        }

        // --- 7. Squad players for your teams ---
        const squadPlayers = [
            { externalId: 50132, position: 'GK' as const, price: 5.0 },
            { externalId: 2935, position: 'DEF' as const, price: 5.5 },
            { externalId: 290, position: 'DEF' as const, price: 6.5 },
            { externalId: 22090, position: 'DEF' as const, price: 6.0 },
            { externalId: 1485, position: 'MID' as const, price: 8.5 },
            { externalId: 1460, position: 'MID' as const, price: 9.0 },
            { externalId: 152982, position: 'MID' as const, price: 8.0 },
            { externalId: 306, position: 'FWD' as const, price: 10.0 },
            { externalId: 1100, position: 'FWD' as const, price: 12.0 },
            { externalId: 643, position: 'FWD' as const, price: 8.0 },
            { externalId: 1145, position: 'DEF' as const, price: 5.5 },
        ]

        for (const compId of compIdsWithTeams) {
            const myFtId = ftMap[compId][userId]

            await prisma.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId: myFtId } })

            for (const sp of squadPlayers) {
                const player = playerMap[sp.externalId]

                if (!player) continue

                await prisma.fantasyTeamPlayer.create({
                    data: {
                        fantasyTeamId: myFtId,
                        playerId: player.id,
                        position: sp.position,
                        purchasePrice: sp.price,
                    },
                })
            }
        }

        // --- 8. Wallet (stats + points will be calculated by the pipeline with real API data) ---
        await prisma.user.update({ where: { id: userId }, data: { coinBalance: 1550 } })
        await prisma.coinTransaction.deleteMany({ where: { userId } })
        await prisma.coinTransaction.createMany({
            data: [
                { userId, amount: 500, type: 'COMPETITION_REWARD', description: '1st place — GW1\u2013GW5' },
                { userId, amount: 300, type: 'COMPETITION_REWARD', description: '2nd place — GW6\u2013GW10' },
                {
                    userId,
                    amount: 500,
                    type: 'COMPETITION_REWARD',
                    description: '1st place — GW11\u2013GW15',
                },
                {
                    userId,
                    amount: 100,
                    type: 'COMPETITION_REWARD',
                    description: '3rd place — GW16\u2013GW20',
                },
                {
                    userId,
                    amount: 300,
                    type: 'COMPETITION_REWARD',
                    description: '2nd place — GW21\u2013GW25',
                },
                {
                    userId,
                    amount: 500,
                    type: 'COMPETITION_REWARD',
                    description: '1st place — GW26\u2013GW30',
                },
                { userId, amount: 200, type: 'PURCHASE', description: 'Purchased 200 coins' },
                { userId, amount: -50, type: 'AI_FEATURE_SPEND', description: 'AI Transfer Suggestions' },
                { userId, amount: -100, type: 'AI_FEATURE_SPEND', description: 'Advanced Player Analytics' },
                { userId, amount: -200, type: 'PURCHASE', description: 'Purchased 200 coins' },
                { userId, amount: -50, type: 'AI_FEATURE_SPEND', description: 'Match Prediction Insights' },
            ],
        })

        return NextResponse.json({
            success: true,
            seeded: {
                user: userName,
                teams: 5,
                players: 12,
                gameweeks: 'GW1-38 (GW1-30 finished, GW31 active)',
                competitions: competitions.map((c) => `${c.name} (${c.status})`),
                fantasyTeams: `3 users x ${compIdsWithTeams.length} competitions`,
                wallet: '1,550 coins, 11 transactions',
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Seed failed'

        console.error('Seed error:', error)

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
