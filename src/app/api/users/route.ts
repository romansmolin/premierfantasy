import { NextRequest } from 'next/server'

import { container } from '@/shared/lib/di'

export async function GET() {
    return container.userController.getAll()
}

export async function POST(req: NextRequest) {
    return container.userController.create(req)
}
