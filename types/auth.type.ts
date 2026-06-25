import type { Document } from 'mongoose';

/** Persisted refresh-token record. The raw token is never stored — only its hash. */
export interface IRefreshToken extends Document {
    /** Owner user id (currently always `admin`). */
    user_id: string;
    /** SHA-256 hash of the raw refresh token JWT. */
    token_hash: string;
    /** Optional device / client label for session management. */
    device?: string;
    /** Hard expiry — also drives the TTL index that auto-removes the doc. */
    expires_at: Date;
    /** Set when the token is rotated or logged out; a revoked token is unusable. */
    revoked_at?: Date | null;
    /** jti of the token that superseded this one (rotation audit trail). */
    replaced_by?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Mobile auth API DTOs ────────────────────────────────────────────────────

export interface MobileAuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface LoginRequestBody {
    email: string;
    password: string;
    device?: string;
}

export interface RefreshRequestBody {
    refreshToken: string;
}

export interface LogoutRequestBody {
    refreshToken: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
