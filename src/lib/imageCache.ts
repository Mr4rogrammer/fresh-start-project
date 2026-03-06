// Global cache for Drive image blob URLs
// This prevents re-fetching the same image multiple times

const cache = new Map<string, string>();

export const imageCache = {
  get: (fileId: string): string | undefined => {
    return cache.get(fileId);
  },

  set: (fileId: string, blobUrl: string): void => {
    cache.set(fileId, blobUrl);
  },

  has: (fileId: string): boolean => {
    return cache.has(fileId);
  },

  clear: (): void => {
    // Revoke all blob URLs before clearing
    cache.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore errors
      }
    });
    cache.clear();
  },

  delete: (fileId: string): void => {
    const url = cache.get(fileId);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // Ignore errors
      }
      cache.delete(fileId);
    }
  },
};
