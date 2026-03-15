import type { BlogPlatform, PublishInput, PublishResult, CheckExistsResult } from "./types";

/** DEV.to 태그: 영숫자+언더스코어만 허용, 하이픈→언더스코어 변환 */
function sanitizeTag(tag: string): string {
  return tag.toLowerCase().replace(/-/g, "").replace(/[^a-z0-9]/g, "");
}

export const devto: BlogPlatform = {
  config: {
    id: "devto",
    name: "DEV.to",
    icon: "D",
    url: "https://dev.to",
    credentialFields: [
      {
        key: "apiKey",
        label: "API 키",
        type: "password",
        required: true,
        placeholder: "DEV.to API 키",
      },
    ],
  },

  isConfigured(creds) {
    return !!creds.apiKey;
  },

  async validateCredentials(creds) {
    try {
      const res = await fetch("https://dev.to/api/users/me", {
        headers: { "api-key": creds.apiKey },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async publish(input: PublishInput, creds): Promise<PublishResult> {
    try {
      const res = await fetch("https://dev.to/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": creds.apiKey,
        },
        body: JSON.stringify({
          article: {
            title: input.title,
            body_markdown: input.body,
            published: !input.isDraft,
            tags: input.tags.map(sanitizeTag).filter(Boolean).slice(0, 4),
            cover_image: input.coverImage || undefined,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        return {
          success: false,
          platform: "devto",
          error: data.error || `HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      // DEV.to가 published: false로 응답하면 모더레이션 대기 상태
      if (!input.isDraft && data.published === false) {
        return {
          success: false,
          platform: "devto",
          platformPostId: String(data.id),
          url: data.url,
          error: "DEV.to 모더레이션 대기 중 — 잠시 후 자동 발행됩니다",
        };
      }
      return {
        success: true,
        platform: "devto",
        platformPostId: String(data.id),
        url: data.url,
      };
    } catch (e: unknown) {
      return {
        success: false,
        platform: "devto",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      };
    }
  },

  async update(
    platformPostId: string,
    input: PublishInput,
    creds
  ): Promise<PublishResult> {
    try {
      const res = await fetch(
        `https://dev.to/api/articles/${platformPostId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "api-key": creds.apiKey,
          },
          body: JSON.stringify({
            article: {
              title: input.title,
              body_markdown: input.body,
              published: true,
              tags: input.tags.map(sanitizeTag).filter(Boolean).slice(0, 4),
            },
          }),
        }
      );

      if (!res.ok) {
        return {
          success: false,
          platform: "devto",
          error: `HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        platform: "devto",
        platformPostId: String(data.id),
        url: data.url,
      };
    } catch (e: unknown) {
      return {
        success: false,
        platform: "devto",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      };
    }
  },

  async checkExists(platformPostId: string, creds): Promise<CheckExistsResult> {
    try {
      const res = await fetch(`https://dev.to/api/articles/${platformPostId}`, {
        headers: { "api-key": creds.apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        return { exists: true, url: data.url, title: data.title };
      }
      return { exists: false };
    } catch {
      return { exists: false };
    }
  },
};
