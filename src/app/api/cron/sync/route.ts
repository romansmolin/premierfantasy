import { container } from '@/shared/lib/container'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const GET = container.syncCronController.run
