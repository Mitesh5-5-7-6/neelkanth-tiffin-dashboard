import 'server-only';
import { type NextRequest } from 'next/server';
import { verifyMobileToken } from '@/lib/auth/verifyMobileToken';
import { success, internalServerError } from '@/lib/apiResponse';

// ─── GET /api/nts/v1/auth/me ──────────────────────────────────────────────────
// Returns the current user from a valid Bearer access token.
// Header: Authorization: Bearer <accessToken>

export async function GET(request: NextRequest) {
    const auth = verifyMobileToken(request);
    if (auth.error) return auth.error;

    try {
        return success(
            {
                id: auth.user.userId,
                email: auth.user.email,
                role: auth.user.role,
            },
            'Current user',
        );
    } catch (e) {
        return internalServerError(e);
    }
}
