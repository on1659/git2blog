import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const sitePassword = process.env.SITE_PASSWORD;

  if (!sitePassword) {
    // No password set — allow access
    return NextResponse.json({ success: true });
  }

  if (password === sitePassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("site_auth", sitePassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ success: false, error: "비밀번호가 틀렸습니다" }, { status: 401 });
}
