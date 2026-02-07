/**
 * Simple in-memory cache for customer segmentation results
 * No database storage - keeps it simple
 */

interface CachedSegmentation {
  data: any[];
  timestamp: number;
}

const segmentationCache = new Map<string, CachedSegmentation>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function setSegmentationCache(userId: string, data: any[]): void {
  segmentationCache.set(userId, {
    data,
    timestamp: Date.now(),
  });
}

export function getSegmentationCache(userId: string): any[] | null {
  const cached = segmentationCache.get(userId);
  
  if (!cached) {
    return null;
  }

  // Check if cache is expired
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    segmentationCache.delete(userId);
    return null;
  }

  return cached.data;
}

export function clearSegmentationCache(userId: string): void {
  segmentationCache.delete(userId);
}

