import type { BlogPlatform, PublishInput, PublishResult } from "./types";

const BASE_URL = "https://radar-blog.up.railway.app";

export const radar: BlogPlatform = {
  config: {
    id: "radar",
    name: "Radar Blog (이더.dev)",
    icon: "R",
    url: BASE_URL,
    credentialFields: [
      {
        key: "apiKey",
        label: "API 키",
        type: "password",
        required: true,
        placeholder: "Radar Blog API 키",
      },
    ],
  },

  isConfigured(creds) {
    return !!creds.apiKey;
  },

  async validateCredentials(creds) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/posts?limit=1`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async publish(input: PublishInput, creds): Promise<PublishResult> {
    try {
      const body: Record<string, unknown> = {
        title: input.title,
        content: input.body,
        category: "articles",
        published: !input.isDraft,
      };

      if (input.slug) body.slug = input.slug;
      if (input.subtitle) body.subtitle = input.subtitle;
      if (input.coverImage) body.coverImage = input.coverImage;
      if (input.tags.length > 0) body.tags = input.tags;
      if (input.titleEn) body.titleEn = input.titleEn;
      if (input.bodyEn) body.contentEn = input.bodyEn;

      const res = await fetch(`${BASE_URL}/api/v1/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          platform: "radar",
          error: data.error || `HTTP ${res.status}`,
        };
      }

      return {
        success: true,
        platform: "radar",
        platformPostId: String(data.data.id),
        url: `${BASE_URL}/posts/${data.data.id}`,
      };
    } catch (e: unknown) {
      return {
        success: false,
        platform: "radar",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      };
    }
  },
};
