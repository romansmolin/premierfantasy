export interface DemoConfig {
    /** Master switch — off means cron and join hooks never touch demo data. */
    enabled: boolean
    /** Competitions are topped up with demo competitors to this total size. */
    targetParticipantCount: number
}

const parsedTarget = Number(process.env.DEMO_TARGET_PARTICIPANTS)

export const DEMO_CONFIG: DemoConfig = {
    enabled: process.env.DEMO_PARTICIPANTS_ENABLED !== 'false',
    targetParticipantCount:
        Number.isInteger(parsedTarget) && parsedTarget > 0 && parsedTarget <= 24 ? parsedTarget : 10,
}
