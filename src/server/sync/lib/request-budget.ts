/** Daily API-Football requests we leave untouched for the website itself. */
export const API_DAILY_RESERVE = 1500

interface BudgetOptions {
    /** Stop taking new requests this long after the budget was created (serverless time limit). */
    maxMillis?: number
    now?: () => number
}

export class RequestBudget {
    private readonly max: number
    private readonly reserve: number
    private readonly deadline: number | null
    private readonly now: () => number
    private count = 0

    constructor(
        max: number,
        reserve: number = API_DAILY_RESERVE,
        { maxMillis, now = Date.now }: BudgetOptions = {},
    ) {
        this.max = max
        this.reserve = reserve
        this.now = now
        this.deadline = maxMillis === undefined ? null : now() + maxMillis
    }

    /**
     * Call before every request. Returns true (and counts the request) when it may go ahead,
     * false when the run must stop: max reached, time limit passed, or the daily quota left is at or below the reserve.
     */
    take(dailyRemaining: number | null): boolean {
        if (this.count >= this.max) return false

        if (this.deadline !== null && this.now() >= this.deadline) return false

        if (dailyRemaining !== null && dailyRemaining <= this.reserve) return false

        this.count += 1

        return true
    }

    /** True once the time limit has passed. Does not count a request. */
    timeUp(): boolean {
        return this.deadline !== null && this.now() >= this.deadline
    }

    get used(): number {
        return this.count
    }
}
