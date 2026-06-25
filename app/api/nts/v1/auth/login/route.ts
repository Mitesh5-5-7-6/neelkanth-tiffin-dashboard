import 'server-only';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/mongodb';
import { validateCredentials } from '@/lib/auth/validateCredentials';
import { issueTokenPair } from '@/lib/token';
import { success, badRequest, unauthorized, internalServerError, rateLimitExceeded } from '@/lib/apiResponse';
import { rateLimit } from '@/lib/rateLimit';

// ─── POST /api/nts/v1/auth/login ──────────────────────────────────────────────
// Mobile login. Validates against the SAME credentials as NextAuth (shared
// validateCredentials), then issues a JWT access + refresh token pair.
// Independent of NextAuth session cookies.

const loginSchema = z.object({
    email: z.string().min(1, 'Email is required'),
    password: z.string().min(1, 'Password is required'),
    device: z.string().max(200).optional(),
});

function clientIp(request: NextRequest): string {
    const fwd = request.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
    return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: NextRequest) {
    // Throttle brute-force attempts per IP (5 / minute).
    const limit = rateLimit(`mobile-login:${clientIp(request)}`, 5, 60_000);
    if (!limit.allowed) return rateLimitExceeded(limit.retryAfter);

    try {
        const body = await request.json().catch(() => null);
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors);
        }

        const user = validateCredentials(parsed.data.email, parsed.data.password);
        if (!user) return unauthorized('Invalid email or password');

        await dbConnect();
        const tokens = await issueTokenPair(user, parsed.data.device);

        return success(
            {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
            'Login successful',
        );
    } catch (e) {
        return internalServerError(e);
    }
}
