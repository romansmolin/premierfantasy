'use client'

import { CompetitionList } from '@/features/competition'

export const CompetitionsView = () => {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Competitions</h2>
                <p className="text-sm text-muted-foreground">Browse fantasy football competitions</p>
            </div>
            <CompetitionList />
        </div>
    )
}
