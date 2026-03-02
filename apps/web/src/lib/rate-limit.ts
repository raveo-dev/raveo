/**
 * KV-based sliding window rate limiter for Cloudflare Workers.
 *
 * Uses the existing CACHE KV namespace — no extra resources needed.
 * Each rate limit entry is a simple counter with TTL-based expiration.
 *
 * Usage:
 *   const limiter = createRateLimiter(kvNamespace);
 *   const result = await limiter.check('user-ip', { maxRequests: 10, windowSeconds: 60 });
 *   if (!result.allowed) return new Response('Too Many Requests', { status: 429 });
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_PREFIX = 'rl:';

/**
 * Default rate limit configurations per route pattern.
 * Stricter limits for mutation endpoints, softer for reads.
 */
export const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  // POST requests (form submits, mutations) — strict
  POST: { maxRequests: 10, windowSeconds: 60 },
  // API endpoints — moderate
  '/api/': { maxRequests: 30, windowSeconds: 60 },
};

export function createRateLimiter(kv: KVNamespace) {
  return {
    /**
     * Check if a request is within rate limits.
     *
     * @param key - Unique identifier (typically IP or IP+path)
     * @param config - Rate limit configuration
     * @returns Whether the request is allowed, remaining quota, and reset time
     */
    async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
      const kvKey = `${RATE_LIMIT_PREFIX}${key}`;
      const now = Math.floor(Date.now() / 1000);

      let entry: RateLimitEntry | null = null;

      try {
        entry = await kv.get<RateLimitEntry>(kvKey, 'json');
      } catch {
        // KV read failed — allow request (fail open)
      }

      // Check if we're still in the current window
      if (entry && now - entry.windowStart < config.windowSeconds) {
        if (entry.count >= config.maxRequests) {
          return {
            allowed: false,
            remaining: 0,
            resetAt: entry.windowStart + config.windowSeconds,
          };
        }

        // Increment counter
        const updated: RateLimitEntry = {
          count: entry.count + 1,
          windowStart: entry.windowStart,
        };

        try {
          await kv.put(kvKey, JSON.stringify(updated), {
            expirationTtl: config.windowSeconds,
          });
        } catch {
          // KV write failed — still allow request
        }

        return {
          allowed: true,
          remaining: config.maxRequests - updated.count,
          resetAt: entry.windowStart + config.windowSeconds,
        };
      }

      // New window — reset counter
      const fresh: RateLimitEntry = { count: 1, windowStart: now };

      try {
        await kv.put(kvKey, JSON.stringify(fresh), {
          expirationTtl: config.windowSeconds,
        });
      } catch {
        // KV write failed — still allow request
      }

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowSeconds,
      };
    },
  };
}

/**
 * Get the appropriate rate limit config for a request.
 * Returns null if the request should not be rate limited.
 */
export function getRateLimitConfig(
  method: string,
  pathname: string,
): { config: RateLimitConfig; key: string } | null {
  // POST requests — strictest limit
  if (method === 'POST') {
    return { config: RATE_LIMIT_RULES.POST, key: `post:${pathname}` };
  }

  // API endpoints
  if (pathname.startsWith('/api/')) {
    return { config: RATE_LIMIT_RULES['/api/'], key: `api:${pathname}` };
  }

  return null;
}

/**
 * Extract client IP from Cloudflare request headers.
 * Falls back to a generic key for local development.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * Build rate limit response headers (RFC draft standard).
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'RateLimit-Limit': String(result.remaining + (result.allowed ? 0 : 0)),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.resetAt),
    'Retry-After': result.allowed ? '' : String(result.resetAt - Math.floor(Date.now() / 1000)),
  };
}
