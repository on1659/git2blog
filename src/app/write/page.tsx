"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  title_ko: string;
  title_en: string;
  summary: string;
  angle: string;
};

type AnalyzeResult = {
  commits: unknown[];
  readme: string;
  repo: { owner: string; repo: string };
  suggestions: Suggestion[];
};

const stepLabels = ["소스 선택", "주제 선택", "생성"];

export default function WritePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<"auto" | "upload" | null>(null);

  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");

  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedKo, setGeneratedKo] = useState("");
  const [generatedEn, setGeneratedEn] = useState("");
  const [genLang, setGenLang] = useState<"ko" | "en">("ko");

  const [uploading, setUploading] = useState(false);

  async function handleAnalyze() {
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "분석 실패");
      }
      const data: AnalyzeResult = await res.json();
      setAnalyzeResult(data);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate(suggestion: Suggestion) {
    setSelectedSuggestion(suggestion);
    setStep(3);
    setGenerating(true);
    setGeneratedKo("");
    setGeneratedEn("");

    try {
      setGenLang("ko");
      await streamGenerate(suggestion, "ko", (text) => setGeneratedKo((prev) => prev + text));

      setGenLang("en");
      await streamGenerate(suggestion, "en", (text) => setGeneratedEn((prev) => prev + text));

      const slug = suggestion.title_en
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          githubUrl: url,
          versions: [
            { language: "ko", title: suggestion.title_ko, body: generatedKo || "(생성 중...)", tags: "[]" },
            { language: "en", title: suggestion.title_en, body: generatedEn || "(생성 중...)", tags: "[]" },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/edit/${data.id}`);
      }
    } catch {
      setError("생성 실패");
    } finally {
      setGenerating(false);
    }
  }

  async function streamGenerate(
    suggestion: Suggestion,
    language: "ko" | "en",
    onChunk: (text: string) => void
  ) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suggestion,
        commits: analyzeResult?.commits || [],
        readme: analyzeResult?.readme || "",
        language,
      }),
    });

    if (!res.ok) throw new Error("생성 실패");

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) onChunk(parsed.text);
          } catch {
            // skip
          }
        }
      }
    }
  }

  const [uploadedKo, setUploadedKo] = useState<File | null>(null);
  const [uploadedEn, setUploadedEn] = useState<File | null>(null);

  async function handleUploadSubmit() {
    if (!uploadedKo) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", uploadedKo);
      if (uploadedEn) {
        formData.append("fileEn", uploadedEn);
      }

      const res = await fetch("/api/upload", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "업로드 실패");
      }

      const data = await res.json();
      router.push(`/edit/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <h1 className="font-semibold mb-2" style={{ fontSize: "var(--text-title)" }}>
        새 글 작성
      </h1>
      <p className="text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>
        GitHub 커밋을 분석하거나 파일을 업로드하세요
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {stepLabels.map((label, i) => {
          const s = i + 1;
          const active = step >= s;
          return (
            <div key={s} className="flex items-center" style={{ flex: s < 3 ? 1 : "none" }}>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    background: active ? "var(--primary)" : "var(--bg-elevated)",
                    color: active ? "white" : "var(--text-tertiary)",
                    boxShadow: active ? "var(--primary-glow)" : "none",
                  }}
                >
                  {s}
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                  {label}
                </span>
              </div>
              {s < 3 && (
                <div
                  className="flex-1 h-px mx-3"
                  style={{ background: step > s ? "var(--primary)" : "var(--border-default)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div
          className="rounded-lg p-4 mb-6 text-sm animate-fade-in"
          style={{ background: "var(--error-bg)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--error)" }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Mode Selection */}
      {step === 1 && !mode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger">
          <button
            className="card card-interactive rounded-lg p-8 text-left animate-fade-up"
            onClick={() => setMode("auto")}
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl mb-4" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
              ⚡
            </div>
            <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              자동 생성
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              GitHub URL을 입력하면 커밋을 분석하고 AI가 블로그 글을 생성합니다
            </p>
          </button>

          <button
            className="card card-interactive rounded-lg p-8 text-left animate-fade-up"
            onClick={() => setMode("upload")}
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl mb-4" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
              📄
            </div>
            <p className="font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              파일 업로드
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              기존 마크다운 파일을 업로드합니다 (frontmatter 포함)
            </p>
          </button>
        </div>
      )}

      {/* Step 1: Auto - URL Input */}
      {step === 1 && mode === "auto" && (
        <div className="animate-fade-up">
          <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            GitHub 리포지토리 URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="input flex-1"
              style={{ padding: "12px 16px" }}
            />
            <button
              onClick={handleAnalyze}
              disabled={!url || analyzing}
              className="btn btn-primary"
              style={{ padding: "12px 24px" }}
            >
              {analyzing ? (
                <>
                  <span className="inline-block w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                  분석 중...
                </>
              ) : "분석"}
            </button>
          </div>
          <button className="btn-ghost text-sm mt-4" onClick={() => setMode(null)}>
            ← 모드 선택으로
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && mode === "upload" && (
        <div className="animate-fade-up">
          <div className="flex flex-col gap-4">
            {/* 한국어 파일 (필수) */}
            <label className="card card-interactive block rounded-lg p-8 text-center cursor-pointer" style={{ border: `2px dashed ${uploadedKo ? "var(--primary)" : "var(--border-emphasis)"}` }}>
              <input type="file" accept=".md,.markdown" onChange={(e) => setUploadedKo(e.target.files?.[0] || null)} className="hidden" />
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  {uploadedKo ? "✓" : "↑"}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    한국어 마크다운 {uploadedKo ? `— ${uploadedKo.name}` : "(필수)"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    frontmatter(title, tags 등)가 포함된 .md 파일
                  </p>
                </div>
              </div>
            </label>

            {/* 영어 파일 (선택) */}
            <label className="card card-interactive block rounded-lg p-8 text-center cursor-pointer" style={{ border: `2px dashed ${uploadedEn ? "var(--primary)" : "var(--border-default)"}` }}>
              <input type="file" accept=".md,.markdown" onChange={(e) => setUploadedEn(e.target.files?.[0] || null)} className="hidden" />
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: uploadedEn ? "var(--primary-soft)" : "var(--bg-elevated)", color: uploadedEn ? "var(--primary)" : "var(--text-tertiary)" }}>
                  {uploadedEn ? "✓" : "↑"}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    영어 마크다운 {uploadedEn ? `— ${uploadedEn.name}` : "(선택)"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Radar Blog 한영 전환용 — 없으면 한국어만 발행
                  </p>
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button className="btn-ghost text-sm" onClick={() => { setMode(null); setUploadedKo(null); setUploadedEn(null); }}>
              ← 모드 선택으로
            </button>
            <button
              onClick={handleUploadSubmit}
              disabled={!uploadedKo || uploading}
              className="btn btn-primary"
              style={{ padding: "10px 24px" }}
            >
              {uploading ? "업로드 중..." : "업로드"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Suggestions */}
      {step === 2 && analyzeResult && (
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge badge-published">{analyzeResult.commits.length}개 커밋</span>
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>분석 완료. 주제를 선택하세요:</span>
          </div>
          <div className="flex flex-col gap-4 stagger">
            {analyzeResult.suggestions.map((s, i) => (
              <button
                key={i}
                className="card card-interactive rounded-lg p-6 text-left animate-fade-up"
                onClick={() => handleGenerate(s)}
              >
                <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  {s.title_ko}
                </p>
                <p className="text-sm mb-2" style={{ color: "var(--text-tertiary)" }}>
                  {s.title_en}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {s.summary}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === 3 && (
        <div className="animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            {generating && (
              <span className="inline-block w-5 h-5 rounded-full animate-spin" style={{ border: "2.5px solid var(--border-default)", borderTopColor: "var(--primary)" }} />
            )}
            {!generating && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: "var(--success)", color: "white" }}>✓</span>
            )}
            <p className="text-sm font-medium" style={{ color: generating ? "var(--text-secondary)" : "var(--success)" }}>
              {generating ? `${genLang.toUpperCase()} 버전 생성 중...` : "생성 완료! 에디터로 이동합니다..."}
            </p>
          </div>

          {generating && (
            <div className="w-full rounded-full h-1 mb-4 overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-full rounded-full" style={{ background: "var(--primary)", width: genLang === "ko" ? "50%" : "90%", transition: "width 0.5s ease" }} />
            </div>
          )}

          {selectedSuggestion && (
            <p className="font-medium mb-4" style={{ color: "var(--text-primary)" }}>
              {selectedSuggestion.title_ko}
            </p>
          )}

          <div
            className={`card rounded-lg p-4 max-h-96 overflow-y-auto text-sm whitespace-pre-wrap ${generating ? "typing-cursor" : ""}`}
            style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}
          >
            {genLang === "ko" ? generatedKo || "대기 중..." : generatedEn || "대기 중..."}
          </div>
        </div>
      )}
    </div>
  );
}
