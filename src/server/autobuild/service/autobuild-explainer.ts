import { openaiClient } from '@/shared/api/openai-client'

import type { ExplainContext, IAutoBuildExplainer } from './autobuild.service.interface'

const SYSTEM_PROMPT = `You explain a Fantasy Premier League squad that an optimizer has already chosen.
The squad, captain and every number are final: never suggest changing them and never invent facts, injuries or fixtures.
Use only the data given. Write 4-6 short sentences of plain text (no markdown, no lists):
why the captain, where the money was spent, what the main risk is (availability notes, thin bench), and what the locked or excluded players cost.`

export class AutoBuildExplainer implements IAutoBuildExplainer {
    async explain(context: ExplainContext): Promise<string> {
        const lines = context.players.map(
            (p) =>
                `${p.starter ? 'XI' : 'bench'} ${p.position} ${p.name} (${p.club}) £${(p.priceTenths / 10).toFixed(1)}m, forecast ${p.forecast.toFixed(1)}, form ${p.form ?? 'n/a'}${p.note ? `, note: ${p.note}` : ''}`,
        )
        const prompt = [
            `Gameweek ${context.event}. Cost £${(context.totalTenths / 10).toFixed(1)}m. Expected XI points (captain doubled): ${context.expectedXi.toFixed(1)}. Captain: ${context.captain}.`,
            context.locked.length ? `Locked by the user: ${context.locked.join(', ')}.` : '',
            context.excluded.length ? `Excluded by the user: ${context.excluded.join(', ')}.` : '',
            ...lines,
        ]
            .filter(Boolean)
            .join('\n')

        return (await openaiClient.analyze(SYSTEM_PROMPT, prompt)).trim()
    }
}
