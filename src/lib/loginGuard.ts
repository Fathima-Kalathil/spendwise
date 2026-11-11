import { and, eq, gt, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";
import { IP_MAX_FAILS, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS, retryAfterMs } from "./ratelimit";

export function clientIp(): string {
  try {
    const h = headers();
    return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim() || "unknown";
  } catch { return "unknown"; }
}

/** Milliseconds the person must wait before trying again (0 = go ahead). */
export async function loginRetryAfter(key: string, ip: string): Promise<number> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const byKey = await db.select({ t: loginAttempts.createdAt }).from(loginAttempts).where(and(eq(loginAttempts.email, key), gt(loginAttempts.createdAt, since)));
  let wait = retryAfterMs(byKey.map((r) => r.t.getTime()), LOGIN_MAX_FAILS, LOGIN_WINDOW_MS);
  if (ip !== "unknown") {
    const byIp = await db.select({ t: loginAttempts.createdAt }).from(loginAttempts).where(and(eq(loginAttempts.ip, ip), gt(loginAttempts.createdAt, since)));
    wait = Math.max(wait, retryAfterMs(byIp.map((r) => r.t.getTime()), IP_MAX_FAILS, LOGIN_WINDOW_MS));
  }
  return wait;
}

export async function recordLoginFailure(key: string, ip: string) {
  await db.insert(loginAttempts).values({ email: key, ip });
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))); // tidy up old rows
}

export async function clearLoginFailures(key: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.email, key));
}
