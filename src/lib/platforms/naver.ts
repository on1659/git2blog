import type { BlogPlatform, PublishInput, PublishResult } from "./types";

export const naver: BlogPlatform = {
  config: {
    id: "naver",
    name: "네이버 블로그",
    icon: "N",
    url: "https://blog.naver.com",
    credentialFields: [
      {
        key: "clientId",
        label: "클라이언트 ID",
        type: "text",
        required: true,
        placeholder: "네이버 API 클라이언트 ID",
      },
      {
        key: "clientSecret",
        label: "클라이언트 시크릿",
        type: "password",
        required: true,
        placeholder: "네이버 API 클라이언트 시크릿",
      },
    ],
  },

  isConfigured(creds) {
    return !!(creds.clientId && creds.clientSecret);
  },

  async validateCredentials(creds) {
    // Naver doesn't have a simple validation endpoint
    return !!(creds.clientId && creds.clientSecret);
  },

  async publish(input: PublishInput, _creds): Promise<PublishResult> {
    // Naver Blog API requires OAuth flow — placeholder
    return {
      success: false,
      platform: "naver",
      error: "Naver Blog publishing requires OAuth authentication. Not yet implemented.",
    };
  },
};
