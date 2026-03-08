"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "대시보드" },
  { href: "/settings", label: "설정" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="sticky top-0 z-40"
      style={{
        background: "rgba(9, 9, 11, 0.8)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between px-6 h-16 mx-auto" style={{ maxWidth: 1100 }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--primary)", color: "white" }}
          >
            G
          </span>
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            git2blog
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "var(--bg-elevated)" : "transparent",
                  border: active ? "1px solid var(--border-emphasis)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--bg-surface)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/write"
            className="ml-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
            style={{
              color: "white",
              background: "var(--primary)",
              boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--primary-hover)";
              e.currentTarget.style.boxShadow = "var(--primary-glow)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--primary)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            새 글
          </Link>
        </div>

        {/* Hamburger */}
        <button
          className="flex md:hidden items-center justify-center w-10 h-10 rounded-md"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="flex flex-col p-3 gap-2 md:hidden animate-slide-down"
          style={{
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-center"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "var(--bg-elevated)" : "transparent",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/write"
            className="px-4 py-3 rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-center gap-1.5"
            style={{
              color: "white",
              background: "var(--primary)",
            }}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M8 3v10M3 8h10" />
            </svg>
            새 글
          </Link>
        </div>
      )}
    </nav>
  );
}
