import 'server-only';
import type { NextRequest } from 'next/server';
import { verifyAccessToken, type AccessTokenClaims } from '@/lib/jwt';
import { unauthorized } from '@/lib/apiResponse';
import type { NextResponse } from 'next/server';

/**
 * Reusable Bearer-token guard for mobile (`/api/nts/v1/...`) routes.
 *
 * Independent from NextAuth — it reads the `Authorization: Bearer <jwt>`
 * header and validates the **mobile** access token. Rejects missing,
 * malformed, expired, and wrong-type tokens with a 401.
 *
 * Usage:
 *   const auth = verifyMobileToken(request);
 *   if (auth.error) return auth.error;
 *   // auth.user is the verified access-token claims
 */
export type MobileAuthOk = { user: AccessTokenClaims; error: null };
export type MobileAuthFail = { user: null; error: ReturnType<typeof NextResponse.json> };

export function verifyMobileToken(request: NextRequest): MobileAuthOk | MobileAuthFail {
    const header = request.headers.get('authorization') ?? request.headers.get('Authorization');

    if (!header || !header.startsWith('Bearer ')) {
        return { user: null, error: unauthorized('Missing or invalid Authorization header') };
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
        return { user: null, error: unauthorized('Missing bearer token') };
    }

    try {
        const claims = verifyAccessToken(token);
        return {
            user: { userId: claims.userId, email: claims.email, role: claims.role },
            error: null,
        };
    } catch (e) {
        const expired = e instanceof Error && e.name === 'TokenExpiredError';
        return {
            user: null,
            error: unauthorized(expired ? 'Access token expired' : 'Invalid access token'),
        };
    }
}
