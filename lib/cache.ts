interface CacheEntry {
  data: any;
  expiresAt: number;
}

export const cache: Record<string, CacheEntry> = {};