import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, isExpired, otpMatches } from "@/lib/otp";

describe("email OTP helpers", () => {
  it("always makes a 6-digit numeric code", () => {
    for (let i = 0; i < 300; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  it("hashes the code with the email and a secret, ignoring email case", () => {
    const h = hashOtp("123456", "A@x.com", "s3cret");
    expect(h).toBe(hashOtp("123456", "a@x.com", "s3cret"));
    expect(h).not.toBe(hashOtp("123456", "a@x.com", "other"));
    expect(h).not.toContain("123456");
  });
  it("accepts the right code and rejects wrong ones", () => {
    const h = hashOtp("123456", "a@x.com", "s3cret");
    expect(otpMatches("123456", "a@x.com", "s3cret", h)).toBe(true);
    expect(otpMatches("654321", "a@x.com", "s3cret", h)).toBe(false);
    expect(otpMatches("123456", "b@x.com", "s3cret", h)).toBe(false);
  });
  it("knows when a code has expired", () => {
    const now = Date.now();
    expect(isExpired(new Date(now + 1000), now)).toBe(false);
    expect(isExpired(new Date(now - 1000), now)).toBe(true);
  });
});
