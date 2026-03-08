import { db } from "@/lib/db";
import { posts, postVersions, publications } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import PostList from "./components/PostList";


export const dynamic = "force-dynamic";

async function getStats() {
  const allPosts = await db.select().from(posts);
  const total = allPosts.length;
  const published = allPosts.filter((p) => p.status === "published").length;
  const drafts = allPosts.filter((p) => p.status === "draft").length;
  return { total, published, drafts };
}

async function getRecentPosts() {
  const result = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.updatedAt))
    .limit(20);

  const postsWithVersions = await Promise.all(
    result.map(async (post) => {
      const versions = await db
        .select({
          id: postVersions.id,
          language: postVersions.language,
          title: postVersions.title,
        })
        .from(postVersions)
        .where(eq(postVersions.postId, post.id));

      // 발행 기록 가져오기
      const versionIds = versions.map((v) => v.id);
      let pubs: { platformId: string; url: string | null }[] = [];
      if (versionIds.length > 0) {
        const allPubs = await db
          .select({
            platformId: publications.platformId,
            url: publications.url,
          })
          .from(publications)
          .where(inArray(publications.postVersionId, versionIds));
        // 플랫폼별 중복 제거 (최신 것만)
        const seen = new Set<string>();
        pubs = allPubs.filter((p) => {
          if (seen.has(p.platformId)) return false;
          seen.add(p.platformId);
          return true;
        });
      }

      return { ...post, versions, publications: pubs };
    })
  );

  return postsWithVersions;
}

export default async function DashboardPage() {
  const stats = await getStats();
  const recentPosts = await getRecentPosts();

  return (
    <div className="animate-fade-up">
      {/* Hero + Quick Action */}
      <div className="card p-8 mb-10" style={{ background: "linear-gradient(135deg, var(--bg-surface) 0%, rgba(16,185,129,0.05) 100%)", border: "1px solid var(--border-subtle)" }}>
        <div>
          <h1 className="font-semibold mb-2" style={{ fontSize: "var(--text-title)" }}>
            대시보드
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            GitHub 커밋을 블로그 글로 변환하세요
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 stagger">
        <StatCard label="전체 글" value={stats.total} icon="📄" />
        <StatCard label="발행됨" value={stats.published} color="success" icon="✓" />
        <StatCard label="초안" value={stats.drafts} color="warning" icon="✎" />
      </div>

      {/* Post List */}
      <div>
        <h2 className="font-medium mb-5" style={{ fontSize: "var(--text-section)", color: "var(--text-primary)" }}>
          최근 글
        </h2>
        <PostList posts={recentPosts} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color?: "success" | "warning";
  icon: string;
}) {
  const valueColor = color ? `var(--${color})` : "var(--text-primary)";
  const iconBg = color ? `var(--${color}-bg)` : "var(--primary-soft)";
  const iconColor = color ? `var(--${color})` : "var(--primary)";

  return (
    <div className="card p-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {label}
          </p>
          <p className="text-2xl font-semibold" style={{ color: valueColor }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
