import 'server-only';
import jwt, { type SignOptions, type JwtPayload } from 'jsonwebtoken';

/**
 * JWT helpers for the **mobile** auth layer only.
 *
 * Completely independent from NextAuth: separate secret (`MOBILE_JWT_SECRET`),
 * separate audience, and its own access/refresh token shapes. Nothing here
 * touches NextAuth session cookies.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const ISSUER = 'neelkanth-tiffin';
const ACCESS_AUDIENCE = 'mobile-access';
const REFRESH_AUDIENCE = 'mobile-refresh';

/** Resolve the mobile JWT secret, failing loudly if it is not configured. */
function getSecret(): string {
    const secret = process.env.MOBILE_JWT_SECRET;
    if (!secret) {
        throw new Error('MOBILE_JWT_SECRET environment variable is not set');
    }
    return secret;
}

export interface AccessTokenClaims {
    userId: string;
    email: string;
    role: string;
}

export interface RefreshTokenClaims {
    userId: string;
    /** Opaque id of the stored refresh-token record (the rotation handle). */
    jti: string;
}

/** Sign a short-lived access token (15 min). */
export function signAccessToken(claims: AccessTokenClaims): string {
    const options: SignOptions = {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        issuer: ISSUER,
        audience: ACCESS_AUDIENCE,
        subject: claims.userId,
    };
    return jwt.sign(
        { userId: claims.userId, email: claims.email, role: claims.role, typ: 'access' },
        getSecret(),
        options,
    );
}

/** Sign a long-lived refresh token (30 days), carrying the rotation handle. */
export function signRefreshToken(claims: RefreshTokenClaims): string {
    const options: SignOptions = {
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        issuer: ISSUER,
        audience: REFRESH_AUDIENCE,
        subject: claims.userId,
        jwtid: claims.jti,
    };
    return jwt.sign(
        { userId: claims.userId, typ: 'refresh' },
        getSecret(),
        options,
    );
}

/**
 * Verify and decode an access token. Throws (JsonWebTokenError /
 * TokenExpiredError) on any malformed, tampered, or expired token.
 */
export function verifyAccessToken(token: string): AccessTokenClaims & JwtPayload {
    const decoded = jwt.verify(token, getSecret(), {
        issuer: ISSUER,
        audience: ACCESS_AUDIENCE,
    }) as JwtPayload;

    if (decoded.typ !== 'access') {
        throw new jwt.JsonWebTokenError('Invalid token type');
    }
    return decoded as AccessTokenClaims & JwtPayload;
}

/**
 * Verify and decode a refresh token. Throws on malformed/expired tokens.
 * Revocation/rotation is checked separately against the token store.
 */
export function verifyRefreshToken(token: string): RefreshTokenClaims & JwtPayload {
    const decoded = jwt.verify(token, getSecret(), {
        issuer: ISSUER,
        audience: REFRESH_AUDIENCE,
    }) as JwtPayload;

    if (decoded.typ !== 'refresh' || !decoded.jti) {
        throw new jwt.JsonWebTokenError('Invalid token type');
    }
    return { userId: decoded.userId as string, jti: decoded.jti, ...decoded } as RefreshTokenClaims & JwtPayload;
}
