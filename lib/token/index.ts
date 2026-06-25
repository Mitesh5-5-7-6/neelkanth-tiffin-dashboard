import 'server-only';
import { createHash } from 'crypto';
import { Types } from 'mongoose';
import RefreshToken from '@/models/refresh-token.model';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
} from '@/lib/jwt';
import type { MobileAuthUser, TokenPair } from '@/types/auth.type';

/**
 * Refresh-token lifecycle for the mobile auth layer: issue, rotate, revoke.
 *
 * Security properties:
 *  - Only the SHA-256 hash of each refresh token is stored.
 *  - Every refresh rotates the token: the old record is revoked and a new one
 *    is issued (token rotation).
 *  - A refresh token that is already revoked but presented again is treated as
 *    reuse and the whole chain for that user is revoked (reuse detection).
 */

/** Hash a raw refresh token JWT before it ever touches the database. */
function hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

/** Issue a brand-new access + refresh token pair and persist the refresh record. */
export async function issueTokenPair(
    user: MobileAuthUser,
    device?: string,
): Promise<TokenPair> {
    const jti = new Types.ObjectId();

    const refreshToken = signRefreshToken({ userId: user.id, jti: jti.toHexString() });

    await RefreshToken.create({
        _id: jti,
        user_id: user.id,
        token_hash: hashToken(refreshToken),
        device,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    });

    const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export type RotateResult =
    | { ok: true; tokens: TokenPair }
    | { ok: false; reason: 'invalid' | 'expired' | 'revoked' };

/**
 * Validate a presented refresh token and rotate it.
 *
 * On success: the presented token is revoked and a fresh pair is returned.
 * On reuse of an already-revoked token: every active token for the user is
 * revoked and the call fails.
 */
export async function rotateRefreshToken(rawToken: string): Promise<RotateResult> {
    // 1) Cryptographic validity (signature, expiry, audience, type).
    let claims: { userId: string; jti: string };
    try {
        const decoded = verifyRefreshToken(rawToken);
        claims = { userId: decoded.userId, jti: decoded.jti };
    } catch (e) {
        const expired = e instanceof Error && e.name === 'TokenExpiredError';
        return { ok: false, reason: expired ? 'expired' : 'invalid' };
    }

    // 2) The record must exist and its stored hash must match this exact token.
    const record = await RefreshToken.findById(claims.jti);
    if (!record || record.token_hash !== hashToken(rawToken)) {
        return { ok: false, reason: 'invalid' };
    }

    // 3) Reuse detection: a revoked token being presented again is a red flag —
    //    nuke every live token for this user and refuse.
    if (record.revoked_at) {
        await RefreshToken.updateMany(
            { user_id: record.user_id, revoked_at: null },
            { $set: { revoked_at: new Date() } },
        );
        return { ok: false, reason: 'revoked' };
    }

    // 4) Hard-expiry guard (belt-and-braces alongside the JWT exp).
    if (record.expires_at.getTime() <= Date.now()) {
        return { ok: false, reason: 'expired' };
    }

    // 5) Rotate: issue a new pair, then revoke the old record pointing at the new.
    const user: MobileAuthUser = {
        id: record.user_id,
        name: 'Administrator',
        email: process.env.LOGIN_EMAIL ?? '',
        role: 'admin',
    };

    const tokens = await issueTokenPair(user, record.device);

    record.revoked_at = new Date();
    record.replaced_by = verifyRefreshToken(tokens.refreshToken).jti;
    await record.save();

    return { ok: true, tokens };
}

/**
 * Revoke a refresh token (logout). Idempotent and never throws for a
 * malformed/unknown token — logout should always "succeed" from the client's
 * perspective so it can safely clear local state.
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
    let jti: string;
    try {
        jti = verifyRefreshToken(rawToken).jti;
    } catch {
        return; // malformed/expired — nothing to revoke
    }

    await RefreshToken.updateOne(
        { _id: jti, revoked_at: null },
        { $set: { revoked_at: new Date() } },
    );
}
