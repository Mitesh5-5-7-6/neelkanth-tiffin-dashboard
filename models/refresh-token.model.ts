import mongoose, { Schema, type HydratedDocument } from 'mongoose';
import type { IRefreshToken } from '@/types/auth.type';

/**
 * Stores **hashed** mobile refresh tokens for the JWT auth layer.
 *
 * - Raw tokens are never persisted (only their SHA-256 hash).
 * - `_id` of each doc is used as the refresh token's `jti`, so the JWT itself
 *   carries the rotation handle.
 * - The TTL index on `expires_at` lets Mongo auto-purge expired records.
 */
const RefreshTokenSchema = new Schema<IRefreshToken>(
    {
        user_id: { type: String, required: true, index: true },
        token_hash: { type: String, required: true, index: true },
        device: { type: String, trim: true },
        expires_at: { type: Date, required: true },
        revoked_at: { type: Date, default: null },
        replaced_by: { type: String, default: null },
    },
    { timestamps: true }
);

// Auto-remove documents once they pass their hard expiry.
RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDocument = HydratedDocument<IRefreshToken>;

export default mongoose.models.RefreshToken ||
    mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
