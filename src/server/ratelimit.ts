import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

type Result = { ok: boolean; retryAfterSeconds: number };

const memory = new Map<string, { count: number; resetAt: number }>();
const limiters = new Map<string, Ratelimit>();

function upstash(limit: number, windowSeconds: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const key = `${limit}:${windowSeconds}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: "praxis:rl",
    });
    limiters.set(key, rl);
  }
  return rl;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed/sliding window limiter. Uses Upstash Redis when configured (shared across
 * serverless instances); otherwise an in-memory window per instance.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<Result> {
  const id = `${bucket}:${await clientIp()}`;
  const rl = upstash(limit, windowSeconds);
  if (rl) {
    const r = await rl.limit(id);
    return { ok: r.success, retryAfterSeconds: Math.max(0, Math.ceil((r.reset - Date.now()) / 1000)) };
  }
  const now = Date.now();
  const entry = memory.get(id);
  if (!entry || entry.resetAt <= now) {
    memory.set(id, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  return { ok: entry.count <= limit, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
}
