export interface IFantasyTeam {
    id: string
    userId: string
    competitionId: string
    name: string
    budgetTotal: number
    budgetLeft: number
    freeTransfers: number
    createdAt: Date
}

export interface ICreateFantasyTeam {
    userId: string
    competitionId: string
    name: string
    budgetLeft: number
}

export interface ISquadPlayer {
    externalId: number
    name: string
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
    teamExternalId: number
    purchasePrice: number
}

export interface ISquadPlayerWithStats {
    externalId: number
    name: string
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
    teamExternalId: number
    purchasePrice: number
    stats: {
        minutesPlayed: number
        goals: number
        assists: number
        cleanSheet: boolean
        saves: number
        penaltySaved: number
        penaltyMissed: number
        goalsConceded: number
        yellowCards: number
        redCards: number
        ownGoals: number
        totalPoints: number
    } | null
}

export interface ITransfer {
    id: string
    fantasyTeamId: string
    gameweekId: string
    playerIn: { externalId: number; name: string; position: 'GK' | 'DEF' | 'MID' | 'FWD' }
    playerOut: { externalId: number; name: string; position: 'GK' | 'DEF' | 'MID' | 'FWD' }
    isFree: boolean
    createdAt: Date
}

export interface ICreateTransfer {
    playerOutId: number
    playerInId: number
    playerInName: string
    playerInPosition: 'GK' | 'DEF' | 'MID' | 'FWD'
    playerInPrice: number
    playerInTeamId: number
}

export interface IStagedTransfer {
    playerOut: { id: number; name: string; position: string; price: number }
    playerIn: { id: number; name: string; position: string; price: number; teamId: number }
}

export interface ITransferInfo {
    freeTransfers: number
    deadline: Date | null
    transfersMade: number
    pointsCost: number
}
