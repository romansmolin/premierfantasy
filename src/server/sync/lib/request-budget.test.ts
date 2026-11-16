import { describe, expect, it } from 'vitest'

import { RequestBudget } from './request-budget'

describe('RequestBudget.timeUp', () => {
    it('is false without a deadline', () => {
        expect(new RequestBudget(10).timeUp()).toBe(false)
    })

    it('turns true at the deadline and does not count a request', () => {
        let time = 1000
        const budget = new RequestBudget(10, 0, { maxMillis: 500, now: () => time })

        expect(budget.timeUp()).toBe(false)

        time = 1500

        expect(budget.timeUp()).toBe(true)
        expect(budget.used).toBe(0)
    })
})
