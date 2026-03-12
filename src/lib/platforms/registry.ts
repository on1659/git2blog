import type { BlogPlatform } from "./types";
import { hashnode } from "./hashnode";
import { devto } from "./devto";
import { radar } from "./radar";

export const platforms = new Map<string, BlogPlatform>();

platforms.set("hashnode", hashnode);
platforms.set("devto", devto);
platforms.set("radar", radar);

export function getPlatform(id: string): BlogPlatform | undefined {
  return platforms.get(id);
}

export function getAllPlatforms(): BlogPlatform[] {
  return Array.from(platforms.values());
}
