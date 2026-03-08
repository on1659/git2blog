import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications, platformCredentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPlatform } from "@/lib/platforms/registry";

export async function POST(request: Request) {
  try {
    const { publicationIds } = await request.json();

    if (!publicationIds?.length) {
      return NextResponse.json(
        { error: "publicationIds가 필요합니다" },
        { status: 400 }
      );
    }

    const now = new Date();
    const results: {
      publicationId: number;
      platformId: string;
      exists: boolean;
      url?: string;
      error?: string;
    }[] = [];

    for (const pubId of publicationIds) {
      const pubResult = await db
        .select()
        .from(publications)
        .where(eq(publications.id, pubId));

      if (pubResult.length === 0) {
        results.push({
          publicationId: pubId,
          platformId: "unknown",
          exists: false,
          error: "발행 기록을 찾을 수 없습니다",
        });
        continue;
      }

      const pub = pubResult[0];
      const platform = getPlatform(pub.platformId);
      let exists = false;
      let resultUrl = pub.url || undefined;
      let error: string | undefined;

      if (platform?.checkExists && pub.platformPostId) {
        // checkExists 지원 플랫폼
        const credResult = await db
          .select()
          .from(platformCredentials)
          .where(eq(platformCredentials.platformId, pub.platformId));

        const creds: Record<string, string> = credResult.length > 0
          ? JSON.parse(credResult[0].credentials)
          : {};

        const checkResult = await platform.checkExists(pub.platformPostId, creds);
        exists = checkResult.exists;
        if (checkResult.url) resultUrl = checkResult.url;
      } else if (pub.url) {
        // URL HEAD 요청으로 확인
        try {
          const res = await fetch(pub.url, { method: "HEAD", redirect: "follow" });
          exists = res.ok;
        } catch {
          error = "URL 접근 불가";
        }
      } else {
        error = "URL 없음";
      }

      // DB에 상태 저장
      await db
        .update(publications)
        .set({
          isLive: exists,
          lastCheckedAt: now,
          ...(resultUrl && resultUrl !== pub.url ? { url: resultUrl } : {}),
        })
        .where(eq(publications.id, pubId));

      results.push({
        publicationId: pubId,
        platformId: pub.platformId,
        exists,
        url: resultUrl,
        error,
      });
    }

    return NextResponse.json({ results });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
