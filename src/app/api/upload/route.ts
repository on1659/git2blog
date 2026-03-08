import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import matter from "gray-matter";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "ko";

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    const content = await file.text();
    const { data: frontmatter, content: body } = matter(content);

    const title = frontmatter.title || file.name.replace(/\.md$/, "");
    const slug =
      frontmatter.slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
    const subtitle = frontmatter.subtitle || null;
    const tags = Array.isArray(frontmatter.tags)
      ? JSON.stringify(frontmatter.tags)
      : typeof frontmatter.tags === "string"
      ? JSON.stringify(frontmatter.tags.split(",").map((t: string) => t.trim()))
      : "[]";
    const coverImage = frontmatter.cover || null;

    // Check for duplicate slug
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
        status: "draft",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const postId = inserted[0].id;

    await db.insert(postVersions).values({
      postId,
      language: language as "ko" | "en",
      title,
      subtitle,
      body,
      tags,
      coverImage,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: postId, slug: finalSlug }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
