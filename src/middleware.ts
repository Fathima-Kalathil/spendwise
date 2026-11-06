import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set. Add it in Vercel > Settings > Environment Variables.");
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me");
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  let valid = false;
  if (token) {
    try { await jwtVerify(token, secret()); valid = true; } catch { valid = false; }
  }
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/verify";
  if (!valid && !isAuthPage) return NextResponse.redirect(new URL("/login", req.url));
  if (valid && (isAuthPage || pathname === "/")) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
