export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  url: string;
  credentialFields: CredentialField[];
}

export interface PublishInput {
  title: string;
  subtitle?: string;
  body: string;
  tags: string[];
  slug: string;
  coverImage?: string;
  isDraft: boolean;
  titleEn?: string;
  bodyEn?: string;
}

export interface PublishResult {
  success: boolean;
  platform: string;
  platformPostId?: string;
  url?: string;
  error?: string;
}

export interface CheckExistsResult {
  exists: boolean;
  url?: string;
  title?: string;
}

export interface BlogPlatform {
  config: PlatformConfig;
  isConfigured(credentials: Record<string, string>): boolean;
  validateCredentials(
    credentials: Record<string, string>
  ): Promise<boolean>;
  publish(
    input: PublishInput,
    credentials: Record<string, string>
  ): Promise<PublishResult>;
  update?(
    platformPostId: string,
    input: PublishInput,
    credentials: Record<string, string>
  ): Promise<PublishResult>;
  checkExists?(
    platformPostId: string,
    credentials: Record<string, string>
  ): Promise<CheckExistsResult>;
}
