"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto px-6 py-12 lg:px-16" style={{ maxWidth: 1100 }}>
        {children}
      </main>
    </>
  );
}
