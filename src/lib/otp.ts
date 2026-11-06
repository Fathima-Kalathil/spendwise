import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const OTP_TTL_MS = 10 * 60 * 1000; // a code works for 10 minutes
export const OTP_MAX_ATTEMPTS = 5; // wrong guesses allowed per code
export const OTP_RESEND_MS = 60 * 1000; // wait between emails

export function otpSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return s ?? "dev-only-secret-change-me";
}

/** Cryptographically random 6-digit code, e.g. "048213". */
export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** We never store the code itself, only this keyed hash. */
export const hashOtp = (code: string, email: string, secret: string) =>
  createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");

export function otpMatches(code: string, email: string, secret: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(code, email, secret)), b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const isExpired = (expiresAt: Date, now = Date.now()) => expiresAt.getTime() <= now;
