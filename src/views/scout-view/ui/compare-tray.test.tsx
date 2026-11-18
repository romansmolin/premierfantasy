import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CompareTray } from './compare-tray'

const a = { id: 'a', name: 'Bukayo Saka', position: 'MID' as const }
const b = { id: 'b', name: 'Cole Palmer', position: 'MID' as const }

const html = (players: (typeof a)[]) =>
    renderToStaticMarkup(
        <CompareTray players={players} onRemove={() => undefined} onClear={() => undefined} />,
    )

describe('CompareTray', () => {
    it('renders nothing when no player is selected', () => {
        expect(html([])).toBe('')
    })

    it('shows the selected players and keeps Compare disabled with only one', () => {
        const out = html([a])

        expect(out).toContain('Bukayo Saka')
        expect(out).toMatch(/<button[^>]*disabled/)
        expect(out).not.toContain('/scout/compare')
    })

    it('links Compare to the compare page with both ids in order', () => {
        const out = html([a, b])

        expect(out).toContain('href="/scout/compare?ids=a,b"')
        expect(out).toContain('Cole Palmer')
    })
})
