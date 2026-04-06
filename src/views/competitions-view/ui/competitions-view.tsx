'use client'

import { CompetitionList } from '@/features/competition'

export const CompetitionsView = () => {
    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">Browse fantasy football competitions</p>
            </div>
            <CompetitionList />
        </div>
    )
}
