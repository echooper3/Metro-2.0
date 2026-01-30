
import { GoogleGenAI, Type } from "@google/genai";
import { EventActivity, GroundingSource } from "../types";

// Persistent Cache Configuration
const CACHE_KEY_PREFIX = "itm_cache_";
const CACHE_TTL = 1000 * 60 * 60 * 12; 

// Track quota status globally
let isGroundedQuotaExhausted = false;
let isGlobalQuotaExhausted = false;
let quotaResetTime = 0;

const extractJson = (text: string) => {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) return jsonMatch[0];
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getPersistentCache = (key: string) => {
  const item = localStorage.getItem(CACHE_KEY_PREFIX + key);
  if (!item) return null;
  try {
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp < CACHE_TTL) return parsed.data;
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  } catch (e) {
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  }
  return null;
};

const setPersistentCache = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(CACHE_KEY_PREFIX)) localStorage.removeItem(k);
    });
  }
};

export interface FetchOptions {
  category?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
  userLocation?: { latitude: number; longitude: number };
  forceRefresh?: boolean;
}

export const getQuotaStatus = () => ({
  isGroundedExhausted: isGroundedQuotaExhausted,
  isGlobalExhausted: isGlobalQuotaExhausted && Date.now() < quotaResetTime,
  resetTime: quotaResetTime
});

export const resetQuotaStandby = () => {
  isGroundedQuotaExhausted = false;
  isGlobalQuotaExhausted = false;
  quotaResetTime = 0;
};

/**
 * Sync helper to get cache key
 */
export const getCacheKey = (cityName: string | 'All', options: FetchOptions = {}) => {
  return btoa(JSON.stringify({ cityName, ...options, forceRefresh: false }));
};

/**
 * Sync helper to check cache
 */
export const getCachedData = (key: string) => {
  return getPersistentCache(key);
};

/**
 * Internal helper to call Gemini with or without tools
 */
async function queryGemini(cityName: string, options: FetchOptions, useGrounding: boolean) {
  const { category, startDate, endDate, keyword, page = 1 } = options;
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = "gemini-3-flash-preview";
  
  let categoryConstraint = (category && category !== 'All') 
    ? `Category: "${category}".` 
    : `Diverse categories.`;

  const currentDateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Minimalist prompt to reduce output latency
  const prompt = `Concierge for ${cityName}. Find 10 REAL events.
  Today is ${currentDateStr}. Page ${page}.
  Rules:
  - ${categoryConstraint}
  - Range: ${startDate || 'Upcoming'}
  - Keyword: ${keyword || 'None'}
  - For imageUrl, provide a high-quality Unsplash URL: https://images.unsplash.com/photo-{ID}?auto=format&fit=crop&q=60&w=800 based on keywords like "concert", "stadium", "festival", "gallery".
  
  JSON array: title, category, description, date (MM/DD/YYYY), time, location, venue, cityName, sourceUrl, imageUrl, isTrending, lat, lng, price, isFree, priceLevel.`;

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          date: { type: Type.STRING },
          time: { type: Type.STRING },
          location: { type: Type.STRING },
          venue: { type: Type.STRING },
          cityName: { type: Type.STRING },
          sourceUrl: { type: Type.STRING },
          imageUrl: { type: Type.STRING },
          isTrending: { type: Type.BOOLEAN },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          price: { type: Type.STRING },
          isFree: { type: Type.BOOLEAN },
          priceLevel: { type: Type.STRING }
        },
        required: ["title", "category", "description", "location", "date"]
      }
    }
  };

  if (useGrounding && !isGroundedQuotaExhausted) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config
  });

  const cleanJson = extractJson(response.text);
  const rawEvents = JSON.parse(cleanJson);
  
  const events: EventActivity[] = rawEvents.map((e: any, index: number) => ({
    ...e,
    id: `live-${cityName}-${page}-${index}-${Date.now()}`
  }));

  const sources: GroundingSource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    });
  }

  return { events, sources, isGrounded: !!chunks };
}

/**
 * Fetches events with an intelligent multi-stage retry/fallback
 */
export const fetchEvents = async (cityName: string | 'All', options: FetchOptions = {}): Promise<{ events: EventActivity[], sources: GroundingSource[], status: 'grounded' | 'ai' } | null> => {
  const { forceRefresh = false } = options;
  const cacheKey = getCacheKey(cityName, options);

  if (isGlobalQuotaExhausted && Date.now() < quotaResetTime && !forceRefresh) {
    return null;
  }

  if (!forceRefresh) {
    const cached = getPersistentCache(cacheKey);
    if (cached) return { ...cached, status: cached.sources?.length > 0 ? 'grounded' : 'ai' };
  }

  try {
    const result = await queryGemini(cityName, options, true);
    setPersistentCache(cacheKey, result);
    return { ...result, status: 'grounded' };
  } catch (error: any) {
    const errorMsg = error?.message || "";
    if (errorMsg.includes('429') || error?.status === 429) {
      isGroundedQuotaExhausted = true;
      try {
        const fallbackResult = await queryGemini(cityName, options, false);
        setPersistentCache(cacheKey, fallbackResult);
        return { ...fallbackResult, status: 'ai' };
      } catch (fallbackError: any) {
        isGlobalQuotaExhausted = true;
        quotaResetTime = Date.now() + (30 * 60 * 1000); 
        return null;
      }
    }
    return null;
  }
};

/**
 * Search for places using Gemini and Google Maps tool
 * Provides fuzzy autocomplete and geocoding
 */
export const searchPlaces = async (input: string): Promise<Array<{ name: string; address: string; lat: number; lng: number }>> => {
  if (input.length < 3) return [];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-2.5-flash";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `Find 5 locations for: "${input}". 
      JSON array: "name", "address", "lat", "lng". 
      Only JSON.`,
      config: {
        tools: [{ googleMaps: {} }]
      }
    });

    const cleanJson = extractJson(response.text || "[]");
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Place search failed:", error);
    return [];
  }
};
