/**
 * Writes are sent in small transactions: Prisma gives every transaction 5 s by default, and one big batch
 * of a few hundred upserts over a network with some latency (a remote database) runs past it.
 */
export const WRITE_CHUNK_SIZE = 25

export function chunk<T>(items: T[], size: number): T[][] {
    if (size < 1) throw new Error('chunk size must be at least 1')

    const groups: T[][] = []

    for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size))

    return groups
}
