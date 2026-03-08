import type { BlogPlatform } from "./types";
import { hashnode } from "./hashnode";
import { devto } from "./devto";

export const platforms = new Map<string, BlogPlatform>();

platforms.set("hashnode", hashnode);
platforms.set("devto", devto);

export function getPlatform(id: string): BlogPlatform | undefined {
  return platforms.get(id);
}

export function getAllPlatforms(): BlogPlatform[] {
  return Array.from(platforms.values());
}
