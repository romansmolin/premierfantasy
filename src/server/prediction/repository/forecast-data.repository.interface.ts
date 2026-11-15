import type { ForecastDataset } from '../lib/inputs'

export interface IForecastDataRepository {
    /** Everything the model needs, read with a handful of queries (no per-player queries). */
    loadDataset(): Promise<ForecastDataset>
}
