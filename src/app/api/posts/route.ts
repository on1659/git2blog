import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postVersions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const allPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.updatedAt));

    const result = await Promise.all(
      allPosts.map(async (post) => {
        const versions = await db
          .select()
          .from(postVersions)
          .where(eq(postVersions.postId, post.id));
        return { ...post, versions };
      })
    );

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, githubUrl, versions } = body;

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    // Check for duplicate slug, append suffix if needed
    let finalSlug = slug;
    const existing = await db
      .select()
      .from(posts)
      .where(eq(posts.slug, finalSlug));
    if (existing.length > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const now = new Date().toISOString();
    const inserted = await db
      .insert(posts)
      .values({
        slug: finalSlug,
        githubUrl: githubUrl || null,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const postId = inserted[0].id;

    // Insert versions
    if (versions && Array.isArray(versions)) {
      for (const v of versions) {
        await db.insert(postVersions).values({
          postId,
          language: v.language,
          title: v.title,
          subtitle: v.subtitle || null,
          body: v.body || "",
          tags: v.tags || "[]",
          coverImage: v.coverImage || null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return NextResponse.json({ id: postId, slug: finalSlug }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
