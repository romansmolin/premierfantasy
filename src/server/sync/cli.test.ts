import { describe, expect, it, vi } from 'vitest'

import { parseSyncArgs, runSyncCli } from './cli'

import type { CliDeps } from './cli'

const makeDeps = (jobs: CliDeps['jobs']): CliDeps & { lines: string[] } => {
    const lines: string[] = []

    return {
        jobs,
        groups: { short: ['a', 'b'] },
        syncRunRepository: {
            start: vi.fn().mockResolvedValue('r'),
            finish: vi.fn().mockResolvedValue(undefined),
        },
        write: (line) => lines.push(line),
        lines,
    }
}

describe('runSyncCli', () => {
    it('prints usage and returns 2 for an unknown job', async () => {
        const deps = makeDeps({ a: async () => ({ status: 'OK', stats: {} }) })

        expect(await runSyncCli(['nope'], deps)).toBe(2)
        expect(deps.lines[0]).toMatch(/Usage/)
    })

    it('runs a group in order and returns 0 when all are OK or PARTIAL', async () => {
        const order: string[] = []
        const deps = makeDeps({
            a: async () => (order.push('a'), { status: 'OK', stats: {} }),
            b: async () => (order.push('b'), { status: 'PARTIAL', stats: { saved: 1 } }),
        })

        expect(await runSyncCli(['short'], deps)).toBe(0)
        expect(order).toEqual(['a', 'b'])
    })

    it('keeps running the other jobs and returns 1 when one fails', async () => {
        const deps = makeDeps({
            a: async () => {
                throw new Error('boom')
            },
            b: async () => ({ status: 'OK', stats: {} }),
        })

        expect(await runSyncCli(['short'], deps)).toBe(1)
        expect(deps.lines.join('\n')).toMatch(/a: FAILED.*boom/)
        expect(deps.lines.join('\n')).toMatch(/b: OK/)
    })
})

describe('parseSyncArgs', () => {
    it('reads a job name without any flag', () => {
        expect(parseSyncArgs(['short'])).toEqual({ names: ['short'], maxRequests: 2000 })
    })

    it('reads the max-requests flag after the job name', () => {
        expect(parseSyncArgs(['full', '--max-requests', '500'])).toEqual({
            names: ['full'],
            maxRequests: 500,
        })
    })

    it('reads the max-requests flag before the job name', () => {
        expect(parseSyncArgs(['--max-requests', '5', 'fixtures'])).toEqual({
            names: ['fixtures'],
            maxRequests: 5,
        })
    })

    it('rejects a max-requests value that is not a positive integer', () => {
        expect(() => parseSyncArgs(['full', '--max-requests', 'abc'])).toThrow(/max-requests/)
        expect(() => parseSyncArgs(['full', '--max-requests', '0'])).toThrow(/max-requests/)
        expect(() => parseSyncArgs(['full', '--max-requests'])).toThrow(/max-requests/)
    })
})
