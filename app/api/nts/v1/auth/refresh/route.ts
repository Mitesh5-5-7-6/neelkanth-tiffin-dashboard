import 'server-only';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/mongodb';
import { rotateRefreshToken } from '@/lib/token';
import { success, badRequest, unauthorized, internalServerError } from '@/lib/apiResponse';

// ─── POST /api/nts/v1/auth/refresh ────────────────────────────────────────────
// Token rotation: validates the presented refresh token, revokes it, and
// returns a fresh access + refresh token pair. Reuse of a revoked token
// revokes the whole chain (handled in the token service).

const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'refreshToken is required'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        const parsed = refreshSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors);
        }

        await dbConnect();
        const result = await rotateRefreshToken(parsed.data.refreshToken);

        if (!result.ok) {
            const message =
                result.reason === 'expired'
                    ? 'Refresh token expired'
                    : result.reason === 'revoked'
                      ? 'Refresh token has been revoked'
                      : 'Invalid refresh token';
            return unauthorized(message);
        }

        return success(
            {
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                expiresIn: result.tokens.expiresIn,
            },
            'Token refreshed',
        );
    } catch (e) {
        return internalServerError(e);
    }
}
