import { describe, expect, it } from 'vitest'

import { generateDemoGameweekScore } from './demo-score'

describe('generateDemoGameweekScore', () => {
    it('is deterministic in (team, gameweek)', () => {
        expect(generateDemoGameweekScore('team-a', 'gw-1')).toBe(generateDemoGameweekScore('team-a', 'gw-1'))
    })

    it('stays inside the believable range for many samples', () => {
        for (let team = 0; team < 20; team++) {
            for (let gw = 0; gw < 10; gw++) {
                const score = generateDemoGameweekScore(`team-${team}`, `gw-${gw}`)

                expect(score).toBeGreaterThanOrEqual(12)
                expect(score).toBeLessThanOrEqual(92)
                expect(Number.isInteger(score)).toBe(true)
            }
        }
    })

    it('varies across teams and across gameweeks', () => {
        const acrossTeams = new Set(
            Array.from({ length: 20 }, (_, i) => generateDemoGameweekScore(`team-${i}`, 'gw-1')),
        )
        const acrossGameweeks = new Set(
            Array.from({ length: 20 }, (_, i) => generateDemoGameweekScore('team-a', `gw-${i}`)),
        )

        expect(acrossTeams.size).toBeGreaterThan(5)
        expect(acrossGameweeks.size).toBeGreaterThan(5)
    })
})
