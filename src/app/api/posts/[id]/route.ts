import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postVersions, publications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    const post = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId));

    if (post.length === 0) {
      return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    }

    const versions = await db
      .select()
      .from(postVersions)
      .where(eq(postVersions.postId, postId));

    // 모든 버전의 발행 기록 가져오기
    const versionIds = versions.map((v) => v.id);
    const allPubs = [];
    for (const vId of versionIds) {
      const pubs = await db
        .select()
        .from(publications)
        .where(eq(publications.postVersionId, vId));
      allPubs.push(...pubs);
    }

    return NextResponse.json({
      ...post[0],
      versions,
      publications: allPubs,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    const body = await request.json();
    const { versions } = body;

    const now = new Date().toISOString();

    // Update post timestamp
    await db
      .update(posts)
      .set({ updatedAt: now })
      .where(eq(posts.id, postId));

    // Update versions
    if (versions && Array.isArray(versions)) {
      for (const v of versions) {
        const existing = await db
          .select()
          .from(postVersions)
          .where(eq(postVersions.postId, postId));

        const match = existing.find((e) => e.language === v.language);

        if (match) {
          await db
            .update(postVersions)
            .set({
              title: v.title,
              subtitle: v.subtitle || null,
              body: v.body,
              tags: v.tags || "[]",
              updatedAt: now,
            })
            .where(eq(postVersions.id, match.id));
        } else {
          await db.insert(postVersions).values({
            postId,
            language: v.language,
            title: v.title,
            subtitle: v.subtitle || null,
            body: v.body || "",
            tags: v.tags || "[]",
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id);

    // CASCADE will handle versions and publications
    await db.delete(posts).where(eq(posts.id, postId));

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
