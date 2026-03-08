import type { BlogPlatform, PublishInput, PublishResult, CheckExistsResult } from "./types";

export const medium: BlogPlatform = {
  config: {
    id: "medium",
    name: "Medium",
    icon: "M",
    url: "https://medium.com",
    credentialFields: [
      {
        key: "token",
        label: "통합 토큰",
        type: "password",
        required: true,
        placeholder: "Medium 통합 토큰",
      },
    ],
  },

  isConfigured(creds) {
    return !!creds.token;
  },

  async validateCredentials(creds) {
    try {
      const res = await fetch("https://api.medium.com/v1/me", {
        headers: { Authorization: `Bearer ${creds.token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async publish(input: PublishInput, creds): Promise<PublishResult> {
    try {
      // Get user ID first
      const meRes = await fetch("https://api.medium.com/v1/me", {
        headers: { Authorization: `Bearer ${creds.token}` },
      });
      if (!meRes.ok) {
        return { success: false, platform: "medium", error: "인증 실패" };
      }
      const me = await meRes.json();
      const userId = me.data.id;

      const res = await fetch(
        `https://api.medium.com/v1/users/${userId}/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${creds.token}`,
          },
          body: JSON.stringify({
            title: input.title,
            contentFormat: "markdown",
            content: input.body,
            tags: input.tags.slice(0, 5),
            publishStatus: input.isDraft ? "draft" : "public",
          }),
        }
      );

      if (!res.ok) {
        return {
          success: false,
          platform: "medium",
          error: `HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        platform: "medium",
        platformPostId: data.data.id,
        url: data.data.url,
      };
    } catch (e: unknown) {
      return {
        success: false,
        platform: "medium",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      };
    }
  },

  // Medium API에는 글 조회 엔드포인트가 없어서 URL 존재 여부로 확인
  async checkExists(_platformPostId: string, _creds): Promise<CheckExistsResult> {
    // Medium은 개별 글 조회 API를 제공하지 않음
    // DB에 저장된 URL이 있으면 그걸로 판단
    return { exists: false };
  },
};
