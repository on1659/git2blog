import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformCredentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPlatform } from "@/lib/platforms/registry";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: platformId } = await params;
    const { credentials, action } = await request.json();

    // 서비스 키 (github, anthropic) — 플랫폼이 아닌 내부 서비스
    const SERVICE_IDS = ["github", "anthropic"];
    const isService = SERVICE_IDS.includes(platformId);

    if (!isService) {
      const platform = getPlatform(platformId);
      if (!platform) {
        return NextResponse.json(
          { error: "플랫폼을 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      // Validate action
      if (action === "validate") {
        const valid = await platform.validateCredentials(credentials || {});
        return NextResponse.json({ valid });
      }
    }

    // Service validate
    if (isService && action === "validate") {
      if (platformId === "github") {
        try {
          const res = await fetch("https://api.github.com/user", {
            headers: { Authorization: `token ${credentials?.token || ""}` },
          });
          return NextResponse.json({ valid: res.ok });
        } catch {
          return NextResponse.json({ valid: false });
        }
      }
      if (platformId === "anthropic") {
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": credentials?.apiKey || "",
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 10,
              messages: [{ role: "user", content: "test" }],
            }),
          });
          return NextResponse.json({ valid: res.ok });
        } catch {
          return NextResponse.json({ valid: false });
        }
      }
    }

    // Save credentials
    const existing = await db
      .select()
      .from(platformCredentials)
      .where(eq(platformCredentials.platformId, platformId));

    const credJson = JSON.stringify(credentials || {});

    if (existing.length > 0) {
      await db
        .update(platformCredentials)
        .set({
          credentials: credJson,
          isActive: true,
        })
        .where(eq(platformCredentials.platformId, platformId));
    } else {
      await db.insert(platformCredentials).values({
        platformId,
        credentials: credJson,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
