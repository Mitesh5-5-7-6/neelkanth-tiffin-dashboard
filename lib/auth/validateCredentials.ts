import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';

/**
 * Single source of truth for admin credential validation.
 *
 * Both the NextAuth Credentials provider (web dashboard) and the mobile
 * auth API (`/api/nts/v1/auth/login`) call into this so credentials live in
 * exactly one place: the `LOGIN_EMAIL` / `LOGIN_PASSWORD` environment vars.
 *
 * Comparison is constant-time to avoid leaking the secrets via timing.
 */

export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

/** Constant-time string comparison (hash first so lengths never diverge). */
function safeCompare(a: string, b: string): boolean {
    const hashA = createHash('sha256').update(a).digest();
    const hashB = createHash('sha256').update(b).digest();
    return timingSafeEqual(hashA, hashB);
}

/**
 * Validate an email/password pair against the configured admin credentials.
 *
 * @returns the authenticated user on success, or `null` for any failure
 *          (missing input, unconfigured env, or mismatch).
 */
export function validateCredentials(
    email: string | undefined | null,
    password: string | undefined | null,
): AuthenticatedUser | null {
    if (!email || !password) return null;

    const validEmail = process.env.LOGIN_EMAIL;
    const validPassword = process.env.LOGIN_PASSWORD;
    if (!validEmail || !validPassword) return null;

    const emailOk = safeCompare(email, validEmail);
    const passwordOk = safeCompare(password, validPassword);
    if (!emailOk || !passwordOk) return null;

    return {
        id: 'admin',
        name: 'Administrator',
        email: validEmail,
        role: 'admin',
    };
}
