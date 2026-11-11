import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set. Add it in Vercel > Settings > Environment Variables.");
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me");
};

/** `sv` is the user's session version. Changing a password bumps it, which logs out every other device. */
export async function createSession(userId: string, sv = 0) {
  const token = await new SignJWT({ sv }).setProtectedHeader({ alg: "HS256" }).setSubject(userId)
    .setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

/** The logged-in user, or null (no cookie, bad token, deleted user, or an old session after a password change). */
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user || user.sessionVersion !== Number(payload.sv ?? 0)) return null;
    return user;
  } catch {
    return null;
  }
}

/** Use at the top of every server action / page that touches user data. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
