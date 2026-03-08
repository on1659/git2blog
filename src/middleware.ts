import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;

  // No password configured — skip auth
  if (!sitePassword) return NextResponse.next();

  // Allow auth API
  if (request.nextUrl.pathname === "/api/auth") return NextResponse.next();

  // Allow login page
  if (request.nextUrl.pathname === "/login") return NextResponse.next();

  // Allow static assets
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get("site_auth")?.value;
  if (authCookie === sitePassword) {
    return NextResponse.next();
  }

  // Redirect to login
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
