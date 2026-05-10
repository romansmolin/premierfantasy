import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isAuthError, requireUserId } from '@/shared/lib/auth-helpers'
import { Errors, parseJson, withController } from '@/shared/lib/http'

import type { IUserService } from '../service/user.service.interface'

const updateUserSchema = z
    .object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        image: z.string().url().nullable().optional(),
    })
    .strict()

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

const avatarSchema = z.object({
    image: z.string().url().nullable(),
})

export class UserController {
    private readonly userService: IUserService

    constructor(userService: IUserService) {
        this.userService = userService
    }

    private assertSelf(targetId: string, sessionUserId: string) {
        if (targetId !== sessionUserId) throw Errors.forbidden()
    }

    getById = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        this.assertSelf(id, userId)

        const user = await this.userService.getUser(id)

        if (!user) throw Errors.notFound()

        return user
    })

    update = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        this.assertSelf(id, userId)

        const data = await parseJson(req, updateUserSchema)

        return this.userService.updateUser(id, data)
    })

    delete = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        this.assertSelf(id, userId)

        await this.userService.deleteUser(id)

        return new NextResponse(null, { status: 204 })
    })

    changePassword = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        this.assertSelf(id, userId)

        const { currentPassword, newPassword } = await parseJson(req, changePasswordSchema)

        await this.userService.changePassword(id, currentPassword, newPassword)

        return { success: true }
    })

    updateAvatar = withController(async (req, ctx) => {
        const userId = await requireUserId(req)

        if (isAuthError(userId)) return userId

        const { id } = await ctx.params

        this.assertSelf(id, userId)

        const { image } = await parseJson(req, avatarSchema)
        const user = await this.userService.updateAvatar(id, image)

        return { image: user.image }
    })
}
