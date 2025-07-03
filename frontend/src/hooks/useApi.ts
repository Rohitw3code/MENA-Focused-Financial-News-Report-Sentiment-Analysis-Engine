import { useState, useCallback, useRef } from 'react';
import { useApi } from '../contexts/ApiContext';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

interface UseApiOptions {
  cacheTime?: number; // Cache duration in milliseconds
  retries?: number;
  retryDelay?: number;
}

export const useApiWithCache = (options: UseApiOptions = {}) => {
  const { fetchData } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    retries = 3,
    retryDelay = 1000
  } = options;

  const getCacheKey = (endpoint: string, params?: Record<string, any>) => {
    return `${endpoint}?${new URLSearchParams(params || {}).toString()}`;
  };

  const isValidCache = (entry: CacheEntry) => {
    return Date.now() < entry.timestamp + entry.expiry;
  };

  const fetchWithCache = useCallback(async (
    endpoint: string, 
    params?: Record<string, any>,
    options: { skipCache?: boolean; signal?: AbortSignal } = {}
  ) => {
    const cacheKey = getCacheKey(endpoint, params);
    
    // Check cache first (unless skipCache is true)
    if (!options.skipCache) {
      const cached = cache.current.get(cacheKey);
      if (cached && isValidCache(cached)) {
        return cached.data;
      }
    }

    // Cancel any existing request for this endpoint
    const existingController = abortControllers.current.get(cacheKey);
    if (existingController) {
      existingController.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllers.current.set(cacheKey, controller);

    setLoading(true);
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await fetchData(endpoint, params);
        
        // Cache the result
        cache.current.set(cacheKey, {
          data,
          timestamp: Date.now(),
          expiry: cacheTime
        });

        setLoading(false);
        abortControllers.current.delete(cacheKey);
        return data;
      } catch (err) {
        lastError = err as Error;
        
        if (attempt < retries && !controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    setLoading(false);
    setError(lastError?.message || 'Failed to fetch data');
    abortControllers.current.delete(cacheKey);
    throw lastError;
  }, [fetchData, cacheTime, retries, retryDelay]);

  const clearCache = useCallback((endpoint?: string) => {
    if (endpoint) {
      const keysToDelete = Array.from(cache.current.keys()).filter(key => 
        key.startsWith(endpoint)
      );
      keysToDelete.forEach(key => cache.current.delete(key));
    } else {
      cache.current.clear();
    }
  }, []);

  const cancelRequests = useCallback((endpoint?: string) => {
    if (endpoint) {
      const controllersToCancel = Array.from(abortControllers.current.entries())
        .filter(([key]) => key.startsWith(endpoint));
      controllersToCancel.forEach(([key, controller]) => {
        controller.abort();
        abortControllers.current.delete(key);
      });
    } else {
      abortControllers.current.forEach(controller => controller.abort());
      abortControllers.current.clear();
    }
  }, []);

  return {
    fetchWithCache,
    loading,
    error,
    clearCache,
    cancelRequests
  };
};