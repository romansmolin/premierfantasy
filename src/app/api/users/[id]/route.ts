import { NextRequest } from 'next/server'

import { UserController } from '@/server/user/controller/user.controller'
import { UserRepository } from '@/server/user/repository/user.repository'
import { UserService } from '@/server/user/service/user.service'

const userRepository = new UserRepository()
const userService = new UserService(userRepository)
const userController = new UserController(userService)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return userController.getById(id)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return userController.update(req, id)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return userController.delete(id)
}
