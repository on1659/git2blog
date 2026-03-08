import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { platformCredentials } from "@/lib/db/schema";
import { getAllPlatforms } from "@/lib/platforms/registry";

// 내부 서비스 (블로그 플랫폼이 아닌 것)
const SERVICES = [
  {
    id: "github",
    name: "GitHub",
    icon: "GH",
    url: "https://github.com",
    credentialFields: [
      { key: "token", label: "Personal Access Token", type: "password" as const, required: false, placeholder: "ghp_xxxx (없으면 공개 리포만 접근)" },
    ],
    isService: true,
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude AI)",
    icon: "AI",
    url: "https://console.anthropic.com",
    credentialFields: [
      { key: "apiKey", label: "API 키", type: "password" as const, required: true, placeholder: "sk-ant-xxxx" },
    ],
    isService: true,
  },
];

export async function GET() {
  try {
    const allPlatforms = getAllPlatforms();
    const allCreds = await db.select().from(platformCredentials);

    const platformResult = allPlatforms.map((p) => {
      const cred = allCreds.find((c) => c.platformId === p.config.id);
      const credentials: Record<string, string> = cred
        ? JSON.parse(cred.credentials)
        : {};

      return {
        id: p.config.id,
        name: p.config.name,
        icon: p.config.icon,
        url: p.config.url,
        credentialFields: p.config.credentialFields,
        isConfigured: p.isConfigured(credentials),
        isActive: cred?.isActive ?? false,
        credentials,
        isService: false,
      };
    });

    const serviceResult = SERVICES.map((s) => {
      const cred = allCreds.find((c) => c.platformId === s.id);
      const credentials: Record<string, string> = cred
        ? JSON.parse(cred.credentials)
        : {};
      const isConfigured = s.id === "github"
        ? !!credentials.token
        : !!credentials.apiKey;

      return {
        ...s,
        isConfigured,
        isActive: cred?.isActive ?? false,
        credentials,
      };
    });

    return NextResponse.json([...serviceResult, ...platformResult]);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "내부 오류" },
      { status: 500 }
    );
  }
}
