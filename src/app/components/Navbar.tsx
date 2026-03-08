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
        <div className="hidden md:flex items-center gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                color: isActive(link.href) ? "white" : "white",
                background: isActive(link.href) ? "var(--primary)" : "var(--primary-hover)",
                opacity: isActive(link.href) ? 1 : 0.7,
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/write"
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              color: "white",
              background: pathname.startsWith("/write") ? "var(--primary)" : "var(--primary-hover)",
              opacity: pathname.startsWith("/write") ? 1 : 0.7,
            }}
          >
            + 새 글
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-3 rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-center"
              style={{
                color: "white",
                background: isActive(link.href) ? "var(--primary)" : "var(--primary-hover)",
                opacity: isActive(link.href) ? 1 : 0.7,
              }}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/write"
            className="px-4 py-3 rounded-lg text-sm font-medium min-h-[44px] flex items-center justify-center"
            style={{
              color: "white",
              background: pathname.startsWith("/write") ? "var(--primary)" : "var(--primary-hover)",
              opacity: pathname.startsWith("/write") ? 1 : 0.7,
            }}
            onClick={() => setMenuOpen(false)}
          >
            + 새 글
          </Link>
        </div>
      )}
    </nav>
  );
}
