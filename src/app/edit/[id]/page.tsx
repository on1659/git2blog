"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import MarkdownPreview from "../../components/MarkdownPreview";

type Version = {
  id: number;
  language: string;
  title: string;
  subtitle: string | null;
  body: string;
  tags: string;
  coverImage: string | null;
};

type Publication = {
  id: number;
  postVersionId: number;
  platformId: string;
  url: string | null;
  isDraft: boolean;
  isLive: boolean | null;
  lastCheckedAt: string | null;
  publishedAt: string;
};

type Post = {
  id: number;
  slug: string;
  githubUrl: string | null;
  status: string;
  versions: Version[];
  publications: Publication[];
};

const PLATFORM_LABELS: Record<string, string> = {
  hashnode: "Hashnode",
  medium: "Medium",
  devto: "DEV.to",
  radar: "Radar Blog",
  tistory: "티스토리",
  naver: "네이버",
};

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"ko" | "en">("ko");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showFrontmatter, setShowFrontmatter] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [pubStatus, setPubStatus] = useState<Record<number, { exists: boolean; error?: string }>>({});

  const [titles, setTitles] = useState<Record<string, string>>({});
  const [subtitles, setSubtitles] = useState<Record<string, string>>({});
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then((r) => r.json())
      .then((data) => {
        setPost(data);
        const t: Record<string, string> = {};
        const st: Record<string, string> = {};
        const b: Record<string, string> = {};
        const tg: Record<string, string> = {};
        for (const v of data.versions) {
          t[v.language] = v.title;
          st[v.language] = v.subtitle || "";
          b[v.language] = v.body;
          tg[v.language] = Array.isArray(JSON.parse(v.tags || "[]"))
            ? JSON.parse(v.tags || "[]").join(", ")
            : "";
        }
        setTitles(t);
        setSubtitles(st);
        setBodies(b);
        setTags(tg);
        if (data.versions.length > 0) {
          setActiveTab(data.versions[0].language);
        }
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSave = useCallback(async () => {
    if (!post) return;
    setSaving(true);
    try {
      const versions = post.versions.map((v) => ({
        language: v.language,
        title: titles[v.language] || v.title,
        subtitle: subtitles[v.language] || undefined,
        body: bodies[v.language] || v.body,
        tags: JSON.stringify(
          (tags[v.language] || "").split(",").map((t) => t.trim()).filter(Boolean)
        ),
      }));

      await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versions }),
      });
    } finally {
      setSaving(false);
    }
  }, [post, titles, subtitles, bodies, tags, postId]);

  // Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  const handleCheckStatus = async () => {
    if (!post?.publications?.length) return;
    setCheckingStatus(true);
    setPubStatus({});
    try {
      const res = await fetch("/api/publish/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicationIds: post.publications.map((p) => p.id),
        }),
      });
      const data = await res.json();
      const statusMap: Record<number, { exists: boolean; error?: string }> = {};
      for (const r of data.results || []) {
        statusMap[r.publicationId] = { exists: r.exists, error: r.error };
      }
      setPubStatus(statusMap);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 글을 삭제하시겠습니까?")) return;
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "var(--text-tertiary)" }}>글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const currentBody = bodies[activeTab] || "";

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-1">
          {post.versions.map((v) => (
            <button
              key={v.language}
              className="px-4 py-2 rounded-md text-sm font-semibold uppercase"
              style={{
                background: activeTab === v.language ? "var(--primary-soft)" : "transparent",
                color: activeTab === v.language ? "var(--primary)" : "var(--text-tertiary)",
                transition: "all 0.15s ease",
              }}
              onClick={() => setActiveTab(v.language as "ko" | "en")}
            >
              {v.language}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleDelete} className="btn btn-danger text-sm">삭제</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
            {saving ? "저장 중..." : "저장"}
          </button>
          <button onClick={() => setShowPublishModal(true)} className="btn btn-secondary text-sm">
            발행
          </button>
        </div>
      </div>

      {/* 발행 기록 */}
      {post.publications && post.publications.length > 0 && (
        <div className="card mb-5 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>발행 기록</p>
            <button
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="btn-ghost text-xs"
              style={{ padding: "4px 8px" }}
            >
              {checkingStatus ? "확인 중..." : "상태 확인"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {post.publications.map((pub) => {
              const status = pubStatus[pub.id];
              const statusDot = status
                ? status.exists
                  ? { bg: "var(--success)", title: "게시 중" }
                  : { bg: "var(--error)", title: status.error || "삭제됨" }
                : pub.isLive !== null
                  ? pub.isLive
                    ? { bg: "var(--success)", title: `게시 중${pub.lastCheckedAt ? ` (${new Date(pub.lastCheckedAt).toLocaleDateString()} 확인)` : ""}` }
                    : { bg: "var(--error)", title: `삭제됨${pub.lastCheckedAt ? ` (${new Date(pub.lastCheckedAt).toLocaleDateString()} 확인)` : ""}` }
                  : null;

              return pub.url ? (
                <a
                  key={pub.id}
                  href={pub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-md"
                  style={{
                    background: "var(--primary-soft)",
                    color: "var(--primary)",
                    transition: "opacity 0.15s",
                  }}
                >
                  {statusDot && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: statusDot.bg }}
                      title={statusDot.title}
                    />
                  )}
                  <span>↗</span>
                  <span className="font-medium">{PLATFORM_LABELS[pub.platformId] || pub.platformId}</span>
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {new Date(pub.publishedAt).toLocaleDateString()}
                  </span>
                  {pub.isDraft && <span className="badge badge-draft" style={{ fontSize: 9, padding: "1px 6px" }}>초안</span>}
                </a>
              ) : (
                <span
                  key={pub.id}
                  className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-md"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                >
                  {statusDot && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: statusDot.bg }}
                      title={statusDot.title}
                    />
                  )}
                  <span className="font-medium">{PLATFORM_LABELS[pub.platformId] || pub.platformId}</span>
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {new Date(pub.publishedAt).toLocaleDateString()}
                  </span>
                  {pub.isDraft && <span className="badge badge-draft" style={{ fontSize: 9, padding: "1px 6px" }}>초안</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Frontmatter */}
      <div className="card mb-5 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setShowFrontmatter(!showFrontmatter)}
        >
          <span className="font-medium">메타 정보 (제목, 부제, 태그)</span>
          <span style={{ transform: showFrontmatter ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
        </button>
        {showFrontmatter && (
          <div className="px-4 pb-4 flex flex-col gap-3 animate-slide-down">
            <input
              type="text"
              value={titles[activeTab] || ""}
              onChange={(e) => setTitles({ ...titles, [activeTab]: e.target.value })}
              placeholder="제목"
              className="input font-medium"
            />
            <input
              type="text"
              value={subtitles[activeTab] || ""}
              onChange={(e) => setSubtitles({ ...subtitles, [activeTab]: e.target.value })}
              placeholder="부제 (선택)"
              className="input"
            />
            <input
              type="text"
              value={tags[activeTab] || ""}
              onChange={(e) => setTags({ ...tags, [activeTab]: e.target.value })}
              placeholder="태그 (쉼표로 구분)"
              className="input"
            />
          </div>
        )}
      </div>

      {/* Mobile toggle */}
      <div className="flex md:hidden mb-5 rounded-lg overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        {(["edit", "preview"] as const).map((view) => (
          <button
            key={view}
            className="flex-1 py-3 text-center text-sm font-medium min-h-[44px]"
            style={{
              color: mobileView === view ? "var(--primary)" : "var(--text-tertiary)",
              background: mobileView === view ? "var(--primary-soft)" : "transparent",
              transition: "all 0.15s ease",
            }}
            onClick={() => setMobileView(view)}
          >
            {view === "edit" ? "편집" : "미리보기"}
          </button>
        ))}
      </div>

      {/* Editor + Preview */}
      <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: 500 }}>
        <div className={`flex-1 ${mobileView === "preview" ? "hidden md:block" : ""}`}>
          <textarea
            value={currentBody}
            onChange={(e) => setBodies({ ...bodies, [activeTab]: e.target.value })}
            className="w-full h-full min-h-[500px] rounded-lg p-4 text-sm resize-none input"
            style={{ fontFamily: "var(--font-mono)", lineHeight: 1.7 }}
          />
        </div>

        <div className={`flex-1 ${mobileView === "edit" ? "hidden md:block" : ""}`}>
          <div className="card rounded-lg p-5 h-full min-h-[500px] overflow-y-auto text-sm">
            {/* Frontmatter preview */}
            {(titles[activeTab] || subtitles[activeTab] || tags[activeTab]) && (
              <div className="mb-5 pb-5" style={{ borderBottom: "1px solid var(--border-default)" }}>
                {titles[activeTab] && (
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>
                    {titles[activeTab]}
                  </h1>
                )}
                {subtitles[activeTab] && (
                  <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
                    {subtitles[activeTab]}
                  </p>
                )}
                {tags[activeTab] && (
                  <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                    {tags[activeTab].split(",").map((tag, i) => tag.trim() && (
                      <span
                        key={i}
                        style={{ display: "inline-block", padding: "3px 12px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 500, background: "var(--primary-soft)", color: "var(--primary)" }}
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <MarkdownPreview content={currentBody} />
          </div>
        </div>
      </div>

      {showPublishModal && createPortal(
        <PublishModal
          postId={post.id}
          versions={post.versions}
          onClose={() => setShowPublishModal(false)}
        />,
        document.body
      )}
    </div>
  );
}

function PublishModal({
  postId,
  versions,
  onClose,
}: {
  postId: number;
  versions: Version[];
  onClose: () => void;
}) {
  const [platforms, setPlatforms] = useState<{ id: string; name: string; isConfigured: boolean; isService?: boolean }[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<number[]>(versions.map((v) => v.id));
  const [isDraft, setIsDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<{ platform: string; success: boolean; url?: string; error?: string }[]>([]);

  useEffect(() => {
    fetch("/api/platforms")
      .then((r) => r.json())
      .then((data) => {
        const blogPlatforms = data.filter((p: { isService?: boolean }) => !p.isService);
        setPlatforms(blogPlatforms);
        // 설정된 플랫폼은 자동 선택
        const configured = blogPlatforms
          .filter((p: { isConfigured: boolean }) => p.isConfigured)
          .map((p: { id: string }) => p.id);
        setSelectedPlatforms(configured);
      })
      .catch((err) => console.error("[PublishModal] 플랫폼 로드 에러:", err));
  }, []);

  async function handlePublish() {
    console.log("[PublishModal] handlePublish 호출:", { postId, selectedVersions, selectedPlatforms, isDraft });
    setPublishing(true);
    try {
      const body = { postId, versionIds: selectedVersions, platformIds: selectedPlatforms, isDraft };
      console.log("[PublishModal] fetch 요청:", JSON.stringify(body));
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      console.log("[PublishModal] fetch 응답:", res.status);
      const data = await res.json();
      console.log("[PublishModal] 결과:", JSON.stringify(data));
      setResults(data.results || []);
    } catch (err) {
      console.error("[PublishModal] 에러:", err);
    } finally {
      setPublishing(false);
    }
  }

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const toggleVersion = (id: number) => {
    setSelectedVersions((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-xl p-8 animate-fade-up"
        style={{ maxWidth: 480, background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold mb-5" style={{ fontSize: "var(--text-section)" }}>
          발행하기
        </h2>

        {results.length > 0 ? (
          <div className="flex flex-col gap-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="rounded-lg p-3 text-sm"
                style={{ background: r.success ? "var(--success-bg)" : "var(--error-bg)", color: r.success ? "var(--success)" : "var(--error)" }}
              >
                <span className="font-medium">{r.platform}</span>:{" "}
                {r.success ? (
                  r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">발행 완료</a>
                  ) : "초안 저장 완료"
                ) : r.error}
              </div>
            ))}
            <button onClick={onClose} className="btn btn-primary mt-2">닫기</button>
          </div>
        ) : (
          <>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>버전</p>
            <div className="flex flex-col gap-2 mb-5">
              {versions.map((v) => (
                <label key={v.id} className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-md" style={{ background: "var(--bg-elevated)" }}>
                  <input
                    type="checkbox"
                    checked={selectedVersions.includes(v.id)}
                    onChange={() => toggleVersion(v.id)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-sm font-semibold uppercase" style={{ color: "var(--text-primary)" }}>{v.language}</span>
                </label>
              ))}
            </div>

            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>플랫폼</p>
            <div className="flex flex-col gap-2 mb-5">
              {platforms.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md ${!p.isConfigured ? "opacity-40" : "cursor-pointer"}`}
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(p.id)}
                    onChange={() => p.isConfigured && togglePlatform(p.id)}
                    disabled={!p.isConfigured}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                  {!p.isConfigured && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>미설정</span>}
                </label>
              ))}
            </div>

            <label className="flex items-center gap-3 mb-6 cursor-pointer">
              <input type="checkbox" checked={isDraft} onChange={(e) => setIsDraft(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>초안으로 저장</span>
            </label>

            <div className="flex gap-2">
              <button onClick={onClose} className="btn btn-secondary flex-1">취소</button>
              <button
                onClick={handlePublish}
                disabled={publishing || selectedPlatforms.length === 0 || selectedVersions.length === 0}
                className="btn btn-primary flex-1"
              >
                {publishing ? "발행 중..." : "발행"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
