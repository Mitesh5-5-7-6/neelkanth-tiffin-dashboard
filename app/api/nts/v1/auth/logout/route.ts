import 'server-only';
import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/mongodb';
import { revokeRefreshToken } from '@/lib/token';
import { success, badRequest, internalServerError } from '@/lib/apiResponse';

// ─── POST /api/nts/v1/auth/logout ─────────────────────────────────────────────
// Revokes the device's refresh token (removes the session). Idempotent — an
// unknown or already-revoked token still returns success so the client can
// safely clear its local state.

const logoutSchema = z.object({
    refreshToken: z.string().min(1, 'refreshToken is required'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        const parsed = logoutSchema.safeParse(body);
        if (!parsed.success) {
            return badRequest('Validation failed', parsed.error.flatten().fieldErrors);
        }

        await dbConnect();
        await revokeRefreshToken(parsed.data.refreshToken);

        return success({}, 'Logged out');
    } catch (e) {
        return internalServerError(e);
    }
}
