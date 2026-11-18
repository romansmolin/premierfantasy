import Link from 'next/link'

import { Button, buttonVariants } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'

import type { Position } from '@/server/prediction/lib/scoring-rules'

export interface TrayPlayer {
    id: string
    name: string
    position: Position
}

interface Props {
    players: TrayPlayer[]
    onRemove: (id: string) => void
    onClear: () => void
}

export function CompareTray({ players, onRemove, onClear }: Props) {
    if (players.length === 0) return null

    const ready = players.length >= 2

    return (
        <Card className="sticky bottom-4 z-10 flex-row flex-wrap items-center gap-3 px-4 py-3 shadow-xl">
            <ul className="flex flex-1 flex-wrap gap-2 text-sm">
                {players.map((p) => (
                    <li key={p.id} className="flex items-center gap-1.5 rounded-full border px-3 py-1">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.position}</span>
                        <button
                            type="button"
                            aria-label={`Remove ${p.name} from the comparison`}
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => onRemove(p.id)}
                        >
                            ×
                        </button>
                    </li>
                ))}
                {!ready && (
                    <li className="self-center text-xs text-muted-foreground">Pick one more to compare</li>
                )}
            </ul>
            <Button type="button" variant="ghost" onClick={onClear}>
                Clear
            </Button>
            {ready ? (
                <Link
                    href={`/scout/compare?ids=${players.map((p) => p.id).join(',')}`}
                    className={buttonVariants()}
                >
                    Compare
                </Link>
            ) : (
                <Button type="button" disabled>
                    Compare
                </Button>
            )}
        </Card>
    )
}
