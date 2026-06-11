import { LivehouseDataRow } from '../types/livehouse';

const API_URL = 'https://script.google.com/macros/s/AKfycbxM3XxkT30dpaNbVSsUFVlLhSCejbcZcIizqEE1StZpj4nKGGMmMSzN0xn0tmYHQuuwaQ/exec';

let cachedData: LivehouseDataRow[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export const LivehouseApiService = {
  async fetchLivehouseData(forceRefresh = false): Promise<LivehouseDataRow[]> {
    const now = Date.now();
    if (!forceRefresh && cachedData && (now - lastFetchTime < CACHE_TTL)) {
      return cachedData;
    }

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      // If the API returns {"status":"error","message":"Unreachable."}, handle gracefully
      if (data && data.status === 'error') {
        console.warn('Livehouse API Error:', data.message);
        return [];
      }

      if (Array.isArray(data)) {
        cachedData = data as LivehouseDataRow[];
        lastFetchTime = now;
        return cachedData;
      } else {
        console.warn('Livehouse API returned non-array data structure', data);
        return [];
      }
    } catch (error) {
      console.error('Failed to fetch livehouse data:', error);
      // Return empty array on failure so UI handles it gracefully
      return [];
    }
  }
};
