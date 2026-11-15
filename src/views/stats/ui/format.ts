export const formatPrice = (price: number | null): string => (price === null ? '—' : `£${price.toFixed(1)}m`)

export const formatPoints = (points: number | null): string => (points === null ? '—' : points.toFixed(1))

export const formatDate = (value: Date | string): string =>
    new Date(value).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
    }) + ' UTC'
