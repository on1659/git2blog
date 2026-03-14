import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postVersions, publications, platformCredentials } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getPlatform } from "@/lib/platforms/registry";
import type { PublishResult } from "@/lib/platforms/types";

export async function POST(request: Request) {
  try {
    const { postId, versionIds, platformIds, isDraft } = await request.json();
    console.log("[publish] 요청:", { postId, versionIds, platformIds, isDraft });

    if (!postId || !versionIds?.length || !platformIds?.length) {
      console.log("[publish] 필수 파라미터 누락");
      return NextResponse.json(
        { error: "postId, versionIds, platformIds가 필요합니다" },
        { status: 400 }
      );
    }

    // Get post
    const postResult = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId));

    if (postResult.length === 0) {
      console.log("[publish] 글을 찾을 수 없음:", postId);
      return NextResponse.json({ error: "글을 찾을 수 없습니다" }, { status: 404 });
    }

    const post = postResult[0];
    console.log("[publish] 글 조회:", { slug: post.slug, status: post.status });

    // Get selected versions
    const versions = await db
      .select()
      .from(postVersions)
      .where(eq(postVersions.postId, postId));

    const selectedVersions = versions.filter((v) =>
      versionIds.includes(v.id)
    );
    console.log("[publish] 선택된 버전:", selectedVersions.map((v) => ({ id: v.id, lang: v.language, titleLen: v.title.length, bodyLen: v.body.length })));

    const results: PublishResult[] = [];

    for (const platformId of platformIds) {
      const platform = getPlatform(platformId);
      if (!platform) {
        console.log("[publish] 플랫폼 없음:", platformId);
        results.push({
          success: false,
          platform: platformId,
          error: "플랫폼을 찾을 수 없습니다",
        });
        continue;
      }

      // Get credentials
      const credResult = await db
        .select()
        .from(platformCredentials)
        .where(eq(platformCredentials.platformId, platformId));

      const creds: Record<string, string> = credResult.length > 0
        ? JSON.parse(credResult[0].credentials)
        : {};

      console.log("[publish] 크레덴셜:", { platformId, hasToken: !!creds.token, hasPubId: !!creds.publicationId, hasApiKey: !!creds.apiKey });

      if (!platform.isConfigured(creds)) {
        console.log("[publish] 플랫폼 미설정:", platformId);
        results.push({
          success: false,
          platform: platform.config.name,
          error: "설정되지 않았습니다",
        });
        continue;
      }

      // 영어 버전 찾기 (Radar Blog 한영 합산용)
      const enVersion = selectedVersions.find((v) => v.language === "en");
      const koVersion = selectedVersions.find((v) => v.language === "ko");

      // Publish each selected version
      for (const version of selectedVersions) {
        // 영어 버전은 Radar Blog에만 발행 (한국어에 합산)
        if (version.language === "en" && platformId !== "radar") {
          console.log("[publish] 영어 버전 건너뛰기 (Radar Blog 전용):", platformId);
          continue;
        }
        // Radar Blog: 영어 버전 단독 발행 건너뛰기 (한국어에 합산됨)
        if (version.language === "en" && platformId === "radar" && koVersion) {
          console.log("[publish] 영어 버전 건너뛰기 (한국어에 합산됨):", platformId);
          continue;
        }
        // 중복 발행 체크
        const existingPub = await db
          .select()
          .from(publications)
          .where(
            and(
              eq(publications.postVersionId, version.id),
              eq(publications.platformId, platformId)
            )
          );

        const tags = (() => {
          try {
            return JSON.parse(version.tags);
          } catch {
            return [];
          }
        })();

        const publishInput = {
          title: version.title,
          subtitle: version.subtitle || undefined,
          body: version.body,
          tags,
          slug: `${post.slug}-${version.language}`,
          coverImage: version.coverImage || undefined,
          isDraft: !!isDraft,
          titleEn: undefined as string | undefined,
          bodyEn: undefined as string | undefined,
        };

        // Radar Blog + 한국어: 영어 버전 합산
        if (platformId === "radar" && version.language === "ko" && enVersion) {
          publishInput.titleEn = enVersion.title;
          publishInput.bodyEn = enVersion.body;
          publishInput.slug = post.slug; // 한영 합산이므로 -ko 접미사 불필요
          console.log("[publish] Radar Blog 한영 합산:", { titleEn: enVersion.title.slice(0, 30) });
        }

        // 이미 발행된 경우: update 지원하면 업데이트, 아니면 건너뛰기
        if (existingPub.length > 0) {
          const existing = existingPub[0];
          console.log("[publish] 이미 발행됨:", { platformId, lang: version.language, platformPostId: existing.platformPostId });

          if (platform.update && existing.platformPostId) {
            console.log("[publish] 업데이트 시도:", { platformId, lang: version.language });
            const result = await platform.update(existing.platformPostId, publishInput, creds);
            console.log("[publish] 업데이트 결과:", result);

            if (result.success) {
              await db
                .update(publications)
                .set({
                  url: result.url || existing.url,
                  isDraft: !!isDraft,
                  publishedAt: new Date(),
                })
                .where(eq(publications.id, existing.id));
            }

            results.push(result);
          } else {
            console.log("[publish] 중복 건너뛰기:", { platformId, lang: version.language });
            results.push({
              success: true,
              platform: platform.config.name,
              platformPostId: existing.platformPostId || undefined,
              url: existing.url || undefined,
              error: "이미 발행됨 (건너뜀)",
            });
          }
          continue;
        }

        console.log("[publish] 발행 시도:", { platformId, lang: version.language, slug: publishInput.slug, tags, isDraft: publishInput.isDraft });

        const result = await platform.publish(publishInput, creds);
        console.log("[publish] 발행 결과:", result);

        results.push(result);

        // Record publication
        if (result.success) {
          await db.insert(publications).values({
            postVersionId: version.id,
            platformId,
            platformPostId: result.platformPostId || null,
            url: result.url || null,
            isDraft: !!isDraft,
            publishedAt: new Date(),
          });
          console.log("[publish] DB 기록 완료");
        }
      }
    }

    // Update post status if any succeeded and not draft
    if (!isDraft && results.some((r) => r.success)) {
      await db
        .update(posts)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(posts.id, postId));
    }

    console.log("[publish] 최종 결과:", JSON.stringify(results));
    return NextResponse.json({ results });
  } catch (e: unknown) {
    console.error("[publish] 에러:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
