export const runtime = 'nodejs'

import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, rl } from '@/lib/rateLimit'

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        'unknown'
    )
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (!pathname.startsWith('/api/')) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-pathname', pathname)
        return NextResponse.next({ request: { headers: requestHeaders } })
    }
    if (pathname.startsWith('/api/auth')) return NextResponse.next()

    // Mobile auth endpoints (login/refresh/logout/me) are public: they are the
    // login surface and authenticate via their own Bearer/JWT layer, not the
    // NextAuth session this middleware checks. The handlers do their own auth.
    if (pathname.startsWith('/api/nts/v1/auth')) return NextResponse.next()

    const ip = getClientIp(request)
    const isMutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)
    const isBulk = pathname.includes('/bulk')

    // Tighter limits for bulk and mutating endpoints
    const key = isBulk ? rl.bulk(ip) : isMutating ? rl.write(ip) : rl.read(ip)
    const max = isBulk ? 20 : isMutating ? 50 : 200
    const result = rateLimit(key, max, 60_000)

    if (!result.allowed) {
        return NextResponse.json(
            {
                success: false,
                message: 'Too many requests. Please slow down.',
                data: null,
                error: { code: 'RATE_LIMIT_EXCEEDED', details: { retryAfter: result.retryAfter } },
            },
            { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
        )
    }

    // Auth check — all API routes require a valid session
    const token = await getToken({ req: request })
    const isExpired =
        token?.exp !== undefined && (token.exp as number) < Math.floor(Date.now() / 1000)

    if (!token || isExpired) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized', data: null, error: { code: 'UNAUTHORIZED' } },
            { status: 401 }
        )
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
