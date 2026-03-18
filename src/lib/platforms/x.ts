import type { BlogPlatform, PublishInput, PublishResult } from "./types";
import crypto from "crypto";

/** 트윗용 텍스트 생성: 제목 + 해시태그, 280자 이내 */
function buildTweetText(input: PublishInput): string {
  const hashtags = input.tags
    .slice(0, 3)
    .map((t) => `#${t.replace(/[\s-]/g, "").replace(/[^a-zA-Z0-9가-힣_]/g, "")}`)
    .join(" ");

  const title = input.title;
  const subtitle = input.subtitle ? `\n${input.subtitle}` : "";
  const tagLine = hashtags ? `\n\n${hashtags}` : "";

  const text = `${title}${subtitle}${tagLine}`;
  return text.length <= 280 ? text : `${title}${tagLine}`.slice(0, 280);
}

/** OAuth 1.0a 서명 생성 */
function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${encodeRFC3986(k)}=${encodeRFC3986(params[k])}`)
    .join("&");

  const base = [method.toUpperCase(), encodeRFC3986(url), encodeRFC3986(sorted)].join("&");
  const key = `${encodeRFC3986(consumerSecret)}&${encodeRFC3986(tokenSecret)}`;

  return crypto.createHmac("sha1", key).update(base).digest("base64");
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** OAuth 1.0a Authorization 헤더 생성 */
function buildOAuthHeader(
  method: string,
  url: string,
  creds: Record<string, string>,
  bodyParams?: Record<string, string>
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };

  const allParams = { ...oauthParams, ...(bodyParams || {}) };
  oauthParams.oauth_signature = oauthSign(method, url, allParams, creds.apiSecret, creds.accessTokenSecret);

  const header = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeRFC3986(k)}="${encodeRFC3986(oauthParams[k])}"`)
    .join(", ");

  return `OAuth ${header}`;
}

export const x: BlogPlatform = {
  config: {
    id: "x",
    name: "X (Twitter)",
    icon: "𝕏",
    url: "https://x.com",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "X API Key" },
      { key: "apiSecret", label: "API Secret", type: "password", required: true, placeholder: "X API Secret" },
      { key: "accessToken", label: "Access Token", type: "password", required: true, placeholder: "Access Token" },
      { key: "accessTokenSecret", label: "Access Token Secret", type: "password", required: true, placeholder: "Access Token Secret" },
    ],
  },

  isConfigured(creds) {
    return !!(creds.apiKey && creds.apiSecret && creds.accessToken && creds.accessTokenSecret);
  },

  async validateCredentials(creds) {
    try {
      const url = "https://api.twitter.com/2/users/me";
      const auth = buildOAuthHeader("GET", url, creds);
      const res = await fetch(url, {
        headers: { Authorization: auth },
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async publish(input: PublishInput, creds): Promise<PublishResult> {
    try {
      const text = buildTweetText(input);
      const url = "https://api.twitter.com/2/tweets";
      const body = JSON.stringify({ text });
      const auth = buildOAuthHeader("POST", url, creds);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!res.ok) {
        const data = await res.json();
        return {
          success: false,
          platform: "x",
          error: data.detail || data.title || `HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const tweetId = data.data?.id;
      return {
        success: true,
        platform: "x",
        platformPostId: tweetId,
        url: tweetId ? `https://x.com/i/status/${tweetId}` : undefined,
      };
    } catch (e: unknown) {
      return {
        success: false,
        platform: "x",
        error: e instanceof Error ? e.message : "알 수 없는 오류",
      };
    }
  },
};
