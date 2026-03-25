'use client'

import useSWR from 'swr'

import { competitionService } from '@/entities/competition'

export const useCompetitions = () => {
    const { data, error, isLoading } = useSWR('/api/competitions', () => competitionService.getAll())

    return { competitions: data, error, isLoading }
}
