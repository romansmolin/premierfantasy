/** `YYYY-MM-DD` to a local-midnight Date, so the calendar never shifts the day across time zones. */
export function parseIsoDate(value: string | undefined): Date | undefined {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')

    if (!match) return undefined

    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
    const date = new Date(year, month - 1, day)

    // Reject overflow like 2024-02-31 rolling into March.
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : undefined
}

export function formatIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
