import { UserController } from '@/server/user/controller/user.controller'
import { UserRepository } from '@/server/user/repository/user.repository'
import { UserService } from '@/server/user/service/user.service'

// Singletons — instantiated once
const userRepository = new UserRepository()
const userService = new UserService(userRepository)
const userController = new UserController(userService)

export const container = {
    userController,
} as const
