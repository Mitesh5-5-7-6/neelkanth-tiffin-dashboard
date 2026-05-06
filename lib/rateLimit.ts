/**
 * In-memory sliding window rate limiter.
 * Requires Node.js runtime — not compatible with Edge runtime.
 * For multi-instance / serverless deployments, swap the Map for Redis.
 */

interface RateLimitRecord {
    count: number
    resetAt: number
}

const store = new Map<string, RateLimitRecord>()

export type RateLimitResult =
    | { allowed: true }
    | { allowed: false; retryAfter: number }

/**
 * @param key       - unique key per client+route (e.g. `read:1.2.3.4`)
 * @param max       - max requests allowed in the window
 * @param windowMs  - window duration in milliseconds
 */
export function rateLimit(key: string, max = 100, windowMs = 60_000): RateLimitResult {
    const now = Date.now()
    const record = store.get(key)

    if (!record || record.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true }
    }

    if (record.count >= max) {
        return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
    }

    record.count++
    return { allowed: true }
}

// Key helpers — keep keys consistent across middleware and route handlers
export const rl = {
    read: (ip: string) => `read:${ip}`,
    write: (ip: string) => `write:${ip}`,
    bulk: (ip: string) => `bulk:${ip}`,
} as const
