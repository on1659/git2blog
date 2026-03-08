import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postVersions, publications, platformCredentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

      // Publish each selected version
      for (const version of selectedVersions) {
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
        };
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
            publishedAt: new Date().toISOString(),
          });
          console.log("[publish] DB 기록 완료");
        }
      }
    }

    // Update post status if any succeeded and not draft
    if (!isDraft && results.some((r) => r.success)) {
      await db
        .update(posts)
        .set({ status: "published", updatedAt: new Date().toISOString() })
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
