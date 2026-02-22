import { redis } from "@/lib/redis";

interface RateLimitOptions {
    key: string;
    limit: number;
    windowSec: number;
}

export async function checkRateLimit({ key, limit, windowSec }: RateLimitOptions) {
    try {
        const current = await redis.incr(key);
        if (current === 1) {
            await redis.expire(key, windowSec);
        }

        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current),
        };
    } catch (e) {
        // Fail-open to avoid blocking real users if rate-limit backend is unavailable.
        console.error("Rate limit backend error:", e);
        return {
            allowed: true,
            remaining: limit,
        };
    }
}
