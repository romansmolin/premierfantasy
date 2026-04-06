import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Checking existing data...')

    const existingUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true } })

    console.log('Existing users:', existingUsers)

    // Find or use existing user
    const userId = existingUsers[0]?.id

    if (!userId) {
        console.log('No users found. Please sign up via the app first, then run this seed again.')
        return
    }

    console.log(`Using user: ${existingUsers[0].name} (${userId})`)

    // --- 1. Create Teams ---
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

    console.log('Teams upserted')

    const teams = await prisma.team.findMany({
        where: { externalId: { in: teamsData.map((t) => t.externalId) } },
    })
    const teamMap = Object.fromEntries(teams.map((t) => [t.externalId, t.id]))

    // --- 2. Create Players ---
    const playersData = [
        // Man United
        { externalId: 882, name: 'A. Onana', position: 'GK' as const, teamExtId: 33 },
        { externalId: 747, name: 'H. Maguire', position: 'DEF' as const, teamExtId: 33 },
        { externalId: 174, name: 'B. Fernandes', position: 'MID' as const, teamExtId: 33 },
        // Liverpool
        { externalId: 305, name: 'Alisson', position: 'GK' as const, teamExtId: 40 },
        { externalId: 1100, name: 'V. van Dijk', position: 'DEF' as const, teamExtId: 40 },
        { externalId: 306, name: 'M. Salah', position: 'FWD' as const, teamExtId: 40 },
        // Arsenal
        { externalId: 1460, name: 'D. Raya', position: 'GK' as const, teamExtId: 42 },
        { externalId: 1161, name: 'W. Saliba', position: 'DEF' as const, teamExtId: 42 },
        { externalId: 1160, name: 'B. Saka', position: 'MID' as const, teamExtId: 42 },
        { externalId: 1100, name: 'G. Jesus', position: 'FWD' as const, teamExtId: 42 },
        // Chelsea
        { externalId: 2289, name: 'R. Palmer', position: 'MID' as const, teamExtId: 49 },
        // Man City
        { externalId: 645, name: 'E. Haaland', position: 'FWD' as const, teamExtId: 50 },
    ]

    // Fix: van Dijk and Jesus can't share externalId 1100
    playersData[4].externalId = 1101
    playersData[9].externalId = 1162

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

    console.log('Players upserted')

    const players = await prisma.player.findMany({
        where: { externalId: { in: playersData.map((p) => p.externalId) } },
    })
    const playerMap = Object.fromEntries(players.map((p) => [p.externalId, p]))

    // --- 3. Create Gameweeks (GW1-10) ---
    const baseDate = new Date('2025-08-16T15:00:00Z')

    for (let i = 1; i <= 10; i++) {
        const start = new Date(baseDate.getTime() + (i - 1) * 7 * 24 * 60 * 60 * 1000)
        const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000)
        const deadline = new Date(start.getTime() - 60 * 60 * 1000)

        await prisma.gameweek.upsert({
            where: { number: i },
            create: {
                number: i,
                startDate: start,
                endDate: end,
                deadline,
                isActive: i === 5,
                isFinished: i < 5,
            },
            update: { startDate: start, endDate: end, deadline, isActive: i === 5, isFinished: i < 5 },
        })
    }

    console.log('Gameweeks upserted (GW1-10, GW5 active, GW1-4 finished)')

    const gameweeks = await prisma.gameweek.findMany({ orderBy: { number: 'asc' }, take: 10 })
    const gwMap = Object.fromEntries(gameweeks.map((gw) => [gw.number, gw.id]))

    // --- 4. Create Competitions ---
    const comp1 = await prisma.competition.upsert({
        where: { id: 'seed-comp-1' },
        create: {
            id: 'seed-comp-1',
            name: 'GW1–GW5',
            startGameweek: 1,
            endGameweek: 5,
            status: 'completed',
            joinDeadline: new Date('2025-08-15T14:00:00Z'),
        },
        update: { status: 'completed' },
    })

    const comp2 = await prisma.competition.upsert({
        where: { id: 'seed-comp-2' },
        create: {
            id: 'seed-comp-2',
            name: 'GW6–GW10',
            startGameweek: 6,
            endGameweek: 10,
            status: 'active',
            joinDeadline: new Date('2025-09-20T14:00:00Z'),
        },
        update: { status: 'active' },
    })

    console.log('Competitions created:', comp1.name, '(completed),', comp2.name, '(active)')

    // --- 5. Create Fantasy Teams (3 users simulated via same user + fake users) ---
    // Create 2 fake users for leaderboard
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

    // Fantasy teams for completed competition (comp1)
    const ft1 = await prisma.fantasyTeam.upsert({
        where: { userId_competitionId: { userId, competitionId: comp1.id } },
        create: {
            userId,
            competitionId: comp1.id,
            name: `${existingUsers[0].name}'s Team`,
            budgetLeft: 12.5,
        },
        update: {},
    })

    const ft2 = await prisma.fantasyTeam.upsert({
        where: { userId_competitionId: { userId: user2.id, competitionId: comp1.id } },
        create: { userId: user2.id, competitionId: comp1.id, name: "Alice's XI", budgetLeft: 15.0 },
        update: {},
    })

    const ft3 = await prisma.fantasyTeam.upsert({
        where: { userId_competitionId: { userId: user3.id, competitionId: comp1.id } },
        create: { userId: user3.id, competitionId: comp1.id, name: "Bob's Squad", budgetLeft: 10.0 },
        update: {},
    })

    // Fantasy team for active competition (comp2) - only the real user
    const ft4 = await prisma.fantasyTeam.upsert({
        where: { userId_competitionId: { userId, competitionId: comp2.id } },
        create: {
            userId,
            competitionId: comp2.id,
            name: `${existingUsers[0].name}'s Team`,
            budgetLeft: 12.5,
        },
        update: {},
    })

    console.log('Fantasy teams created')

    // --- 6. Assign squad players to your team (11 players) ---
    const squadPlayers = [
        { externalId: 882, position: 'GK' as const, price: 5.0 },
        { externalId: 747, position: 'DEF' as const, price: 5.5 },
        { externalId: 1101, position: 'DEF' as const, price: 6.5 },
        { externalId: 1161, position: 'DEF' as const, price: 6.0 },
        { externalId: 174, position: 'MID' as const, price: 8.5 },
        { externalId: 1160, position: 'MID' as const, price: 9.0 },
        { externalId: 2289, position: 'MID' as const, price: 8.0 },
        { externalId: 306, position: 'FWD' as const, price: 10.0 },
        { externalId: 645, position: 'FWD' as const, price: 12.0 },
        { externalId: 1162, position: 'FWD' as const, price: 8.0 },
        { externalId: 1460, position: 'GK' as const, price: 5.5 },
    ]

    // Assign to both teams (comp1 and comp2)
    for (const ftId of [ft1.id, ft4.id]) {
        await prisma.fantasyTeamPlayer.deleteMany({ where: { fantasyTeamId: ftId } })

        for (const sp of squadPlayers) {
            const player = playerMap[sp.externalId]

            if (!player) continue

            await prisma.fantasyTeamPlayer.create({
                data: {
                    fantasyTeamId: ftId,
                    playerId: player.id,
                    position: sp.position,
                    purchasePrice: sp.price,
                },
            })
        }
    }

    console.log('Squad players assigned')

    // --- 7. Create PlayerGameweekStats (GW1-4, realistic data) ---
    const statsData: Record<
        number,
        {
            gw: number
            mins: number
            goals: number
            assists: number
            cs: boolean
            saves: number
            yc: number
            rc: number
            gc: number
            pts: number
        }[]
    > = {
        882: [
            { gw: 1, mins: 90, goals: 0, assists: 0, cs: true, saves: 4, yc: 0, rc: 0, gc: 0, pts: 7 },
            { gw: 2, mins: 90, goals: 0, assists: 0, cs: false, saves: 3, yc: 0, rc: 0, gc: 2, pts: 2 },
            { gw: 3, mins: 90, goals: 0, assists: 0, cs: true, saves: 5, yc: 0, rc: 0, gc: 0, pts: 8 },
            { gw: 4, mins: 90, goals: 0, assists: 0, cs: false, saves: 2, yc: 1, rc: 0, gc: 3, pts: 0 },
        ],
        747: [
            { gw: 1, mins: 90, goals: 0, assists: 0, cs: true, saves: 0, yc: 1, rc: 0, gc: 0, pts: 5 },
            { gw: 2, mins: 90, goals: 1, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 2, pts: 7 },
            { gw: 3, mins: 90, goals: 0, assists: 1, cs: true, saves: 0, yc: 0, rc: 0, gc: 0, pts: 9 },
            { gw: 4, mins: 45, goals: 0, assists: 0, cs: false, saves: 0, yc: 1, rc: 0, gc: 1, pts: 0 },
        ],
        1101: [
            { gw: 1, mins: 90, goals: 0, assists: 0, cs: true, saves: 0, yc: 0, rc: 0, gc: 0, pts: 6 },
            { gw: 2, mins: 90, goals: 0, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 1, pts: 4 },
            { gw: 3, mins: 90, goals: 1, assists: 0, cs: true, saves: 0, yc: 0, rc: 0, gc: 0, pts: 12 },
            { gw: 4, mins: 90, goals: 0, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 2, pts: 1 },
        ],
        174: [
            { gw: 1, mins: 90, goals: 1, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 10 },
            { gw: 2, mins: 90, goals: 0, assists: 2, cs: false, saves: 0, yc: 1, rc: 0, gc: 0, pts: 7 },
            { gw: 3, mins: 90, goals: 2, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 12 },
            { gw: 4, mins: 90, goals: 0, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 2 },
        ],
        306: [
            { gw: 1, mins: 90, goals: 2, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 14 },
            { gw: 2, mins: 90, goals: 1, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 6 },
            { gw: 3, mins: 90, goals: 0, assists: 2, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 8 },
            { gw: 4, mins: 90, goals: 3, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 15 },
        ],
        645: [
            { gw: 1, mins: 90, goals: 1, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 6 },
            { gw: 2, mins: 90, goals: 2, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 14 },
            { gw: 3, mins: 90, goals: 1, assists: 1, cs: false, saves: 0, yc: 1, rc: 0, gc: 0, pts: 8 },
            { gw: 4, mins: 90, goals: 0, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 2 },
        ],
        1160: [
            { gw: 1, mins: 90, goals: 0, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 5 },
            { gw: 2, mins: 90, goals: 1, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 10 },
            { gw: 3, mins: 90, goals: 0, assists: 0, cs: false, saves: 0, yc: 1, rc: 0, gc: 0, pts: 1 },
            { gw: 4, mins: 90, goals: 1, assists: 2, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 12 },
        ],
        2289: [
            { gw: 1, mins: 90, goals: 1, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 7 },
            { gw: 2, mins: 90, goals: 0, assists: 1, cs: false, saves: 0, yc: 1, rc: 0, gc: 0, pts: 4 },
            { gw: 3, mins: 90, goals: 2, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 15 },
            { gw: 4, mins: 90, goals: 1, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 7 },
        ],
        1161: [
            { gw: 1, mins: 90, goals: 0, assists: 0, cs: true, saves: 0, yc: 0, rc: 0, gc: 0, pts: 6 },
            { gw: 2, mins: 90, goals: 0, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 1, pts: 2 },
            { gw: 3, mins: 90, goals: 0, assists: 0, cs: true, saves: 0, yc: 0, rc: 0, gc: 0, pts: 6 },
            { gw: 4, mins: 90, goals: 1, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 2, pts: 5 },
        ],
        1162: [
            { gw: 1, mins: 70, goals: 0, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 2 },
            { gw: 2, mins: 90, goals: 1, assists: 0, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 6 },
            { gw: 3, mins: 45, goals: 0, assists: 0, cs: false, saves: 0, yc: 1, rc: 0, gc: 0, pts: 0 },
            { gw: 4, mins: 90, goals: 0, assists: 1, cs: false, saves: 0, yc: 0, rc: 0, gc: 0, pts: 5 },
        ],
        1460: [
            { gw: 1, mins: 90, goals: 0, assists: 0, cs: true, saves: 3, yc: 0, rc: 0, gc: 0, pts: 7 },
            { gw: 2, mins: 90, goals: 0, assists: 0, cs: false, saves: 5, yc: 0, rc: 0, gc: 2, pts: 3 },
            { gw: 3, mins: 90, goals: 0, assists: 0, cs: true, saves: 4, yc: 0, rc: 0, gc: 0, pts: 8 },
            { gw: 4, mins: 90, goals: 0, assists: 0, cs: false, saves: 2, yc: 0, rc: 0, gc: 1, pts: 2 },
        ],
    }

    for (const [extId, gwStats] of Object.entries(statsData)) {
        const player = playerMap[Number(extId)]

        if (!player) continue

        for (const s of gwStats) {
            await prisma.playerGameweekStats.upsert({
                where: { playerId_gameweekId: { playerId: player.id, gameweekId: gwMap[s.gw] } },
                create: {
                    playerId: player.id,
                    gameweekId: gwMap[s.gw],
                    minutesPlayed: s.mins,
                    goals: s.goals,
                    assists: s.assists,
                    cleanSheet: s.cs,
                    saves: s.saves,
                    yellowCards: s.yc,
                    redCards: s.rc,
                    goalsConceded: s.gc,
                    totalPoints: s.pts,
                },
                update: {
                    minutesPlayed: s.mins,
                    goals: s.goals,
                    assists: s.assists,
                    cleanSheet: s.cs,
                    saves: s.saves,
                    yellowCards: s.yc,
                    redCards: s.rc,
                    goalsConceded: s.gc,
                    totalPoints: s.pts,
                },
            })
        }
    }

    console.log('Player gameweek stats created (GW1-4)')

    // --- 8. Create GameweekPoints for fantasy teams ---
    // Your team (ft1) points per GW
    const yourGwPoints = [
        { gw: 1, pts: 75 },
        { gw: 2, pts: 63 },
        { gw: 3, pts: 87 },
        { gw: 4, pts: 51 },
    ]

    const aliceGwPoints = [
        { gw: 1, pts: 68 },
        { gw: 2, pts: 71 },
        { gw: 3, pts: 59 },
        { gw: 4, pts: 82 },
    ]

    const bobGwPoints = [
        { gw: 1, pts: 54 },
        { gw: 2, pts: 45 },
        { gw: 3, pts: 92 },
        { gw: 4, pts: 38 },
    ]

    for (const { ftId, points } of [
        { ftId: ft1.id, points: yourGwPoints },
        { ftId: ft2.id, points: aliceGwPoints },
        { ftId: ft3.id, points: bobGwPoints },
    ]) {
        for (const p of points) {
            await prisma.gameweekPoints.upsert({
                where: { fantasyTeamId_gameweekId: { fantasyTeamId: ftId, gameweekId: gwMap[p.gw] } },
                create: { fantasyTeamId: ftId, gameweekId: gwMap[p.gw], points: p.pts },
                update: { points: p.pts },
            })
        }
    }

    console.log('Gameweek points created')

    // --- 9. Give your user some coins ---
    await prisma.user.update({
        where: { id: userId },
        data: { coinBalance: 350 },
    })

    await prisma.coinTransaction.deleteMany({ where: { userId } })

    await prisma.coinTransaction.createMany({
        data: [
            { userId, amount: 500, type: 'COMPETITION_REWARD', description: '1st place reward (GW1-GW5)' },
            {
                userId,
                amount: -50,
                type: 'AI_FEATURE_SPEND',
                description: 'Spent 50 coins on AI Transfer Suggestions',
            },
            {
                userId,
                amount: -100,
                type: 'AI_FEATURE_SPEND',
                description: 'Spent 100 coins on Advanced Player Analytics',
            },
        ],
    })

    console.log('Wallet seeded (350 coins, 3 transactions)')

    console.log('\n--- SEED COMPLETE ---')
    console.log(`Competitions: GW1-5 (completed), GW6-10 (active)`)
    console.log(`Your team total points (comp1): ${yourGwPoints.reduce((s, p) => s + p.pts, 0)}`)
    console.log(`Alice total: ${aliceGwPoints.reduce((s, p) => s + p.pts, 0)}`)
    console.log(`Bob total: ${bobGwPoints.reduce((s, p) => s + p.pts, 0)}`)
    console.log(`Leaderboard: 1st=${existingUsers[0].name} (276), 2nd=Alice (280), 3rd=Bob (229)`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
