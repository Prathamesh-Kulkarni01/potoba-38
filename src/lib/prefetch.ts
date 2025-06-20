// Data prefetcher utility
import { doc, collection, getDocs, getDoc, query, where, limit } from 'firebase/firestore';
import { db } from './firebase/config';

interface PrefetchConfig {
  paths: string[];
  key: string;
  maxCacheAge?: number;
}

const DEFAULT_CACHE_AGE = 1000 * 60 * 5; // 5 minutes

export class DataPrefetcher {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  async prefetchData(config: PrefetchConfig): Promise<void> {
    const { paths, key, maxCacheAge = DEFAULT_CACHE_AGE } = config;

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < maxCacheAge) {
      return;
    }

    try {
      const data = await Promise.all(
        paths.map(async (path) => {
          const ref = doc(db, path);
          const snapshot = await getDoc(ref);
          return snapshot.data();
        })
      );

      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error prefetching data:', error);
      throw error;
    }
  }

  getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    return cached.data;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
export const prefetcher = new DataPrefetcher();
