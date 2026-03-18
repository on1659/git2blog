import type { BlogPlatform, PublishInput, PublishResult } from "./types";

const THREADS_API = "https://graph.threads.net/v1.0";

/** 스레드용 텍스트 생성: 제목 + 부제 + 해시태그, 500자 이내 */
function buildThreadText(input: PublishInput): string {
  const hashtags = input.tags
    .slice(0, 5)
    .map((t) => `#${t.replace(/[\s-]/g, "").replace(/[^a-zA-Z0-9가-힣_]/g, "")}`)
    .join(" ");

  const title = input.title;
  const subtitle = input.subtitle ? `\n${input.subtitle}` : "";
  const tagLine = hashtags ? `\n\n${hashtags}` : "";

  const text = `${title}${subtitle}${tagLine}`;
  return text.length <= 500 ? text : `${title}${tagLine}`.slice(0, 500);
}

export const threads: BlogPlatform = {
  config: {
    id: "threads",
    name: "Threads",
    icon: "@",
    url: "https://threads.net",
    credentialFields: [
      { key: "userId", label: "User ID", type: "text", required: true, placeholder: "Threads User ID (숫자)" },
      { key: "accessToken", label: "Access Token", type: "password", required: true, placeholder: "Long-lived Access Token" },
    ],
  },

  isConfigured(creds) {
    return !!(creds.userId && creds.accessToken);
  },

  async validateCredentials(creds) {
    try {
      const res = await fetch(
        `${THREADS_API}/${creds.userId}/threads_publishing_limit?access_token=${creds.accessToken}`
      );
      return res.ok;
    } catch {
      return false;
    }
  },

  async publish(input: PublishInput, creds): Promise<PublishResult> {
    try {
      const text = buildThreadText(input);

      // Step 1: 컨테이너 생성
      const createRes = await fetch(`${THREADS_API}/${creds.userId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "TEXT",
          text,
          access_token: creds.accessToken,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        return {
          success: false,
          platform: "threads",
          error: err.error?.message || `HTTP ${createRes.status}`,
        };
      }

      const { id: creationId } = await createRes.json();

      // Step 2: 발행
      const publishRes = await fetch(`${THREADS_API}/${creds.userId}/threads_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: creds.accessToken,
        }),
      });

      if (!publishRes.ok) {
        const err = await publishRes.json();
        return {
          success: false,
          platform: "threads",
          error: err.error?.message || `HTTP ${publishRes.status}`,
        };
      }

      const { id: postId } = await publishRes.json();
      return {
        success: true,
        platform: "threads",
        platformPostId: String(postId),
      };
    } catch (e: unknown) {
      return {
        success: false,
        platform: "threads",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      };
    }
  },
};
