export const LOGIN_MAX_FAILS = 5; // wrong passwords per email
export const IP_MAX_FAILS = 25; // wrong passwords per network address
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * How long (ms) until another attempt is allowed. 0 = allowed now.
 * `times` are the timestamps of earlier failed attempts.
 */
export function retryAfterMs(times: number[], max: number, windowMs: number, now = Date.now()): number {
  const recent = times.filter((t) => now - t < windowMs).sort((a, b) => a - b);
  if (recent.length < max) return 0;
  return Math.max(0, recent[recent.length - max] + windowMs - now);
}
