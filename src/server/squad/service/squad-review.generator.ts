import { z } from 'zod'

import { openaiClient } from '@/shared/api/openai-client'
import { Errors } from '@/shared/lib/http'

import type { ISquadReviewGenerator, ReviewContext, ReviewDraft } from './squad-review.service'

const draftSchema = z.object({
    summary: z.string().min(1).max(1200),
    strengths: z.array(z.string().max(300)).max(6),
    risks: z.array(z.string().max(300)).max(6),
    suggestions: z.array(z.object({ out: z.string(), in: z.string(), reason: z.string().max(300) })).max(5),
})

const SYSTEM_PROMPT = `You review a Fantasy Premier League squad using only the data provided.
Respond ONLY with JSON (no markdown): {"summary": string, "strengths": string[], "risks": string[], "suggestions": [{"out": id, "in": id, "reason": string}]}.
Suggestions are single swaps: "out" must be the id of a player in the squad, "in" the id of a player from the alternatives list, same position.
Never invent players, injuries or fixtures. At most 5 suggestions; prefer none over weak ones.`

export class SquadReviewGenerator implements ISquadReviewGenerator {
    async review(context: ReviewContext): Promise<ReviewDraft> {
        const line = (p: ReviewContext['players'][number] | ReviewContext['alternatives'][number]) =>
            `${p.id} | ${p.position} | ${p.name} (${p.club}) | £${p.priceTenths === null ? '?' : (p.priceTenths / 10).toFixed(1)}m | forecast ${p.forecast?.toFixed(1) ?? 'n/a'} | form ${p.form ?? 'n/a'}${p.note ? ` | ${p.note}` : ''}`
        const prompt = [
            `Gameweek ${context.event}, squad "${context.squadName}".`,
            'SQUAD:',
            ...context.players.map((p) => `${line(p)} | ${p.role}${p.captain ? ` | ${p.captain}` : ''}`),
            'ALTERNATIVES (best forecast per position, not in the squad):',
            ...context.alternatives.map(line),
        ].join('\n')
        const raw = await openaiClient.analyze(SYSTEM_PROMPT, prompt)

        try {
            return draftSchema.parse(
                JSON.parse(
                    raw
                        .replace(/```json\n?/g, '')
                        .replace(/```\n?/g, '')
                        .trim(),
                ),
            )
        } catch {
            throw Errors.internal('AI returned an unreadable result')
        }
    }
}
