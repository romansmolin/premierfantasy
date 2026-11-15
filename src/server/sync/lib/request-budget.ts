/** Daily API-Football requests we leave untouched for the website itself. */
export const API_DAILY_RESERVE = 1500

export class RequestBudget {
    private readonly max: number
    private readonly reserve: number
    private count = 0

    constructor(max: number, reserve: number = API_DAILY_RESERVE) {
        this.max = max
        this.reserve = reserve
    }

    /**
     * Call before every request. Returns true (and counts the request) when it may go ahead,
     * false when the run must stop: max reached, or the daily quota left is at or below the reserve.
     */
    take(dailyRemaining: number | null): boolean {
        if (this.count >= this.max) return false

        if (dailyRemaining !== null && dailyRemaining <= this.reserve) return false

        this.count += 1

        return true
    }

    get used(): number {
        return this.count
    }
}
