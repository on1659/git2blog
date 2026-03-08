import type { BlogPlatform, PublishInput, PublishResult } from "./types";

export const tistory: BlogPlatform = {
  config: {
    id: "tistory",
    name: "Tistory",
    icon: "T",
    url: "https://www.tistory.com",
    credentialFields: [
      {
        key: "clientId",
        label: "클라이언트 ID",
        type: "text",
        required: true,
        placeholder: "티스토리 API 클라이언트 ID",
      },
      {
        key: "clientSecret",
        label: "클라이언트 시크릿",
        type: "password",
        required: true,
        placeholder: "티스토리 API 클라이언트 시크릿",
      },
    ],
  },

  isConfigured(creds) {
    return !!(creds.clientId && creds.clientSecret);
  },

  async validateCredentials(creds) {
    return !!(creds.clientId && creds.clientSecret);
  },

  async publish(input: PublishInput, _creds): Promise<PublishResult> {
    // Tistory API requires OAuth flow — placeholder
    return {
      success: false,
      platform: "tistory",
      error: "Tistory publishing requires OAuth authentication. Not yet implemented.",
    };
  },
};
