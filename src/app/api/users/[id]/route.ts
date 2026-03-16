import { NextRequest } from 'next/server'

import { container } from '@/shared/lib/di'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return container.userController.getById(id)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return container.userController.update(req, id)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return container.userController.delete(id)
}
