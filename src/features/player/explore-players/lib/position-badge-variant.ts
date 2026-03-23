const positionClasses: Record<string, string> = {
    Goalkeeper: 'bg-amber-500/15 text-amber-700 border-amber-500/25',
    Defender: 'bg-blue-500/15 text-blue-700 border-blue-500/25',
    Midfielder: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25',
    Attacker: 'bg-rose-500/15 text-rose-700 border-rose-500/25',
}

export const getPositionBadgeClass = (position: string): string => {
    return positionClasses[position] ?? ''
}
