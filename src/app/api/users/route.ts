import { NextRequest } from 'next/server'

import { UserController } from '@/server/user/controller/user.controller'
import { UserRepository } from '@/server/user/repository/user.repository'
import { UserService } from '@/server/user/service/user.service'

const userRepository = new UserRepository()
const userService = new UserService(userRepository)
const userController = new UserController(userService)

export async function GET() {
    return userController.getAll()
}

export async function POST(req: NextRequest) {
    return userController.create(req)
}
