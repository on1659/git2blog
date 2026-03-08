"use client";

import Link from "next/link";

const PLATFORM_LABELS: Record<string, string> = {
  hashnode: "Hashnode",
  medium: "Medium",
  devto: "DEV.to",
  tistory: "티스토리",
  naver: "네이버",
};

type PostItem = {
  id: number;
  slug: string;
  status: string;
  updatedAt: string | Date;
  versions: { id: number; language: string; title: string }[];
  publications?: { platformId: string; url: string | null }[];
};

export default function PostList({ posts }: { posts: PostItem[] }) {
  if (posts.length === 0) {
    return (
      <div className="card rounded-lg p-16 text-center animate-fade-up">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          +
        </div>
        <p className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
          아직 글이 없습니다
        </p>
        <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>
          GitHub 커밋으로 첫 블로그 글을 만들어보세요
        </p>
        <Link href="/write" className="btn btn-primary text-sm">
          + 새 글 작성
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 stagger">
      {posts.map((post) => (
        <div key={post.id} className="card card-interactive animate-fade-up">
          <Link
            href={`/edit/${post.id}`}
            className="block px-6 py-5"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  {post.versions[0]?.title || post.slug}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {post.slug}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {post.versions.map((v) => (
                  <span key={v.id} className="badge badge-lang">
                    {v.language}
                  </span>
                ))}
                <span className={`badge ${post.status === "published" ? "badge-published" : "badge-draft"}`}>
                  {post.status === "published" ? "발행됨" : "초안"}
                </span>
                <span className="text-xs hidden md:inline" style={{ color: "var(--text-tertiary)" }}>
                  {new Date(post.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Link>

          {/* 발행 기록 */}
          {post.publications && post.publications.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-2 px-6 pb-4 -mt-1"
            >
              {post.publications.map((pub) => (
                pub.url ? (
                  <a
                    key={pub.platformId}
                    href={pub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md"
                    style={{
                      background: "var(--primary-soft)",
                      color: "var(--primary)",
                      transition: "opacity 0.15s",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>↗</span>
                    {PLATFORM_LABELS[pub.platformId] || pub.platformId}
                  </a>
                ) : (
                  <span
                    key={pub.platformId}
                    className="inline-flex items-center text-xs px-3 py-1.5 rounded-md"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                  >
                    {PLATFORM_LABELS[pub.platformId] || pub.platformId}
                  </span>
                )
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
