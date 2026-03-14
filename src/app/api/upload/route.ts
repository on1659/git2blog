import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postVersions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import matter from "gray-matter";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileEn = formData.get("fileEn") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    function parseMd(content: string, fileName: string) {
      const { data: frontmatter, content: body } = matter(content);
      const title = frontmatter.title || fileName.replace(/\.md$/, "");
      const subtitle = frontmatter.subtitle || null;
      const tags = Array.isArray(frontmatter.tags)
        ? JSON.stringify(frontmatter.tags)
        : typeof frontmatter.tags === "string"
        ? JSON.stringify(frontmatter.tags.split(",").map((t: string) => t.trim()))
        : "[]";
      const coverImage = frontmatter.cover || null;
      const slug = frontmatter.slug || title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      return { title, subtitle, body, tags, coverImage, slug };
    }

    const koContent = await file.text();
    const ko = parseMd(koContent, file.name);

    // Check for duplicate slug
    let finalSlug = ko.slug;
    const existing = await db
      .select()
      .from(posts)
      .where(eq(posts.slug, finalSlug));
    if (existing.length > 0) {
      finalSlug = `${ko.slug}-${Date.now()}`;
    }

    const now = new Date();

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

    // 한국어 버전
    await db.insert(postVersions).values({
      postId,
      language: "ko",
      title: ko.title,
      subtitle: ko.subtitle,
      body: ko.body,
      tags: ko.tags,
      coverImage: ko.coverImage,
      createdAt: now,
      updatedAt: now,
    });

    // 영어 버전 (선택)
    if (fileEn) {
      const enContent = await fileEn.text();
      const en = parseMd(enContent, fileEn.name);
      await db.insert(postVersions).values({
        postId,
        language: "en",
        title: en.title,
        subtitle: en.subtitle,
        body: en.body,
        tags: en.tags,
        coverImage: en.coverImage,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ id: postId, slug: finalSlug }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
