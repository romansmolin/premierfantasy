import { NextRequest } from 'next/server'

import { FantasyTeamRepository } from '@/server/fantasy-team/repository/fantasy-team.repository'
import { UserController } from '@/server/user/controller/user.controller'
import { UserRepository } from '@/server/user/repository/user.repository'
import { UserService } from '@/server/user/service/user.service'

const fantasyTeamRepository = new FantasyTeamRepository()
const userRepository = new UserRepository()
const userService = new UserService(userRepository, fantasyTeamRepository)
const userController = new UserController(userService)

export async function GET() {
    return userController.getAll()
}

export async function POST(req: NextRequest) {
    return userController.create(req)
}
