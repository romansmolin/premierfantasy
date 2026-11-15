import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AIGeneratorService } from './ai-generator.service'

const analyzeMock = vi.hoisted(() => vi.fn())
const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/shared/api/openai-client', () => ({ openaiClient: { analyze: analyzeMock } }))
vi.mock('@/shared/api/api-football-client', () => ({ apiFootballClient: { get: getMock } }))

describe('AIGeneratorService with an unreadable model answer', () => {
    beforeEach(() => {
        analyzeMock.mockReset()
        getMock.mockReset()
        getMock.mockResolvedValue([{ teams: { home: { id: 1, name: 'A' }, away: { id: 2, name: 'B' } } }])
        analyzeMock.mockResolvedValue('this is not json')
    })

    it('analyzePlayer throws instead of returning a placeholder that would be billed', async () => {
        await expect(new AIGeneratorService().analyzePlayer(7)).rejects.toMatchObject({ statusCode: 500 })
    })

    it('predictMatch throws instead of returning a placeholder that would be billed', async () => {
        await expect(new AIGeneratorService().predictMatch(99)).rejects.toMatchObject({ statusCode: 500 })
    })
})
