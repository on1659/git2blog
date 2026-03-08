"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "비밀번호가 틀렸습니다");
      }
    } catch {
      setError("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base, #0a0a0a)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{
          padding: "2.5rem",
          width: "100%",
          maxWidth: 360,
        }}
      >
        <h1
          className="font-semibold mb-2"
          style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}
        >
          git2blog
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--text-tertiary)" }}
        >
          비밀번호를 입력하세요
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          className="w-full px-4 py-3 rounded-lg text-sm mb-4"
          style={{
            background: "var(--bg-elevated, #1a1a1a)",
            border: "1px solid var(--border-subtle, #333)",
            color: "var(--text-primary, #fff)",
            outline: "none",
          }}
        />

        {error && (
          <p className="text-sm mb-4" style={{ color: "var(--error, #ef4444)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="btn btn-primary w-full text-sm"
          style={{ padding: "0.75rem" }}
        >
          {loading ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
