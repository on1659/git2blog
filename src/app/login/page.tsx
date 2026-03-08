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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base, #0a0a0a)",
      }}
    >
      {/* Title area */}
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--text-primary, #fff)",
            marginBottom: "0.5rem",
          }}
        >
          git2blog
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--text-tertiary, #888)" }}>
          관리를 위해 로그인하세요
        </p>
      </div>

      {/* Login card */}
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--bg-surface, #141414)",
          border: "1px solid var(--border-subtle, #262626)",
          borderRadius: 16,
          padding: "2.5rem",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "0.95rem",
            fontWeight: 500,
            color: "var(--text-primary, #fff)",
            marginBottom: "0.75rem",
          }}
        >
          비밀번호
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          autoFocus
          style={{
            width: "100%",
            padding: "1rem 1.25rem",
            borderRadius: 10,
            background: "var(--bg-elevated, #1a1a1a)",
            border: "1px solid var(--border-subtle, #333)",
            color: "var(--text-primary, #fff)",
            fontSize: "1.1rem",
            outline: "none",
            marginBottom: "1.5rem",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--error, #ef4444)",
              marginBottom: "1rem",
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="btn btn-primary"
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.1rem",
            fontWeight: 600,
            borderRadius: 10,
          }}
        >
          {loading ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
