/** API-Football serves a head shot per player id; the host is allowed in next.config. */
export const playerPhotoUrl = (externalId: number) =>
    `https://media.api-sports.io/football/players/${externalId}.png`
