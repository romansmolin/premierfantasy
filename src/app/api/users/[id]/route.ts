import { container } from '@/shared/lib/container'

export const GET = container.userController.getById
export const PATCH = container.userController.update
export const DELETE = container.userController.delete
