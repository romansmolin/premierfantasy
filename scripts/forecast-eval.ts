/**
 * Prints the walk-forward evaluation of the forecast model. Reads only; writes nothing.
 *
 * Usage: npx tsx -r dotenv/config scripts/forecast-eval.ts
 */
import { evaluateWalkForward } from '../src/server/prediction/lib/evaluation'
import { ForecastDataRepository } from '../src/server/prediction/repository/forecast-data.repository'

async function main() {
    const data = await new ForecastDataRepository().loadDataset()
    const { evaluation, calibration } = evaluateWalkForward(data)
    const line = (text: string) => process.stdout.write(`${text}\n`)
    const f = (x: number) => x.toFixed(3)

    line(`events evaluated: ${evaluation.eventsEvaluated}  player-events: ${evaluation.playerEvents}`)
    line(`MAE   model ${f(evaluation.mae)}   baseline ${f(evaluation.baselineMae)}`)
    line(`rank  model ${f(evaluation.rankCorr)}   baseline ${f(evaluation.baselineRankCorr)}`)
    line(
        `bar passed: ${evaluation.passed}${evaluation.reasons.length > 0 ? `  (${evaluation.reasons.join('; ')})` : ''}`,
    )

    const byPosition = evaluation.details.byPosition as Record<
        string,
        { n: number; mae: number; baselineMae: number }
    >

    for (const [position, v] of Object.entries(byPosition)) {
        line(`  ${position}: n=${v.n} MAE model ${f(v.mae)} baseline ${f(v.baselineMae)}`)
    }

    line(`calibration: ${JSON.stringify(calibration)}`)
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error)
        process.exit(1)
    })
    .finally(() => process.exit(0))
