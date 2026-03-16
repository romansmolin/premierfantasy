import { NextRequest, NextResponse } from 'next/server'

import { IUserService } from '../../service/user.service.interface'

export class UserController {
    private readonly userService
    constructor(userService: IUserService) {
        this.userService = userService
    }

    async getAll() {
        const users = await this.userService.getAllUsers()

        return NextResponse.json(users)
    }

    async getById(id: string) {
        const user = await this.userService.getUser(id)

        if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        return NextResponse.json(user)
    }

    async create(req: NextRequest) {
        const body = await req.json()
        // validate with zod here
        const user = await this.userService.createUser(body)

        return NextResponse.json(user, { status: 201 })
    }

    async update(req: NextRequest, id: string) {
        const body = await req.json()
        const user = await this.userService.updateUser(id, body)

        return NextResponse.json(user)
    }

    async delete(id: string) {
        await this.userService.deleteUser(id)

        return NextResponse.json(null, { status: 204 })
    }
}
