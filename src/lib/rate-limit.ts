import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort in-memory rate limiter, keyed by caller IP. Good enough to
 * deter casual spam of the name-submission endpoint at family scale. It is
 * NOT distributed — each serverless instance has its own counters, so a
 * determined attacker spread across instances isn't fully stopped. If that
 * ever matters, swap this for Upstash Redis or Vercel KV.
 */
const buckets = new Map<string, { count: number; windowStart: number }>();

export async function isRateLimited(
  bucketName: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<boolean> {
  const ip = await getClientIp();
  const key = `${bucketName}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  existing.count += 1;
  return existing.count > limit;
}

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}
