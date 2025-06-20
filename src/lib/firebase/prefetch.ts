import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import type { UserProfileType } from '@/types';

const CACHE_PREFIX = 'prefetch_';
const CACHE_EXPIRY = 1000 * 60 * 30; // 30 minutes

export const prefetchUserData = async (uid: string): Promise<UserProfileType | null> => {
  const cacheKey = `${CACHE_PREFIX}user_${uid}`;
  
  // Try to get from cache first
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return data;
      }
    } catch (e) {
      console.warn('Error parsing cached prefetch data:', e);
    }
  }

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data() as UserProfileType;
      
      // Cache the fresh data
      localStorage.setItem(cacheKey, JSON.stringify({
        data: userData,
        timestamp: Date.now()
      }));
      
      return userData;
    }
  } catch (error) {
    console.error('Error prefetching user data:', error);
  }
  
  return null;
};

export const clearPrefetchCache = () => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
};
