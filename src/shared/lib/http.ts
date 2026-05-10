import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import type { NextRequest } from 'next/server'
import type { ZodType, infer as ZodInfer } from 'zod'

export class AppError extends Error {
    readonly statusCode: number
    readonly details?: unknown

    constructor(statusCode: number, message: string, details?: unknown) {
        super(message)
        this.name = 'AppError'
        this.statusCode = statusCode
        this.details = details
    }
}

export const Errors = {
    badRequest: (message: string, details?: unknown) => new AppError(400, message, details),
    unauthorized: (message = 'Unauthorized') => new AppError(401, message),
    forbidden: (message = 'Forbidden') => new AppError(403, message),
    notFound: (message = 'Not found') => new AppError(404, message),
    conflict: (message: string, details?: unknown) => new AppError(409, message, details),
    unprocessable: (message: string, details?: unknown) => new AppError(422, message, details),
    internal: (message = 'Internal server error') => new AppError(500, message),
} as const

type RouteContext = { params: Promise<Record<string, string>> }
type Handler<T> = (req: NextRequest, ctx: RouteContext) => Promise<T>

export function withController<T>(
    handler: Handler<T | NextResponse>,
): (req: NextRequest, ctx: RouteContext) => Promise<NextResponse> {
    return async (req, ctx) => {
        try {
            const result = await handler(req, ctx)

            if (result instanceof NextResponse) return result

            return NextResponse.json(result)
        } catch (error) {
            if (error instanceof AppError) {
                return NextResponse.json(
                    { error: error.message, details: error.details },
                    { status: error.statusCode },
                )
            }

            if (error instanceof ZodError) {
                return NextResponse.json(
                    { error: 'Invalid request', details: error.flatten() },
                    { status: 400 },
                )
            }

            if (error instanceof SyntaxError) {
                return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
            }

            console.error('Unhandled controller error:', error)

            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    }
}

export async function parseJson<S extends ZodType>(req: NextRequest, schema: S): Promise<ZodInfer<S>> {
    let body: unknown

    try {
        body = await req.json()
    } catch {
        throw Errors.badRequest('Invalid JSON body')
    }

    const parsed = schema.safeParse(body)

    if (!parsed.success) {
        throw Errors.badRequest('Invalid request', parsed.error.flatten())
    }

    return parsed.data
}

export function parseQuery<S extends ZodType>(req: NextRequest, schema: S): ZodInfer<S> {
    const query = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = schema.safeParse(query)

    if (!parsed.success) {
        throw Errors.badRequest('Invalid query parameters', parsed.error.flatten())
    }

    return parsed.data
}
