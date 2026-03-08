"use client";

import { useState, useEffect } from "react";

type CredentialField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
};

type Platform = {
  id: string;
  name: string;
  icon: string;
  url: string;
  credentialFields: CredentialField[];
  isConfigured: boolean;
  isActive: boolean;
  credentials: Record<string, string>;
  isService?: boolean;
};

const PLATFORM_GUIDES: Record<string, { title: string; steps: string[] }> = {
  github: {
    title: "GitHub 토큰 설정 가이드",
    steps: [
      "github.com에 로그인합니다.",
      "우측 상단 프로필 아이콘 > Settings로 이동합니다.",
      "좌측 메뉴 최하단의 Developer settings를 클릭합니다.",
      "Personal access tokens > Tokens (classic)을 선택합니다.",
      "Generate new token (classic)을 클릭합니다.",
      "Note에 'git2blog' 등 설명을 입력하고, Expiration을 설정합니다.",
      "scope는 repo (private 리포 접근) 또는 public_repo (공개 리포만)를 선택합니다.",
      "Generate token을 클릭하고 생성된 토큰(ghp_...)을 복사합니다.",
      "참고: 토큰 없이도 공개 리포는 접근 가능하지만, rate limit이 시간당 60회로 제한됩니다. 토큰이 있으면 5,000회까지 가능합니다.",
    ],
  },
  anthropic: {
    title: "Anthropic API 키 설정 가이드",
    steps: [
      "console.anthropic.com에 접속합니다.",
      "계정이 없으면 회원가입합니다.",
      "좌측 메뉴에서 API Keys를 클릭합니다.",
      "Create Key를 클릭해서 새 API 키를 생성합니다.",
      "생성된 키(sk-ant-...)를 복사해서 'API 키' 필드에 붙여넣습니다.",
      "참고: Anthropic API는 유료입니다. 크레딧을 충전해야 사용할 수 있습니다. 커밋 분석 1회에 약 $0.01~0.03 정도 소요됩니다.",
    ],
  },
  hashnode: {
    title: "Hashnode 설정 가이드",
    steps: [
      "hashnode.com에 로그인합니다.",
      "우측 상단 프로필 아이콘 > Developer Settings로 이동합니다.",
      "Generate New Token을 클릭해서 API 토큰을 생성합니다.",
      "생성된 토큰을 복사해서 'API 토큰' 필드에 붙여넣습니다.",
      "퍼블리케이션 ID는 블로그 대시보드 URL에서 확인할 수 있습니다. 예: hashnode.com/[블로그명]/dashboard → 설정 > General에 Publication ID가 표시됩니다.",
      "또는 Hashnode GraphQL API Playground(gql.hashnode.com)에서 아래 쿼리로 확인할 수 있습니다:\n{ publication(host: \"내블로그.hashnode.dev\") { id } }",
    ],
  },
  devto: {
    title: "DEV.to 설정 가이드",
    steps: [
      "dev.to에 로그인합니다.",
      "우측 상단 프로필 아이콘 > Extensions로 이동합니다.",
      "페이지 하단의 DEV Community API Keys 섹션을 찾습니다.",
      "설명(Description)을 입력하고 Generate API Key를 클릭합니다.",
      "생성된 API 키를 복사해서 'API 키' 필드에 붙여넣습니다.",
    ],
  },
};

export default function SettingsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; type: "success" | "error"; text: string } | null>(null);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [guideId, setGuideId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platforms")
      .then((r) => r.json())
      .then((data: Platform[]) => {
        setPlatforms(data);
        const initial: Record<string, Record<string, string>> = {};
        for (const p of data) {
          initial[p.id] = { ...p.credentials };
        }
        setEdits(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateField(platformId: string, key: string, value: string) {
    setEdits((prev) => ({ ...prev, [platformId]: { ...prev[platformId], [key]: value } }));
  }

  async function handleSave(platformId: string) {
    setSavingId(platformId);
    setMessage(null);
    try {
      const res = await fetch(`/api/platforms/${platformId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: edits[platformId] || {} }),
      });
      if (res.ok) {
        setMessage({ id: platformId, type: "success", text: "저장 완료!" });
      } else {
        const data = await res.json();
        setMessage({ id: platformId, type: "error", text: data.error || "저장 실패" });
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleTest(platformId: string) {
    setTestingId(platformId);
    setMessage(null);
    try {
      const res = await fetch(`/api/platforms/${platformId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: edits[platformId] || {}, action: "validate" }),
      });
      const data = await res.json();
      setMessage({ id: platformId, type: data.valid ? "success" : "error", text: data.valid ? "연결 성공!" : "연결 실패" });
    } catch {
      setMessage({ id: platformId, type: "error", text: "연결 실패" });
    } finally {
      setTestingId(null);
    }
  }

  function renderCard(p: Platform) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
            >
              {p.icon}
            </span>
            <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
              {p.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {p.isConfigured && <span className="badge badge-published">연결됨</span>}
            {PLATFORM_GUIDES[p.id] && (
              <button
                onClick={() => setGuideId(p.id)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                }}
                title="설정 방법 보기"
              >
                ?
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          {p.credentialFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                {field.label}
                {field.required && <span style={{ color: "var(--error)" }}> *</span>}
              </label>
              <input
                type={field.type === "password" ? "password" : "text"}
                value={edits[p.id]?.[field.key] || ""}
                onChange={(e) => updateField(p.id, field.key, e.target.value)}
                placeholder={field.placeholder || ""}
                className="input"
              />
            </div>
          ))}
        </div>

        {message && message.id === p.id && (
          <div
            className="rounded-md px-3 py-2 text-xs mb-3 animate-fade-in"
            style={{
              background: message.type === "success" ? "var(--success-bg)" : "var(--error-bg)",
              color: message.type === "success" ? "var(--success)" : "var(--error)",
            }}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => handleSave(p.id)} disabled={savingId === p.id} className="btn btn-primary flex-1 text-sm">
            {savingId === p.id ? "저장 중..." : "저장"}
          </button>
          <button onClick={() => handleTest(p.id)} disabled={testingId === p.id} className="btn btn-secondary text-sm">
            {testingId === p.id ? "테스트 중..." : "테스트"}
          </button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  const guide = guideId ? PLATFORM_GUIDES[guideId] : null;
  const services = platforms.filter((p) => p.isService);
  const blogPlatforms = platforms.filter((p) => !p.isService);

  return (
    <div className="max-w-3xl mx-auto animate-fade-up">
      <h1 className="font-semibold mb-2" style={{ fontSize: "var(--text-title)" }}>
        설정
      </h1>
      <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>
        서비스 연동 및 블로그 플랫폼 인증 정보를 관리합니다
      </p>

      {/* 서비스 연동 */}
      <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        서비스 연동
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10 stagger">
        {services.map((p) => (
          <div key={p.id} className="card p-6 animate-fade-up">
            {renderCard(p)}
          </div>
        ))}
      </div>

      {/* 발행 플랫폼 */}
      <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        발행 플랫폼
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger">
        {blogPlatforms.map((p) => (
          <div key={p.id} className="card p-6 animate-fade-up">
            {renderCard(p)}
          </div>
        ))}
      </div>

      {/* Guide Modal */}
      {guide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setGuideId(null)}
        >
          <div
            className="w-full rounded-xl p-8 animate-fade-up"
            style={{
              maxWidth: 520,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-lg)",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold" style={{ fontSize: "var(--text-section)" }}>
                {guide.title}
              </h2>
              <button
                onClick={() => setGuideId(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              >
                X
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {guide.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setGuideId(null)}
              className="btn btn-primary w-full mt-6"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
